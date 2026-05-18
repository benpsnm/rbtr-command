// ═══════════════════════════════════════════════════════════════════════════
// Customer Portal - Get Current User
// GET /api/customer/auth/me
// Returns customer data from JWT session cookie
// ═══════════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {}) || {};

    const token = cookies.psnm_customer_session;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'customer') {
      return res.status(403).json({ error: 'Invalid session type' });
    }

    return res.status(200).json({
      customer_id: decoded.customer_id,
      email: decoded.email,
      company_name: decoded.company_name,
    });

  } catch (error) {
    console.error('[Customer Auth Me Error]', error);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}
