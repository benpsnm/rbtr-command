'use strict';

const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { parse } = require('cookie');

function requireAuth(req) {
  // Mobile PWA routes (/m/*) are auth-exempt for easy install
  const url = req.url || '';
  if (url.startsWith('/m/') || url === '/m') {
    return { authorized: true, reason: 'mobile_pwa_exempt' };
  }

  const rbtrToken  = process.env.RBTR_AUTH_TOKEN;
  const signingKey = process.env.SESSION_SIGNING_KEY;

  if (!rbtrToken || !signingKey) {
    console.error('[auth/middleware] Missing RBTR_AUTH_TOKEN or SESSION_SIGNING_KEY');
    return { authorized: false, reason: 'server_misconfigured' };
  }

  const headerToken = req.headers['x-rbtr-auth'];

  // Path A — header present: evaluate it, do not fall through to cookie on failure
  if (headerToken !== undefined) {
    const a = Buffer.from(headerToken);
    const b = Buffer.from(rbtrToken);
    if (a.length !== b.length) {
      return { authorized: false, reason: 'invalid_token' };
    }
    if (crypto.timingSafeEqual(a, b)) {
      return { authorized: true };
    }
    return { authorized: false, reason: 'invalid_token' };
  }

  // Path B — no header: try cookie
  try {
    const cookies = parse(req.headers.cookie || '');
    const sessionToken = cookies['psnm_session'];
    if (!sessionToken) {
      return { authorized: false, reason: 'no_credentials' };
    }
    const payload = jwt.verify(sessionToken, signingKey, { algorithms: ['HS256'] });
    const now = Math.floor(Date.now() / 1000);
    if (payload.role !== 'wms' || payload.exp <= now) {
      return { authorized: false, reason: 'invalid_session' };
    }
    return { authorized: true };
  } catch (e) {
    return { authorized: false, reason: 'invalid_session' };
  }
}

module.exports = { requireAuth };
