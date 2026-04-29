// ── PSNM Prospect Intelligence Engine — core logic ───────────────────────────
// NOT a Vercel function (underscore-prefixed). Required by intelligence.js.
// Data flow: Harvest (CH API) → Score → Enrich (Claude) → Dispatch (Atlas)

const fs   = require('fs');
const path = require('path');
const { validateDraft } = require('./_draft_validator');
const { buildFactBlock, verifyDraft } = require('./_claim_verifier');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE;
const CH_API_KEY    = process.env.COMPANIES_HOUSE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TABLE         = 'psnm_intelligence_prospects';

// ── SIC TIERS — high-confidence (A) vs possible (B) stockholding businesses ──
// Tier A: wholesale/distribution + core manufacturing with definite physical storage
// Tier B: retail/e-commerce + lighter manufacturing — need size/age qualifier

const SIC_TIER_A = new Set([
  // Paper & packaging manufacture (definite stock)
  17110,17120,17211,17219,17220,17230,17240,17290,
  // Rubber & plastics (manufacturing intermediates)
  22110,22190,22210,22220,22230,22290,
  // Non-metallic minerals — glass, ceramics, packaging (ambient)
  23110,23120,23130,23140,23190,23200,23310,23320,23410,23420,23430,23440,23490,
  23510,23520,23610,23620,23630,23640,23650,23690,23700,23910,23990,
  // Basic metals
  24100,24200,24310,24320,24330,24340,
  // Fabricated metal products — hardware, structural, containers
  25110,25120,25210,25290,25300,25400,25500,25610,25620,25710,25720,25730,
  25910,25921,25929,25930,25940,25990,
  // Electronics manufacturing
  26110,26120,26200,26301,26309,26400,26511,26512,26513,26514,26520,26600,26701,26702,26800,
  // Electrical equipment manufacturing
  27110,27120,27200,27310,27320,27330,27400,27510,27520,27900,
  // Machinery & equipment manufacturing
  28110,28120,28131,28132,28140,28150,28210,28220,28230,28240,28250,28291,28292,28293,28294,
  28301,28302,28410,28490,28910,28921,28922,28923,28930,28940,28950,28960,28990,
  // Wholesale / distribution (all — unambiguous stock-holding)
  46110,46120,46130,46140,46150,46160,46170,46180,46190,
  46210,46220,46230,46240,46310,46320,46330,46341,46342,46350,46360,46370,46380,46390,
  46410,46420,46431,46439,46441,46442,46450,46460,46470,46480,46491,46499,
  46510,46520,46610,46620,46630,46640,46650,46660,46690,
  46711,46719,46720,46730,46740,46750,46760,46770,46900,
]);

const SIC_TIER_B = new Set([
  // Food processing — ambient only (oils, milling, sugar, cereals, cocoa)
  10410,10440,10610,10710,10720,10810,10820,10860,11030,11040,
  // Textiles & apparel
  13100,13200,13300,14110,14120,14130,14310,14390,15110,15120,15200,
  // Wood products
  16101,16102,16210,16220,16240,16290,
  // Printing & publishing
  18110,18120,18130,18140,18200,
  // Motor vehicles, parts & accessories
  29100,29201,29202,29203,29310,29320,
  // Other transport equipment — bicycles, motorcycles, recreational
  30110,30120,30200,30300,30400,30910,30920,30990,
  // Furniture manufacture
  31010,31020,31030,31090,
  // Other manufacturing — jewellery, sports, medical devices, toys
  32110,32120,32130,32200,32300,32401,32409,32500,32910,32990,
  // Repair & installation of equipment
  33110,33120,33130,33140,33150,33160,33170,33190,33200,
  // E-commerce / retail with stockholding
  47190,47210,47220,47230,47240,47250,47260,47290,
  47410,47421,47429,47430,47510,47520,47530,47540,
  47591,47599,47610,47621,47622,47630,47640,47650,
  47710,47721,47722,47730,47741,47749,47750,47761,47762,47770,
  47781,47782,47789,47791,47799,47810,47820,47890,47910,47990,
]);

// ── SIC BLOCKLIST — hard exclusions ──────────────────────────────────────────
const SIC_BLOCKLIST = new Set([
  // Food / restaurants / catering
  10110,10130,10200,10310,10320,10510,10520,56101,56102,56103,56210,56290,56301,56302,
  // Pharma
  21100,21200,
  // Hazmat / chemicals
  19100,19201,19209,20110,20120,20130,20140,20150,20160,20170,
  // Healthcare
  86101,86102,86210,86220,86230,86900,87100,87200,87300,87900,88100,88910,88990,
  // Financial
  64110,64191,64192,64201,64202,64203,64204,64205,64209,64301,64302,64303,64304,64305,64306,
  64910,64921,64922,64929,64991,64992,64999,
  65110,65120,65201,65202,65300,
  66110,66120,66190,66210,66220,66290,66300,
]);

// ── Logistics SIC codes — for insolvency filter (3PL/warehouse companies failing) ─
const LOGISTICS_SIC_CODES = new Set([
  52100,52101,52102,52103,52211,52219,52220,52230,52240,52290,
  52410,52411,52412,52419,52490,52610,52690,53100,53200,
  49410,49420,49390, // Road freight / haulage
]);

// Company name keywords that indicate hazmat/pharma/chilled even if SIC slips through
const NAME_BLOCKLIST = [
  /\bpharma\b/i,/\bpharmaceutical/i,/\bdrug\b/i,/\bmedical\b/i,/\bhealthcare\b/i,
  /\bchemical\b/i,/\bhazardous\b/i,/\bexplosive/i,/\bpesticide/i,/\bfertiliser/i,
  /\bfrozen\b/i,/\bchilled\b/i,/\brefrigerat/i,/\bice cream/i,/\bdairy\b/i,
  /\bfish(ing)?\b/i,/\bmeat\b/i,/\bpoultry\b/i,/\bbakery\b/i,/\bfood service/i,
];

// Inner London postcodes (de-prioritise but don't exclude — handled in scoring)
const INNER_LONDON_PREFIXES = ['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','E14',
  'EC','WC','W1','W2','SW1','SW2','SW3','NW1'];

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}
async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
  if (!r.ok) return null;
  return r.json();
}
async function sbInsert(table, rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers: sbHeaders(),
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!r.ok) { const t = await r.text(); return { error: t }; }
  return r.json();
}
async function sbUpsert(table, rows, onConflict = 'company_number') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!r.ok) { const t = await r.text(); return { error: t }; }
  return r.json();
}
async function sbUpdate(table, match, patch) {
  const q = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method: 'PATCH', headers: sbHeaders(), body: JSON.stringify(patch),
  });
  if (!r.ok) { const t = await r.text(); return { error: t }; }
  return r.json();
}

// ── Companies House API helpers ──────────────────────────────────────────────
// Rate limit: 600 req / 5 min = 2 req/s. We throttle to 1.5/s for safety.
const CH_BASE = 'https://api.company-information.service.gov.uk';
let _chLastCall = 0;

async function chFetch(path, retries = 3) {
  if (!CH_API_KEY) throw new Error('COMPANIES_HOUSE_API_KEY not set');
  const now = Date.now();
  const gap = 700; // ~1.4 req/s
  if (now - _chLastCall < gap) await sleep(gap - (now - _chLastCall));
  _chLastCall = Date.now();

  const auth = Buffer.from(`${CH_API_KEY}:`).toString('base64');
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(`${CH_BASE}${path}`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      if (r.status === 429) {
        await sleep(5000 * (attempt + 1)); // backoff: 5s, 10s, 15s
        continue;
      }
      if (!r.ok) return null;
      return r.json();
    } catch (e) {
      if (attempt === retries - 1) return null;
      await sleep(2000 * (attempt + 1));
    }
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Phase 2: Source helpers ───────────────────────────────────────────────────
// trigger_signals for CH prospects: JSON array ["incorporated_under_90d", ...]
// trigger_signals for Phase 2 prospects: JSON object { _source, _meta..., triggers: [...] }

function getProspectSource(p) {
  const ts = p.trigger_signals;
  if (!ts) return 'companies_house';
  try {
    const parsed = typeof ts === 'string' ? JSON.parse(ts) : ts;
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
      return parsed._source || 'companies_house';
    }
  } catch {}
  return 'companies_house';
}

function getSourceMeta(p) {
  const ts = p.trigger_signals;
  if (!ts) return {};
  try {
    const parsed = typeof ts === 'string' ? JSON.parse(ts) : ts;
    if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') return parsed;
  } catch {}
  return {};
}

function getUrgencyWindowEnds(p) {
  return getSourceMeta(p)._urgency_window_ends || null;
}

function getSafeTriggers(p) {
  const ts = p.trigger_signals;
  if (!ts) return [];
  try {
    const parsed = typeof ts === 'string' ? JSON.parse(ts) : ts;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return parsed.triggers || [];
  } catch {}
  return [];
}

function buildInsolvencyTriggers(meta) {
  const d = new Date(meta.notice_date);
  d.setDate(d.getDate() + 21);
  const urgencyWindowEnds = d.toISOString().slice(0, 10);
  return JSON.stringify({
    _source: 'gazette_insolvency',
    _failed_company: meta.failed_company_name,
    _failed_company_number: meta.failed_company_number || null,
    _insolvency_type: meta.insolvency_type,
    _notice_date: meta.notice_date,
    _urgency_window_ends: urgencyWindowEnds,
    _gazette_url: meta.gazette_url || null,
    triggers: ['insolvency_rescue', 'high_urgency'],
  });
}

function buildDefenceTriggers(meta) {
  return JSON.stringify({
    _source: 'defence_supplier',
    _scheme: meta.scheme || 'defence_supplier_overflow',
    _source_directory: meta.source_directory || 'web_search',
    triggers: ['defence_supply_chain', 'reliability_premium'],
  });
}

// ── SIC code classification ──────────────────────────────────────────────────
function classifySics(sicCodes) {
  const codes = (sicCodes || []).map(s => parseInt(s.toString().replace(/\D/g, '')));
  const blocked = codes.some(c => SIC_BLOCKLIST.has(c));
  const tierA   = !blocked && codes.some(c => SIC_TIER_A.has(c));
  const tierB   = !blocked && !tierA && codes.some(c => SIC_TIER_B.has(c));
  const allowed  = tierA || tierB;
  return { blocked, tierA, tierB, allowed, unclassified: !blocked && !allowed };
}

// ── Address analysis ─────────────────────────────────────────────────────────
function isResidentialAddress(addr) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  // Strong residential signals
  const resPatterns = [
    /\bflat\s+\d/i, /\bapartment\s+\d/i, /\bunit\s+\d+[a-z]?\b(?!.*(?:industrial|estate|park|warehouse))/i,
    /\b\d+[a-z]?\s+\w+\s+(?:road|street|avenue|lane|drive|close|crescent|way|grove|place|gardens)\b/i,
    /c\/o\s+\w/i, // care of — accountant/agent
    /registered agents/i, /formation company/i,
  ];
  const comPatterns = [
    /industrial\s+estate/i, /business\s+park/i, /trading\s+estate/i,
    /unit\s+\d+.*(?:industrial|estate|park)/i, /warehouse/i, /distribution/i,
  ];
  const hasCom = comPatterns.some(p => p.test(a));
  const hasRes = resPatterns.some(p => p.test(a));
  if (hasCom) return false;
  if (hasRes) return true;
  return false;
}

function isInnerLondon(postcode) {
  if (!postcode) return false;
  const pc = postcode.toUpperCase().replace(/\s/g, '');
  return INNER_LONDON_PREFIXES.some(p => pc.startsWith(p));
}

// Block postcodes where delivery economics make Hellaby uncompetitive or non-viable
function isLogisticallyViable(postcode) {
  if (!postcode) return true; // unknown — let through, don't over-block
  const pc = postcode.toUpperCase().replace(/\s/g, '');
  const BLOCKED_PREFIXES = [
    'BT',                           // Northern Ireland (separate logistics network)
    'JE','GY','IM',                 // Channel Islands / Isle of Man
    'AB','IV','KW','PH','FK',       // Far-north Scotland (uneconomical delivery time)
    'ZE','HS','KA',                 // Shetland, Western Isles, Ayrshire islands
  ];
  return !BLOCKED_PREFIXES.some(p => pc.startsWith(p));
}

function assignRegion(postcode) {
  if (!postcode) return 'Unknown';
  const pc = postcode.toUpperCase().replace(/\s/g, '');
  // Extract 1-2 letter area code. Greedy {1,2} tries 2-letter first (e.g. BN, NP, SA)
  // before falling back to 1-letter (S, B, N) — fixes alternation-order bugs.
  const area = pc.match(/^([A-Z]{1,2})/)?.[1];
  if (!area) return 'Unknown';
  const AREA_MAP = {
    // Scotland
    AB:'Scotland', DD:'Scotland', DG:'Scotland', EH:'Scotland', FK:'Scotland',
    G: 'Scotland', HS:'Scotland', IV:'Scotland', KA:'Scotland', KW:'Scotland',
    KY:'Scotland', ML:'Scotland', PA:'Scotland', PH:'Scotland', TD:'Scotland', ZE:'Scotland',
    // Northern Ireland
    BT:'Northern Ireland',
    // North East
    DH:'North East', DL:'North East', NE:'North East', SR:'North East', TS:'North East',
    // North West
    BB:'North West', BL:'North West', CA:'North West', CH:'North West', CW:'North West',
    FY:'North West', L: 'North West', LA:'North West', M: 'North West', OL:'North West',
    PR:'North West', SK:'North West', WA:'North West', WN:'North West',
    // Yorkshire
    BD:'Yorkshire', DN:'Yorkshire', HD:'Yorkshire', HG:'Yorkshire', HU:'Yorkshire',
    HX:'Yorkshire', LS:'Yorkshire', S: 'Yorkshire', WF:'Yorkshire', YO:'Yorkshire',
    // East Midlands
    DE:'East Midlands', LE:'East Midlands', LN:'East Midlands', NG:'East Midlands',
    NN:'East Midlands', PE:'East Midlands',
    // West Midlands
    B: 'West Midlands', CV:'West Midlands', DY:'West Midlands', HR:'West Midlands',
    ST:'West Midlands', TF:'West Midlands', WR:'West Midlands', WS:'West Midlands', WV:'West Midlands',
    // East of England
    AL:'East', CB:'East', CM:'East', CO:'East', IP:'East', NR:'East', SG:'East', SS:'East',
    // London
    BR:'London', CR:'London', DA:'London', E: 'London', EC:'London', EN:'London',
    HA:'London', IG:'London', KT:'London', N: 'London', NW:'London', RM:'London',
    SE:'London', SM:'London', SW:'London', TW:'London', UB:'London', W: 'London',
    WC:'London', WD:'London',
    // South East
    BN:'South East', CT:'South East', GU:'South East', ME:'South East', MK:'South East',
    OX:'South East', PO:'South East', RG:'South East', RH:'South East', SL:'South East',
    SO:'South East', TN:'South East',
    // South West
    BA:'South West', BH:'South West', BS:'South West', DT:'South West', EX:'South West',
    GL:'South West', PL:'South West', SN:'South West', SP:'South West', TA:'South West',
    TQ:'South West', TR:'South West',
    // Wales
    CF:'Wales', LD:'Wales', LL:'Wales', NP:'Wales', SA:'Wales', SY:'Wales',
  };
  return AREA_MAP[area] || (area.length === 2 ? AREA_MAP[area[0]] : null) || 'Other';
}

// ── Scoring logic ─────────────────────────────────────────────────────────────
// Hard block order: name → SIC blocked → residential → non-viable region
// Grade A: Tier A SIC + age ≤ 365 + non-residential + logViable
// Grade B: (Tier A + age 366-730) OR (Tier B + age ≤ 365 + non-residential + logViable)
// Grade C: inner London OR Tier B + age 366-730 — human review, never auto-dispatched
function scoreProspect({ companyAge, isResidential, isLogViable, sicClassification, isInLondon, triggers, companyName }) {
  if (NAME_BLOCKLIST.some(p => p.test(companyName || ''))) {
    return { grade: null, reasoning: 'Blocked by company name pattern (hazmat/pharma/chilled)', hook: null };
  }
  if (sicClassification.blocked) {
    return { grade: null, reasoning: 'Blocked SIC code', hook: null };
  }
  if (sicClassification.unclassified) {
    return { grade: null, reasoning: 'Unclassified SIC code — default block', hook: null };
  }
  // Residential = hard block (no warehouse = nothing to store)
  if (isResidential) {
    return { grade: null, reasoning: 'Residential address — sole trader / pre-commercial stage', hook: null };
  }
  // Non-viable region
  if (!isLogViable) {
    return { grade: null, reasoning: 'Non-viable postcode region (NI / islands / far-north Scotland)', hook: null };
  }

  // Grade A: Tier A SIC + age ≤ 365 + non-London
  if (sicClassification.tierA && companyAge <= 365 && !isInLondon) {
    const ageLabel = companyAge <= 90 ? `${companyAge} days` : `${Math.round(companyAge / 30)} months`;
    return {
      grade: 'A',
      reasoning: `Incorporated ${ageLabel} ago. Tier A SIC (wholesale/manufacturing) — high-confidence stock-holding business. Not yet in a dedicated warehouse.`,
      hook: companyAge <= 90
        ? `You incorporated ${companyAge} days ago. Most physical-product businesses find they need proper warehousing within 3 months. Hellaby is the geographic centre of GB — get a quote before you commit elsewhere.`
        : `${Math.round(companyAge / 30)} months in — your logistics setup is being decided now, not later. Hellaby (S66): Glasgow 4hr, London 3hr, Liverpool port 2hr from one address. Worth a 15-min chat?`,
    };
  }

  // Grade B case 1: Tier A SIC + age 366-730 days
  if (sicClassification.tierA && companyAge > 365 && companyAge <= 730 && !isInLondon) {
    return {
      grade: 'B',
      reasoning: `Incorporated ${Math.round(companyAge / 30)} months ago. Wholesale/manufacturing — likely reviewing warehousing as business matures.`,
      hook: `Coming up on your second year — if your warehousing arrangements aren't sorted, now's the time. Our central GB location (Hellaby, S66) gives you Glasgow 4hr, London 3hr, Felixstowe 3hr from one address.`,
    };
  }

  // Grade B case 2: Tier B SIC + age ≤ 365 + non-residential + logViable
  if (sicClassification.tierB && companyAge <= 365 && !isInLondon) {
    return {
      grade: 'B',
      reasoning: `Incorporated ${Math.round(companyAge / 30)} months ago. Tier B SIC (retail/apparel/furniture) — possible stock-holding business at growth stage.`,
      hook: `${companyAge <= 180 ? 'Just over 6 months in' : 'Coming up on your first year'} — your logistics setup is being decided now, not later. Our central GB location (Hellaby, S66) gives you Glasgow 4hr, London 3hr, Liverpool port 2hr from one address. Worth a 15-min chat?`,
    };
  }

  // Grade C: inner London (any qualifying SIC, any age ≤ 730) — not dispatched, for review
  if (isInLondon && companyAge <= 730 && sicClassification.allowed) {
    return {
      grade: 'C',
      reasoning: `London-registered, ${Math.round(companyAge / 30)} months old. Local options exist but are expensive — central GB argument valid for national distribution.`,
      hook: `London storage is expensive and slow for national dispatch. From Hellaby: Glasgow 4hrs, Cardiff 3.5hrs, all ports under 3hrs. If you're shipping nationally, worth a conversation.`,
    };
  }

  // Grade C: Tier B + age 366-730 — borderline, human review
  if (sicClassification.tierB && companyAge > 365 && companyAge <= 730 && !isInLondon) {
    return {
      grade: 'C',
      reasoning: `Tier B SIC, ${Math.round(companyAge / 30)} months old. Borderline — may be reviewing warehousing but lower confidence than Tier A.`,
      hook: `If you're reviewing warehousing for the year ahead — Hellaby gives you competitive central UK pricing with strong reach across all GB postcodes. Glasgow 4hr, London 3hr, Felixstowe 3hr from one address.`,
    };
  }

  return { grade: null, reasoning: 'Outside scoring criteria — deprioritised', hook: null };
}

// ── Phase 2: Gazette insolvency notice fetcher ───────────────────────────────
// Fetches public Atom feed from The Gazette for recent insolvency notices.
// Notice type codes: 2430=Administration, 2920=Creditors' winding-up, 2930=Compulsory, 2110=CVA
let _gazetteLastCall = 0;
async function gazetteThrottle() {
  const gap = 2100; // 30 req/min = 2s gap
  const now = Date.now();
  if (now - _gazetteLastCall < gap) await sleep(gap - (now - _gazetteLastCall));
  _gazetteLastCall = Date.now();
}

async function fetchGazetteNotices(days_back = 14) {
  const notices = [];
  const fromDate = new Date(Date.now() - days_back * 86400000).toISOString().slice(0, 10);

  for (const ntypes of ['2430', '2920,2930', '2110']) {
    try {
      await gazetteThrottle();
      const url = `https://www.thegazette.co.uk/all-notices/data.feed?noticetypes=${encodeURIComponent(ntypes)}&results-page=1&numberOfLocationRows=100`;
      const r = await fetch(url, { headers: { Accept: 'application/atom+xml,text/xml,*/*', 'User-Agent': 'PSNMIntelBot/2.0' } });
      if (!r.ok) continue;
      const xml = await r.text();

      const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
      for (const entry of entries) {
        const rawTitle = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || '';
        const title = rawTitle.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').replace(/<[^>]+>/g, '').trim();
        const updated = entry.match(/<updated>([\s\S]*?)<\/updated>/)?.[1]?.slice(0, 10);
        const entryId = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim();
        const summary = (entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] || '').toLowerCase();

        if (!title || !updated || updated < fromDate) continue;

        let insolvencyType = 'liquidation';
        if (/administrat/i.test(title + summary)) insolvencyType = 'administration';
        else if (/voluntary arrangement|CVA/i.test(title + summary)) insolvencyType = 'CVA';
        else if (/winding.?up|wound.?up/i.test(title + summary)) insolvencyType = 'liquidation';
        else if (/receivership/i.test(title + summary)) insolvencyType = 'receivership';

        // Company number is often embedded in the notice
        const companyNumber = (entry + summary).match(/company(?:\s+number|no\.?)?\s*:?\s*([0-9]{8})/i)?.[1] || null;
        // Company name usually comes before " - " dash or is the whole title
        const companyName = title.split(/\s+[-–]\s+/)[0].replace(/\s+\d+$/, '').trim();

        if (companyName && companyName.length > 3) {
          notices.push({ company_name: companyName, company_number: companyNumber, insolvency_type: insolvencyType, notice_date: updated, gazette_url: entryId || url });
        }
      }
    } catch (e) {
      console.warn(`Gazette fetch (ntypes=${ntypes}): ${e.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  return notices.filter(n => { if (seen.has(n.company_name)) return false; seen.add(n.company_name); return true; });
}

// ── Phase 2: Find affected customers via Claude web search ───────────────────
async function findAffectedCustomers(failedCompanyName, insolvencyType, noticeDate) {
  if (!ANTHROPIC_KEY) return [];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'web-search-2025-03-05', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
        messages: [{ role: 'user', content: `Search for companies that were customers or clients of "${failedCompanyName}", a UK logistics/warehouse company that entered ${insolvencyType} on ${noticeDate}. Search for news articles, trade press, LinkedIn mentions. Return ONLY a JSON array of UK company names: ["Company A Ltd", "Company B Ltd"]. Maximum 10. If none found, return [].` }],
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.filter(n => typeof n === 'string' && n.length > 3) : [];
  } catch (e) {
    console.warn(`Customer search failed for ${failedCompanyName}: ${e.message}`);
    return [];
  }
}

// ── HARVEST ──────────────────────────────────────────────────────────────────
async function harvest({ batch_size = 100, days_back = 365, dry_run = false } = {}) {
  if (!CH_API_KEY) return { ok: false, error: 'COMPANIES_HOUSE_API_KEY not set — add to Vercel env vars' };

  const cap = Math.min(batch_size, 500);
  const fromDate = new Date(Date.now() - days_back * 86400000).toISOString().slice(0, 10);
  let inserted = 0, skipped = 0, blocked = 0;
  const errors = [];
  const dryRunLog = dry_run ? [] : null;

  // Build SIC code filter string for CH advanced search
  // We search by incorporation date range and filter SIC locally
  let startIndex = 0;
  const pageSize = 50;
  let totalFetched = 0;
  const toDate = new Date().toISOString().slice(0, 10);

  while (totalFetched < cap) {
    const remaining = cap - totalFetched;
    const fetchSize = Math.min(pageSize, remaining);

    // Use CH advanced search — filter by incorporation date
    const searchPath = `/advanced-search/companies?incorporated_from=${fromDate}&incorporated_to=${toDate}&size=${fetchSize}&start_index=${startIndex}`;
    const page = await chFetch(searchPath);
    if (!page || !page.items || page.items.length === 0) break;

    for (const company of page.items) {
      if (totalFetched >= cap) break;
      totalFetched++;

      const sics = company.sic_codes || [];
      const clf = classifySics(sics);

      // Hard SIC block
      if (clf.blocked || clf.unclassified) {
        blocked++;
        continue;
      }
      if (!clf.allowed) { blocked++; continue; }

      // Name-level safety check
      if (NAME_BLOCKLIST.some(p => p.test(company.company_name || ''))) {
        blocked++;
        continue;
      }

      const addr = [
        company.registered_office_address?.address_line_1,
        company.registered_office_address?.address_line_2,
        company.registered_office_address?.locality,
        company.registered_office_address?.region,
        company.registered_office_address?.postal_code,
      ].filter(Boolean).join(', ');

      const postcode = company.registered_office_address?.postal_code || null;
      const incDate = company.date_of_creation;
      const companyAge = incDate
        ? Math.floor((Date.now() - new Date(incDate).getTime()) / 86400000)
        : 9999;

      // Hard block: residential address
      const isResidential = isResidentialAddress(addr);
      if (isResidential) { blocked++; continue; }

      // Hard block: non-viable region
      const logViable = isLogisticallyViable(postcode);
      if (!logViable) { blocked++; continue; }

      const isLondon = isInnerLondon(postcode);
      const region = assignRegion(postcode);

      const triggers = [];
      if (companyAge <= 90) triggers.push('incorporated_under_90d');
      else if (companyAge <= 365) triggers.push('incorporated_under_365d');
      else if (companyAge <= 730) triggers.push('incorporated_under_730d');
      if (clf.tierA) triggers.push('sic_tier_a');
      else if (clf.tierB) triggers.push('sic_tier_b');
      if (isLondon) triggers.push('inner_london');

      const { grade, reasoning, hook } = scoreProspect({
        companyAge, isResidential: false, isLogViable: true,
        sicClassification: clf, isInLondon: isLondon,
        triggers, companyName: company.company_name,
      });

      if (!grade) { skipped++; continue; }

      if (dry_run) {
        dryRunLog.push({ company_name: company.company_name, postcode, grade, sic_tier: clf.tierA ? 'A' : 'B', age_days: companyAge, reasoning });
        inserted++;
        continue;
      }

      const sicFormatted = sics.map(s => ({ code: s, description: SIC_DESCRIPTIONS[parseInt(s)] || s }));

      const row = {
        company_number:   company.company_number,
        company_name:     company.company_name,
        registered_address: addr,
        postcode,
        region,
        sic_codes:        JSON.stringify(sicFormatted),
        incorporation_date: incDate || null,
        date_of_creation: incDate || null,
        ambient_likely:   clf.allowed,
        trigger_signals:  JSON.stringify(Array.isArray(triggers) ? triggers : []),
        score_grade:      grade,
        score_reasoning:  reasoning,
        outreach_hook:    hook,
        estimated_pallet_volume: 'unknown',
        updated_at:       new Date().toISOString(),
      };

      const result = await sbUpsert(TABLE, [row]);
      if (result && result.error) {
        errors.push({ company: company.company_name, error: result.error.slice?.(0, 100) });
      } else {
        inserted++;
      }
    }

    startIndex += page.items.length;
    if (page.items.length < fetchSize) break; // last page
  }

  const result = { ok: true, inserted, skipped, blocked, total_fetched: totalFetched, errors: errors.slice(0, 10), from_date: fromDate };
  if (dry_run) {
    result.dry_run = true;
    result.dry_run_log = dryRunLog;
    result.grade_a = dryRunLog.filter(r => r.grade === 'A').length;
    result.grade_b = dryRunLog.filter(r => r.grade === 'B').length;
    result.grade_c = dryRunLog.filter(r => r.grade === 'C').length;
  }
  return result;
}

// ── HARVEST INSOLVENCY ───────────────────────────────────────────────────────
// Scrapes Gazette insolvency notices → filters by logistics SIC → finds affected
// customers via Claude web search → verifies via CH → inserts as Grade A urgency.
async function harvestInsolvency({ days_back = 14 } = {}) {
  if (!CH_API_KEY) return { ok: false, error: 'COMPANIES_HOUSE_API_KEY not set' };

  const notices = await fetchGazetteNotices(days_back);
  if (!notices.length) return { ok: true, inserted: 0, skipped: 0, failed_companies_checked: 0, message: 'No Gazette insolvency notices in period' };

  let inserted = 0, skipped = 0;
  const errors = [];
  let failedCompaniesChecked = 0;

  for (const notice of notices.slice(0, 20)) {
    try {
      let failedNum = notice.company_number;
      if (!failedNum) {
        const sr = await chFetch(`/search/companies?q=${encodeURIComponent(notice.company_name)}&items_per_page=1`);
        failedNum = sr?.items?.[0]?.company_number || null;
      }
      if (!failedNum) { skipped++; continue; }

      const profile = await chFetch(`/company/${failedNum}`);
      if (!profile) { skipped++; continue; }

      const failedSics = (profile.sic_codes || []).map(s => parseInt(s));
      if (!failedSics.some(s => LOGISTICS_SIC_CODES.has(s))) { skipped++; continue; }

      failedCompaniesChecked++;
      const customerNames = await findAffectedCustomers(notice.company_name, notice.insolvency_type, notice.notice_date);

      for (const custName of customerNames.slice(0, 10)) {
        try {
          const sr = await chFetch(`/search/companies?q=${encodeURIComponent(custName)}&items_per_page=3`);
          for (const match of (sr?.items || []).slice(0, 2)) {
            if (match.company_status !== 'active') continue;
            const cProfile = await chFetch(`/company/${match.company_number}`);
            if (!cProfile) continue;
            const clf = classifySics(cProfile.sic_codes || []);
            if (clf.blocked || !clf.allowed) continue;
            if (NAME_BLOCKLIST.some(p => p.test(match.company_name || ''))) continue;
            const postcode = cProfile.registered_office?.postal_code || null;
            if (postcode?.startsWith('BT')) continue; // Northern Ireland
            const addr = [cProfile.registered_office?.address_line_1, cProfile.registered_office?.address_line_2, cProfile.registered_office?.locality, cProfile.registered_office?.region, postcode].filter(Boolean).join(', ');
            const region = assignRegion(postcode);
            const sicFormatted = (cProfile.sic_codes || []).map(s => ({ code: s, description: SIC_DESCRIPTIONS[parseInt(s)] || s }));
            const d = new Date(notice.notice_date); d.setDate(d.getDate() + 21);
            const urgencyWindowEnds = d.toISOString().slice(0, 10);

            const row = {
              company_number: match.company_number,
              company_name: match.company_name,
              registered_address: addr,
              postcode, region,
              sic_codes: JSON.stringify(sicFormatted),
              incorporation_date: cProfile.date_of_creation || null,
              date_of_creation: cProfile.date_of_creation || null,
              ambient_likely: clf.allowed,
              trigger_signals: buildInsolvencyTriggers({ failed_company_name: notice.company_name, failed_company_number: failedNum, insolvency_type: notice.insolvency_type, notice_date: notice.notice_date, gazette_url: notice.gazette_url }),
              score_grade: 'A',
              score_reasoning: `Insolvency rescue: ${notice.company_name} (${notice.insolvency_type}, ${notice.notice_date}). Urgency window: ${urgencyWindowEnds}.`,
              outreach_hook: `${notice.company_name} entered ${notice.insolvency_type} on ${notice.notice_date}. If your stock is still with them, we can move fast — typically 3-5 working days from contract.`,
              estimated_pallet_volume: 'unknown',
              updated_at: new Date().toISOString(),
            };

            const result = await sbUpsert(TABLE, [row]);
            if (result?.error) { errors.push({ company: match.company_name, error: result.error.slice?.(0, 80) }); }
            else { inserted++; break; } // one match per customer name
          }
        } catch (e) { errors.push({ company: custName, error: e.message.slice(0, 60) }); }
        await sleep(700);
      }
      await sleep(2100); // Gazette rate limit
    } catch (e) { errors.push({ gazette: notice.company_name, error: e.message.slice(0, 60) }); }
  }

  return { ok: true, inserted, skipped, failed_companies_checked: failedCompaniesChecked, total_notices: notices.length, errors: errors.slice(0, 10) };
}

// ── HARVEST DEFENCE SUPPLIERS ─────────────────────────────────────────────────
// Uses Claude web search to find UK SME defence suppliers from public directories.
// Verifies via CH, filters by SIC allowlist, inserts as Grade B reliability prospects.
async function harvestDefence({ cap = 50 } = {}) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  if (!CH_API_KEY) return { ok: false, error: 'COMPANIES_HOUSE_API_KEY not set' };

  const searches = [
    'UK SME defence supplier ambient warehousing logistics company limited site:defencesuppliers.uk OR site:adsgroup.org.uk',
    'MOD supplier UK limited company ambient storage supply chain SME manufacturer',
    'UK defence supply chain SME manufacturer distributor ambient goods limited',
    'ADS Group member UK SME aerospace defence manufacturer limited company',
    'Crown Commercial Service supplier UK SME ambient goods manufacturer distributor limited',
  ];

  const companyNames = new Set();
  for (const query of searches) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'web-search-2025-03-05', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6', max_tokens: 1000,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: [{ role: 'user', content: `Search: ${query}. Extract UK limited company names that appear in the results. Only SMEs (not large multinationals — no BAE Systems, Rolls-Royce, Thales etc). Return ONLY a JSON array: ["Company A Ltd", "Company B Ltd"]. Maximum 15. If none, return [].` }],
        }),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const match = text.match(/\[[\s\S]*?\]/);
      if (!match) continue;
      const names = JSON.parse(match[0]);
      if (Array.isArray(names)) names.forEach(n => typeof n === 'string' && n.length > 3 && companyNames.add(n));
      await sleep(1500);
    } catch (e) { console.warn(`Defence search error: ${e.message}`); }
  }

  if (!companyNames.size) return { ok: true, inserted: 0, skipped: 0, message: 'No defence suppliers found via web search' };

  let inserted = 0, skipped = 0;
  const errors = [];

  for (const name of [...companyNames].slice(0, cap)) {
    try {
      const sr = await chFetch(`/search/companies?q=${encodeURIComponent(name)}&items_per_page=3`);
      let inserted_this = false;
      for (const match of (sr?.items || []).slice(0, 2)) {
        if (match.company_status !== 'active' || inserted_this) continue;
        const profile = await chFetch(`/company/${match.company_number}`);
        if (!profile) continue;
        const clf = classifySics(profile.sic_codes || []);
        if (clf.blocked || !clf.allowed) { skipped++; continue; }
        if (NAME_BLOCKLIST.some(p => p.test(match.company_name || ''))) { skipped++; continue; }
        const postcode = profile.registered_office?.postal_code || null;
        if (postcode?.startsWith('BT')) { skipped++; continue; } // Northern Ireland
        if (isInnerLondon(postcode)) { skipped++; continue; } // inner London — local options exist
        const addr = [profile.registered_office?.address_line_1, profile.registered_office?.address_line_2, profile.registered_office?.locality, profile.registered_office?.region, postcode].filter(Boolean).join(', ');
        const region = assignRegion(postcode);
        const sicFormatted = (profile.sic_codes || []).map(s => ({ code: s, description: SIC_DESCRIPTIONS[parseInt(s)] || s }));

        const row = {
          company_number: match.company_number,
          company_name: match.company_name,
          registered_address: addr, postcode, region,
          sic_codes: JSON.stringify(sicFormatted),
          incorporation_date: profile.date_of_creation || null,
          date_of_creation: profile.date_of_creation || null,
          ambient_likely: clf.allowed,
          trigger_signals: buildDefenceTriggers({ scheme: 'defence_supplier_overflow', source_directory: 'web_search' }),
          score_grade: 'B',
          score_reasoning: `Defence supply chain prospect. Stable revenue, ambient goods warehousing need for MOD-adjacent supply chain.`,
          outreach_hook: `You supply MOD/defence — they require reliable supply chain. Hellaby is GB's logistics heartland: Glasgow 4hr, London 3hr, Cardiff 3.5hr. If you need central UK overflow warehousing, worth a conversation.`,
          estimated_pallet_volume: 'unknown',
          updated_at: new Date().toISOString(),
        };

        const result = await sbUpsert(TABLE, [row]);
        if (result?.error) { errors.push({ company: match.company_name, error: result.error.slice?.(0, 80) }); }
        else { inserted++; inserted_this = true; }
      }
      if (!inserted_this) skipped++;
      await sleep(700);
    } catch (e) { errors.push({ company: name, error: e.message.slice(0, 60) }); }
  }

  return { ok: true, inserted, skipped, total_searched: companyNames.size, errors: errors.slice(0, 10) };
}

// ── ENRICH ────────────────────────────────────────────────────────────────────
async function enrich({ limit = 50 } = {}) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const cap = Math.min(limit, 100); // hard cap per spec
  // Only pick up records not yet attempted — avoids burning A-tier slots repeatedly
  // and avoids re-hammering Anthropic on recently-errored records.
  // To force a retry: clear last_enrichment_attempt in Supabase dashboard.
  const rows = await sbSelect(TABLE,
    `enriched_email=is.null&enriched_website=is.null&last_enrichment_attempt=is.null&score_grade=in.(A,B,C)&order=score_grade.asc,created_at.asc&limit=${cap}&select=id,company_name,company_number,registered_address,postcode`);

  if (!rows || rows.length === 0) return { ok: true, enriched: 0, message: 'Nothing to enrich' };

  let enriched = 0, failed = 0;

  for (const row of rows) {
    const prompt = `You are a business researcher finding contact information for a UK company.

Company: ${row.company_name}
Companies House number: ${row.company_number}
Registered address: ${row.registered_address || 'unknown'}

Find:
1. Company website URL (official homepage)
2. Generic business email (info@, sales@, hello@, contact@ pattern — or director email if on LinkedIn)
3. Phone number
4. LinkedIn company page URL

Rules:
- Only return information you found via web search, do not fabricate
- For email: prefer a real found address. If you find the website domain and common pattern (e.g. firstname.lastname@domain.com from LinkedIn), report it as inferred.
- Return ONLY valid JSON, no prose:
{"website":"url or null","email":"address or null","phone":"number or null","linkedin":"url or null","confidence":0-100,"notes":"brief notes on source"}`;

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 500,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await r.json().catch(() => null);
      const text = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

      // Robust JSON extraction — handles prose wrapper, markdown fences, any position
      let parsed = null;
      const stripped = text.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
      try { parsed = JSON.parse(stripped); } catch {}
      if (!parsed) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) { try { parsed = JSON.parse(match[0]); } catch {} }
      }
      const apiErr = data?.type === 'error' ? `${data.error?.type || 'api_error'}:${(data.error?.message || '').slice(0, 60)}` : null;
      const parseError = !parsed ? (apiErr || `no_json (stop=${data?.stop_reason},textLen=${text.length})`) : null;

      if (parsed) {
        await sbUpdate(TABLE, { id: row.id }, {
          enriched_website:          parsed.website || null,
          enriched_email:            parsed.email || null,
          enriched_phone:            parsed.phone || null,
          enriched_linkedin:         parsed.linkedin || null,
          last_enrichment_attempt:   new Date().toISOString(),
          updated_at:                new Date().toISOString(),
          // Coerce null trigger_signals to empty array to prevent frontend .map() errors
          ...(row.trigger_signals == null ? { trigger_signals: '[]' } : {}),
        });
        enriched++;
      } else {
        await sbUpdate(TABLE, { id: row.id }, {
          last_enrichment_attempt: new Date().toISOString(),
          score_reasoning: (parseError ? `[enrich_err:${parseError}] ` : '') + (row.score_reasoning || ''),
          updated_at: new Date().toISOString(),
        });
        failed++;
      }
    } catch (e) {
      await sbUpdate(TABLE, { id: row.id }, {
        last_enrichment_attempt: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).catch(() => null);
      failed++;
    }
    await sleep(3000); // 20 req/min — headroom for web_search beta rate limits
  }

  return { ok: true, enriched, failed, total: rows.length };
}

// ── City extraction from CH address string ────────────────────────────────────
function extractCity(addr, postcode) {
  if (!addr) return postcode ? postcode.replace(/\d.*$/, '').trim() : 'UK';
  // CH addresses are typically: "Street, Locality, Town, Region, Postcode"
  const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
  // Strip postcode-looking parts from the end
  const clean = parts.filter(p => !/^[A-Z]{1,2}\d/.test(p.toUpperCase().replace(/\s/g, '')));
  // Town is usually 2nd-to-last or last remaining part
  return clean[clean.length - 2] || clean[clean.length - 1] || 'UK';
}

// ── Approximate road distance (miles) from Hellaby S66 8HR by postcode area ──
const HELLABY_DISTANCES = {
  // Yorkshire — home territory
  S:5, DN:12, WF:25, HD:20, HX:30, BD:35, LS:40, HG:50, HU:60, YO:65,
  // East Midlands
  NG:40, DE:30, LN:60, LE:70, NN:90, PE:90,
  // West Midlands
  ST:55, DY:75, WV:75, WS:80, B:80, TF:80, CV:85, WR:105, HR:120,
  // North East
  TS:55, DL:60, DH:70, SR:75, NE:80,
  // North West
  SK:55, BB:55, OL:55, BL:60, M:65, PR:65, FY:75, L:80, WA:75, WN:70, CW:80, CH:90, LA:100, CA:130,
  // East of England
  CB:120, MK:125, SG:150, CO:150, CM:155, AL:155, SN:160, IP:165, NR:165, SS:165, RM:175,
  // Wales
  SY:110, LD:130, LL:140, NP:145, CF:160, SA:175,
  // London & surrounds
  EN:170, N:175, NW:175, E:175, W:180, WC:180, EC:180, WD:175, HA:185, SE:185, IG:175,
  DA:185, UB:185, KT:190, CR:190, SM:195, TW:195, BR:185, SW:195,
  // South East
  OX:155, RG:185, SL:180, ME:200, BH:200, BN:215, RH:210, GU:210, SO:215, TN:210, CT:215, PO:225,
  // South West
  GL:140, BS:165, BA:165, DT:200, EX:220, SP:190, TA:195, PL:245, TQ:240, TR:280,
  // Scotland
  DG:200, G:230, FK:230, ML:235, KA:240, EH:250, TD:255, KY:265, PA:235, DD:280, PH:290, AB:370, IV:395,
};

function getDistanceInfo(postcode) {
  if (!postcode) return null;
  const area = postcode.toUpperCase().replace(/\s/g, '').match(/^([A-Z]{1,2})/)?.[1];
  const dist = area ? (HELLABY_DISTANCES[area] || (area.length === 2 ? HELLABY_DISTANCES[area[0]] : null)) : null;
  if (!dist) return null;
  const hrs = dist < 35 ? 'under 30 minutes' : dist < 55 ? 'about 45 minutes' : dist < 80 ? 'about 1 hour' : dist < 120 ? `about ${Math.round(dist / 55 * 2) / 2} hours` : `${Math.round(dist / 55 * 2) / 2} hours`;
  return { miles: dist, label: `~${dist} miles (~${hrs} drive)` };
}

// ── Fact registry loader ──────────────────────────────────────────────────────
async function loadFactRegistry() {
  try {
    const rows = await sbSelect('psnm_atlas_fact_sources', 'select=claim_type,claim_key,claim_value,source&order=claim_type.asc,claim_key.asc');
    if (rows && rows.length > 0) return rows;
  } catch {}
  // Fallback: inline static facts so pipeline never blocks on DB unavailability
  return [
    { claim_type: 'drive_time',  claim_key: 'glasgow',    claim_value: '4h 30min / 272 miles',  source: 'verified_static' },
    { claim_type: 'drive_time',  claim_key: 'london',     claim_value: '3h 15min / 170 miles',  source: 'verified_static' },
    { claim_type: 'drive_time',  claim_key: 'felixstowe', claim_value: '3h 30min / 190 miles',  source: 'verified_static' },
    { claim_type: 'drive_time',  claim_key: 'manchester', claim_value: '1h 15min / 60 miles',   source: 'verified_static' },
    { claim_type: 'drive_time',  claim_key: 'birmingham', claim_value: '1h 45min / 95 miles',   source: 'verified_static' },
    { claim_type: 'drive_time',  claim_key: 'leeds',      claim_value: '45min / 35 miles',      source: 'verified_static' },
    { claim_type: 'drive_time',  claim_key: 'sheffield',  claim_value: '25min / 12 miles',      source: 'verified_static' },
    { claim_type: 'facility',    claim_key: 'capacity',   claim_value: '1,602 pallet spaces',   source: 'site_survey' },
    { claim_type: 'facility',    claim_key: 'spec',       claim_value: 'ambient only',           source: 'site_survey' },
    { claim_type: 'facility',    claim_key: 'postcode',   claim_value: 'S66 8HR',               source: 'site_survey' },
    { claim_type: 'facility',    claim_key: 'motorway_access', claim_value: 'M18/M1',           source: 'site_survey' },
    { claim_type: 'offer_terms', claim_key: 'rate_tier_1_100',    claim_value: '£3.95/pallet/week (1-100 pallets)',          source: 'manual' },
    { claim_type: 'offer_terms', claim_key: 'rate_tier_101_500',  claim_value: '£3.50/pallet/week (101-500 pallets)',         source: 'manual' },
    { claim_type: 'offer_terms', claim_key: 'rate_tier_500_plus', claim_value: '£2.95/pallet/week (500+ pallets)',            source: 'manual' },
    { claim_type: 'offer_terms', claim_key: 'canonical_offer',    claim_value: '1 week free WITH 12-week minimum commitment', source: 'manual' },
    { claim_type: 'offer_terms', claim_key: 'notice_period',      claim_value: '30-day notice after initial 12 weeks',       source: 'manual' },
    { claim_type: 'offer_terms', claim_key: 'goods_in_out',       claim_value: '£3.50 per pallet movement',                  source: 'manual' },
    { claim_type: 'offer_terms', claim_key: 'onboarding',         claim_value: '3-5 working days from contract',             source: 'manual' },
    { claim_type: 'facility',    claim_key: 'no_fulfilment',      claim_value: 'no pick-pack, no fulfilment, no e-commerce dispatch', source: 'site_survey' },
    { claim_type: 'facility',    claim_key: 'vat_registered',     claim_value: 'VAT registered',                             source: 'manual' },
  ];
}

// ── Generate draft via Claude + Atlas v2 system prompt ────────────────────────
// Unified with generateDrafts() in atlas.js — one source of truth for quality.
async function generateDraftViaAtlas(p, factRegistry = []) {
  let promptTemplate;
  try {
    promptTemplate = fs.readFileSync(path.join(__dirname, 'docs/_atlas_system_prompt.md'), 'utf8');
  } catch { return null; }

  const companyAge = p.incorporation_date
    ? Math.floor((Date.now() - new Date(p.incorporation_date).getTime()) / 86400000)
    : null;

  const sics = JSON.parse(p.sic_codes || '[]');
  const industry = sics.map(s => s.description || s.code).filter(Boolean).join(', ') || 'wholesale / retail';
  const city = extractCity(p.registered_address, p.postcode);
  const distInfo = getDistanceInfo(p.postcode);

  const shortName = (p.company_name || '').replace(/\s+(LTD\.?|LIMITED|PLC|LLP)$/i, '').trim();
  const source = getProspectSource(p);
  const sourceMeta = getSourceMeta(p);
  const pitchType = source === 'gazette_insolvency' ? 'insolvency_rescue'
                  : source === 'defence_supplier'   ? 'defence_supplier'
                  : 'standard';

  const triggers = getSafeTriggers(p);
  const triggerText = triggers.map(t => ({
    incorporated_under_90d:  `incorporated just ${companyAge} days ago — very likely still setting up logistics`,
    incorporated_under_365d: `incorporated ${Math.round((companyAge||0)/30)} months ago — growth stage, probably reviewing storage options`,
    residential_address:     'registered at a residential address — suggests not yet in a warehouse',
    inner_london:            'London-registered — London storage is expensive; central GB argument is strong',
    insolvency_rescue:       `URGENT: their 3PL (${sourceMeta._failed_company || 'unknown'}) has entered ${sourceMeta._insolvency_type || 'insolvency'}`,
    high_urgency:            `urgency window closes ${sourceMeta._urgency_window_ends || 'soon'} — outreach is time-critical`,
    defence_supply_chain:    'defence/MOD supply chain company — reliability-premium buyer',
    reliability_premium:     'expects high standards, treats suppliers as operational partners',
  }[t] || t)).filter(Boolean).join('; ');

  const gradeContext = {
    A: `Grade A: incorporated ${companyAge} days ago. Very high probability of needing warehousing imminently — decision is being made now.`,
    B: `Grade B: incorporated ~${Math.round((companyAge||180)/30)} months ago. Growth stage. Likely reviewing storage options before committing to a lease.`,
    C: `Grade C: incorporated ~${Math.round((companyAge||365)/365 * 10)/10} years ago. Established. Likely reviewing warehousing costs or capacity for the year ahead.`,
  }[p.score_grade] || '';

  const distanceContext = distInfo
    ? `The company is approximately ${distInfo.label} from Hellaby. ${distInfo.miles < 80 ? 'Very close — emphasise rapid response, local logistics partner angle.' : distInfo.miles < 150 ? 'Within comfortable day-trip distance — central UK argument is powerful.' : 'Further afield — lead with national reach and central GB positioning.'}`
    : '';

  const walesContext = ['Wales'].includes(p.region)
    ? `The company is in Wales. Emphasise: Hellaby is central GB — 3.5 hours from Cardiff, faster national reach than any Welsh depot. Ideal for businesses shipping beyond Wales.`
    : '';

  const confidenceMap = { A: 85, B: 70, C: 55 };

  // Fill system prompt template vars (all the same as generateDrafts() in atlas.js)
  const prompt = promptTemplate
    .replace(/\{\{company\}\}/g, shortName)
    .replace(/\{\{contact_name\}\}/g, 'the team')
    .replace(/\{\{contact_first_name\}\}/g, 'there')
    .replace(/\{\{industry\}\}/g, industry)
    .replace(/\{\{city\}\}/g, city)
    .replace(/\{\{estimated_pallet_need\}\}/g, p.score_grade === 'A' ? '10–50' : p.score_grade === 'B' ? '25–100' : '50–200')
    .replace(/\{\{priority_score\}\}/g, confidenceMap[p.score_grade] || 70)
    .replace(/\{\{dream_outcome\}\}/g, 'Stock stored centrally at GB\'s geographic centre, dispatched nationally — no lease, no staff overhead, no minimum term after the initial 12 weeks')
    .replace(/\{\{perceived_likelihood\}\}/g, 'First week free with 12-week commitment. Site visit available before you sign. Walk away at day 5 if we are not delivering.')
    .replace(/\{\{time_effort\}\}/g, 'Onboarding typically 3-5 working days from contract signed. We coordinate haulier booking with you for stock collection or delivery — minimal admin on your side. 30 days notice to cancel after initial 12 weeks.')
    .replace(/\{\{risk_reversal\}\}/g, 'Try us for a week with real product moving through. If we\'re not faster and cleaner than your current setup, walk away — week 2 doesn\'t bill.')
    .replace(/\{\{rate_small\}\}/g, '3.95')
    .replace(/\{\{rate_mid\}\}/g, '3.45')
    .replace(/\{\{rate_bulk\}\}/g, '2.95')
    .replace(/\{\{headline\}\}/g, 'First week free — when you commit to 12 weeks')
    .replace(/\{\{touch_number\}\}/g, '1')
    .replace(/\{\{tone_mix\}\}/g, 'direct');

  const insolvencyContext = pitchType === 'insolvency_rescue' ? [
    ``,
    `--- PITCH TYPE: insolvency_rescue ---`,
    `Follow the INSOLVENCY RESCUE PITCH section of the system prompt.`,
    `Failed company: ${sourceMeta._failed_company} (${sourceMeta._insolvency_type || 'insolvency'}, ${sourceMeta._notice_date || 'recent'})`,
    `Urgency window closes: ${sourceMeta._urgency_window_ends || 'within 21 days'} — time-sensitive outreach`,
    `TONE: empathetic, calm, professional. NOT vulturous. They've had bad news. PSNM is the calm, reliable option.`,
    `DO NOT use urgency pressure language. DO reference that PSNM can move fast (3-5 working days) when they're ready.`,
  ] : [];

  const defenceContext = pitchType === 'defence_supplier' ? [
    ``,
    `--- PITCH TYPE: defence_supplier ---`,
    `Follow the DEFENCE SUPPLY CHAIN PITCH section of the system prompt.`,
    `This is a reliability-premium buyer who operates to defence-grade standards. Holmes Dream 100 tone at maximum. Peer treatment.`,
    `MANDATORY: DO NOT claim ISO 9001 certification — say "ISO 9001 path on roadmap" only.`,
    `MANDATORY: DO NOT claim Cyber Essentials Plus or any security clearance.`,
    `MANDATORY: DO NOT exaggerate capabilities — honest description only.`,
  ] : [];

  const factBlock = buildFactBlock(factRegistry);

  const userMsg = [
    `Generate a cold outreach email for ${shortName} (${industry}), based in ${city}.`,
    ``,
    factBlock,
    ``,
    `STRICT INSTRUCTION: You may ONLY state facts that appear verbatim in the VERIFIED FACT REGISTRY above.`,
    `Do NOT invent drive times, distances, capacities, rates, or any other factual claims.`,
    `If you cannot write a convincing, accurate email using only verified facts, output exactly the text: INSUFFICIENT_DATA`,
    ``,
    `Intelligence Engine context — use to personalise this email:`,
    `- ${gradeContext}`,
    ...(triggerText ? [`- Trigger signals: ${triggerText}`] : []),
    `- Outreach hook (use this verbatim or adapt it into the opening): "${p.outreach_hook}"`,
    ...(distanceContext ? [`- Geography: ${distanceContext}`] : []),
    ...(walesContext ? [`- Region note: ${walesContext}`] : []),
    `- SIC: ${sics[0]?.code} — ${sics[0]?.description || 'unknown'}`,
    ...insolvencyContext,
    ...defenceContext,
    ``,
    `Apply all six frameworks. Subject line must reference their specific situation, not generic. Return only valid JSON as specified.`,
  ].join('\n');

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: prompt,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!aiRes.ok) return null;

  const aiJson = await aiRes.json().catch(() => null);
  const rawContent = aiJson?.content?.[0]?.text || '';
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  let parsed = null;
  try { parsed = JSON.parse(jsonMatch?.[0] || rawContent); } catch {}
  if (!parsed?.subject || !parsed?.body) return null;

  // Replace phone placeholder — system prompt tells Claude to use 07XXX XXXXXX
  parsed.body    = parsed.body.replace(/07XXX XXXXXX/g, '07506 255033');
  parsed.subject = parsed.subject.replace(/07XXX XXXXXX/g, '07506 255033');

  // Post-processing: remove retired/fabricated claims Claude generates from training data
  // "no deposit"
  parsed.body = parsed.body.replace(/,\s*no deposit\b[,.]?/gi, '');
  parsed.body = parsed.body.replace(/\bno deposit\b[,.]?\s*/gi, '');
  parsed.body = parsed.body.replace(/,\s*zero deposit\b[,.]?/gi, '');
  parsed.body = parsed.body.replace(/\bzero deposit\b[,.]?\s*/gi, '');
  // "zero paperwork" / "no paperwork" — overpromises; customer signs T&Cs, insurance check, etc.
  parsed.body = parsed.body.replace(/[Zz]ero paperwork[^.]*\.\s*/g, '');
  parsed.body = parsed.body.replace(/,?\s*no paperwork\b[,.]?\s*/gi, '');
  // "real facility" / "real despatch" — reads defensive
  parsed.body = parsed.body.replace(/\breal facility,?\s*(with\s+)?real despatch[,.]?\s*/gi, '');
  parsed.body = parsed.body.replace(/\breal facility\b/gi, 'our facility');
  // "1 in 4" / "one in four" conversion stat
  parsed.body = parsed.body.replace(/[Oo]ne in four [^.]*\.\s*/g, '');
  parsed.body = parsed.body.replace(/1 in 4 [^.]*\.\s*/g, '');
  // "population-weighted centre"
  parsed.body = parsed.body.replace(/population-weighted cent(?:re|er) of Great Britain/gi, "GB's logistics heartland");
  parsed.body = parsed.body.replace(/population-weighted cent(?:re|er)/gi, "logistics heartland");
  // Unverifiable percentage claims ("saves X%", "cuts X%", "25-30%", "~30%")
  parsed.body = parsed.body.replace(/cuts cross-country dispatch by (?:roughly |around |approximately |~)?\d+%/gi, 'reduces average dispatch time across UK postcodes');
  parsed.body = parsed.body.replace(/save[s]? (?:roughly |around |approximately |~)?\d+[-–]\d+% vs [^.]+\./gi, 'competitive central UK pricing.');
  // Clean up double-comma or trailing comma-space left by removals
  parsed.body = parsed.body.replace(/,\s*,/g, ',');
  parsed.body = parsed.body.replace(/,\s*\n/g, '\n');
  parsed.body = parsed.body.replace(/,\s*$/gm, '');

  // Enforce canonical sign-off — replace everything from last "Ben Greenwood" to end
  const SIGN_OFF = 'Ben Greenwood\nFounder — Pallet Storage Near Me\nHellaby, Rotherham S66 8HR\nTel: 07506 255033\nsales@palletstoragenearme.co.uk\npalletstoragenearme.co.uk';
  const sigIdx = parsed.body.lastIndexOf('Ben Greenwood');
  if (sigIdx !== -1) {
    parsed.body = parsed.body.slice(0, sigIdx) + SIGN_OFF;
  } else {
    parsed.body = parsed.body + '\n\n' + SIGN_OFF;
  }

  return parsed;
}

// ── SCORE AND DISPATCH ────────────────────────────────────────────────────────
// Priority ordering (Phase 2):
//   1. Insolvency prospects with urgency_window_ends < today+7 (rescue window)
//   2. Companies House Grade A with enriched_email
//   3. Defence supplier Grade B with enriched_email
//   4. Companies House Grade B with enriched_email
async function scoreAndDispatch({ limit = 10, grade = null, prospect_id = null, dry_run = false } = {}) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const cap = Math.min(limit, 50);
  let prospects = [];

  // dry_run relaxes enriched_email requirement — we're testing the generation pipeline, not email delivery
  const emailFilter = dry_run ? '' : '&enriched_email=not.is.null';

  if (prospect_id) {
    prospects = await sbSelect(TABLE, `id=eq.${prospect_id}&atlas_dispatched=eq.false${emailFilter}&select=*`) || [];
  } else if (grade) {
    prospects = await sbSelect(TABLE, `score_grade=eq.${grade}&atlas_dispatched=eq.false${emailFilter}&order=created_at.asc&limit=${cap}&select=*`) || [];
  } else {
    // Fetch all eligible across A+B grades, sort by priority in JS
    const all = await sbSelect(TABLE, `atlas_dispatched=eq.false${emailFilter}&score_grade=in.(A,B)&order=created_at.asc&limit=${cap * 6}&select=*`) || [];
    const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const urgentInsolvency  = all.filter(p => getProspectSource(p) === 'gazette_insolvency' && (getUrgencyWindowEnds(p) || '9999') <= sevenDaysOut);
    const normalInsolvency  = all.filter(p => getProspectSource(p) === 'gazette_insolvency' && (getUrgencyWindowEnds(p) || '9999') >  sevenDaysOut);
    const chA    = all.filter(p => getProspectSource(p) === 'companies_house' && p.score_grade === 'A');
    const defB   = all.filter(p => getProspectSource(p) === 'defence_supplier');
    const chB    = all.filter(p => getProspectSource(p) === 'companies_house' && p.score_grade === 'B');
    // Priority: urgent insolvency → CH A → normal insolvency (still in window) → defence B → CH B
    prospects = [...urgentInsolvency, ...chA, ...normalInsolvency, ...defB, ...chB].slice(0, cap);
  }

  if (!prospects || prospects.length === 0) {
    return { ok: true, dispatched: 0, message: 'No matching undispatched prospects with email' };
  }

  let dispatched = 0;
  const errors = [];
  const dry_run_log = [];

  const factRegistry = await loadFactRegistry();

  for (const p of prospects) {
    const draftData = await generateDraftViaAtlas(p, factRegistry);
    if (!draftData) {
      errors.push({ company: p.company_name, error: 'Claude draft generation failed' });
      continue;
    }

    const confidenceMap = { A: 85, B: 70, C: 55 };

    const validation = validateDraft({ subject: draftData.subject, body: draftData.body });
    let draftStatus = validation.pass ? 'pending_approval' : 'needs_revision';
    if (!validation.pass) {
      const errorRules = validation.issues.filter(i => i.severity === 'error').map(i => i.rule).join(', ');
      console.warn(`[Atlas validator] ${p.company_name} → needs_revision (${errorRules})`);
    }

    // Claim-source verification (only run if validator passed — no point verifying a failed draft)
    let claimVerification = null;
    if (draftStatus === 'pending_approval') {
      claimVerification = await verifyDraft(draftData.body, factRegistry);
      if (claimVerification.verdict === 'insufficient_data') {
        draftStatus = 'enrichment_required';
      } else if (claimVerification.verdict === 'has_red_claims') {
        draftStatus = 'needs_source';
      }
      // all_green → stays pending_approval
      console.log(`[Claim verifier] ${p.company_name} → ${claimVerification.verdict} → ${draftStatus}`);
    }

    const draft = {
      prospect_id:      null,
      touch_number:     1,
      subject:          draftData.subject,
      body:             draftData.body,
      status:           draftStatus,
      confidence_score: draftData.confidence_score || confidenceMap[p.score_grade] || 70,
      framework_annotations: JSON.stringify({
        source:                   'intelligence_engine',
        intelligence_prospect_id: p.id,
        score_grade:              p.score_grade,
        to_email:                 p.enriched_email,
        to_name:                  p.company_name,
        company_name:             p.company_name,
        atlas_annotations:        draftData.framework_annotations || [],
        ...(validation.pass ? {} : { validation_issues: validation.issues }),
        ...(claimVerification ? { claim_verification: claimVerification } : {}),
      }),
    };

    if (dry_run) {
      dry_run_log.push({
        company:       p.company_name,
        grade:         p.score_grade,
        subject:       draftData.subject,
        body:          draftData.body,
        validator:     { pass: validation.pass, issues: validation.issues },
        claim_verdict: claimVerification?.verdict || 'skipped',
        claims:        claimVerification?.claims || [],
        would_status:  draftStatus,
      });
      continue;
    }

    const result = await sbInsert('psnm_atlas_drafts', [draft]);
    if (result && result.error) {
      errors.push({ company: p.company_name, error: result.error.slice?.(0, 100) });
    } else {
      await sbUpdate(TABLE, { id: p.id }, {
        atlas_dispatched:    true,
        atlas_dispatched_at: new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      });
      dispatched++;
    }
    await sleep(1000); // brief gap between consecutive Claude calls
  }

  if (dry_run) {
    return { ok: true, dry_run: true, total_candidates: prospects.length, results: dry_run_log };
  }

  return { ok: true, dispatched, errors: errors.slice(0, 10), total_candidates: prospects.length };
}

// ── HARVEST DAILY (cron combined run) ────────────────────────────────────────
async function harvestDaily() {
  const autorun = process.env.PSNM_INTELLIGENCE_AUTORUN;
  if (autorun === 'false') return { ok: true, skipped: true, reason: 'PSNM_INTELLIGENCE_AUTORUN=false' };

  const harvest_result = await harvest({ batch_size: 100, days_back: 2 }); // last 48hrs — A/B feed
  // Weekly C-tier sweep: on Mondays also harvest 1-3 year old companies
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon
  let ctier_result = null;
  if (dayOfWeek === 1) {
    ctier_result = await harvest({ batch_size: 100, days_back: 1095 }); // up to 3 years back
  }
  const enrich_result  = await enrich({ limit: 50 });
  const dispatch_result = await scoreAndDispatch({ limit: 10 });

  return { ok: true, harvest: harvest_result, ctier_harvest: ctier_result, enrich: enrich_result, dispatch: dispatch_result };
}

// ── GET STATS ─────────────────────────────────────────────────────────────────
async function getStats() {
  const [gradeA, gradeB, gradeC, dispatched, allForSources] = await Promise.all([
    sbSelect(TABLE, 'score_grade=eq.A&select=id'),
    sbSelect(TABLE, 'score_grade=eq.B&select=id'),
    sbSelect(TABLE, 'score_grade=eq.C&select=id'),
    sbSelect(TABLE, 'atlas_dispatched=eq.true&select=id'),
    sbSelect(TABLE, 'select=id,trigger_signals&limit=1000&order=created_at.desc'),
  ]);

  // Source breakdown + urgency count (calculated client-side since trigger_signals is TEXT)
  const sourceCounts = { companies_house: 0, gazette_insolvency: 0, defence_supplier: 0 };
  let urgentInsolvencyCount = 0;
  const sevenDaysOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  (allForSources || []).forEach(p => {
    const src = getProspectSource(p);
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    if (src === 'gazette_insolvency') {
      const uw = getUrgencyWindowEnds(p);
      if (uw && uw <= sevenDaysOut) urgentInsolvencyCount++;
    }
  });

  const recent = await sbSelect(TABLE, 'order=created_at.desc&limit=20&select=id,company_name,company_number,postcode,region,score_grade,score_reasoning,outreach_hook,trigger_signals,enriched_email,enriched_website,atlas_dispatched,created_at');

  return {
    ok: true,
    counts: {
      total: (gradeA?.length || 0) + (gradeB?.length || 0) + (gradeC?.length || 0),
      A: gradeA?.length || 0,
      B: gradeB?.length || 0,
      C: gradeC?.length || 0,
      dispatched: dispatched?.length || 0,
      by_source: sourceCounts,
      urgent_insolvency: urgentInsolvencyCount,
    },
    recent: recent || [],
  };
}

// ── GET PROSPECT DETAIL ───────────────────────────────────────────────────────
async function getProspect(id) {
  const rows = await sbSelect(TABLE, `id=eq.${id}&limit=1`);
  if (!rows || rows.length === 0) return { ok: false, error: 'not found' };
  return { ok: true, prospect: rows[0] };
}

// ── SIC descriptions (common ones) ───────────────────────────────────────────
const SIC_DESCRIPTIONS = {
  46900: 'Non-specialised wholesale trade', 46610: 'Wholesale of agricultural machinery',
  46630: 'Wholesale of mining, construction and civil engineering machinery',
  47910: 'Retail sale via mail order houses or via Internet',
  47190: 'Other retail sale in non-specialised stores',
  46410: 'Wholesale of textiles', 46420: 'Wholesale of clothing and footwear',
  46491: 'Wholesale of household goods (other than china, glassware, wallpaper and floor coverings)',
  46499: 'Wholesale of household goods', 46510: 'Wholesale of computers, peripheral equipment and software',
  46520: 'Wholesale of electronic and telecommunications equipment',
  25990: 'Manufacture of other fabricated metal products',
  32990: 'Other manufacturing', 46190: 'Agents in sale of a variety of goods',
  46130: 'Agents in sale of timber and building materials',
  46180: 'Agents specialised in the sale of other particular products',
  47789: 'Other retail sale of new goods in specialised stores',
  47799: 'Retail sale of other second-hand goods in stores',
};

// ── HARVEST INSOLVENCY DAILY (cron 06:15) ────────────────────────────────────
async function harvestInsolvencyDaily() {
  const autorun = process.env.PSNM_INTELLIGENCE_AUTORUN;
  if (autorun === 'false') return { ok: true, skipped: true, reason: 'PSNM_INTELLIGENCE_AUTORUN=false' };
  const insolvency_result = await harvestInsolvency({ days_back: 14 });
  const enrich_result     = await enrich({ limit: 20 });
  const dispatch_result   = await scoreAndDispatch({ limit: 5 }); // urgency-priority dispatch
  return { ok: true, insolvency: insolvency_result, enrich: enrich_result, dispatch: dispatch_result };
}

// ── HARVEST DEFENCE WEEKLY (cron Sunday 06:30) ────────────────────────────────
async function harvestDefenceWeekly() {
  const autorun = process.env.PSNM_INTELLIGENCE_AUTORUN;
  if (autorun === 'false') return { ok: true, skipped: true, reason: 'PSNM_INTELLIGENCE_AUTORUN=false' };
  return harvestDefence({ cap: 50 });
}

module.exports = { harvest, enrich, scoreAndDispatch, harvestDaily, harvestInsolvencyDaily, harvestDefenceWeekly, harvestInsolvency, harvestDefence, getStats, getProspect, loadFactRegistry };
