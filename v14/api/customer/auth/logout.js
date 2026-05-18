'use strict';
// PSNM Customer Portal — Logout
// GET /api/customer/auth/logout
// Clears session cookie, redirects to login

module.exports = async function handler(req, res) {
  // Clear cookie
  res.setHeader('Set-Cookie', 'psnm_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');

  // Redirect to login
  res.writeHead(302, { Location: '/customer-portal/login.html' });
  return res.end();
};
