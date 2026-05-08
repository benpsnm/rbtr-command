'use strict';

// ── PSNM Auto-Responder · Phase 3 · Enricher ─────────────────────────────────
// Enriches an inbound sender with Companies House data, PSNM domain history,
// and geo-distance from S66 8HR.
//
// POST /api/autorespond/enrich
// Auth: x-rbtr-auth header | psnm_session cookie | CRON_SECRET
// Body: { from_email, sender_domain, from_name? }
// Returns: { companies_house, domain_history, distance, enriched_at }

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const CH_API_KEY    = process.env.COMPANIES_HOUSE_API_KEY;
const RBTR_TOKEN    = process.env.RBTR_AUTH_TOKEN;
const CRON_SECRET   = process.env.CRON_SECRET;

// ── Auth ──────────────────────────────────────────────────────────────────────
function checkAuth(req) {
  const headerToken = req.headers['x-rbtr-auth'];
  if (headerToken !== undefined) {
    if (!RBTR_TOKEN) return false;
    const a = Buffer.from(headerToken);
    const b = Buffer.from(RBTR_TOKEN);
    return a.length === b.length && require('crypto').timingSafeEqual(a, b);
  }
  const cronHeader = req.headers['x-cron-secret'] || req.headers['authorization'];
  if (cronHeader) {
    const token = cronHeader.replace(/^Bearer\s+/, '');
    if (CRON_SECRET && token === CRON_SECRET) return true;
  }
  try {
    const { parse } = require('cookie');
    const { verify } = require('jsonwebtoken');
    const cookies = parse(req.headers.cookie || '');
    const session = cookies['psnm_session'];
    if (!session) return false;
    const payload = verify(session, process.env.SESSION_SIGNING_KEY, { algorithms: ['HS256'] });
    return payload.role === 'wms' && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

// ── Companies House lookup ────────────────────────────────────────────────────
// Given a domain or email, try to infer company name and look it up on CH.

function companyNameFromDomain(domain) {
  if (!domain || domain.endsWith('.gmail.com') || domain.endsWith('.yahoo.com') ||
      domain.endsWith('.hotmail.com') || domain.endsWith('.outlook.com') ||
      domain.endsWith('.icloud.com') || domain.endsWith('.me.com')) {
    return null;
  }
  // Strip common suffixes and convert to readable name
  return domain
    .replace(/\.(co\.uk|com|org\.uk|ltd\.uk|plc\.uk|net|io|co)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

async function chFetch(path) {
  if (!CH_API_KEY) return null;
  const creds = Buffer.from(`${CH_API_KEY}:`).toString('base64');
  try {
    const r = await fetch(`https://api.company-information.service.gov.uk${path}`, {
      headers: { Authorization: `Basic ${creds}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function lookupCompaniesHouse(companyName) {
  if (!companyName || !CH_API_KEY) return null;
  const search = await chFetch(`/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=3`);
  if (!search?.items?.length) return null;

  const best = search.items.find(i => i.company_status === 'active') || search.items[0];
  if (!best) return null;

  const profile = await chFetch(`/company/${best.company_number}`);
  if (!profile) return {
    company_number: best.company_number,
    company_name: best.title,
    company_status: best.company_status,
    match_confidence: 'low',
  };

  const addr = profile.registered_office_address || {};
  const postcode = addr.postal_code || null;

  return {
    company_number:   profile.company_number,
    company_name:     profile.company_name,
    company_status:   profile.company_status,
    date_of_creation: profile.date_of_creation || null,
    sic_codes:        profile.sic_codes || [],
    registered_address: [
      addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code
    ].filter(Boolean).join(', '),
    postcode,
    match_confidence: 'medium',
  };
}

// ── Distance lookup from S66 8HR ──────────────────────────────────────────────
// Approx road distances in miles from Hellaby S66 8HR by postcode area.
const HELLABY_DISTANCES = {
  S:5, DN:12, WF:25, HD:20, HX:30, BD:35, LS:40, HG:50, HU:60, YO:65,
  NG:40, DE:30, LN:60, LE:70, NN:90, PE:90,
  ST:55, DY:75, WV:75, WS:80, B:80, TF:80, CV:85, WR:105, HR:120,
  TS:55, DL:60, DH:70, SR:75, NE:80,
  SK:55, BB:55, OL:55, BL:60, M:65, PR:65, FY:75, L:80, WA:75, WN:70, CW:80, CH:90, LA:100, CA:130,
  CB:120, MK:125, SG:150, CO:150, CM:155, AL:155, SN:160, IP:165, NR:165, SS:165, RM:175,
  SY:110, LD:130, LL:140, NP:145, CF:160, SA:175,
  EN:170, N:175, NW:175, E:175, W:180, WC:180, EC:180, WD:175, HA:185, SE:185, IG:175,
  DA:185, UB:185, KT:190, CR:190, SM:195, TW:195, BR:185, SW:195,
  OX:155, RG:185, SL:180, ME:200, BH:200, BN:215, RH:210, GU:210, SO:215, TN:210, CT:215, PO:225,
  GL:140, BS:165, BA:165, DT:200, EX:220, SP:190, TA:195, PL:245, TQ:240, TR:280,
  DG:200, G:230, FK:230, ML:235, KA:240, EH:250, TD:255, KY:265, PA:235, DD:280, PH:290, AB:370, IV:395,
};

function getDistanceInfo(postcode) {
  if (!postcode) return null;
  const area = postcode.toUpperCase().replace(/\s/g, '').match(/^([A-Z]{1,2})/)?.[1];
  if (!area) return null;
  const dist = HELLABY_DISTANCES[area] || (area.length === 2 ? HELLABY_DISTANCES[area[0]] : null);
  if (!dist) return null;
  const hrs = dist < 35 ? 'under 30 min' : dist < 55 ? 'about 45 min' : dist < 80 ? 'about 1 hr'
    : dist < 120 ? `about ${Math.round(dist / 55 * 2) / 2} hrs` : `${Math.round(dist / 55 * 2) / 2} hrs`;
  return { postcode: postcode.toUpperCase(), miles: dist, label: `~${dist} miles (~${hrs} drive)` };
}

// ── Domain history check ──────────────────────────────────────────────────────
// Look for previous enquiries from the same domain in psnm_inbound_replies and psnm_enquiries.

async function checkDomainHistory(domain) {
  if (!domain || !SUPABASE_URL) return { previous_enquiries: 0, first_seen: null, known_customer: false };

  const encodedDomain = encodeURIComponent(`%@${domain}`);

  const [replies, enquiries] = await Promise.all([
    sbSelect('psnm_inbound_replies', `from_email=ilike.${encodedDomain}&select=id,from_email,created_at&order=created_at.asc&limit=20`),
    sbSelect('psnm_enquiries', `email=ilike.${encodedDomain}&select=id,email,created_at,status&order=created_at.asc&limit=20`).catch(() => null),
  ]);

  const replyCount   = Array.isArray(replies)   ? replies.length   : 0;
  const enquiryCount = Array.isArray(enquiries)  ? enquiries.length : 0;
  const total        = replyCount + enquiryCount;

  const allDates = [
    ...(replies   || []).map(r => r.created_at),
    ...(enquiries || []).map(e => e.created_at),
  ].filter(Boolean).sort();

  const isCustomer = Array.isArray(enquiries) &&
    enquiries.some(e => e.status === 'customer' || e.status === 'active');

  return {
    previous_enquiries: total,
    reply_emails: replyCount,
    web_form_enquiries: enquiryCount,
    first_seen: allDates[0] || null,
    known_customer: isCustomer,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!checkAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  let body = {};
  try {
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    body = JSON.parse(raw);
  } catch { return res.status(400).json({ ok: false, error: 'invalid_json' }); }

  const { from_email, sender_domain, from_name } = body;
  const domain = sender_domain || (from_email ? from_email.split('@')[1] : null);

  if (!domain && !from_email) {
    return res.status(400).json({ ok: false, error: 'from_email or sender_domain required' });
  }

  try {
    // Run CH lookup + domain history check concurrently
    const companyName = companyNameFromDomain(domain) || from_name;

    const [chData, domainHistory] = await Promise.all([
      lookupCompaniesHouse(companyName),
      checkDomainHistory(domain),
    ]);

    // Distance from CH-registered postcode (best available) or null
    const postcode = chData?.postcode || null;
    const distance = getDistanceInfo(postcode);

    const enrichment = {
      companies_house: chData || null,
      domain_history: domainHistory,
      distance: distance || null,
      enriched_at: new Date().toISOString(),
    };

    return res.status(200).json({ ok: true, enrichment });

  } catch (e) {
    console.error('[enrich] unhandled error:', e.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

module.exports = handler;
