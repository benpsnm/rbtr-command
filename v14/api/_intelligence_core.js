// ── PSNM Prospect Intelligence Engine — core logic ───────────────────────────
// NOT a Vercel function (underscore-prefixed). Required by intelligence.js.
// Data flow: Harvest (CH API) → Score → Enrich (Claude) → Dispatch (Atlas)

const fs   = require('fs');
const path = require('path');
const { validateDraft } = require('./_draft_validator');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE;
const CH_API_KEY    = process.env.COMPANIES_HOUSE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TABLE         = 'psnm_intelligence_prospects';

// ── SIC ALLOWLIST — ambient physical-product businesses ──────────────────────
const SIC_ALLOWLIST = new Set([
  // Manufacturing / production (ambient)
  10410,10440,10610,10710,10720,10810,10820,10860,11030,11040,
  13100,13200,13300,14110,14120,14130,14310,14390,15110,15120,15200,
  16101,16102,16210,16220,16240,16290,17110,17120,17211,17219,17220,17230,17240,17290,
  18110,18120,18130,18140,18200,
  22110,22190,22210,22220,22230,22290,
  23110,23120,23130,23140,23190,23200,23310,23320,23410,23420,23430,23440,23490,
  23510,23520,23610,23620,23630,23640,23650,23690,23700,23910,23990,
  24100,24200,24310,24320,24330,24340,
  25110,25120,25210,25290,25300,25400,25500,25610,25620,25710,25720,25730,
  25910,25921,25929,25930,25940,25990,
  26110,26120,26200,26301,26309,26400,26511,26512,26513,26514,26520,26600,26701,26702,26800,
  27110,27120,27200,27310,27320,27330,27400,27510,27520,27900,
  28110,28120,28131,28132,28140,28150,28210,28220,28230,28240,28250,28291,28292,28293,28294,
  28301,28302,28410,28490,28910,28921,28922,28923,28930,28940,28950,28960,28990,
  29100,29201,29202,29203,29310,29320,
  30110,30120,30200,30300,30400,30910,30920,30990,
  31010,31020,31030,31090,
  32110,32120,32130,32200,32300,32401,32409,32500,32910,32990,
  33110,33120,33130,33140,33150,33160,33170,33190,33200,
  // Wholesale / distribution
  46110,46120,46130,46140,46150,46160,46170,46180,46190,
  46210,46220,46230,46240,46310,46320,46330,46341,46342,46350,46360,46370,46380,46390,
  46410,46420,46431,46439,46441,46442,46450,46460,46470,46480,46491,46499,
  46510,46520,46610,46620,46630,46640,46650,46660,46690,
  46711,46719,46720,46730,46740,46750,46760,46770,46900,
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

// ── SIC code classification ──────────────────────────────────────────────────
function classifySics(sicCodes) {
  const codes = (sicCodes || []).map(s => parseInt(s.toString().replace(/\D/g, '')));
  const blocked = codes.some(c => SIC_BLOCKLIST.has(c));
  const allowed = codes.some(c => SIC_ALLOWLIST.has(c));
  return { blocked, allowed, unclassified: !blocked && !allowed };
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
function scoreProspect({ companyAge, isResidential, sicClassification, isInLondon, triggers, companyName }) {
  if (NAME_BLOCKLIST.some(p => p.test(companyName || ''))) {
    return { grade: null, reasoning: 'Blocked by company name pattern (hazmat/pharma/chilled)', hook: null };
  }
  if (sicClassification.blocked) {
    return { grade: null, reasoning: 'Blocked SIC code', hook: null };
  }
  // Grade A: <90 days + residential + clean SIC
  if (companyAge <= 90 && isResidential && !isInLondon && sicClassification.allowed) {
    return {
      grade: 'A',
      reasoning: `Incorporated ${companyAge} days ago. Registered address looks residential — not yet in a warehouse. SIC code signals physical product business.`,
      hook: `You incorporated ${companyAge} days ago. Wherever you're trading from now, it's not a warehouse. Hellaby is the geographic centre of GB — talk to me before you sign a lease.`,
    };
  }
  // Grade A: <90 days with strong SIC even without residential (could be accountant address)
  if (companyAge <= 90 && !isInLondon && sicClassification.allowed) {
    return {
      grade: 'A',
      reasoning: `Very recently incorporated (${companyAge} days). High probability of needing warehousing imminently.`,
      hook: `You incorporated ${companyAge} days ago. Most new physical-product businesses realise they need proper warehousing within 3 months. Hellaby is the geographic centre of GB — get a quote before you commit elsewhere.`,
    };
  }
  // Grade B: 90-365 days + allowed SIC
  if (companyAge <= 365 && !isInLondon && (sicClassification.allowed || (isResidential && !sicClassification.blocked))) {
    const residential_note = isResidential ? ' Registered address looks residential — probably still trading from home or an accountant address.' : '';
    return {
      grade: 'B',
      reasoning: `Incorporated ${companyAge} days ago. Growth stage business — likely reviewing warehousing options.${residential_note}`,
      hook: `${companyAge <= 180 ? 'Just over 6 months in' : 'Coming up on your first year'} — your logistics setup is being decided now, not later. Our central GB location (Hellaby, S66) gives you Glasgow 4hr, London 3hr, Liverpool port 2hr from one address. Worth a 15-min chat?`,
    };
  }
  // Grade B: Inner London — de-prioritise but still B
  if (companyAge <= 365 && isInLondon && sicClassification.allowed) {
    return {
      grade: 'B',
      reasoning: `London-registered, ${companyAge} days old. Local London options exist but are expensive — central GB argument still valid for national distribution.`,
      hook: `London storage is expensive and slow for national dispatch. From Hellaby: Glasgow 4hrs, Cardiff 3.5hrs, all ports under 3hrs. If you're shipping nationally, it's worth a conversation.`,
    };
  }
  // Grade C: 1-3 years
  if (companyAge <= 1095 && (sicClassification.allowed || isResidential)) {
    return {
      grade: 'C',
      reasoning: `Established (${Math.round(companyAge/365 * 10) / 10} years). Stable but may be reviewing warehouse costs.`,
      hook: `If you're reviewing warehousing for the year ahead — Hellaby gives you competitive central UK pricing with strong reach across all GB postcodes. Glasgow 4hr, London 3hr, Felixstowe 3hr from one address.`,
    };
  }
  return { grade: null, reasoning: 'No trigger signals — deprioritised', hook: null };
}

// ── HARVEST ──────────────────────────────────────────────────────────────────
async function harvest({ batch_size = 100, days_back = 365 } = {}) {
  if (!CH_API_KEY) return { ok: false, error: 'COMPANIES_HOUSE_API_KEY not set — add to Vercel env vars' };

  const cap = Math.min(batch_size, 500);
  const fromDate = new Date(Date.now() - days_back * 86400000).toISOString().slice(0, 10);
  let inserted = 0, skipped = 0, blocked = 0;
  const errors = [];

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

      if (clf.blocked || (clf.unclassified)) {
        // Default: BLOCK unclassified (per spec)
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

      const isResidential = isResidentialAddress(addr);
      const isLondon = isInnerLondon(postcode);
      const region = assignRegion(postcode);

      const triggers = [];
      if (companyAge <= 90) triggers.push('incorporated_under_90d');
      else if (companyAge <= 365) triggers.push('incorporated_under_365d');
      if (isResidential) triggers.push('residential_address');
      if (isLondon) triggers.push('inner_london');

      const { grade, reasoning, hook } = scoreProspect({
        companyAge, isResidential, sicClassification: clf, isInLondon: isLondon,
        triggers, companyName: company.company_name,
      });

      if (!grade) { skipped++; continue; }

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
        trigger_signals:  JSON.stringify(triggers),
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

  return {
    ok: true,
    inserted, skipped, blocked,
    total_fetched: totalFetched,
    errors: errors.slice(0, 10),
    from_date: fromDate,
  };
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

// ── Generate draft via Claude + Atlas v2 system prompt ────────────────────────
// Unified with generateDrafts() in atlas.js — one source of truth for quality.
async function generateDraftViaAtlas(p) {
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
  const triggers = JSON.parse(p.trigger_signals || '[]');
  const triggerText = triggers.map(t => ({
    incorporated_under_90d:  `incorporated just ${companyAge} days ago — very likely still setting up logistics`,
    incorporated_under_365d: `incorporated ${Math.round((companyAge||0)/30)} months ago — growth stage, probably reviewing storage options`,
    residential_address:     'registered at a residential address — suggests not yet in a warehouse',
    inner_london:            'London-registered — London storage is expensive; central GB argument is strong',
  }[t] || t)).join('; ');

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

  const userMsg = [
    `Generate a cold outreach email for ${shortName} (${industry}), based in ${city}.`,
    ``,
    `Intelligence Engine context — use to personalise this email:`,
    `- ${gradeContext}`,
    ...(triggerText ? [`- Trigger signals: ${triggerText}`] : []),
    `- Outreach hook (use this verbatim or adapt it into the opening): "${p.outreach_hook}"`,
    ...(distanceContext ? [`- Geography: ${distanceContext}`] : []),
    ...(walesContext ? [`- Region note: ${walesContext}`] : []),
    `- SIC: ${sics[0]?.code} — ${sics[0]?.description || 'unknown'}`,
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
// grade: 'A'|'B'|'C'|null (null = A-tier only, production default)
// prospect_id: specific intelligence_prospect id to dispatch exactly one
async function scoreAndDispatch({ limit = 10, grade = null, prospect_id = null } = {}) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const cap = Math.min(limit, 50);
  let query;
  if (prospect_id) {
    query = `id=eq.${prospect_id}&atlas_dispatched=eq.false&enriched_email=not.is.null&select=*`;
  } else if (grade) {
    query = `score_grade=eq.${grade}&atlas_dispatched=eq.false&enriched_email=not.is.null&order=created_at.asc&limit=${cap}&select=*`;
  } else {
    query = `score_grade=eq.A&atlas_dispatched=eq.false&enriched_email=not.is.null&order=created_at.asc&limit=${cap}&select=*`;
  }

  const prospects = await sbSelect(TABLE, query);
  if (!prospects || prospects.length === 0) {
    return { ok: true, dispatched: 0, message: 'No matching undispatched prospects with email' };
  }

  let dispatched = 0;
  const errors = [];

  for (const p of prospects) {
    const draftData = await generateDraftViaAtlas(p);
    if (!draftData) {
      errors.push({ company: p.company_name, error: 'Claude draft generation failed' });
      continue;
    }

    const confidenceMap = { A: 85, B: 70, C: 55 };

    const validation = validateDraft({ subject: draftData.subject, body: draftData.body });
    const draftStatus = validation.pass ? 'pending_approval' : 'needs_revision';
    if (!validation.pass) {
      const errorRules = validation.issues.filter(i => i.severity === 'error').map(i => i.rule).join(', ');
      console.warn(`[Atlas validator] ${p.company_name} → needs_revision (${errorRules})`);
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
      }),
    };

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
  const [allRows, gradeA, gradeB, gradeC, dispatched] = await Promise.all([
    sbSelect(TABLE, 'select=id&limit=1&order=created_at.asc'), // just for existence check
    sbSelect(TABLE, 'score_grade=eq.A&select=id'),
    sbSelect(TABLE, 'score_grade=eq.B&select=id'),
    sbSelect(TABLE, 'score_grade=eq.C&select=id'),
    sbSelect(TABLE, 'atlas_dispatched=eq.true&select=id'),
  ]);
  const recent = await sbSelect(TABLE, 'order=created_at.desc&limit=20&select=id,company_name,company_number,postcode,region,score_grade,score_reasoning,outreach_hook,trigger_signals,enriched_email,enriched_website,atlas_dispatched,created_at');

  return {
    ok: true,
    counts: {
      total: (gradeA?.length || 0) + (gradeB?.length || 0) + (gradeC?.length || 0),
      A: gradeA?.length || 0,
      B: gradeB?.length || 0,
      C: gradeC?.length || 0,
      dispatched: dispatched?.length || 0,
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

module.exports = { harvest, enrich, scoreAndDispatch, harvestDaily, getStats, getProspect };
