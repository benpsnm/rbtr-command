'use strict';

// Customer portal auth middleware.
// Separate from requireAuth() (which is for Ben's admin session).
// Customers use a JWT 'portal_session' cookie with role: 'customer'.

const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { parse } = require('cookie');

function requirePortalAuth(req) {
  const signingKey = process.env.SESSION_SIGNING_KEY;
  if (!signingKey) return { authorized: false, reason: 'server_misconfigured' };

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies['portal_session'];
    if (!token) return { authorized: false, reason: 'no_credentials' };
    const payload = jwt.verify(token, signingKey, { algorithms: ['HS256'] });
    const now = Math.floor(Date.now() / 1000);
    if (payload.role !== 'customer' || payload.exp <= now) {
      return { authorized: false, reason: 'invalid_session' };
    }
    return { authorized: true, customerId: payload.customer_id, portalUserId: payload.portal_user_id, email: payload.email };
  } catch (e) {
    return { authorized: false, reason: 'invalid_session' };
  }
}

function issuePortalToken(res, customerId, portalUserId, email) {
  const signingKey = process.env.SESSION_SIGNING_KEY;
  const exp = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
  const token = jwt.sign(
    { role: 'customer', customer_id: customerId, portal_user_id: portalUserId, email, exp },
    signingKey,
    { algorithm: 'HS256' }
  );
  res.setHeader('Set-Cookie',
    `portal_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
  );
  return token;
}

function generateMagicToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { requirePortalAuth, issuePortalToken, generateMagicToken };
