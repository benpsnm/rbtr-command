'use strict';
// Atlas v3 — EnrichmentAgent
// Wraps _enricher.js with proper retry logic, prospect table updates, and stage advancement.

const db = require('./_av3_db');
const { enrichLead } = require('./_enricher');

const ENRICHMENT_MAX_AGE_DAYS = 7;
const ENRICHMENT_MIN_QUALITY  = 40;

function msAgo(ts) {
  if (!ts) return Infinity;
  return Date.now() - new Date(ts).getTime();
}

class EnrichmentAgent {
  // Enrich a single prospect. Returns { ok, prospect_id, quality_score, from_cache, stage_advanced }
  async enrichOne(prospect) {
    const prospectId = prospect.id;

    // Skip if already freshly enriched
    const ageDays = msAgo(prospect.enriched_at) / 86400000;
    if (prospect.pipeline_stage !== 'raw' && ageDays < ENRICHMENT_MAX_AGE_DAYS && (prospect.enrichment_quality || 0) >= ENRICHMENT_MIN_QUALITY) {
      return { ok: true, prospect_id: prospectId, skipped: true, reason: 'fresh_cache' };
    }

    let enrichResult;
    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        // enrichLead accepts either a lead_id (for psnm_outreach_targets lookup) or a company name
        // For v3 prospects, we build an enrichment object manually
        enrichResult = await this._runEnrichment(prospect);
        if (enrichResult.ok) break;
        if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        if (attempt >= maxAttempts) {
          return { ok: false, prospect_id: prospectId, error: e.message, attempt };
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!enrichResult?.ok) {
      return { ok: false, prospect_id: prospectId, error: enrichResult?.error || 'enrichment_failed' };
    }

    const qualityScore = enrichResult.quality_score || 0;
    const enrichmentData = enrichResult.enrichment_data;

    // Update the prospect record
    const updatePayload = {
      enrichment_data:    enrichmentData,
      enrichment_quality: qualityScore,
      enriched_at:        new Date().toISOString(),
    };

    // Pull useful fields from enrichment into top-level columns
    if (enrichmentData?.companies_house?.company_name && !prospect.company) {
      updatePayload.company = enrichmentData.companies_house.company_name;
    }
    if (enrichmentData?.companies_house?.sic_codes) {
      updatePayload.sic_codes = enrichmentData.companies_house.sic_codes;
    }
    if (enrichmentData?.companies_house?.registered_address) {
      const addr = enrichmentData.companies_house.registered_address;
      if (!prospect.postcode && addr.postal_code) updatePayload.postcode = addr.postal_code;
      if (!prospect.city && addr.locality) updatePayload.city = addr.locality;
    }

    // Advance stage if quality threshold met
    let stageAdvanced = false;
    if (qualityScore >= ENRICHMENT_MIN_QUALITY && prospect.pipeline_stage === 'raw') {
      updatePayload.pipeline_stage = 'enriched';
      stageAdvanced = true;
    } else if (qualityScore < ENRICHMENT_MIN_QUALITY) {
      updatePayload.pipeline_stage = 'dead';
      updatePayload.status = 'dead';
      updatePayload.notes = (prospect.notes || '') + ` [EnrichmentAgent: quality_score=${qualityScore}, below threshold]`;
    }

    await db.update('prospects', { id: prospectId }, updatePayload);

    if (stageAdvanced) {
      await db.logStageTransition(prospectId, 'raw', 'enriched', 'EnrichmentAgent', `quality=${qualityScore}`);
    } else if (qualityScore < ENRICHMENT_MIN_QUALITY) {
      await db.logStageTransition(prospectId, prospect.pipeline_stage, 'dead', 'EnrichmentAgent', `quality=${qualityScore} below ${ENRICHMENT_MIN_QUALITY}`);
    }

    return {
      ok: true,
      prospect_id:    prospectId,
      quality_score:  qualityScore,
      from_cache:     enrichResult.from_cache || false,
      stage_advanced: stageAdvanced,
      new_stage:      updatePayload.pipeline_stage || prospect.pipeline_stage,
    };
  }

  // Internal: run enrichment using _enricher.js or legacy intelligence core
  async _runEnrichment(prospect) {
    // If there's a source_ref pointing to a legacy psnm_outreach_targets row,
    // use the enrichLead function directly with the legacy lead_id
    if (prospect.source === 'psnm_outreach' && prospect.source_ref) {
      return enrichLead(prospect.source_ref, {});
    }

    // Otherwise build a pseudo-lead object for enrichment
    // enrichLead expects a company name lookup fallback
    return enrichLead(prospect.company, {
      domain:   prospect.domain,
      postcode: prospect.postcode,
    });
  }

  // Run enrichment on a batch of raw prospects
  async runBatch(limit = 10) {
    const rawProspects = await db.select('prospects',
      `pipeline_stage=eq.raw&status=eq.active&order=created_at.asc&limit=${limit}`);
    if (!Array.isArray(rawProspects) || rawProspects.length === 0) {
      return { ok: true, processed: 0, reason: 'no_raw_prospects' };
    }

    const results = [];
    for (const p of rawProspects) {
      // Rate-limit between prospects
      if (results.length > 0) await new Promise(r => setTimeout(r, 1500));
      const r = await this.enrichOne(p);
      results.push(r);
    }

    const succeeded = results.filter(r => r.ok && r.stage_advanced).length;
    const failed = results.filter(r => !r.ok).length;
    const dead = results.filter(r => r.ok && r.new_stage === 'dead').length;

    return { ok: true, processed: rawProspects.length, advanced: succeeded, failed, dead };
  }
}

module.exports = EnrichmentAgent;
