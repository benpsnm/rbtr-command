'use strict';
// Atlas v3 — DrafterAgent
// Generates outreach drafts via the existing v2.2 intelligence pipeline.
// Writes to prospect_drafts (v3) rather than psnm_atlas_drafts (legacy).

const db = require('./_av3_db');
const { runPipeline } = require('./_intelligence_core');

const MINIMUM_FIT_SCORE = 50;

class DrafterAgent {
  // Draft for a single classified prospect. Returns { ok, prospect_id, draft_id, status }
  async draftOne(prospect) {
    const prospectId = prospect.id;

    // Hard gate: don't draft below fit threshold
    if ((prospect.fit_score || 0) < MINIMUM_FIT_SCORE) {
      return { ok: false, prospect_id: prospectId, reason: 'fit_score_below_threshold', fit_score: prospect.fit_score };
    }
    if (prospect.exclusion_flags?.length > 0) {
      return { ok: false, prospect_id: prospectId, reason: 'hard_exclusion', exclusion_flags: prospect.exclusion_flags };
    }

    // Use the existing intelligence pipeline
    // It expects a legacy lead_id (from psnm_outreach_targets) OR a company name
    const pipelineInput = prospect.source_ref || prospect.company;

    let pipelineResult;
    try {
      pipelineResult = await runPipeline(pipelineInput);
    } catch (e) {
      return { ok: false, prospect_id: prospectId, error: e.message };
    }

    const finalStatus = pipelineResult?.final_status;
    const legacyDraftId = pipelineResult?.draft_id;

    // Mirror the legacy draft into v3 prospect_drafts table
    if (legacyDraftId) {
      const legacyDraft = await db.select('psnm_atlas_drafts', `id=eq.${legacyDraftId}&limit=1`);
      const ld = Array.isArray(legacyDraft) ? legacyDraft[0] : null;

      if (ld) {
        const [v3Draft] = await db.insert('prospect_drafts', {
          prospect_id:      prospectId,
          prospect_type:    prospect.prospect_type || 'psnm',
          touch_number:     ld.touch_number || 1,
          subject:          ld.subject,
          body:             ld.body,
          status:           ld.status === 'pending_approval' ? 'pending_approval' : 'needs_revision',
          source:           'v3_drafter',
          angle_brief:      ld.angle_id ? { angle_id: ld.angle_id } : null,
          critic_log:       ld.critic_log || null,
          critic_iterations:ld.critic_iterations || 0,
          confidence_score: ld.confidence_score || null,
          claim_verdict:    ld.claim_verdict || null,
        });

        const draftId = v3Draft?.id;

        // Advance stage
        if (ld.status === 'pending_approval') {
          await db.advanceStage(prospectId, 'classified', 'drafted', 'DrafterAgent', `draft_id=${draftId}`);
        }

        return {
          ok: true,
          prospect_id:  prospectId,
          draft_id:     draftId,
          legacy_draft: legacyDraftId,
          status:       ld.status,
          final_status: finalStatus,
        };
      }
    }

    // Pipeline ran but no draft (e.g. manual_research_required, human_review_required)
    return {
      ok: true,
      prospect_id:  prospectId,
      draft_id:     null,
      final_status: finalStatus,
      pipeline_result: pipelineResult,
      action: 'pipeline_ran_no_draft',
    };
  }

  // Run drafting on a batch of classified, high-fit prospects with no current draft
  async runBatch(limit = 5) {
    // Find classified prospects with no pending/approved draft in v3 table
    const classified = await db.select('prospects',
      `pipeline_stage=eq.classified&status=eq.active&fit_score=gte.${MINIMUM_FIT_SCORE}&order=fit_score.desc&limit=${limit}`);
    if (!Array.isArray(classified) || classified.length === 0) {
      return { ok: true, processed: 0, reason: 'no_classified_prospects_ready' };
    }

    // For each, check if they already have a draft in v3
    const results = [];
    for (const p of classified) {
      const existing = await db.select('prospect_drafts',
        `prospect_id=eq.${p.id}&status=in.(pending_approval,approved,pending_critic)&limit=1`);
      if (Array.isArray(existing) && existing.length > 0) {
        results.push({ prospect_id: p.id, skipped: true, reason: 'draft_exists' });
        continue;
      }

      // Rate limit between drafts
      if (results.length > 0) await new Promise(r => setTimeout(r, 2000));
      const r = await this.draftOne(p);
      results.push(r);
    }

    const drafted = results.filter(r => r.ok && r.draft_id).length;
    const failed = results.filter(r => !r.ok).length;
    const skipped = results.filter(r => r.skipped).length;

    return { ok: true, processed: classified.length, drafted, failed, skipped };
  }
}

module.exports = DrafterAgent;
