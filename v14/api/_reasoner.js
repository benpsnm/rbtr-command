'use strict';

// ── Atlas v2.2 · Layer 2 · Reasoner ──────────────────────────────────────────
// Input:  lead_id, enrichment_data, enrichment_id
// Model:  Claude Sonnet 4.6, temperature 0.3
// Job:    Identify the angle. Does NOT write email copy.
// Output: angle_brief with 6 structured fields + confidence (0-100)
// Storage: psnm_lead_angles
//
// If confidence < 60 → flag for human review, do not proceed to drafter.

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL         = 'claude-sonnet-4-6';

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    });
    if (!r.ok) return { error: await r.text() };
    return r.json();
  } catch (e) { return { error: e.message }; }
}

// ── System prompt ─────────────────────────────────────────────────────────────

const REASONER_SYSTEM = `You are the PSNM prospect analyst for Pallet Storage Near Me (PSNM).

PSNM is a 1,602-space ambient-only pallet warehouse in Hellaby, Rotherham S66 8HR. Ben Greenwood is the owner-operator. PSNM is looking for UK businesses that need overflow ambient pallet storage — seasonal peaks, contract wins, expansion, anything that creates variable demand for pallet space they don't want to hold themselves.

YOUR JOB — identify the angle. You are NOT writing the email. You are outputting a structured brief that will instruct the email writer. One sharp angle, backed by evidence, calibrated to the contact's role.

CONSTRAINTS:
- Base every claim on what is actually in the enrichment data. Do not assume or invent pain points.
- If the enrichment data shows the company handles food, pharma, hazardous materials, or chilled/frozen goods, set confidence to 0 and note this in what_to_avoid — PSNM is ambient-only and cannot serve those businesses.
- If the company appears to already have significant in-house warehousing capacity or is itself a 3PL/warehouse operator, lower confidence and note in what_to_avoid.
- The hook must reference a specific, real, publicly-verifiable item from the enrichment data — not a generic assumption about the industry.

OUTPUT FORMAT — return ONLY valid JSON, no markdown wrapper:
{
  "primary_pain_point": "one sentence — what is this prospect's most likely operational challenge where PSNM's ambient pallet storage helps? Be specific to this company, not to the industry in general.",
  "evidence": "quote or cite the specific item from enrichment_data that points to this pain point. Use exact company name, specific news item title, or SIC code/sector detail. If nothing specific, say 'No direct evidence — inferred from sector and company size.'",
  "prospect_role_lens": "what does this contact's role care about? E.g. an ops director cares about throughput, reliability, and not having to escalate problems. An MD cares about margin and risk. A warehouse manager cares about space and daily flow. Name the lens explicitly.",
  "hook": "the single most specific opening hook for this email. Must reference a real, public, verifiable fact about this prospect — not an assumption. E.g. a specific news item, a specific product they make, a recent contract win. Not: 'As a manufacturer in Yorkshire...'",
  "what_to_avoid": "anything in the enrichment data that makes this prospect a poor fit, or that should not be mentioned. E.g. if they handle food, note PSNM cannot serve them. If they already have a listed 3PL contract, note this. If none, write 'Nothing flagged.'",
  "confidence": 0
}`;

// ── Build context block from enrichment_data ──────────────────────────────────

function buildEnrichmentContext(enrichmentData) {
  const e = enrichmentData;
  const lines = [];

  lines.push(`== PROSPECT ==`);
  lines.push(`Company: ${e.lead?.company}`);
  lines.push(`Industry: ${e.lead?.industry}`);
  lines.push(`City: ${e.lead?.city}, ${e.lead?.postcode}`);
  if (e.lead?.decision_maker_name) {
    lines.push(`Contact: ${e.lead.decision_maker_name} — ${e.lead.decision_maker_role || 'role unknown'}`);
  }

  if (e.companies_house) {
    const ch = e.companies_house;
    lines.push(`\n== COMPANIES HOUSE ==`);
    lines.push(`Company number: ${ch.company_number}`);
    lines.push(`Status: ${ch.company_status}`);
    lines.push(`Incorporated: ${ch.date_of_creation || 'unknown'}`);
    lines.push(`SIC codes: ${(ch.sic_codes || []).join(', ') || 'none listed'}`);
    if (ch.accounts?.last_accounts_made_up_to) {
      lines.push(`Last accounts: ${ch.accounts.last_accounts_made_up_to}`);
    }
    if (ch.directors?.length > 0) {
      lines.push(`Directors: ${ch.directors.slice(0, 5).map(d => d.name).join(', ')}`);
    }
    if (ch.employees) lines.push(`Employee count (CH): ${ch.employees}`);
  }

  if (e.website?.scraped && e.website.pages?.length > 0) {
    lines.push(`\n== WEBSITE ==`);
    for (const page of e.website.pages.slice(0, 3)) {
      lines.push(`[${page.path}] ${page.excerpt?.slice(0, 500)}`);
    }
  } else if (e.website?.blocked_by_robots) {
    lines.push(`\n== WEBSITE == (blocked by robots.txt)`);
  } else {
    lines.push(`\n== WEBSITE == (not scraped or no content)`);
  }

  if (e.news?.length > 0) {
    lines.push(`\n== RECENT NEWS (last 90 days) ==`);
    for (const item of e.news.slice(0, 8)) {
      lines.push(`• [${item.date_approx || 'recent'}] ${item.title} — ${item.source}: ${item.snippet?.slice(0, 200)}`);
    }
  } else {
    lines.push(`\n== RECENT NEWS == (none found in last 90 days)`);
  }

  if (e.sector_headline) {
    lines.push(`\n== SECTOR CONTEXT ==`);
    lines.push(e.sector_headline);
  }

  return lines.join('\n');
}

// ── Main export ───────────────────────────────────────────────────────────────

async function reasonLead(leadId, enrichmentData, enrichmentId) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const context = buildEnrichmentContext(enrichmentData);
  const userMessage = `Here is the enrichment data for the prospect. Identify the best outreach angle for PSNM.

${context}

---

Return ONLY valid JSON as specified in the system prompt. Set confidence honestly — 60+ means you have specific evidence; below 60 means you're guessing.`;

  let parsed;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        temperature: 0.3,
        system: REASONER_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return { ok: false, error: `Anthropic API ${r.status}`, detail: err.slice(0, 300) };
    }
    const data = await r.json();
    const text = (data.content?.[0]?.text || '').trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: 'reasoner_parse_failed', raw: text.slice(0, 500) };
    parsed = JSON.parse(m[0]);
  } catch (e) {
    return { ok: false, error: 'reasoner_exception', detail: e.message };
  }

  const angleBrief = {
    primary_pain_point: parsed.primary_pain_point || '',
    evidence: parsed.evidence || '',
    prospect_role_lens: parsed.prospect_role_lens || '',
    hook: parsed.hook || '',
    what_to_avoid: parsed.what_to_avoid || '',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 50,
  };

  // Store in psnm_lead_angles
  const stored = await sbInsert('psnm_lead_angles', {
    lead_id: leadId,
    enrichment_id: enrichmentId || null,
    angle_brief: angleBrief,
    confidence: angleBrief.confidence,
    generated_at: new Date().toISOString(),
  });

  const angleId = Array.isArray(stored) ? stored[0]?.id : null;

  return {
    ok: true,
    lead_id: leadId,
    angle_id: angleId,
    angle_brief: angleBrief,
    confidence: angleBrief.confidence,
    confidence_flag: angleBrief.confidence < 60 ? 'human_review_required' : null,
  };
}

module.exports = { reasonLead };
