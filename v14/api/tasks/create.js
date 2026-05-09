'use strict';

const { requireAuth } = require('../auth/middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbInsert(row) {
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rbtr_tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const auth = requireAuth(req);
  if (!auth.authorized) { res.status(401).json({ error: 'Unauthorized', reason: auth.reason }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { description, priority, project, source, source_detail, due_date } = body;

  if (!description || !source) {
    res.status(400).json({ error: 'description and source are required' });
    return;
  }

  const row = {
    description,
    priority: priority ? parseInt(priority, 10) : 3,
    source,
    ...(source_detail && { source_detail }),
    ...(project      && { project }),
    ...(due_date     && { due_date }),
  };

  try {
    const created = await sbInsert(row);
    res.status(201).json({ task: Array.isArray(created) ? created[0] : created });
  } catch (err) {
    console.error('[tasks/create]', err.message);
    res.status(500).json({ error: err.message });
  }
};
