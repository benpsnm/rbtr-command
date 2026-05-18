// ═══════════════════════════════════════════════════════════════════════════
// Customer Portal - Verify Magic Link
// GET /api/customer/auth/verify?token=xxx
// Validates token, creates session, redirects to dashboard
// ═══════════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

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

  if (!response.ok) return method === 'GET' ? [] : null;
  return method === 'GET' || method === 'PATCH' ? await response.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Invalid Link</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h1>Invalid Login Link</h1>
        <p>No token provided.</p>
        <a href="/customer-portal/login">Request a new login link</a>
      </body>
      </html>
    `);
  }

  try {
    // Look up token
    const sessions = await sbQuery('psnm_customer_sessions', `token=eq.${token}&select=*,psnm_customers(id,email,company_name)`);

    if (sessions.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Invalid Link</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h1>Invalid Login Link</h1>
          <p>This link is not valid.</p>
          <a href="/customer-portal/login">Request a new login link</a>
        </body>
        </html>
      `);
    }

    const session = sessions[0];

    // Check if already used
    if (session.used) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link Already Used</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h1>Link Already Used</h1>
          <p>This login link has already been used.</p>
          <a href="/customer-portal/login">Request a new login link</a>
        </body>
        </html>
      `);
    }

    // Check if expired
    const tokenExpires = new Date(session.token_expires);
    if (tokenExpires < new Date()) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link Expired</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h1>Link Expired</h1>
          <p>This login link has expired.</p>
          <a href="/customer-portal/login">Request a new login link</a>
        </body>
        </html>
      `);
    }

    // Mark token as used
    await sbQuery('psnm_customer_sessions', `id=eq.${session.id}`, 'PATCH', { used: true });

    // Create JWT session
    const customer = session.psnm_customers;
    const jwtToken = jwt.sign(
      {
        customer_id: customer.id,
        email: customer.email,
        company_name: customer.company_name,
        type: 'customer',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set cookie and redirect
    res.setHeader('Set-Cookie', `psnm_customer_session=${jwtToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`);
    res.setHeader('Location', '/customer-portal/dashboard');
    return res.status(302).end();

  } catch (error) {
    console.error('[Customer Verify Error]', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h1>Something Went Wrong</h1>
        <p>Unable to verify your login link.</p>
        <a href="/customer-portal/login">Request a new login link</a>
      </body>
      </html>
    `);
  }
}
