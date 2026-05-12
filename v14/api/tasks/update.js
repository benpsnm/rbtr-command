'use strict';

const { requireAuth } = require('../auth/middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbUpdate(id, patch) {
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rbtr_tasks?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const VALID_STATUSES = new Set(['open', 'in_progress', 'complete', 'skipped', 'blocked']);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'PUT') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const auth = requireAuth(req);
  if (!auth.authorized) { res.status(401).json({ error: 'Unauthorized', reason: auth.reason }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { id, status, priority, blocked_reason, due_date } = body;

  if (!id) { res.status(400).json({ error: 'id is required' }); return; }
  if (status && !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` });
    return;
  }

  const patch = {};
  if (status)         { patch.status = status; }
  if (priority)       { patch.priority = parseInt(priority, 10); }
  if (blocked_reason !== undefined) { patch.blocked_reason = blocked_reason; }
  if (due_date !== undefined)       { patch.due_date = due_date || null; }

  if (status === 'complete') {
    patch.completed_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  try {
    const updated = await sbUpdate(id, patch);
    res.status(200).json({ task: Array.isArray(updated) ? updated[0] : updated });
  } catch (err) {
    console.error('[tasks/update]', err.message);
    res.status(500).json({ error: err.message });
  }
};
