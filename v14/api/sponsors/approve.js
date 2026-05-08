'use strict';

// ── RBTR · Sponsor Outreach Approve ─────────────────────────────────────────
// POST /api/sponsors/approve  { id, status }
// Flips status on psnm_sponsor_outreach — does NOT send email.
// Valid statuses: approved | skipped
// Auth: requireAuth

const path = require('path');
const { requireAuth } = require(path.join(__dirname, '../auth/middleware'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbPatch(id, row) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/psnm_sponsor_outreach?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    }
  );
  if (!r.ok) return { error: await r.text() };
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const auth = requireAuth(req);
  if (!auth.authorized) { res.status(401).json({ error: 'Unauthorised' }); return; }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { res.status(400).json({ error: 'invalid_json' }); return; }

  const { id, status } = body;
  if (!id) { res.status(400).json({ error: 'id required' }); return; }
  if (!['approved', 'skipped'].includes(status)) {
    res.status(400).json({ error: 'status must be approved or skipped' });
    return;
  }

  const result = await sbPatch(id, { status });
  if (result?.error) { res.status(500).json({ error: 'patch_failed', detail: result }); return; }

  res.status(200).json({ ok: true, id, status, updated: result });
};
