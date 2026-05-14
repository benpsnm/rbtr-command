'use strict';
// PSNM Customer Portal — Verify Magic Link Token
// GET /api/customer/auth/verify?token=xxx
// Validates token, sets session cookie, redirects to dashboard

const jwt = require('jsonwebtoken');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

async function sbQuery(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!r.ok) return null;
  return r.json();
}

async function sbUpdate(table, match, data) {
  const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbUpdate ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ ok: false, error: 'Token required' });
  }

  try {
    // Look up session
    const sessions = await sbQuery('psnm_customer_sessions', `token=eq.${encodeURIComponent(token)}&limit=1`);

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ ok: false, error: 'Invalid or expired token' });
    }

    const session = sessions[0];

    // Check if already used
    if (session.used) {
      return res.status(410).json({ ok: false, error: 'Token already used' });
    }

    // Check if expired
    if (new Date(session.token_expires) < new Date()) {
      return res.status(410).json({ ok: false, error: 'Token expired' });
    }

    // Mark token as used
    await sbUpdate('psnm_customer_sessions', { id: session.id }, {
      used: true,
      used_at: new Date().toISOString(),
    });

    // Create JWT session cookie
    const jwtToken = jwt.sign(
      { customer_id: session.customer_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HttpOnly cookie
    res.setHeader('Set-Cookie', `psnm_session=${jwtToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);

    // Redirect to dashboard
    res.writeHead(302, { Location: '/customer-portal/dashboard.html' });
    return res.end();

  } catch (e) {
    console.error('[verify] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Verification failed' });
  }
};
