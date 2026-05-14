'use strict';
// Atlas v3 — action dispatcher endpoint
//
// Actions (GET):
//   get_hot          — hot prospects list for UI
//   get_funnel       — stage counts for funnel view
//   get_prospects    — paginated prospect list with stage/status filters
//   get_replies      — unclassified + recent prospect_replies
//   get_drafts       — drafts pending approval
//   get_run_log      — recent orchestrator run log
//
// Actions (POST — require auth or CRON_SECRET):
//   ingest           — ingest a single raw prospect {company, city, domain, ...}
//   backfill_legacy  — ingest from psnm_outreach_targets (limit optional)
//   backfill_ww      — ingest from psnm_ww_leads (limit optional)
//   run_enrichment   — run EnrichmentAgent batch
//   run_classification — run ClassifierAgent batch
//   run_drafting     — run DrafterAgent batch
//   run_dispatch     — run DispatcherAgent batch
//   run_reply_intent — run ReplyIntentAgent on pending replies
//   run_hot_eval     — run HotProspectAgent evaluation
//   approve_draft    — {draft_id} → status=approved
//   reject_draft     — {draft_id, reason} → status=needs_revision

const { requireAuth } = require('./auth/middleware');
const db = require('./_av3_db');

const CRON_ACTIONS = new Set([
  'backfill_legacy', 'backfill_ww',
  'run_enrichment', 'run_classification', 'run_drafting',
  'run_dispatch', 'run_reply_intent', 'run_hot_eval',
]);

function isCronAuthed(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers?.authorization === `Bearer ${secret}`;
}

function checkAccess(req, action) {
  if (isCronAuthed(req)) return { ok: true };
  if (CRON_ACTIONS.has(action)) {
    // CRON_ACTIONS can also be called by authed users from UI
    const auth = requireAuth(req);
    if (auth.authorized) return { ok: true };
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  const auth = requireAuth(req);
  if (auth.authorized) return { ok: true };
  return { ok: false, status: 401, error: 'Unauthorized' };
}

// ── Funnel stats ─────────────────────────────────────────────────────────────
async function getFunnel() {
  const stages = ['raw', 'enriched', 'classified', 'drafted', 'dispatched', 'replied', 'hot', 'customer', 'dead'];
  const counts = await Promise.all(
    stages.map(s =>
      db.select('prospects', `pipeline_stage=eq.${s}&select=id`).then(r => ({
        stage: s, count: Array.isArray(r) ? r.length : 0,
      })).catch(() => ({ stage: s, count: 0 }))
    )
  );
  const hotActive = await db.select('prospects', 'hot_flag=eq.true&status=eq.active&select=id')
    .then(r => Array.isArray(r) ? r.length : 0).catch(() => 0);
  const approvedDrafts = await db.select('prospect_drafts', 'status=eq.approved&select=id')
    .then(r => Array.isArray(r) ? r.length : 0).catch(() => 0);
  return { ok: true, stages: counts, hot_active: hotActive, approved_drafts_ready: approvedDrafts };
}

// ── Get prospects with optional filters ──────────────────────────────────────
async function getProspects(query) {
  const stage  = query.stage  || null;
  const status = query.status || 'active';
  const limit  = Math.min(parseInt(query.limit || '50', 10), 200);
  let qs = `status=eq.${status}&order=fit_score.desc.nullslast&limit=${limit}`;
  if (stage) qs = `pipeline_stage=eq.${stage}&` + qs;
  const rows = await db.select('prospects',
    qs + '&select=id,company,city,domain,fit_score,pipeline_stage,hot_flag,touch_count,last_touched_at,hot_since,last_reply_intent,decision_maker_name,decision_maker_email,pallet_estimate,primary_sector'
  );
  return { ok: true, prospects: rows || [], count: (rows || []).length };
}

// ── Get drafts pending approval ───────────────────────────────────────────────
async function getDrafts(query) {
  const status = query.status || 'pending_approval';
  const limit  = Math.min(parseInt(query.limit || '20', 10), 100);
  const drafts = await db.select('prospect_drafts',
    `status=eq.${status}&order=created_at.desc&limit=${limit}&select=id,prospect_id,subject,body,touch_number,confidence_score,claim_verdict,critic_iterations,created_at`
  );
  if (!Array.isArray(drafts) || drafts.length === 0) return { ok: true, drafts: [] };

  // Attach company names
  const ids = [...new Set(drafts.map(d => d.prospect_id).filter(Boolean))];
  const prospects = ids.length > 0
    ? await db.select('prospects', `id=in.(${ids.join(',')})&select=id,company,city,fit_score`).catch(() => [])
    : [];
  const pMap = Object.fromEntries((prospects || []).map(p => [p.id, p]));

  return {
    ok: true,
    drafts: drafts.map(d => ({ ...d, prospect: pMap[d.prospect_id] || null })),
  };
}

// ── Get recent replies ────────────────────────────────────────────────────────
async function getReplies(query) {
  const limit = Math.min(parseInt(query.limit || '20', 10), 100);
  const unclassifiedOnly = query.unclassified === 'true';
  let qs = `order=received_at.desc&limit=${limit}`;
  if (unclassifiedOnly) qs = `intent=is.null&${qs}`;
  const replies = await db.select('prospect_replies', qs);
  return { ok: true, replies: replies || [] };
}

// ── Get run log ───────────────────────────────────────────────────────────────
async function getRunLog(query) {
  const limit = Math.min(parseInt(query.limit || '20', 10), 100);
  const rows = await db.select('atlas_v3_run_log',
    `order=started_at.desc&limit=${limit}&select=id,triggered_by,stages_run,prospects_moved,emails_sent,started_at,completed_at,summary`
  );
  return { ok: true, run_log: rows || [] };
}

// ── Ingest single prospect ────────────────────────────────────────────────────
async function ingestOne(body) {
  const { ProspectIngestor } = require('./_av3_ingestor');
  const ingestor = new ProspectIngestor();
  const result = await ingestor.ingest(body, body.source || 'manual', body.source_ref || null);
  return result;
}

// ── Backfill actions ──────────────────────────────────────────────────────────
async function backfillLegacy(body) {
  const { ProspectIngestor } = require('./_av3_ingestor');
  const ingestor = new ProspectIngestor();
  return ingestor.backfillFromLegacy(body.limit || 50);
}

async function backfillWW(body) {
  const { ProspectIngestor } = require('./_av3_ingestor');
  const ingestor = new ProspectIngestor();
  return ingestor.backfillFromWW(body.limit || 50);
}

// ── Agent batch actions ───────────────────────────────────────────────────────
async function runEnrichment(body) {
  const EnrichmentAgent = require('./_av3_enrichment');
  return new EnrichmentAgent().runBatch(body.limit || 10);
}

async function runClassification(body) {
  const ClassifierAgent = require('./_av3_classifier');
  return new ClassifierAgent().runBatch(body.limit || 10);
}

async function runDrafting(body) {
  const DrafterAgent = require('./_av3_drafter');
  return new DrafterAgent().runBatch(body.limit || 5);
}

async function runDispatch(body) {
  const DispatcherAgent = require('./_av3_dispatcher');
  return new DispatcherAgent().runBatch(body.limit || 10);
}

async function runReplyIntent(body) {
  const ReplyIntentAgent = require('./_av3_reply_intent');
  const agent = new ReplyIntentAgent();
  const [legacy, v3] = await Promise.all([
    agent.processLegacyReplies(body.limit || 20),
    agent.processV3Replies(body.limit || 20),
  ]);
  return { ok: true, legacy, v3 };
}

async function runHotEval(body) {
  const HotProspectAgent = require('./_av3_hot_prospect');
  return new HotProspectAgent().runBatch(body.limit || 30);
}

// ── Draft approval / rejection ────────────────────────────────────────────────
async function approveDraft(body) {
  const { draft_id } = body;
  if (!draft_id) return { ok: false, error: 'draft_id required' };
  await db.update('prospect_drafts', { id: draft_id }, {
    status: 'approved',
    approved_at: new Date().toISOString(),
  });
  return { ok: true, draft_id, action: 'approved' };
}

async function rejectDraft(body) {
  const { draft_id, reason } = body;
  if (!draft_id) return { ok: false, error: 'draft_id required' };
  await db.update('prospect_drafts', { id: draft_id }, {
    status: 'needs_revision',
    critic_log: reason || 'Rejected by user',
  });
  return { ok: true, draft_id, action: 'needs_revision' };
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  let body = {};
  if (req.method === 'POST') {
    try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); }
    catch { body = {}; }
  }

  const action = (req.method === 'GET' ? req.query?.action : body?.action) || '';
  if (!action) {
    return res.status(400).json({ ok: false, error: 'action param required' });
  }

  const access = checkAccess(req, action);
  if (!access.ok) return res.status(access.status || 401).json({ ok: false, error: access.error });

  try {
    let result;
    switch (action) {
      // ── GET actions
      case 'get_hot':          result = await new (require('./_av3_hot_prospect'))().getHotProspects(parseInt(req.query.limit || '10', 10)); break;
      case 'get_funnel':       result = await getFunnel(); break;
      case 'get_prospects':    result = await getProspects(req.query); break;
      case 'get_drafts':       result = await getDrafts(req.query); break;
      case 'get_replies':      result = await getReplies(req.query); break;
      case 'get_run_log':      result = await getRunLog(req.query); break;

      // ── POST actions
      case 'ingest':           result = await ingestOne(body); break;
      case 'backfill_legacy':  result = await backfillLegacy(body); break;
      case 'backfill_ww':      result = await backfillWW(body); break;
      case 'run_enrichment':   result = await runEnrichment(body); break;
      case 'run_classification': result = await runClassification(body); break;
      case 'run_drafting':     result = await runDrafting(body); break;
      case 'run_dispatch':     result = await runDispatch(body); break;
      case 'run_reply_intent': result = await runReplyIntent(body); break;
      case 'run_hot_eval':     result = await runHotEval(body); break;
      case 'approve_draft':    result = await approveDraft(body); break;
      case 'reject_draft':     result = await rejectDraft(body); break;

      // ── Generic Supabase query (for UI data fetching)
      case 'supabase_query': {
        if (!body.table) return res.status(400).json({ ok: false, error: 'table required' });
        const rows = await db.select(body.table, body.query || 'select=*');
        return res.status(200).json(rows || []);
      }

      default:
        return res.status(400).json({ ok: false, error: `unknown action: ${action}` });
    }
    return res.status(200).json(result);
  } catch (e) {
    console.error(`[atlas3] action=${action}`, e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
