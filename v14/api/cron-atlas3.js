'use strict';
// Atlas v3 — 15-minute orchestrator cron
// Fires every 15 minutes. Reads the prospect funnel, decides what agents to run,
// logs every decision and result to atlas_v3_run_log.

const db = require('./_av3_db');

const CRON_SECRET = process.env.CRON_SECRET;

// ── Funnel snapshot ───────────────────────────────────────────────────────────
async function getFunnelSnapshot() {
  const [
    raw, enriched, classified, drafted, dispatched, approvedDrafts,
    unclassifiedLegacy, unclassifiedV3,
  ] = await Promise.all([
    db.select('prospects', 'pipeline_stage=eq.raw&status=eq.active&select=id').then(r => (r || []).length).catch(() => 0),
    db.select('prospects', 'pipeline_stage=eq.enriched&status=eq.active&select=id').then(r => (r || []).length).catch(() => 0),
    db.select('prospects', `pipeline_stage=eq.classified&status=eq.active&fit_score=gte.50&select=id`).then(r => (r || []).length).catch(() => 0),
    db.select('prospects', 'pipeline_stage=eq.drafted&status=eq.active&select=id').then(r => (r || []).length).catch(() => 0),
    db.select('prospects', 'pipeline_stage=in.(dispatched,replied,hot)&status=eq.active&select=id').then(r => (r || []).length).catch(() => 0),
    db.select('prospect_drafts', 'status=eq.approved&select=id').then(r => (r || []).length).catch(() => 0),
    db.select('psnm_inbound_replies', 'status=eq.unread&select=id').then(r => (r || []).length).catch(() => 0),
    db.select('prospect_replies', 'intent=is.null&select=id').then(r => (r || []).length).catch(() => 0),
  ]);

  return { raw, enriched, classified, drafted, dispatched, approvedDrafts, unclassifiedLegacy, unclassifiedV3 };
}

// ── Orchestration decision ────────────────────────────────────────────────────
// Returns ordered list of { stage, reason } to run this tick.
// Capped to avoid timeouts — each batch is small, next tick picks up the rest.
function decideStages(snap) {
  const stages = [];

  // 1. Reply intent — always first (time-sensitive for hot prospects)
  if (snap.unclassifiedLegacy > 0 || snap.unclassifiedV3 > 0) {
    stages.push({ stage: 'reply_intent', reason: `${snap.unclassifiedLegacy + snap.unclassifiedV3} unclassified replies` });
  }

  // 2. Hot prospect eval — runs whenever there are dispatched/replied prospects
  if (snap.dispatched > 0) {
    stages.push({ stage: 'hot_eval', reason: `${snap.dispatched} active dispatched/replied/hot prospects` });
  }

  // 3. Dispatch — if approved drafts are waiting (rate-limited inside agent)
  if (snap.approvedDrafts > 0) {
    stages.push({ stage: 'dispatch', reason: `${snap.approvedDrafts} approved drafts ready to send` });
  }

  // 4. Enrich — new raw prospects
  if (snap.raw > 0) {
    stages.push({ stage: 'enrichment', reason: `${snap.raw} raw prospects need enrichment` });
  }

  // 5. Classify — enriched but unclassified
  if (snap.enriched > 0) {
    stages.push({ stage: 'classification', reason: `${snap.enriched} enriched prospects need classification` });
  }

  // 6. Draft — classified with sufficient fit score and no pending draft
  if (snap.classified > 0) {
    stages.push({ stage: 'drafting', reason: `${snap.classified} classified high-fit prospects need drafts` });
  }

  return stages;
}

// ── Run a single stage ────────────────────────────────────────────────────────
async function runStage(stage) {
  switch (stage) {
    case 'reply_intent': {
      const ReplyIntentAgent = require('./_av3_reply_intent');
      const agent = new ReplyIntentAgent();
      const [legacy, v3] = await Promise.all([
        agent.processLegacyReplies(20).catch(e => ({ ok: false, error: e.message })),
        agent.processV3Replies(20).catch(e => ({ ok: false, error: e.message })),
      ]);
      return { stage, legacy, v3 };
    }
    case 'hot_eval': {
      const HotProspectAgent = require('./_av3_hot_prospect');
      const r = await new HotProspectAgent().runBatch(30).catch(e => ({ ok: false, error: e.message }));
      return { stage, ...r };
    }
    case 'dispatch': {
      const DispatcherAgent = require('./_av3_dispatcher');
      const r = await new DispatcherAgent().runBatch(10).catch(e => ({ ok: false, error: e.message }));
      return { stage, ...r };
    }
    case 'enrichment': {
      const EnrichmentAgent = require('./_av3_enrichment');
      const r = await new EnrichmentAgent().runBatch(8).catch(e => ({ ok: false, error: e.message }));
      return { stage, ...r };
    }
    case 'classification': {
      const ClassifierAgent = require('./_av3_classifier');
      const r = await new ClassifierAgent().runBatch(10).catch(e => ({ ok: false, error: e.message }));
      return { stage, ...r };
    }
    case 'drafting': {
      const DrafterAgent = require('./_av3_drafter');
      const r = await new DrafterAgent().runBatch(3).catch(e => ({ ok: false, error: e.message }));
      return { stage, ...r };
    }
    default:
      return { stage, ok: false, error: `unknown stage: ${stage}` };
  }
}

// ── Log run to Supabase ───────────────────────────────────────────────────────
async function logRun(startedAt, stagesRun, results, summary) {
  const emailsSent = results
    .filter(r => r.stage === 'dispatch')
    .reduce((sum, r) => sum + (r.sent || 0), 0);

  const prospectsMoved = results.reduce((sum, r) => {
    return sum + (r.classified || 0) + (r.enriched || 0) + (r.drafted || 0) + (r.promoted || 0);
  }, 0);

  try {
    await db.insert('atlas_v3_run_log', {
      triggered_by:    'cron-atlas3',
      stages_run:      stagesRun,
      prospects_moved: prospectsMoved,
      emails_sent:     emailsSent,
      started_at:      startedAt,
      completed_at:    new Date().toISOString(),
      summary,
      detail:          results,
    }, { returning: false });
  } catch (e) {
    console.error('[cron-atlas3] Failed to log run:', e.message);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Vercel cron calls with Authorization: Bearer CRON_SECRET
  const authHeader = req.headers?.authorization || '';
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const startedAt = new Date().toISOString();
  console.log('[cron-atlas3] tick', startedAt);

  try {
    const snap = await getFunnelSnapshot();
    const stagesToRun = decideStages(snap);

    if (stagesToRun.length === 0) {
      await logRun(startedAt, [], [], 'No work needed this tick');
      return res.status(200).json({
        ok: true,
        tick: startedAt,
        funnel: snap,
        stages_run: [],
        summary: 'idle — funnel up to date',
      });
    }

    console.log('[cron-atlas3] running stages:', stagesToRun.map(s => s.stage).join(', '));

    const results = [];
    for (const { stage, reason } of stagesToRun) {
      console.log(`[cron-atlas3] → ${stage}: ${reason}`);
      const r = await runStage(stage);
      results.push(r);
    }

    const stagesRun = stagesToRun.map(s => s.stage);
    const emailsSent = results.filter(r => r.stage === 'dispatch').reduce((n, r) => n + (r.sent || 0), 0);
    const summary = `Ran: ${stagesRun.join(', ')}. Emails sent: ${emailsSent}. Funnel: raw=${snap.raw} enriched=${snap.enriched} classified=${snap.classified} hot=${snap.dispatched}`;

    await logRun(startedAt, stagesRun, results, summary);

    return res.status(200).json({
      ok: true,
      tick: startedAt,
      funnel: snap,
      stages_run: stagesToRun,
      results,
      summary,
    });
  } catch (e) {
    console.error('[cron-atlas3] fatal error:', e.message);
    await logRun(startedAt, [], [], `Fatal error: ${e.message}`).catch(() => null);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
