'use strict';

// ── STR Bookings API ──────────────────────────────────────────────────────────
// GET  /api/str/bookings            — list bookings (optionally filtered by date range)
// POST /api/str/bookings            — create a new booking
// PATCH /api/str/bookings?id=<uuid> — update an existing booking
//
// Auth: x-rbtr-auth header | psnm_session cookie | CRON_SECRET

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const RBTR_TOKEN   = process.env.RBTR_AUTH_TOKEN;
const CRON_SECRET  = process.env.CRON_SECRET;
const TABLE        = 'str_bookings';

// ── Auth ──────────────────────────────────────────────────────────────────────
function checkAuth(req) {
  const headerToken = req.headers['x-rbtr-auth'];
  if (headerToken !== undefined) {
    if (!RBTR_TOKEN) return false;
    const a = Buffer.from(headerToken);
    const b = Buffer.from(RBTR_TOKEN);
    return a.length === b.length && require('crypto').timingSafeEqual(a, b);
  }
  const cronHeader = req.headers['x-cron-secret'] || req.headers['authorization'];
  if (cronHeader) {
    const token = cronHeader.replace(/^Bearer\s+/, '');
    if (CRON_SECRET && token === CRON_SECRET) return true;
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

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function sbFetch(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...sbHeaders(), ...options.headers },
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path}: ${r.status} ${err.slice(0, 200)}`);
  }
  return r.json();
}

// ── Body parser ───────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!checkAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: 'supabase_not_configured' });
  }

  // ── GET — list bookings ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { from, to, status, platform, limit = '100' } = req.query || {};
    let query = `${TABLE}?order=check_in.asc&limit=${Math.min(parseInt(limit, 10) || 100, 500)}`;

    if (from)     query += `&check_in=gte.${from}`;
    if (to)       query += `&check_out=lte.${to}`;
    if (status)   query += `&status=eq.${status}`;
    if (platform) query += `&platform=eq.${platform}`;

    try {
      const bookings = await sbFetch(query);
      return res.status(200).json({ ok: true, bookings, count: bookings.length });
    } catch (e) {
      console.error('[str/bookings GET]', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // ── POST — create booking ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'invalid_json' }); }

    const { check_in, check_out } = body;
    if (!check_in || !check_out) {
      return res.status(400).json({ ok: false, error: 'check_in and check_out required' });
    }
    if (new Date(check_out) <= new Date(check_in)) {
      return res.status(400).json({ ok: false, error: 'check_out must be after check_in' });
    }

    const allowed = [
      'platform', 'external_id', 'guest_name', 'guest_email', 'check_in', 'check_out',
      'party_size', 'gross_revenue', 'platform_fee', 'cleaning_fee', 'status',
      'special_requests', 'notes', 'review_left', 'review_rating',
    ];
    const row = {};
    for (const k of allowed) {
      if (body[k] !== undefined) row[k] = body[k];
    }

    try {
      const [created] = await sbFetch(TABLE, {
        method: 'POST',
        body: JSON.stringify(row),
      });
      return res.status(201).json({ ok: true, booking: created });
    } catch (e) {
      console.error('[str/bookings POST]', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // ── PATCH — update booking ────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const id = (req.query || {}).id;
    if (!id) return res.status(400).json({ ok: false, error: 'id query param required' });

    let body;
    try { body = await readBody(req); }
    catch { return res.status(400).json({ ok: false, error: 'invalid_json' }); }

    const allowed = [
      'platform', 'external_id', 'guest_name', 'guest_email', 'check_in', 'check_out',
      'party_size', 'gross_revenue', 'platform_fee', 'cleaning_fee', 'status',
      'special_requests', 'notes', 'review_left', 'review_rating',
    ];
    const patch = { updated_at: new Date().toISOString() };
    for (const k of allowed) {
      if (body[k] !== undefined) patch[k] = body[k];
    }

    try {
      const updated = await sbFetch(`${TABLE}?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      return res.status(200).json({ ok: true, booking: updated[0] || null });
    } catch (e) {
      console.error('[str/bookings PATCH]', e.message);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'method_not_allowed' });
}

module.exports = handler;
