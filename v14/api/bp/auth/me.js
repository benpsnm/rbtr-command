// ═══════════════════════════════════════════════════════════════════════════
// Booking Proof Get Current User
// GET /api/bp/auth/me
// Returns current logged-in user info
// ═══════════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session cookie
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const token = cookies?.bp_session;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.status(200).json({
      userId: decoded.userId,
      email: decoded.email,
      customerId: decoded.customerId,
    });

  } catch (error) {
    console.error('[BP Auth Me] Error:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}
