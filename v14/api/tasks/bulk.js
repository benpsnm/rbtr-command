'use strict';

const crypto = require('crypto');
const { requireAuth } = require('../auth/middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET  = process.env.CRON_SECRET;

async function sbBulkInsert(rows) {
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rbtr_tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

function checkBulkAuth(req) {
  // Accept CRON_SECRET in Authorization header (Bearer) for agent use
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ') && CRON_SECRET) {
    const token = authHeader.slice(7);
    const a = Buffer.from(token);
    const b = Buffer.from(CRON_SECRET);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  // Fall through to standard auth
  return requireAuth(req).authorized;
}

const VALID_STATUSES = new Set(['open', 'in_progress', 'complete', 'skipped', 'blocked']);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  if (!checkBulkAuth(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const tasks = body.tasks || body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    res.status(400).json({ error: 'Body must be { tasks: [...] } or a non-empty array' });
    return;
  }
  if (tasks.length > 100) {
    res.status(400).json({ error: 'Max 100 tasks per bulk insert' });
    return;
  }

  const rows = [];
  const errors = [];

  tasks.forEach((t, i) => {
    if (!t.description || !t.source) {
      errors.push(`tasks[${i}]: description and source are required`);
      return;
    }
    if (t.status && !VALID_STATUSES.has(t.status)) {
      errors.push(`tasks[${i}]: invalid status "${t.status}"`);
      return;
    }
    rows.push({
      description:   t.description,
      priority:      t.priority ? parseInt(t.priority, 10) : 3,
      source:        t.source,
      ...(t.source_detail  && { source_detail: t.source_detail }),
      ...(t.project        && { project: t.project }),
      ...(t.status         && { status: t.status }),
      ...(t.blocked_reason && { blocked_reason: t.blocked_reason }),
      ...(t.due_date       && { due_date: t.due_date }),
    });
  });

  if (errors.length > 0) {
    res.status(400).json({ error: 'Validation errors', details: errors });
    return;
  }

  try {
    const created = await sbBulkInsert(rows);
    res.status(201).json({ created: created.length, tasks: created });
  } catch (err) {
    console.error('[tasks/bulk]', err.message);
    res.status(500).json({ error: err.message });
  }
};
