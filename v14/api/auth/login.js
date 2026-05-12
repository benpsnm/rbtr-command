'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { serialize } = require('cookie');

const THIRTY_DAYS_S = 60 * 60 * 24 * 30;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const hash = process.env.WMS_PASSWORD_HASH;
  const signingKey = process.env.SESSION_SIGNING_KEY;

  if (!hash || !signingKey) {
    console.error('[auth/login] Missing WMS_PASSWORD_HASH or SESSION_SIGNING_KEY');
    return res.status(500).json({ ok: false, error: 'server_configuration_error' });
  }

  const { password } = req.body || {};

  if (typeof password !== 'string' || !password) {
    return res.status(401).json({ ok: false, error: 'invalid_password' });
  }

  let match = false;
  try {
    match = await bcrypt.compare(password, hash);
  } catch (e) {
    console.error('[auth/login] bcrypt error:', e.message);
    return res.status(500).json({ ok: false, error: 'server_configuration_error' });
  }

  if (!match) {
    return res.status(401).json({ ok: false, error: 'invalid_password' });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { role: 'wms', iat: now, exp: now + THIRTY_DAYS_S },
    signingKey,
    { algorithm: 'HS256' }
  );

  const cookie = serialize('psnm_session', token, {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   THIRTY_DAYS_S,
  });

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
};
