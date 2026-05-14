// ═══════════════════════════════════════════════════════════════════════════
// Booking Proof Verify Magic Link
// GET /api/bp/auth/verify?token=xxx
// Validates token, creates session, redirects to dashboard
// ═══════════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'PATCH' ? 'return=representation' : '',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }

  return method === 'GET' || method === 'PATCH' ? await response.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Invalid magic link');
  }

  try {
    // Find user by token
    const users = await sbQuery('bp_users', `magic_link_token=eq.${token}`);

    if (users.length === 0) {
      return res.status(400).send('Invalid or expired magic link');
    }

    const user = users[0];

    // Check if token expired
    if (new Date(user.token_expires) < new Date()) {
      return res.status(400).send('Magic link expired. Please request a new one.');
    }

    // Create JWT session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        customerId: user.customer_id,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Update user last_login and clear magic link token
    await sbQuery('bp_users', `id=eq.${user.id}`, 'PATCH', {
      last_login: new Date().toISOString(),
      magic_link_token: null,
      token_expires: null,
    });

    // Set session cookie
    res.setHeader('Set-Cookie', [
      `bp_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`,
    ]);

    // Redirect to dashboard
    res.writeHead(302, { Location: '/booking-proof/dashboard' });
    res.end();

  } catch (error) {
    console.error('[BP Verify] Error:', error);
    return res.status(500).send('Verification failed');
  }
}
