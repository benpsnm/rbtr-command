'use strict';
// PSNM Customer Portal — Auth Middleware
// Validates psnm_session cookie, attaches req.customer_id

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

function extractCustomerId(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/psnm_session=([^;]+)/);
  if (!match) return null;

  try {
    const decoded = jwt.verify(match[1], JWT_SECRET);
    return decoded.customer_id || null;
  } catch {
    return null;
  }
}

function requireCustomerAuth(req) {
  const customerId = extractCustomerId(req);
  if (!customerId) {
    return { authorized: false, customer_id: null };
  }
  return { authorized: true, customer_id: customerId };
}

module.exports = { requireCustomerAuth, extractCustomerId };
