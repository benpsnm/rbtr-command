'use strict';

const { requireAuth } = require('../auth/middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbQuery(path) {
  const headers = { apikey: SUPABASE_KEY };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const auth = requireAuth(req);
  if (!auth.authorized) { res.status(401).json({ error: 'Unauthorized', reason: auth.reason }); return; }

  const url = new URL(req.url, `https://${req.headers?.host || 'x'}`);
  const status       = url.searchParams.get('status') || 'open';
  const project      = url.searchParams.get('project');
  const priority_max = url.searchParams.get('priority_max');

  let query = `rbtr_tasks?order=priority.asc,created_at.asc`;

  // Filter: status may be a comma-list e.g. open,in_progress
  if (status.includes(',')) {
    query += `&status=in.(${status})`;
  } else {
    query += `&status=eq.${status}`;
  }
  if (project)      query += `&project=eq.${encodeURIComponent(project)}`;
  if (priority_max) query += `&priority=lte.${parseInt(priority_max, 10)}`;

  query += '&select=id,description,priority,status,source,source_detail,project,blocked_reason,due_date,created_at,updated_at,completed_at';

  try {
    const rows = await sbQuery(query);
    res.status(200).json({ tasks: rows, count: rows.length });
  } catch (err) {
    console.error('[tasks/list]', err.message);
    res.status(500).json({ error: err.message });
  }
};
