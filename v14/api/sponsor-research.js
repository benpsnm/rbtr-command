// ═══════════════════════════════════════════════════════════════════════════
// RBTR · Sponsor research generator
//
// POST /api/sponsor-research { sponsor_id }
// 1. Loads sponsor row from Supabase
// 2. Calls Claude Opus with a structured intel prompt
// 3. Parses the JSON response
// 4. Inserts into sponsor_intelligence_reports
// 5. Returns the parsed report + the new row id
//
// Used by the Sponsors UI: click "Research" on a sponsor card → wait 15s →
// see a refreshed intel report on the same card.
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';

function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function getSponsor(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sponsor_targets?id=eq.${id}&select=*`, { headers: sbHeaders() });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

async function insertReport(row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/sponsor_intelligence_reports`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return await r.json();
}

// Appendix D — sponsor research prompt (v3 spec). Web search enabled at the API layer.
function buildPrompt(sponsor) {
  return `You are researching a potential sponsor for Rock Bottom to Roaming (RBTR), a family expedition brand building a Mercedes Arocs 6x6 for a 45-country, 5-year overland journey departing July 2027.

SPONSOR TO RESEARCH: ${sponsor.brand_name}
WEBSITE: ${sponsor.website || 'unknown'}
CATEGORY: ${sponsor.category}
WHAT RBTR IS ASKING FOR: ${sponsor.ask_summary} (£${sponsor.ask_gbp ?? sponsor.ask_value_gbp ?? '?'} value)

YOUR JOB

Produce a structured intelligence report that RBTR can use to approach this sponsor effectively. Every conclusion must be grounded in specific, real, recent information you can cite. No generic filler.

USE WEB SEARCH extensively. Prioritise:
- UK marketing presence and UK partnerships specifically
- Creator/ambassador programmes (not just broadcast media)
- Recent campaigns (last 12 months)
- Named individuals with verifiable roles
- Competitor activity that overlaps with RBTR's positioning (family overland, expedition truck, hand-built, UK-based)

RETURN VALID JSON, NOTHING ELSE:

{
  "company_summary": "3-sentence overview of company, UK presence, and how they typically work with creators",
  "recent_marketing_campaigns": [
    {
      "title": "campaign name",
      "date": "YYYY-MM",
      "summary": "what it was",
      "source_url": "where you found it"
    }
  ],
  "current_ambassadors": [
    {
      "name": "person or channel",
      "platform": "instagram/youtube/etc",
      "follower_count": 0,
      "notes": "why RBTR should know about them"
    }
  ],
  "competitor_sponsorships": [
    {
      "competitor": "rival brand in same category",
      "sponsored_creator": "who they sponsor",
      "platform": "where",
      "notes": "opportunity for RBTR to out-position"
    }
  ],
  "marketing_team_contacts": [
    {
      "name": "full name",
      "role": "exact role title",
      "linkedin": "verified LinkedIn URL",
      "email_inferred": "best guess email based on company pattern",
      "notes": "decision authority and relevance"
    }
  ],
  "recent_product_launches": [
    "product + one-line description"
  ],
  "sponsor_hooks": [
    "Specific opening line Ben can use — references real recent activity. Example: 'Saw your Alps campaign with [creator] last September — we're taking the Arocs down the same passes in July 2027, family in tow. Fundamentally different content angle.'",
    "Another specific hook."
  ],
  "risk_flags": [
    "e.g. budget cuts reported Q1, acquisition talks, ambassador programme paused"
  ],
  "confidence_score": 75
}

CONFIDENCE SCORE RULES:
- 90-100: Named UK contact found with verified LinkedIn, recent campaigns documented, clear ambassador programme, no risk flags
- 70-89: At least one named contact, good campaign history, no major flags
- 50-69: Some information found but key contacts unclear or campaign history thin
- 30-49: Mostly public-facing info only, no named contacts, limited recent activity
- 0-29: Almost nothing useful found — sponsor may be low priority

NARRATIVE DISCIPLINE:
- Do not surface anything about RBTR's legal history or Co-Lab
- Do not generate hooks that reference family hardship, financial collapse, or recovery narrative
- Hooks should reference Ben's craft (20 years fabrication), the Arocs (unusual vehicle), the route (rare destinations), or the sponsor's own activity

OUTPUT: valid JSON only. No markdown, no preamble, no commentary.`;
}

async function callClaude(prompt) {
  // v3 spec: sonnet-4-5 + web_search tool. Gracefully degrade to no-tools on
  // unsupported tool errors so a stale Claude API build doesn't break research.
  const baseBody = {
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  };
  const withSearch = {
    ...baseBody,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
  };

  async function post(body) {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  }

  let r = await post(withSearch);
  if (!r.ok && (r.status === 400 || r.status === 404)) {
    // Tool likely rejected — retry without web_search
    const errTxt = await r.text();
    console.warn('[sponsor-research] web_search unavailable, falling back', errTxt.slice(0, 200));
    r = await post(baseBody);
  }
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  // Multiple content blocks possible when tool use happens — concat text blocks
  return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

function safeParseJson(s) {
  // Strip code fences if Claude added any despite instructions
  const cleaned = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); }
  catch (e) {
    // Try extracting first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    throw new Error('Could not parse Claude response as JSON: ' + e.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' }); return; }
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'Supabase env not set' }); return; }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { res.status(400).json({ error: 'invalid json' }); return; }

  const { sponsor_id } = body;
  if (!sponsor_id) { res.status(400).json({ error: 'sponsor_id required' }); return; }

  try {
    const sponsor = await getSponsor(sponsor_id);
    if (!sponsor) { res.status(404).json({ error: 'sponsor not found' }); return; }

    const prompt = buildPrompt(sponsor);
    const raw = await callClaude(prompt);
    const parsed = safeParseJson(raw);

    const reportRow = {
      sponsor_id: sponsor.id,
      company_summary: parsed.company_summary || null,
      recent_marketing_campaigns: parsed.recent_marketing_campaigns || [],
      current_ambassadors: parsed.current_ambassadors || [],
      competitor_sponsorships: parsed.competitor_sponsorships || [],
      recent_product_launches: parsed.recent_product_launches || [],
      sponsor_hooks: parsed.sponsor_hooks || [],
      risk_flags: parsed.risk_flags || [],
      confidence_score: typeof parsed.confidence_score === 'number'
        ? Math.max(0, Math.min(100, Math.round(parsed.confidence_score)))
        : null,
    };

    const inserted = await insertReport(reportRow);
    if (inserted?.error) { res.status(500).json({ error: 'insert failed', detail: inserted }); return; }

    res.status(200).json({
      sponsor: { id: sponsor.id, brand_name: sponsor.brand_name },
      report: inserted[0] || reportRow,
    });
  } catch (err) {
    console.error('[sponsor-research] error', err);
    res.status(500).json({ error: err.message });
  }
};
