// scripts/import-chemicals.js
// ============================================
// Import OEHHA Prop 65 chemical list into Supabase
// ============================================
// Usage:
//   node scripts/import-chemicals.js
// ============================================

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ============================================
// CSV PARSING
// ============================================

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char === '\r') {
        // skip
      } else {
        field += char;
      }
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ============================================
// NORMALIZATION
// ============================================

function cleanName(raw) {
  if (!raw) return '';
  let name = raw.trim();
  name = name.replace(/\s*\[.*?\]\s*$/g, '');
  name = name.replace(/\s*Delisted\s+.*$/i, '');
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

function isDelisted(raw) {
  if (!raw) return false;
  return /delisted/i.test(raw);
}

function isIndentedSubrow(raw) {
  if (!raw) return false;
  return /^\s{2,}/.test(raw);
}

function normalizeHazard(typeOfToxicity) {
  if (!typeOfToxicity) return 'cancer';
  const t = typeOfToxicity.toLowerCase();
  const hasCancer = t.includes('cancer');
  const hasRepro =
    t.includes('developmental') ||
    t.includes('female') ||
    t.includes('male');
  if (hasCancer && hasRepro) return 'both';
  if (hasCancer) return 'cancer';
  if (hasRepro) return 'reproductive';
  return 'cancer';
}

function cleanCAS(raw) {
  if (!raw) return null;
  const c = raw.trim().replace(/^---$/, '').trim();
  if (!c) return null;
  return c.length <= 50 ? c : null;
}

function parseDateListed(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const match = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const monthNames = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const month = monthNames[match[2]];
  let year = parseInt(match[3], 10);
  if (year < 100) year += year < 50 ? 2000 : 1900;
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function parseNSRLMADL(raw) {
  if (!raw) return { nsrl: null, madl: null };
  const s = raw.trim();
  if (!s) return { nsrl: null, madl: null };
  const numMatch = s.match(/([\d.]+(?:e-?\d+)?)/i);
  if (!numMatch) return { nsrl: null, madl: null };
  const num = parseFloat(numMatch[1]);
  if (isNaN(num)) return { nsrl: null, madl: null };
  return { nsrl: num, madl: null };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('Reading CSV...');

  const csvPath = path.join(__dirname, '..', 'data', 'p65chemicalslist.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found at', csvPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
  const rows = parseCSV(raw);

  let headerIndex = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].trim() === 'Chemical') {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    console.error('Could not find header row');
    process.exit(1);
  }

  const dataRows = rows.slice(headerIndex + 1);
  console.log('Data rows:', dataRows.length);

  const COL_NAME = 0;
  const COL_HAZARD = 1;
  const COL_MECHANISM = 2;
  const COL_CAS = 3;
  const COL_DATE = 4;
  const COL_NSRL = 5;

  // ---- Collect and merge duplicates by name ----
  const byName = new Map();
  let skipped = 0;

  for (const row of dataRows) {
    const rawName = row[COL_NAME] || '';
    if (!rawName.trim()) { skipped++; continue; }
    if (isDelisted(rawName)) { skipped++; continue; }
    if (isIndentedSubrow(rawName)) { skipped++; continue; }

    const name = cleanName(rawName);
    if (!name) { skipped++; continue; }

    const hazard = normalizeHazard(row[COL_HAZARD]);
    const cas = cleanCAS(row[COL_CAS]);
    const mechanism = (row[COL_MECHANISM] || '').trim() || null;
    const listedAt = parseDateListed(row[COL_DATE]);
    const { nsrl, madl } = parseNSRLMADL(row[COL_NSRL]);

    const key = name.toLowerCase();

    if (byName.has(key)) {
      const existing = byName.get(key);

      // Merge hazard
      const hazards = new Set([existing.hazard, hazard]);
      if (hazards.has('both') ||
          (hazards.has('cancer') && hazards.has('reproductive'))) {
        existing.hazard = 'both';
      } else if (hazards.has('cancer')) {
        existing.hazard = 'cancer';
      } else {
        existing.hazard = 'reproductive';
      }

      // Earliest listing date
      if (listedAt && (!existing.oehha_listed_at || listedAt < existing.oehha_listed_at)) {
        existing.oehha_listed_at = listedAt;
      }

      if (!existing.cas_number && cas) existing.cas_number = cas;

      if (mechanism) {
        const mechs = (existing.listing_mechanism || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!mechs.includes(mechanism)) {
          mechs.push(mechanism);
          existing.listing_mechanism = mechs.join(', ');
        }
      }

      if (nsrl !== null) {
        existing.nsrl = existing.nsrl === null ? nsrl : Math.min(existing.nsrl, nsrl);
      }
      if (madl !== null) {
        existing.madl = existing.madl === null ? madl : Math.min(existing.madl, madl);
      }

      existing.has_safe_harbor = existing.nsrl !== null || existing.madl !== null;

    } else {
      byName.set(key, {
        name,
        hazard,
        cas_number: cas,
        listing_mechanism: mechanism,
        oehha_listed_at: listedAt,
        nsrl,
        madl,
        has_safe_harbor: nsrl !== null || madl !== null,
        source_url: 'https://oehha.ca.gov/proposition-65/proposition-65-list',
        source_revision: '2026-07-31',
        last_synced_at: new Date().toISOString()
      });
    }
  }

  const chemicals = Array.from(byName.values());

  console.log('Parsed unique chemicals:', chemicals.length);
  console.log('Skipped:', skipped);

  console.log('\nSample:');
  chemicals.slice(0, 3).forEach(c => {
    console.log(' ', c.name, '|', c.hazard, '|', c.cas_number);
  });

  // ---- Upsert ----
  console.log('\nUpserting to Supabase...');

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  const BATCH_SIZE = 50;

  for (let i = 0; i < chemicals.length; i += BATCH_SIZE) {
    const batch = chemicals.slice(i, i + BATCH_SIZE);

    // Fetch existing by name (case-insensitive) — one query per batch
    const names = batch.map(c => c.name);
    const { data: existing, error: fetchErr } = await supabase
      .from('chemicals')
      .select('id, name')
      .in('name', names);

    if (fetchErr) {
      console.error('Fetch error for batch', i, fetchErr.message);
      failed += batch.length;
      continue;
    }

    const existingByName = new Map(
      (existing || []).map(e => [e.name.toLowerCase(), e])
    );

    const toInsert = [];
    const toUpdate = [];

    for (const chem of batch) {
      if (existingByName.has(chem.name.toLowerCase())) {
        toUpdate.push(chem);
      } else {
        toInsert.push(chem);
      }
    }

    if (toInsert.length) {
      const { error } = await supabase.from('chemicals').insert(toInsert);
      if (error) {
        console.error('Insert error for batch', i, error.message);
        failed += toInsert.length;
      } else {
        inserted += toInsert.length;
      }
    }

    for (const chem of toUpdate) {
      const existingRow = existingByName.get(chem.name.toLowerCase());
      const { error } = await supabase
        .from('chemicals')
        .update(chem)
        .eq('id', existingRow.id);

      if (error) {
        console.error('Update error for', chem.name, error.message);
        failed++;
      } else {
        updated++;
      }
    }

    process.stdout.write('.');
  }

  console.log('\n\n=== Results ===');
  console.log('Inserted:', inserted);
  console.log('Updated:', updated);
  console.log('Failed:', failed);

  const { count } = await supabase
    .from('chemicals')
    .select('id', { count: 'exact', head: true });

  console.log('Total in DB:', count);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});