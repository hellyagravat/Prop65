// ============================================
// PROP65 SHIELD — CHEMICAL MATCHER
// ============================================
// Pure functions. No network. The caller
// supplies the chemical list (from DB).
// ============================================

(function (global) {
  'use strict';

  // --------------------------------------------
  // NORMALISATION
  // --------------------------------------------

  var ABBREVIATIONS = {
    'pvc':    'polyvinyl chloride',
    'dehp':   'di(2-ethylhexyl)phthalate',
    'dinp':   'diisononyl phthalate',
    'dbp':    'di-n-butyl phthalate',
    'bbp':    'benzyl butyl phthalate',
    'dep':    'diethyl phthalate',
    'bpa':    'bisphenol a',
    'bps':    'bisphenol s',
    'pfoa':   'perfluorooctanoic acid',
    'pfos':   'perfluorooctane sulfonate',
    'tce':    'trichloroethylene',
    'pce':    'perchloroethylene',
    'perc':   'perchloroethylene',
    'dcm':    'methylene chloride',
    'tbbpa':  'tetrabromobisphenol a',
    'tdcpp':  'tris(1,3-dichloro-2-propyl) phosphate',
    'tcep':   'tris(2-chloroethyl) phosphate',
    'dea':    'diethanolamine',
    'cs2':    'carbon disulfide',
    'tio2':   'titanium dioxide',
    'pb':     'lead',
    'cd':     'cadmium',
    'hg':     'mercury',
    'as':     'arsenic',
    'cr(vi)': 'hexavalent chromium',
    'cr6':    'hexavalent chromium'
  };

  function normalize(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s()\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function expandAbbreviations(text) {
    var normalized = normalize(text);

    return normalized.split(' ').map(function (token) {
      return ABBREVIATIONS[token] || token;
    }).join(' ');
  }

  // --------------------------------------------
  // TRIGRAM SIMILARITY (pg_trgm-compatible)
  // --------------------------------------------

  function trigrams(text) {
    var padded = '  ' + text + ' ';
    var out = new Set();
    for (var i = 0; i < padded.length - 2; i++) {
      out.add(padded.slice(i, i + 3));
    }
    return out;
  }

  function similarity(a, b) {
    a = normalize(a);
    b = normalize(b);

    if (!a || !b) return 0;
    if (a === b) return 1;

    var ta = trigrams(a);
    var tb = trigrams(b);

    var intersection = 0;
    ta.forEach(function (t) {
      if (tb.has(t)) intersection++;
    });

    var union = ta.size + tb.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // --------------------------------------------
  // SINGLE INGREDIENT MATCH
  // --------------------------------------------

  function matchOne(rawText, chemicals) {
    var query = expandAbbreviations(rawText);
    if (!query) return [];

    var results = [];

    chemicals.forEach(function (chem) {
      var chemName = normalize(chem.name);

      // 1. Exact name match
      if (query === chemName) {
        results.push({ chemical: chem, confidence: 1.00, method: 'exact' });
        return;
      }

      // 2. Exact synonym match
      var synonyms = chem.synonyms || [];
      for (var i = 0; i < synonyms.length; i++) {
        if (query === normalize(synonyms[i])) {
          results.push({ chemical: chem, confidence: 0.98, method: 'synonym' });
          return;
        }
      }

      // 3. Substring containment with scaled threshold
      if (query.indexOf(chemName) !== -1 || chemName.indexOf(query) !== -1) {
        var longer = Math.max(query.length, chemName.length);
        var shorter = Math.min(query.length, chemName.length);
        var containment = shorter / longer;

        var hasWordBoundary =
          (' ' + query + ' ').indexOf(' ' + chemName + ' ') !== -1 ||
          (' ' + query + ' ').indexOf(' ' + chemName + 's ') !== -1 ||
          (' ' + query + ' ').indexOf(' ' + chemName + 'es ') !== -1;

        var threshold = chemName.length <= 5 ? 0.30 : 0.50;

        if (containment >= threshold || hasWordBoundary) {
          var base = hasWordBoundary ? 0.80 : 0.70;
          var bonus = containment * 0.20;
          var confidence = Math.min(0.95, base + bonus);

          results.push({
            chemical: chem,
            confidence: Math.round(confidence * 100) / 100,
            method: 'fuzzy'
          });
          return;
        }
      }

      // 4. Fuzzy against name
      var nameSim = similarity(query, chemName);

      // 5. Fuzzy against each synonym — take the best
      var bestSyn = 0;
      for (var j = 0; j < synonyms.length; j++) {
        var s = similarity(query, synonyms[j]);
        if (s > bestSyn) bestSyn = s;
      }

      var best = Math.max(nameSim, bestSyn);

      if (best >= 0.55) {
        results.push({
          chemical: chem,
          confidence: Math.round(best * 100) / 100,
          method: 'fuzzy'
        });
      }
    });

    results.sort(function (a, b) {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.chemical.name.localeCompare(b.chemical.name);
    });

    var seen = new Set();
    return results.filter(function (r) {
      if (seen.has(r.chemical.id)) return false;
      seen.add(r.chemical.id);
      return true;
    });
  }

  // --------------------------------------------
  // MATCH MANY INGREDIENTS
  // --------------------------------------------

  var AUTO_APPLY_THRESHOLD = 0.80;
  var MAX_CANDIDATES = 5;

  function matchMany(ingredients, chemicals) {
    return ingredients.map(function (ing) {
      var matches = matchOne(ing.raw_text, chemicals)
        .slice(0, MAX_CANDIDATES);

      if (ing.material_class) {
        var classMatches = chemicals.filter(function (c) {
          return (c.common_categories || []).some(function (cat) {
            return normalize(cat).indexOf(normalize(ing.material_class)) !== -1;
          });
        });

        classMatches.forEach(function (c) {
          var exists = matches.some(function (m) {
            return m.chemical.id === c.id;
          });
          if (!exists) {
            matches.push({
              chemical: c,
              confidence: 0.60,
              method: 'category'
            });
          }
        });
      }

      var topConfidence = matches.length ? matches[0].confidence : 0;

      return {
        ingredient: ing,
        matches: matches,
        topConfidence: topConfidence,
        needsReview: topConfidence < AUTO_APPLY_THRESHOLD
      };
    });
  }

  // --------------------------------------------
  // PUBLIC API
  // --------------------------------------------

  global.Prop65Matcher = {
    normalize: normalize,
    expandAbbreviations: expandAbbreviations,
    similarity: similarity,
    matchOne: matchOne,
    matchMany: matchMany,
    AUTO_APPLY_THRESHOLD: AUTO_APPLY_THRESHOLD
  };

})(window);