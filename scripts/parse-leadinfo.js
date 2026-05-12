'use strict';

// ── Leadinfo CSV Parser + PSNM Prospect Scorer ───────────────────────────────
// Reads: ~/Documents/RBTR-Brain/00-Inbox/leadinfo-may12.csv
// Scores each row for PSNM relevance (0-100)
// Inserts to psnm_atlas_prospects via Supabase REST API
//
// Score thresholds:
//   60+ → status='ready_for_enrichment'
//   40-59 → status='nurture_long_tail'
//   <40  → status='noise' (archived, not discarded)
//
// Run: node parse-leadinfo.js
// Run with manual seeds: node parse-leadinfo.js --seeds-only
// Run on file: node parse-leadinfo.js ~/path/to/leadinfo.csv

const path = require('path');
const fs   = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mpxgyobotiqcawmqlhbf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const DEFAULT_CSV  = path.join(process.env.HOME, 'Documents/RBTR-Brain/00-Inbox/leadinfo-may12.csv');

const csvFile = process.argv[2] && process.argv[2] !== '--seeds-only'
  ? process.argv[2]
  : DEFAULT_CSV;

const SEEDS_ONLY = process.argv.includes('--seeds-only');

// ── Relationship exclusion list ───────────────────────────────────────────────
// Companies/people with an existing personal or commercial relationship with Ben.
// These must NEVER enter the cold-outreach pipeline regardless of score.
// Add any future known relationships here. Matching is case-insensitive substring.
//
// Current exclusions (as of 12 May 2026):
//   Select Alloys & Materials = Terry + Tracy (Sam Moore's parents), Ben's landlords at Unit 3C.
//     Any pallet storage conversation goes through Sam, in person — never cold email.
//   Eternal Kustoms / Sam Moore = active business partner.
const EXCLUDED_COMPANIES = [
  'select alloys',
  'terry and tracy',
  'eternal kustoms',
  'sam moore',
  'sons of guns',
  'axel brothers',
  'co-lab custom studios',
  'co-lab studios',
];

function isExcluded(companyName) {
  const lower = (companyName || '').toLowerCase();
  return EXCLUDED_COMPANIES.some(ex => lower.includes(ex));
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[sb] No credentials — row not inserted:', row.company_name);
    return null;
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const err = await r.text();
    console.error(`[sb] Insert error [${table}]: ${err.slice(0, 200)}`);
    return null;
  }
  return r.json();
}

// ── PSNM relevance scorer ─────────────────────────────────────────────────────
// Score bands:
//   60+ = ready_for_enrichment  (active pipeline)
//   40-59 = nurture_long_tail   (low priority)
//   <40  = noise                (archived)

// Approximate postcodes within 100 miles of S66 8HR (Rotherham)
// Covers: South Yorkshire (S), West Yorkshire (LS, BD, WF, HX, HD), East Yorks (HU),
//         Lincolnshire (LN, DN, NG partial), Derbyshire (DE, SK), Nottingham (NG),
//         Cheshire (CH partial), Greater Manchester (M, OL, SK), Lancs (PR, BB, LA)
const NEARBY_POSTCODE_PREFIXES = [
  'S', 'DN', 'WF', 'LS', 'BD', 'HX', 'HD', 'HU', 'YO', 'LN', 'DE', 'NG', 'SK',
  'M', 'OL', 'BB', 'PR', 'LA', 'WA', 'CW', 'ST', 'CV', 'LE', 'PE', 'NE partial',
];

// SIC codes suggesting physical goods / storage need
const GOOD_SIC_PATTERNS = [
  /^1/,   // Food manufacturing
  /^2/,   // Manufacturing (chemicals excluded - see below)
  /^3/,   // Manufacturing continued
  /^41/,  // Wholesale of food
  /^42/,  // Wholesale non-food
  /^43/,  // Wholesale
  /^46/,  // Wholesale trade
  /^47/,  // Retail
  /^49/,  // Land transport
  /^52/,  // Storage/warehousing
  /^56/,  // Food service (ambient sides)
  /^71/,  // Engineering
  /^25/,  // Fabricated metal
  /^22/,  // Rubber/plastics
  /^23/,  // Non-metallic minerals
  /^16/,  // Wood products
  /^17/,  // Paper
  /^18/,  // Printing
  /^31/,  // Furniture
  /^32/,  // Other manufacturing
];

const BAD_SIC_PATTERNS = [
  /^24/,  // Chemical manufacturing (potential hazmat)
  /^20/,  // Chemical products
  /^21/,  // Pharmaceuticals
  /^75/,  // Vet activities
  /^84/,  // Public admin/defence (government)
  /^85/,  // Education
  /^86/,  // Health
  /^87/,  // Residential care
  /^88/,  // Social work
];

// Sectors to penalise
const BAD_SECTOR_KEYWORDS = [
  'council', 'nhs', 'government', 'university', 'college', 'school',
  'hospital', 'clinic', 'surgery', 'dental', 'solicitor', 'accountant',
  'consultant', 'marketing', 'advertising', 'media', 'pr agency',
  'recruitment', 'staffing', 'insurance', 'financial services',
  'estate agent', 'property management',
];

const INTERNATIONAL_COUNTRY_CODES = [
  'US', 'DE', 'FR', 'NL', 'BE', 'CN', 'JP', 'AU', 'IN', 'CA', 'SG',
  'AE', 'SA', 'ZA', 'NG', 'KE', 'BR', 'MX', 'PL', 'ES', 'IT', 'PT',
];

function scoreProspect(row) {
  let score = 0;
  const reasons = [];

  const country  = (row.country || '').trim().toUpperCase();
  const postcode = (row.postcode || row.postal_code || '').trim().toUpperCase();
  const sic      = (row.sic_code || row.sic || '').trim();
  const name     = (row.company_name || row.name || '').trim().toLowerCase();
  const email    = (row.email || row.contact_email || '').trim().toLowerCase();
  const website  = (row.website || row.domain || '').trim().toLowerCase();
  const sector   = (row.sector || row.industry || '').trim().toLowerCase();

  // ── Geography ─────────────────────────────────────────────────────────────
  if (INTERNATIONAL_COUNTRY_CODES.includes(country)) {
    score -= 30;
    reasons.push('-30 international');
  } else if (country === 'GB' || country === 'UK' || !country) {
    score += 30;
    reasons.push('+30 UK');

    // Proximity bonus
    const firstPart = postcode.split(' ')[0];
    const isNearby = NEARBY_POSTCODE_PREFIXES.some(prefix =>
      firstPart.startsWith(prefix)
    );
    if (isNearby) {
      score += 20;
      reasons.push('+20 within 100mi');
    }
  }

  // ── SIC code scoring ──────────────────────────────────────────────────────
  if (sic) {
    if (BAD_SIC_PATTERNS.some(p => p.test(sic))) {
      score -= 20;
      reasons.push('-20 bad SIC');
    } else if (GOOD_SIC_PATTERNS.some(p => p.test(sic))) {
      score += 15;
      reasons.push('+15 good SIC');
    }
  }

  // ── Sector / name keywords ────────────────────────────────────────────────
  const nameAndSector = name + ' ' + sector;
  if (BAD_SECTOR_KEYWORDS.some(kw => nameAndSector.includes(kw))) {
    const which = BAD_SECTOR_KEYWORDS.find(kw => nameAndSector.includes(kw));
    if (['council', 'nhs', 'government'].includes(which)) {
      score -= 20;
      reasons.push('-20 govt/NHS');
    } else if (['university', 'college', 'school'].includes(which)) {
      score -= 15;
      reasons.push('-15 education');
    } else {
      score -= 15;
      reasons.push('-15 pure services');
    }
  }

  // Physical product keywords boost
  const physicalKeywords = [
    'manufacture', 'manufacturing', 'distribution', 'wholesale', 'import',
    'export', 'food', 'drink', 'beverage', 'packaging', 'timber', 'steel',
    'metal', 'fabricat', 'plastic', 'rubber', 'print', 'furniture', 'retail',
    'building', 'construction', 'materials', 'agricultural', 'pharma', 'medical',
    'consumer goods', 'fmcg', 'electrical', 'electronic', 'automotive',
    'logistics', 'haulage', 'storage', 'fulfilment',
  ];
  if (physicalKeywords.some(kw => nameAndSector.includes(kw))) {
    score += 10;
    reasons.push('+10 physical goods');
  }

  // ── Company size proxy ────────────────────────────────────────────────────
  const employees = parseInt(row.employees || row.employee_count || '0', 10);
  if (employees >= 50 && employees <= 500) {
    score += 10;
    reasons.push('+10 mid-size');
  } else if (employees > 500) {
    score += 5;
    reasons.push('+5 large (check)');
  }

  // ── Contact email quality ─────────────────────────────────────────────────
  if (email && !/^info@|^contact@|^hello@|^enquiries@|^admin@/.test(email) && email.includes('@')) {
    score += 10;
    reasons.push('+10 direct contact email');
  }

  // No website = questionable lead
  if (!website) {
    score -= 10;
    reasons.push('-10 no website');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function statusFromScore(score) {
  if (score >= 60) return 'ready_for_enrichment';
  if (score >= 40) return 'nurture_long_tail';
  return 'noise';
}

// ── CSV parser (simple — handles quoted fields) ───────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/\s+/g, '_'));

  return lines.slice(1).map(line => {
    const values = [];
    let cur = '';
    let inQ  = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  }).filter(row => Object.values(row).some(v => v));
}

// ── Manual seeds (chat-known data, 12 May 2026) ───────────────────────────────
const MANUAL_SEEDS = [
  // Select Alloys removed — Terry + Tracy are Ben's landlords and Sam Moore's parents.
  // Existing commercial + family relationship. Never cold outreach. Goes through Sam in person.
  {
    company_name: 'Renew A Fuel Home Innovations',
    postcode: 'S80',
    country: 'GB',
    sector: 'energy fuel home products',
    score: 75,
    notes: 'Worksop S80 — 13 miles. Fuel/energy products likely ambient. Close proximity.',
    rbtr_overlap: false,
  },
  {
    company_name: 'Mace Industries',
    postcode: 'NN17',
    country: 'GB',
    sector: 'manufacturing industrial',
    score: 65,
    notes: 'Corby NN17 — approx 70 miles. Manufacturing — likely has storage need.',
    rbtr_overlap: false,
  },
  {
    company_name: 'Cartwright & Butler / Moordale Foods',
    postcode: 'HU15',
    country: 'GB',
    sector: 'premium food manufacturer retail',
    score: 70,
    notes: 'Brough HU15 — 45 miles. Premium ambient food. Seasonal peaks. Good fit.',
    rbtr_overlap: false,
  },
  {
    company_name: 'Boparan / 2 Sisters Food Group',
    postcode: 'WF2',
    country: 'GB',
    sector: 'food manufacturing group',
    score: 65,
    notes: 'Wakefield WF2 — 16 miles. Large food group — likely has frozen ops but ambient sides exist. Approach carefully.',
    rbtr_overlap: false,
  },
  {
    company_name: 'Yeo Valley Organic',
    postcode: 'BS40',
    country: 'GB',
    sector: 'dairy food organic',
    score: 55,
    notes: 'Somerset BS40 — 160+ miles. Dairy = chilled risk. Big scale but wrong direction. Nurture only.',
    rbtr_overlap: false,
  },
  {
    company_name: 'Wild Nutrition',
    postcode: 'BN7',
    country: 'GB',
    sector: 'nutrition supplements health',
    score: 50,
    notes: 'Lewes BN7 — far. RBTR sponsor target — DO NOT double-target. Note flag set.',
    rbtr_overlap: true,
  },
  {
    company_name: 'Goodman Bros',
    postcode: 'PE34',
    country: 'GB',
    sector: 'nondurable goods wholesale',
    score: 60,
    notes: "King's Lynn PE34 — 90 miles. Nondurable goods wholesale. Borderline distance.",
    rbtr_overlap: false,
  },
  {
    company_name: 'Think Timber',
    postcode: 'ST5',
    country: 'GB',
    sector: 'timber construction materials',
    score: 65,
    notes: 'Newcastle-under-Lyme ST5 — 65 miles. Construction materials. Dry secure storage need.',
    rbtr_overlap: false,
  },
  {
    company_name: 'Evolution Fasteners',
    postcode: 'G73',
    country: 'GB',
    sector: 'fasteners industrial fixings',
    score: 35,
    notes: 'Glasgow G73 — too far (180+ miles). Noise tier.',
    rbtr_overlap: false,
  },
];

// ── Build Supabase row from seed or CSV row ───────────────────────────────────
function buildRow(data, scoreOverride = null, isSeed = false, extraNotes = '') {
  const scoreData = scoreOverride !== null
    ? { score: scoreOverride, reasons: ['manual_seed'] }
    : scoreProspect(data);

  const score  = scoreData.score;
  const status = statusFromScore(score);

  return {
    company_name:   (data.company_name || data.name || '').slice(0, 300),
    postcode:       (data.postcode || data.postal_code || '').slice(0, 20),
    country:        (data.country || 'GB').slice(0, 5),
    sector:         (data.sector || data.industry || '').slice(0, 200),
    contact_name:   (data.contact_name || data.first_name ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : '').slice(0, 200) || null,
    contact_email:  (data.email || data.contact_email || '').slice(0, 300) || null,
    website:        (data.website || data.domain || '').slice(0, 300) || null,
    phone:          (data.phone || data.telephone || '').slice(0, 50) || null,
    employees:      parseInt(data.employees || data.employee_count || '0', 10) || null,
    sic_code:       (data.sic_code || data.sic || '').slice(0, 20) || null,
    linkedin_url:   (data.linkedin || data.linkedin_url || '').slice(0, 500) || null,
    psnm_score:     score,
    status,
    source:         isSeed ? 'leadinfo_may12_manual_seed' : 'leadinfo_may12_csv',
    notes:          [extraNotes, scoreData.reasons.join(', ')].filter(Boolean).join(' | ').slice(0, 1000) || null,
    rbtr_overlap:   Boolean(data.rbtr_overlap),
    raw_data:       isSeed ? null : data,
    added_at:       new Date().toISOString(),
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== PSNM Leadinfo Parser + Scorer ===');
  console.log(`Date: ${new Date().toISOString()}`);

  let totalInserted = 0;
  let readyCount = 0;
  let nurtureCount = 0;
  let noiseCount = 0;

  // ── Phase 1: Manual seeds ─────────────────────────────────────────────────
  console.log('\n── Phase 1: Inserting manual seeds ──');

  for (const seed of MANUAL_SEEDS) {
    if (isExcluded(seed.company_name)) {
      console.log(`  ⛔ SKIP ${seed.company_name} — existing relationship (exclusion list)`);
      continue;
    }
    const row = buildRow(seed, seed.score, true, seed.notes || '');
    const result = await sbInsert('psnm_atlas_prospects', row);

    const inserted = Array.isArray(result) ? result[0] : result;
    if (inserted) {
      console.log(`  ✓ ${seed.company_name} — score ${seed.score} → ${row.status}${seed.rbtr_overlap ? ' [RBTR OVERLAP]' : ''}`);
      totalInserted++;
      if (row.status === 'ready_for_enrichment') readyCount++;
      else if (row.status === 'nurture_long_tail') nurtureCount++;
      else noiseCount++;
    } else {
      console.log(`  ✗ ${seed.company_name} — insert failed (may already exist)`);
    }
  }

  // ── Phase 2: CSV parse ────────────────────────────────────────────────────
  if (!SEEDS_ONLY) {
    console.log(`\n── Phase 2: Parsing CSV from ${csvFile} ──`);

    if (!fs.existsSync(csvFile)) {
      console.log(`\n⚠  CSV not found at: ${csvFile}`);
      console.log('   Ben: drop the Leadinfo export there and re-run: node parse-leadinfo.js');
      console.log('   Or export as TSV and rename to leadinfo-may12.csv');
      console.log('\n   Manual seeds have been inserted above. CSV parse skipped.');
    } else {
      const raw = fs.readFileSync(csvFile, 'utf8');
      const rows = parseCSV(raw);
      console.log(`   Found ${rows.length} rows in CSV`);

      for (const csvRow of rows) {
        const company = csvRow.company_name || csvRow.name || '(unnamed)';
        if (isExcluded(company)) {
          console.log(`  ⛔ SKIP ${company} — existing relationship (exclusion list)`);
          continue;
        }
        const row = buildRow(csvRow, null, false, '');
        const result = await sbInsert('psnm_atlas_prospects', row);
        const inserted = Array.isArray(result) ? result[0] : result;
        const psnmScore = row.psnm_score;

        if (inserted) {
          totalInserted++;
          if (row.status === 'ready_for_enrichment') readyCount++;
          else if (row.status === 'nurture_long_tail') nurtureCount++;
          else noiseCount++;
          console.log(`  ${psnmScore >= 60 ? '✓' : psnmScore >= 40 ? '~' : '×'} ${company} — ${psnmScore} → ${row.status}`);
        } else {
          console.log(`  ✗ ${company} — skipped (duplicate or insert error)`);
        }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`  ready_for_enrichment (60+):  ${readyCount}`);
  console.log(`  nurture_long_tail (40-59):   ${nurtureCount}`);
  console.log(`  noise (<40):                 ${noiseCount}`);
  console.log('Run complete.');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
