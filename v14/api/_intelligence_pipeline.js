'use strict';

// ── Atlas v2.2 · Orchestrator ─────────────────────────────────────────────────
// Runs all 4 layers in sequence for a given lead.
//
// Sequence:
//   Layer 1 (Enricher)  → enrichment_data + quality_score
//   ↓ if quality < 40: STOP → manual_research_required
//   Layer 2 (Reasoner)  → angle_brief + confidence
//   ↓ if confidence < 60: STOP → human_review_required
//   Layer 3 (Drafter)   → draft (status: pending_critic)
//   Layer 4 (Critic)    → pass/fail verdict
//   ↓ if fail & attempt < 3: retry Layer 3 with critique
//   ↓ if fail & attempt == 3: STOP → human_review_required
//   If pass: update draft status → pending_approval
//
// Also exports:
//   auditTouchCounts()    — report discrepancies between current_touch_count and actual sent
//   applyTouchCountFix()  — apply audit corrections (requires audit report as input)

const { enrichLead }  = require('./_enricher');
const { reasonLead }  = require('./_reasoner');
const { draftV22 }    = require('./_drafter_v2_2');
const { criticDraft } = require('./_critic');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_CRITIC_ATTEMPTS = 3;

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

async function sbUpdate(table, match, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
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

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function runPipeline(leadIdOrCompany, opts = {}) {
  const result = {
    lead_input: leadIdOrCompany,
    started_at: new Date().toISOString(),
    layers: {},
    final_status: null,
    draft_id: null,
    error: null,
  };

  // ── Layer 1: Enricher ──────────────────────────────────────────────────────
  const t1 = Date.now();
  const enrichResult = await enrichLead(leadIdOrCompany);
  result.layers.enricher = {
    ok: enrichResult.ok,
    from_cache: enrichResult.from_cache || false,
    quality_score: enrichResult.quality_score,
    quality_flag: enrichResult.quality_flag,
    lead_id: enrichResult.lead_id,
    enrichment_id: enrichResult.enrichment_id,
    ms: Date.now() - t1,
  };

  if (!enrichResult.ok) {
    result.final_status = 'enricher_error';
    result.error = enrichResult.error;
    return result;
  }
  if (enrichResult.quality_flag === 'manual_research_required') {
    result.final_status = 'manual_research_required';
    result.layers.enricher.summary = `Quality score ${enrichResult.quality_score}/100 — below threshold of 40. Insufficient public data to generate a credible angle. Manual research required before proceeding.`;
    return result;
  }

  const { lead_id: leadId, enrichment_data: enrichmentData, enrichment_id: enrichmentId, quality_score: qualityScore } = enrichResult;
  // Attach enrichment summary for readability
  result.layers.enricher.summary = buildEnrichmentSummary(enrichmentData);

  // Rate limit buffer: Enricher makes 2 Anthropic web_search calls; give the API
  // a brief window before Reasoner fires. Skip on cache hits (no API calls made).
  if (!enrichResult.from_cache) await new Promise(r => setTimeout(r, 1500));

  // ── Layer 2: Reasoner ──────────────────────────────────────────────────────
  const t2 = Date.now();
  const reasonResult = await reasonLead(leadId, enrichmentData, enrichmentId);
  result.layers.reasoner = {
    ok: reasonResult.ok,
    confidence: reasonResult.confidence,
    confidence_flag: reasonResult.confidence_flag,
    angle_id: reasonResult.angle_id,
    ms: Date.now() - t2,
  };

  if (!reasonResult.ok) {
    result.final_status = 'reasoner_error';
    result.error = reasonResult.error;
    return result;
  }
  if (reasonResult.confidence_flag === 'human_review_required') {
    result.final_status = 'human_review_required';
    result.layers.reasoner.angle_brief = reasonResult.angle_brief;
    result.layers.reasoner.summary = `Confidence ${reasonResult.confidence}/100 — below threshold of 60. Insufficient evidence to identify a credible angle. Human review required.`;
    return result;
  }

  const { angle_brief: angleBrief, angle_id: angleId } = reasonResult;
  result.layers.reasoner.angle_brief = angleBrief;

  // ── Layers 3 + 4: Drafter → Critic loop (max 3 attempts) ─────────────────
  let draftResult = null;
  let criticResult = null;
  let critique = null;
  const criticLog = [];

  for (let attempt = 1; attempt <= MAX_CRITIC_ATTEMPTS; attempt++) {
    // Layer 3: Draft
    const t3 = Date.now();
    draftResult = await draftV22(leadId, enrichmentData, angleBrief, angleId, enrichmentId, attempt, critique);
    result.layers[`drafter_attempt_${attempt}`] = {
      ok: draftResult.ok,
      draft_id: draftResult.draft_id,
      claim_verdict: draftResult.claim_verdict,
      validator_pass: draftResult.validator?.pass,
      validator_issue_count: draftResult.validator?.issues?.length || 0,
      ms: Date.now() - t3,
    };

    if (!draftResult.ok) {
      result.final_status = 'drafter_error';
      result.error = draftResult.error;
      return result;
    }

    // Store the last successful draft_id
    result.draft_id = draftResult.draft_id;

    // Layer 4: Critic
    const t4 = Date.now();
    criticResult = await criticDraft(
      draftResult.subject,
      draftResult.body,
      enrichmentData,
      angleBrief,
      draftResult.touch_number,
      { verdict: draftResult.claim_verdict, claims: draftResult.claims },
    );
    result.layers[`critic_attempt_${attempt}`] = {
      ok: criticResult.ok,
      verdict: criticResult.verdict,
      failed_checks: criticResult.failed_checks,
      ms: Date.now() - t4,
    };

    if (!criticResult.ok) {
      result.final_status = 'critic_error';
      result.error = criticResult.error;
      return result;
    }

    // Append to critic log on draft row
    const logEntry = {
      attempt,
      verdict: criticResult.verdict,
      failed_checks: criticResult.failed_checks || [],
      suggested_rewrite_prompt: criticResult.suggested_rewrite_prompt,
      ts: new Date().toISOString(),
    };
    criticLog.push(logEntry);

    if (draftResult.draft_id) {
      await sbUpdate('psnm_atlas_drafts', { id: draftResult.draft_id }, {
        critic_iterations: attempt,
        critic_log: criticLog,
      });
    }

    if (criticResult.verdict === 'pass') {
      // Promote draft to pending_approval
      if (draftResult.draft_id) {
        await sbUpdate('psnm_atlas_drafts', { id: draftResult.draft_id }, {
          status: 'pending_approval',
        });
      }
      result.final_status = 'pending_approval';
      result.layers.critic_final = {
        verdict: 'pass',
        attempts: attempt,
        checks: criticResult.checks,
      };
      break;
    }

    // Fail: prepare critique for next attempt
    critique = buildCritique(criticResult);

    if (attempt === MAX_CRITIC_ATTEMPTS) {
      // 3 failures — flag for human review
      if (draftResult.draft_id) {
        await sbUpdate('psnm_atlas_drafts', { id: draftResult.draft_id }, {
          status: 'needs_revision',
        });
      }
      result.final_status = 'human_review_required';
      result.layers.critic_final = {
        verdict: 'fail_max_attempts',
        attempts: MAX_CRITIC_ATTEMPTS,
        failed_checks: criticResult.failed_checks,
        last_critique: criticResult.suggested_rewrite_prompt,
        message: `Critic failed ${MAX_CRITIC_ATTEMPTS} consecutive attempts. Draft saved as needs_revision for human review.`,
      };
    }
  }

  result.completed_at = new Date().toISOString();
  result.total_ms = Date.now() - new Date(result.started_at).getTime();
  return result;
}

function buildCritique(criticResult) {
  const lines = [];
  lines.push(`CRITIC VERDICT: FAIL`);
  lines.push(`Failed checks: ${(criticResult.failed_checks || []).join(', ')}`);
  if (criticResult.suggested_rewrite_prompt) {
    lines.push(`\nSPECIFIC FIX REQUIRED:\n${criticResult.suggested_rewrite_prompt}`);
  }
  const failedDetails = (criticResult.checks || []).filter(c => c.result === 'fail');
  for (const c of failedDetails) {
    lines.push(`\n[${c.check}]: ${c.note}`);
  }
  return lines.join('\n');
}

function buildEnrichmentSummary(e) {
  const parts = [];
  if (e.companies_house) {
    parts.push(`CH: ${e.companies_house.company_status} | SIC: ${(e.companies_house.sic_codes || []).slice(0, 2).join(', ')}`);
  }
  parts.push(`Website: ${e.website?.scraped ? `scraped (${e.website.page_count} pages)` : 'not scraped'}`);
  parts.push(`News: ${e.news?.length || 0} items`);
  if (e.sector_headline) parts.push(`Sector: ${e.sector_headline.slice(0, 80)}`);
  return parts.join(' | ');
}

// ── Data integrity audit ──────────────────────────────────────────────────────
// Counts actual sent touches per lead vs stored current_touch_count.
// Returns discrepancy report. Does NOT modify data.

async function auditTouchCounts() {
  const [targets, allTouches] = await Promise.all([
    sbGet('psnm_outreach_targets', 'select=id,company,current_touch_count&order=company.asc&limit=500'),
    sbGet('psnm_outreach_touches',
      'select=target_id,outcome&outcome=in.(sent,delivered,opened,replied)'),
  ]);

  if (!Array.isArray(targets)) {
    return { ok: false, error: 'Could not fetch psnm_outreach_targets' };
  }

  // Aggregate actual sent count per target
  const actualCounts = {};
  for (const t of (allTouches || [])) {
    actualCounts[t.target_id] = (actualCounts[t.target_id] || 0) + 1;
  }

  const discrepancies = [];
  let cleanCount = 0;

  for (const t of targets) {
    const stored = t.current_touch_count || 0;
    const actual = actualCounts[t.id] || 0;
    if (stored !== actual) {
      discrepancies.push({
        id: t.id,
        company: t.company,
        stored,
        actual,
        delta: actual - stored,
        action_needed: actual < stored ? 'reduce_count' : 'increase_count',
      });
    } else {
      cleanCount++;
    }
  }

  return {
    ok: true,
    audited_at: new Date().toISOString(),
    total_targets: targets.length,
    clean_count: cleanCount,
    discrepancy_count: discrepancies.length,
    discrepancies,
    note: 'Run applyTouchCountFix(audit) to apply corrections. Preview only — no changes made.',
  };
}

// ── Apply touch count fix ─────────────────────────────────────────────────────
// Applies the corrections from an audit report. Requires the audit report as input
// to prevent applying stale or un-reviewed data.

async function applyTouchCountFix(audit) {
  if (!audit?.discrepancies?.length) {
    return { ok: true, message: 'No discrepancies to fix', fixed: 0 };
  }
  const fixes = [];
  for (const d of audit.discrepancies) {
    const r = await sbUpdate('psnm_outreach_targets', { id: d.id }, {
      current_touch_count: d.actual,
    });
    fixes.push({
      id: d.id,
      company: d.company,
      old_count: d.stored,
      new_count: d.actual,
      ok: !r?.error,
      error: r?.error || null,
    });
  }
  const successCount = fixes.filter(f => f.ok).length;
  return {
    ok: true,
    applied_at: new Date().toISOString(),
    fixed: successCount,
    failed: fixes.length - successCount,
    detail: fixes,
  };
}

module.exports = { runPipeline, auditTouchCounts, applyTouchCountFix };
