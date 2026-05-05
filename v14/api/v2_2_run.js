// ── Atlas v2.2 Pipeline · Vercel endpoint ────────────────────────────────────
// POST /api/v2_2_run?action=run_pipeline
//
// Actions:
//   run_pipeline       — run full 4-layer pipeline for a lead (lead_id or company)
//   smoke_test         — run against a named list of test leads (no dispatch)
//   audit_touch_counts — report touch count discrepancies (read-only)
//   fix_touch_counts   — apply corrections from audit (requires confirmed=true)
//
// Auth: x-rbtr-auth header (same as atlas.js pattern)
//
// NOTE ON FUNCTION LIMIT:
//   This is the 13th Vercel function in this project. Hobby plan limit is 12.
//   If on Hobby: upgrade to Pro, or merge this endpoint into jarvis.js.
//   This file is on feature/atlas-v2.2-intelligence-stack — not deployed until
//   smoke-tested and approved by Ben.

'use strict';

const { runPipeline, auditTouchCounts, applyTouchCountFix } = require('./_intelligence_pipeline');

const RBTR_AUTH_TOKEN = process.env.RBTR_AUTH_TOKEN;

function checkAuth(req) {
  if (!RBTR_AUTH_TOKEN) return { ok: true };
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization || '';
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return { ok: true };
  const supplied = req.headers?.['x-rbtr-auth'];
  const origin   = req.headers?.origin || '';
  const referer  = req.headers?.referer || '';
  const host     = req.headers?.host || '';
  const isSameOrigin = host && (origin.includes(host) || referer.includes(host)) &&
    (host.endsWith('.vercel.app') || host.startsWith('localhost'));
  if (supplied === RBTR_AUTH_TOKEN || isSameOrigin) return { ok: true };
  return { ok: false, error: 'x-rbtr-auth header missing or invalid' };
}

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).end(JSON.stringify(data, null, 2));
}

const SMOKE_TEST_LEADS = [
  { name: 'Gripple Ltd',        note: 'Wire manufacturer Sheffield — test standard B2B industrial' },
  { name: 'AF Blakemore & Son', note: 'FMCG distribution Doncaster — test large distributor' },
  { name: 'AJ Webb and Sons',   note: 'Fresh produce Sheffield — critic must catch cold storage pitch (ambient only)' },
  { name: 'ABI Electronics Ltd',note: 'Electronics manufacturing Barnsley — different industry lens' },
  { name: 'GW Engineering',     note: 'Micro engineering company Barnsley — owner-run, personal lens' },
];

module.exports = async function handler(req, res) {
  const auth = checkAuth(req);
  if (!auth.ok) return json(res, 401, { error: auth.error });

  const action = req.query?.action || (req.body?.action);

  // ── run_pipeline ────────────────────────────────────────────────────────────
  if (action === 'run_pipeline') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
    const { lead_id, company } = req.body || {};
    const input = lead_id || company;
    if (!input) return json(res, 400, { error: 'lead_id or company required' });
    const result = await runPipeline(input);
    return json(res, 200, result);
  }

  // ── smoke_test ──────────────────────────────────────────────────────────────
  if (action === 'smoke_test') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
    const { leads } = req.body || {};
    const testList = leads || SMOKE_TEST_LEADS;
    const results = [];
    for (const lead of testList) {
      const input = lead.lead_id || lead.name || lead.company;
      if (!input) { results.push({ input, error: 'no identifier' }); continue; }
      const r = await runPipeline(input);
      results.push({
        input,
        note: lead.note || null,
        final_status: r.final_status,
        draft_id: r.draft_id,
        quality_score: r.layers?.enricher?.quality_score,
        reasoner_confidence: r.layers?.reasoner?.confidence,
        critic_attempts: Object.keys(r.layers).filter(k => k.startsWith('critic_attempt')).length,
        critic_verdict: r.layers?.critic_final?.verdict,
        error: r.error || null,
      });
    }
    return json(res, 200, {
      smoke_test_at: new Date().toISOString(),
      count: results.length,
      results,
      note: 'All drafts in status=pending_approval await your review. DO NOT dispatch without manual approval.',
    });
  }

  // ── audit_touch_counts ──────────────────────────────────────────────────────
  if (action === 'audit_touch_counts') {
    const audit = await auditTouchCounts();
    return json(res, 200, audit);
  }

  // ── fix_touch_counts ────────────────────────────────────────────────────────
  if (action === 'fix_touch_counts') {
    if (req.method !== 'POST') return json(res, 405, { error: 'POST required' });
    const { confirmed, audit } = req.body || {};
    if (!confirmed) return json(res, 400, { error: 'confirmed=true required. Run audit_touch_counts first and pass the audit object.' });
    if (!audit?.discrepancies) return json(res, 400, { error: 'audit object with discrepancies required' });
    const fix = await applyTouchCountFix(audit);
    return json(res, 200, fix);
  }

  return json(res, 400, {
    error: 'unknown action',
    valid_actions: ['run_pipeline', 'smoke_test', 'audit_touch_counts', 'fix_touch_counts'],
  });
};
