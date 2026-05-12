'use strict';

const { requireAuth } = require('./middleware');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const result = requireAuth(req);

  if (result.authorized) {
    return res.status(200).json({ authenticated: true });
  }
  return res.status(401).json({ authenticated: false });
};
