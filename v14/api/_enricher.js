'use strict';

// ── Atlas v2.2 · Layer 1 · Enricher ──────────────────────────────────────────
// Input:  lead_id (UUID or company name string)
// Output: enrichment_data blob + quality_score (0-100)
// Storage: psnm_lead_enrichment (upsert, one row per lead)
//
// Cache TTLs (enforced here, not DB):
//   Companies House:  30 days
//   Website scrape:   14 days
//   News search:       7 days  ← shortest TTL drives cache invalidation
//
// Quality score < 40 → flag for manual research, do not proceed to reasoner.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const CH_API_KEY   = process.env.COMPANIES_HOUSE_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const TABLE_TARGETS    = 'psnm_outreach_targets';
const TABLE_ENRICHMENT = 'psnm_lead_enrichment';

const CACHE_NEWS_DAYS = 7;
const SCRAPER_UA = 'PSNMEnrichBot/1.0 (palletstoragenearme.co.uk; contact: sales@palletstoragenearme.co.uk)';

// ── Supabase helpers ──────────────────────────────────────────────────────────

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sbGet(table, qs = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, {
      headers: sbHeaders(),
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function sbUpsert(table, row, conflict) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=representation,resolution=merge-duplicates' }),
      body: JSON.stringify(row),
    });
    if (!r.ok) return { error: await r.text() };
    return r.json();
  } catch (e) { return { error: e.message }; }
}

// ── Companies House API ───────────────────────────────────────────────────────

async function chFetch(path) {
  if (!CH_API_KEY) return null;
  const creds = Buffer.from(`${CH_API_KEY}:`).toString('base64');
  try {
    const r = await fetch(`https://api.company-information.service.gov.uk${path}`, {
      headers: { Authorization: `Basic ${creds}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function fetchCompaniesHouse(companyName) {
  const search = await chFetch(`/search/companies?q=${encodeURIComponent(companyName)}&items_per_page=5`);
  if (!search?.items?.length) return null;

  // Prefer active companies; fall back to first result
  const best = search.items.find(i => i.company_status === 'active') || search.items[0];
  const num = best.company_number;

  const [profile, officers] = await Promise.all([
    chFetch(`/company/${num}`),
    chFetch(`/company/${num}/officers?items_per_page=20`),
  ]);

  const directors = (officers?.items || [])
    .filter(o => o.officer_role === 'director' && !o.resigned_on)
    .map(o => ({
      name: o.name,
      role: o.officer_role,
      appointed: o.appointed_on || null,
    }));

  return {
    company_number: num,
    company_name: profile?.company_name || best.title,
    company_status: profile?.company_status || best.company_status,
    date_of_creation: profile?.date_of_creation || null,
    registered_address: profile?.registered_office_address || null,
    sic_codes: profile?.sic_codes || [],
    accounts: {
      last_accounts_made_up_to: profile?.accounts?.last_accounts?.made_up_to || null,
      accounting_reference_date: profile?.accounts?.accounting_reference_date || null,
      next_accounts_due: profile?.accounts?.next_due || null,
    },
    directors,
    employees: profile?.number_of_employees || null,
  };
}

// ── Website scraper ───────────────────────────────────────────────────────────

async function parseRobotsTxt(baseUrl) {
  // Returns list of disallowed path prefixes for User-agent: * (or our named UA).
  // Empty list means allow everything. Per RFC 9309: empty Disallow = allow all.
  try {
    const r = await fetch(`${baseUrl}/robots.txt`, {
      headers: { 'User-Agent': SCRAPER_UA },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const txt = await r.text();
    const lines = txt.split('\n').map(l => l.trim());
    const disallowed = [];
    let applicable = false;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith('user-agent:')) {
        applicable = lower.includes('*') || lower.includes('psnm') || lower.includes('enrichbot');
      }
      if (!applicable) continue;
      if (lower.startsWith('disallow:')) {
        const path = line.slice(9).trim(); // preserves original case for path comparison
        if (path) disallowed.push(path);   // empty Disallow = "allow all" per RFC 9309
      }
    }
    return disallowed;
  } catch { return []; }
}

function isPathBlocked(disallowRules, urlPath) {
  if (!disallowRules.length) return false;
  const p = urlPath || '/';
  return disallowRules.some(rule => p.startsWith(rule));
}

function stripHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<(header|footer|aside)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500);
}

async function fetchPage(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': SCRAPER_UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('html')) return null;
    return stripHtml(await r.text());
  } catch { return null; }
}

async function scrapeWebsite(website) {
  if (!website) return { scraped: false, pages: [] };
  const base = website.startsWith('http') ? website.replace(/\/$/, '') : `https://${website.replace(/\/$/, '')}`;

  const disallowRules = await parseRobotsTxt(base);

  const paths = ['', '/about', '/about-us', '/news', '/blog', '/press'];
  const pages = [];
  for (const p of paths) {
    if (pages.length >= 5) break;
    if (isPathBlocked(disallowRules, p || '/')) continue;
    const text = await fetchPage(`${base}${p}`);
    if (text && text.length > 150) pages.push({ path: p || '/', excerpt: text.slice(0, 1000) });
  }
  // blocked_by_robots: true only when the root path itself is disallowed (Disallow: /)
  const rootBlocked = isPathBlocked(disallowRules, '/');
  return { scraped: pages.length > 0, pages, blocked_by_robots: rootBlocked && pages.length === 0 };
}

// ── News + sector search (Anthropic web_search) ───────────────────────────────
// Split into two API calls with a 500ms gap between them to avoid rate-limit
// collisions when the Enricher and Reasoner fire in close succession.

async function fetchNewsAndSector(companyName, sector) {
  if (!ANTHROPIC_KEY) return { news: [], sector_headline: null };

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  const anthropicCall = async (prompt, maxUses) => {
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
          max_tokens: 1500,
          system: 'You are a business intelligence researcher. Complete the task using web search. Return only valid JSON.',
          messages: [{ role: 'user', content: prompt }],
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }],
        }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    } catch { return null; }
  };

  // Call 1: company news
  const newsResult = await anthropicCall(
    `Search for recent news about the company "${companyName}".
Search query: "${companyName}" news 2026
Filter to results from the last 90 days only. Exclude the company's own website. Return up to 8 results.

Return ONLY valid JSON, no markdown:
{"company_news":[{"title":"...","source":"...","date_approx":"...","snippet":"...","url":"..."}]}

If no news found, return {"company_news":[]}`,
    2,
  );

  // 500ms gap between web_search calls
  await sleep(500);

  // Call 2: sector headline
  const sectorResult = await anthropicCall(
    `Search for one recent UK trade press headline (last 30 days) for the "${sector}" sector.

Return ONLY valid JSON, no markdown:
{"sector_headline":"one sentence summary of recent ${sector} sector news in the UK"}

If no relevant news found, return {"sector_headline":null}`,
    2,
  );

  return {
    news: (newsResult?.company_news || []).slice(0, 10),
    sector_headline: sectorResult?.sector_headline || null,
  };
}

// ── Quality score ─────────────────────────────────────────────────────────────
// Max 100. Below 40 → flag for manual research.

function calcQualityScore(chData, webData, news, sectorHeadline) {
  let score = 0;
  if (chData) {
    score += 20; // CH data found at all
    if (chData.company_status === 'active') score += 10;
    if (chData.accounts?.last_accounts_made_up_to) score += 8;
    if (chData.directors?.length > 0) score += 7;
    if (chData.sic_codes?.length > 0) score += 5;
  }
  if (webData.scraped) {
    score += 10;
    if (webData.pages.length >= 3) score += 10;
    else if (webData.pages.length >= 1) score += 5;
  }
  if (news.length > 0) {
    score += 15;
    if (news.length >= 3) score += 5;
  }
  if (sectorHeadline) score += 10;
  return Math.min(score, 100);
}

// ── SIC → sector label ────────────────────────────────────────────────────────

const SIC_MAP = {
  17: 'Paper & Packaging Manufacturing',
  22: 'Rubber & Plastics Manufacturing',
  23: 'Non-Metallic Mineral Products',
  24: 'Basic Metals',
  25: 'Fabricated Metal Products',
  26: 'Electronics Manufacturing',
  27: 'Electrical Equipment Manufacturing',
  28: 'Machinery & Equipment Manufacturing',
  29: 'Automotive Manufacturing',
  30: 'Other Transport Equipment',
  31: 'Furniture Manufacturing',
  32: 'Other Manufacturing',
  46: 'Wholesale & Distribution',
  47: 'Retail',
  49: 'Road Transport & Logistics',
  52: 'Warehousing & Storage',
  53: 'Postal & Courier Services',
};

function sectorFromSIC(code) {
  if (!code) return null;
  const prefix = Math.floor(parseInt(code, 10) / 100);
  return SIC_MAP[prefix] || `SIC ${code}`;
}

// ── Main export ───────────────────────────────────────────────────────────────

async function enrichLead(leadIdOrCompany) {
  // 1. Resolve lead record
  let lead;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadIdOrCompany);
  if (isUUID) {
    const rows = await sbGet(TABLE_TARGETS,
      `id=eq.${leadIdOrCompany}&select=id,company,industry,city,postcode,website,email,phone,decision_maker_name,decision_maker_role`);
    lead = rows?.[0] || null;
  } else {
    const rows = await sbGet(TABLE_TARGETS,
      `company=ilike.${encodeURIComponent(leadIdOrCompany)}&select=id,company,industry,city,postcode,website,email,phone,decision_maker_name,decision_maker_role&limit=1`);
    lead = rows?.[0] || null;
  }
  if (!lead) return { ok: false, error: 'lead_not_found', input: leadIdOrCompany };

  // 2. Check cache (use news TTL as the shortest / most conservative)
  const cached = await sbGet(TABLE_ENRICHMENT, `lead_id=eq.${lead.id}&order=retrieved_at.desc&limit=1`);
  if (Array.isArray(cached) && cached.length > 0) {
    const ageMs = Date.now() - new Date(cached[0].retrieved_at).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < CACHE_NEWS_DAYS && (cached[0].quality_score || 0) >= 40) {
      return {
        ok: true,
        lead_id: lead.id,
        lead,
        enrichment_id: cached[0].id,
        enrichment_data: cached[0].enrichment_data,
        quality_score: cached[0].quality_score,
        from_cache: true,
        cached_at: cached[0].retrieved_at,
        quality_flag: null,
      };
    }
  }

  // 3. Fetch all enrichment sources in parallel where possible
  const [chData, webData] = await Promise.all([
    fetchCompaniesHouse(lead.company),
    scrapeWebsite(lead.website),
  ]);

  const topSIC = chData?.sic_codes?.[0] || null;
  const sector = sectorFromSIC(topSIC) || lead.industry || 'Manufacturing & Distribution';
  const { news, sector_headline } = await fetchNewsAndSector(lead.company, sector);

  // 4. Score
  const qualityScore = calcQualityScore(chData, webData, news, sector_headline);

  // 5. Build enrichment blob
  const enrichmentData = {
    lead: {
      id: lead.id,
      company: lead.company,
      industry: lead.industry,
      city: lead.city,
      postcode: lead.postcode,
      website: lead.website,
      email: lead.email,
      phone: lead.phone,
      decision_maker_name: lead.decision_maker_name || null,
      decision_maker_role: lead.decision_maker_role || null,
    },
    companies_house: chData,
    website: {
      scraped: webData.scraped,
      blocked_by_robots: webData.blocked_by_robots || false,
      page_count: webData.pages.length,
      pages: webData.pages,
    },
    news: news.slice(0, 10),
    sector_headline,
    sector,
    quality_score: qualityScore,
    enriched_at: new Date().toISOString(),
  };

  // 6. Upsert cache
  const upserted = await sbUpsert(TABLE_ENRICHMENT, {
    lead_id: lead.id,
    company_number: chData?.company_number || null,
    enrichment_data: enrichmentData,
    quality_score: qualityScore,
    retrieved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, 'lead_id');

  const enrichmentId = Array.isArray(upserted) ? upserted[0]?.id : null;

  return {
    ok: true,
    lead_id: lead.id,
    lead,
    enrichment_id: enrichmentId,
    enrichment_data: enrichmentData,
    quality_score: qualityScore,
    from_cache: false,
    quality_flag: qualityScore < 40 ? 'manual_research_required' : null,
  };
}

module.exports = { enrichLead };
