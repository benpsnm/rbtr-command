'use strict';

const { serialize } = require('cookie');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const cookie = serialize('psnm_session', '', {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    path:     '/',
    maxAge:   0,
  });

  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
};
