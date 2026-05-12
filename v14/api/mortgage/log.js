'use strict';

// ── Mortgage Log — GET (list) + POST (add entry) ──────────────────────────────
// GET  /api/mortgage/log        → last 20 entries
// POST /api/mortgage/log        → insert new entry
// Auth: x-rbtr-auth header | psnm_session cookie

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RBTR_TOKEN   = process.env.RBTR_AUTH_TOKEN;

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function checkAuth(req) {
  const headerToken = req.headers['x-rbtr-auth'];
  if (headerToken !== undefined) {
    if (!RBTR_TOKEN) return false;
    const a = Buffer.from(headerToken);
    const b = Buffer.from(RBTR_TOKEN);
    return a.length === b.length && require('crypto').timingSafeEqual(a, b);
  }
  try {
    const { parse } = require('cookie');
    const { verify } = require('jsonwebtoken');
    const cookies = parse(req.headers.cookie || '');
    const session = cookies['psnm_session'];
    if (!session) return false;
    const payload = verify(session, process.env.SESSION_SIGNING_KEY, { algorithms: ['HS256'] });
    return payload.role === 'wms' && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!checkAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: 'supabase_not_configured' });
  }

  // ── GET — list last 20 entries ────────────────────────────────────────────
  if (req.method === 'GET') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/psnm_mortgage_log?order=date.desc,created_at.desc&limit=20`,
      { headers: sbHeaders() }
    );
    if (!r.ok) return res.status(502).json({ ok: false, error: await r.text() });
    const rows = await r.json();
    return res.status(200).json({ ok: true, entries: rows });
  }

  // ── POST — insert entry ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body = {};
    try {
      const raw = await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', chunk => { d += chunk; });
        req.on('end', () => resolve(d));
        req.on('error', reject);
      });
      body = JSON.parse(raw);
    } catch { return res.status(400).json({ ok: false, error: 'invalid_json' }); }

    const row = {
      date:           body.date           || new Date().toISOString().slice(0, 10),
      lender_contact: body.lender_contact || null,
      status:         body.status         || null,
      amount_owed:    body.amount_owed    ? Number(body.amount_owed)  : null,
      amount_paid:    body.amount_paid    ? Number(body.amount_paid)  : null,
      notes:          body.notes          || null,
    };

    const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_mortgage_log`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    });

    if (!r.ok) return res.status(502).json({ ok: false, error: await r.text() });
    const inserted = await r.json();
    return res.status(200).json({ ok: true, entry: Array.isArray(inserted) ? inserted[0] : inserted });
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

module.exports = handler;
