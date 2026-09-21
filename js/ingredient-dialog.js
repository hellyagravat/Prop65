// ============================================
// PROP65 SHIELD — INGREDIENT DIALOG
// ============================================
// Single-step flow:
//   1. User declares ingredients (free text + materials)
//   2. Click Analyse → we match, generate, and save
//   3. Dialog closes; card refreshes with the warning
//
// The user declares ingredients. We do the rest.
// ============================================

(function (global) {
  'use strict';

  var DB = null; // set on init

  var state = {
    userProductId: null,
    productName: '',
    busy: false
  };

  // --------------------------------------------
  // DOM HELPERS
  // --------------------------------------------

  function el(id) { return document.getElementById(id); }

  function setError(msg) {
    var node = el('ingredient-error');
    if (node) node.textContent = msg || '';
  }

  function setBusy(busy, label) {
    state.busy = busy;
    var btn = el('ingredient-analyse');
    if (!btn) return;

    btn.disabled = busy;
    btn.textContent = busy ? (label || 'Working…') : 'Analyse →';
  }

  // --------------------------------------------
  // OPEN / CLOSE
  // --------------------------------------------

  function open(userProductId, productName) {
    state.userProductId = userProductId;
    state.productName = productName || '';

    var nameNode = el('ingredient-product-name');
    if (nameNode) nameNode.textContent = state.productName;

    var textarea = el('ingredient-free-text');
    if (textarea) textarea.value = '';

    var notes = el('ingredient-notes');
    if (notes) notes.value = '';

    document.querySelectorAll('.material-check input').forEach(function (cb) {
      cb.checked = false;
    });

    setError('');
    setBusy(false);

    var dlg = el('ingredient-dialog');
    if (!dlg) {
      console.error('[dialog] #ingredient-dialog not found');
      return;
    }

    dlg.showModal();
    if (textarea) textarea.focus();
  }

  function close() {
    var dlg = el('ingredient-dialog');
    if (dlg && dlg.open) dlg.close();

    state.userProductId = null;
    state.busy = false;
  }

  // --------------------------------------------
  // READ INPUT
  // --------------------------------------------

  function readIngredientInput() {
    var list = [];

    var textarea = el('ingredient-free-text');
    var raw = textarea ? (textarea.value || '') : '';

    raw.split(/[,;\n]/).forEach(function (piece) {
      var t = piece.trim();
      if (t) list.push({ raw_text: t });
    });

    var notes = el('ingredient-notes');
    var noteText = notes ? (notes.value || '').trim() : '';
    if (noteText) list.push({ raw_text: noteText });

    document.querySelectorAll('.material-check input:checked').forEach(function (cb) {
      list.push({ raw_text: cb.value, material_class: cb.value });
    });

    return list;
  }

  // --------------------------------------------
  // ANALYSE → SAVE (single step, no user review)
  // --------------------------------------------

  async function analyse() {
    if (state.busy) return;

    setError('');

    if (!DB) {
      setError('Internal error: DB not ready.');
      console.error('[dialog] DB not initialised');
      return;
    }

    if (!state.userProductId) {
      setError('No product selected.');
      return;
    }

    var ingredients = readIngredientInput();

    if (!ingredients.length) {
      setError('Add at least one ingredient or select a material.');
      return;
    }

    setBusy(true, 'Analysing…');

    try {
      // --------------------------------------------
      // 1. Load chemicals
      // --------------------------------------------
      var chemicals = await DB.listChemicals();
      console.log('[dialog] loaded', chemicals.length, 'chemicals');

      // --------------------------------------------
      // 2. Match ingredients against chemicals
      // --------------------------------------------
      var matches = window.Prop65Matcher.matchMany(ingredients, chemicals);

      // --------------------------------------------
      // 3. Build the confirmed set — everything at
      //    or above the auto-apply threshold goes in.
      //    No user confirmation. The matcher decides.
      // --------------------------------------------
      var AUTO = window.Prop65Matcher.AUTO_APPLY_THRESHOLD;

      var confirmed = [];
      var seen = {};
      matches.forEach(function (m) {
        m.matches.forEach(function (c) {
          if (c.confidence >= AUTO && !seen[c.chemical.id]) {
            seen[c.chemical.id] = true;
            confirmed.push(c.chemical);
          }
        });
      });

      console.log('[dialog] confirmed chemicals:',
        confirmed.map(function (c) { return c.name; }));

      // --------------------------------------------
      // 4. Persist ingredients (always — even if no
      //    chemicals matched, so the user's declaration
      //    is recorded and can be re-analysed later)
      // --------------------------------------------
      await DB.replaceIngredients(
        state.userProductId,
        matches.map(function (m) {
          var top = m.matches[0];
          return {
            raw_text: m.ingredient.raw_text,
            material_class: m.ingredient.material_class || null,
            match_method: top ? top.method : null,
            match_confidence: top ? top.confidence : null,
            matched_chemical_ids: m.matches
              .filter(function (c) { return c.confidence >= AUTO; })
              .map(function (c) { return c.chemical.id; })
          };
        })
      );

      // --------------------------------------------
      // 5. Save the warning, or clear it if nothing matched
      // --------------------------------------------
      if (confirmed.length) {
        await DB.upsertWarningForProduct(
          state.userProductId,
          confirmed,
          { source: 'auto', reviewedByUser: true }
        );
      } else {
        // The user provided ingredients, but none matched.
        // Clear any stale warning so the card reflects reality.
        await DB.deleteWarningForProduct(state.userProductId);
      }

      // --------------------------------------------
      // 6. Close and refresh
      // --------------------------------------------
      var matchedCount = confirmed.length;
      close();

      if (typeof global.onIngredientsSaved === 'function') {
        global.onIngredientsSaved({
          userProductId: state.userProductId,
          matched: matchedCount,
          total: ingredients.length
        });
      }

    } catch (e) {
      console.error('[dialog] failed:', e);
      setError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------
  // INIT
  // --------------------------------------------

  function init(db) {
    DB = db;

    var analyseBtn = el('ingredient-analyse');
    if (analyseBtn) analyseBtn.addEventListener('click', analyse);

    var cancelBtn = el('ingredient-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    // Esc key closes the dialog
    var dlg = el('ingredient-dialog');
    if (dlg) {
      dlg.addEventListener('cancel', function (e) {
        e.preventDefault();
        if (!state.busy) close();
      });
    }
  }

  // --------------------------------------------
  // PUBLIC
  // --------------------------------------------

  global.Prop65Dialogs = {
    init: init,
    open: open,
    close: close
  };

})(window);