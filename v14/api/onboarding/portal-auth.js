'use strict';

// GET /api/onboarding/portal-auth?token=XXX
// Step 2 of magic link auth: validates token, issues portal_session cookie, redirects.
// POST /api/onboarding/portal-auth (used by portal JS to check current session)

const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPatch } = require('../standalone/_db');
const { requirePortalAuth, issuePortalToken } = require('./_portal_auth');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(req, res);

  // GET with token = magic link claim
  if (req.method === 'GET' && req.query.token) {
    const token = req.query.token;

    try {
      const now = new Date().toISOString();
      const users = await sbGet('psnm_customer_portal_users', {
        login_token: `eq.${token}`,
        is_active: 'eq.true',
        select: 'id,customer_id,email,login_token_expires',
      });

      if (!users.length) {
        return res.redirect(302, '/customer-portal.html?error=invalid_token');
      }

      const user = users[0];
      if (!user.login_token_expires || new Date(user.login_token_expires) < new Date()) {
        return res.redirect(302, '/customer-portal.html?error=expired_token');
      }

      // Consume token (single use)
      await sbPatch('psnm_customer_portal_users', { id: user.id }, {
        login_token: null,
        login_token_expires: null,
        last_login: now,
        login_count: null, // will be incremented by trigger or next update
      });

      // Issue JWT cookie
      issuePortalToken(res, user.customer_id, user.id, user.email);

      return res.redirect(302, '/customer-portal.html#dashboard');
    } catch (e) {
      console.error('[portal-auth] token claim failed:', e.message);
      return res.redirect(302, '/customer-portal.html?error=server_error');
    }
  }

  // GET without token = session check
  if (req.method === 'GET') {
    const auth = requirePortalAuth(req);
    if (!auth.authorized) return res.status(401).json({ ok: false, reason: auth.reason });
    return res.status(200).json({ ok: true, customer_id: auth.customerId, email: auth.email });
  }

  return res.status(405).json({ error: 'method_not_allowed' });
};
