'use strict';

// ── Atlas v2.2 · Layer 3 · Drafter ───────────────────────────────────────────
// Input:  lead_id, enrichment_data, angle_brief, attempt (1-3), critique (optional)
// Model:  Claude Sonnet 4.6, temperature 0.7
// Output: subject, body, recipient — written to psnm_atlas_drafts
//         status = 'pending_critic' until Critic layer approves
//
// Prompt strategy:
//   Base = canonical v2.1 system prompt (loaded from docs/_atlas_system_prompt.md)
//   Additions = v2.2 mandatory section injected BEFORE the output format block
//
// All v2.1 prohibitions are inherited — do not duplicate them here.

const fs   = require('fs');
const path = require('path');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL         = 'claude-sonnet-4-6';

const V21_PROMPT_PATH = path.join(__dirname, 'docs', '_atlas_system_prompt.md');
let _cachedV21 = null;
function getV21Prompt() {
  if (!_cachedV21) {
    try { _cachedV21 = fs.readFileSync(V21_PROMPT_PATH, 'utf-8'); }
    catch { _cachedV21 = ''; }
  }
  return _cachedV21;
}

const { validateDraft } = require('./_draft_validator');
const { buildFactBlock, verifyDraft } = require('./_claim_verifier');

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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
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

async function sbUpdate(table, match, row) {
  const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
      method: 'PATCH',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    });
    if (!r.ok) return { error: await r.text() };
    return r.json();
  } catch (e) { return { error: e.message }; }
}

// ── v2.2 additions injected into the prompt ───────────────────────────────────

function buildV22Section(angleBrief, enrichmentHighlights, touchNumber, critique) {
  const lines = [];
  lines.push(`\n---\n\n## v2.2 INTELLIGENCE-LED DRAFT — MANDATORY REQUIREMENTS\n`);
  lines.push(`This is a v2.2 intelligence-led draft. The Reasoner layer has identified the following angle. You MUST use it.\n`);
  lines.push(`### ANGLE BRIEF (from Reasoner — use this as your foundation)`);
  lines.push(`Primary pain point: ${angleBrief.primary_pain_point}`);
  lines.push(`Evidence: ${angleBrief.evidence}`);
  lines.push(`Prospect role lens: ${angleBrief.prospect_role_lens}`);
  lines.push(`Hook: ${angleBrief.hook}`);
  lines.push(`What to avoid: ${angleBrief.what_to_avoid}\n`);
  lines.push(`### ENRICHMENT HIGHLIGHTS (real data — reference at least ONE item)`);
  lines.push(enrichmentHighlights);
  lines.push(`\n### MANDATORY RULES FOR v2.2`);
  lines.push(`1. OPEN with the hook from the angle brief above. Adapt it naturally — not word-for-word copy — but the same specific fact must anchor the opener.`);
  lines.push(`2. Reference the evidence item somewhere in the body. Make it feel like you did your homework, not like you're showing off.`);
  lines.push(`3. Calibrate tone to the prospect_role_lens above.`);
  lines.push(`4. Include ONE drive-time fact from the verified table (required by validator). Choose the destination most relevant to this prospect's likely distribution routes.`);
  lines.push(`5. Length: 100–140 words (body only, not counting sign-off). Tight. Every sentence earns its place.`);
  lines.push(`6. Touch number for this email: ${touchNumber}. Tone must match — Touch 1 = polite cold opener. Touch 2-3 = warmer reference to prior contact.`);
  lines.push(`7. All v2.1 prohibitions in the rules section below apply without exception.`);
  lines.push(`8. NO speculative claims about the prospect — no guessing their pallet count, staff count, revenue, current setup quality, or operations you haven't seen.`);

  if (critique) {
    lines.push(`\n### CRITIC FEEDBACK FROM PREVIOUS ATTEMPT — FIX THESE SPECIFICALLY`);
    lines.push(critique);
    lines.push(`\nDo not repeat the same mistakes. Rewrite, do not patch.`);
  }

  return lines.join('\n');
}

// ── Build enrichment highlights (what gets injected into the prompt) ──────────

function buildEnrichmentHighlights(enrichmentData) {
  const e = enrichmentData;
  const lines = [];
  const ch = e.companies_house;
  if (ch) {
    lines.push(`- Companies House: ${ch.company_name} | ${ch.company_status} | Incorporated ${ch.date_of_creation || 'unknown'} | SIC: ${(ch.sic_codes || []).join(', ')}`);
    if (ch.directors?.length > 0) lines.push(`- Directors: ${ch.directors.slice(0, 3).map(d => d.name).join(', ')}`);
  }
  if (e.news?.length > 0) {
    lines.push(`- Recent news:`);
    for (const n of e.news.slice(0, 3)) {
      lines.push(`  • ${n.title} (${n.source}, ${n.date_approx || 'recent'})`);
    }
  }
  if (e.website?.scraped && e.website.pages?.length > 0) {
    const homepage = e.website.pages[0];
    lines.push(`- Website (${homepage.path}): ${homepage.excerpt?.slice(0, 300)}`);
  }
  if (e.sector_headline) lines.push(`- Sector context: ${e.sector_headline}`);
  return lines.join('\n') || '(no enrichment highlights available)';
}

// ── Fetch touch count for lead ────────────────────────────────────────────────

async function getActualTouchCount(leadId) {
  const rows = await sbGet('psnm_outreach_touches',
    `target_id=eq.${leadId}&outcome=in.(sent,delivered,opened,replied)&select=id`);
  return Array.isArray(rows) ? rows.length : 0;
}

// ── Main export ───────────────────────────────────────────────────────────────

async function draftV22(leadId, enrichmentData, angleBrief, angleId, enrichmentId, attempt = 1, critique = null) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const lead = enrichmentData.lead || {};
  const touchNumber = await getActualTouchCount(leadId) + 1;
  const highlights = buildEnrichmentHighlights(enrichmentData);
  const v22Section = buildV22Section(angleBrief, highlights, touchNumber, critique);

  // Build the full prompt: v2.1 base + v2.2 additions
  const v21 = getV21Prompt();
  const systemPrompt = v21 + v22Section;

  // Pull fact registry for claim verifier
  const registry = await sbGet('psnm_atlas_fact_sources', 'select=claim_type,claim_key,claim_value') || [];
  const factBlock = buildFactBlock(registry);

  const userMessage = `Generate a v2.2 intelligence-led cold email for this prospect.

Company: ${lead.company}
Industry: ${lead.industry || 'unknown'}
City: ${lead.city || 'unknown'}
Contact: ${lead.decision_maker_name || 'the decision maker'} (${lead.decision_maker_role || 'role unknown'})
Touch number: ${touchNumber} of planned 5-touch sequence
Email: ${lead.email || '(no email on file)'}

${factBlock}

Return ONLY valid JSON as specified in the output format above (subject, body, framework_annotations, confidence_score).`;

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
        max_tokens: 1800,
        temperature: 0.7,
        system: systemPrompt,
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
    if (!m) return { ok: false, error: 'drafter_parse_failed', raw: text.slice(0, 500) };
    parsed = JSON.parse(m[0]);
  } catch (e) {
    return { ok: false, error: 'drafter_exception', detail: e.message };
  }

  const subject = parsed.subject || '';
  const body    = parsed.body || '';

  // Run claim verifier
  const claimResult = await verifyDraft(body, registry);

  // Run draft validator
  const validatorResult = validateDraft({ subject, body });

  // Write to psnm_atlas_drafts (status = pending_critic until critic approves)
  const draftRow = {
    prospect_id:          leadId,
    touch_number:         touchNumber,
    subject,
    body,
    framework_annotations: parsed.framework_annotations || [],
    confidence_score:     parsed.confidence_score || 0,
    status:               'pending_critic',
    source:               'v2.2_stack',
    enrichment_id:        enrichmentId || null,
    angle_id:             angleId || null,
    critic_iterations:    attempt - 1,
    critic_log:           critique ? [{ attempt: attempt - 1, critique }] : [],
  };
  const stored = await sbInsert('psnm_atlas_drafts', draftRow);
  const draftId = Array.isArray(stored) ? stored[0]?.id : null;

  return {
    ok: true,
    draft_id:       draftId,
    lead_id:        leadId,
    subject,
    body,
    touch_number:   touchNumber,
    attempt,
    claim_verdict:  claimResult.verdict,
    claims:         claimResult.claims,
    validator:      validatorResult,
    confidence:     parsed.confidence_score || 0,
    framework_annotations: parsed.framework_annotations || [],
  };
}

module.exports = { draftV22 };
