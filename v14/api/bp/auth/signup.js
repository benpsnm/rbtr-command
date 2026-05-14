// ═══════════════════════════════════════════════════════════════════════════
// Booking Proof Signup Endpoint
// POST /api/bp/auth/signup
// Creates new BP user and sends magic link
// ═══════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : '',
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

  return method === 'GET' || method === 'POST' ? await response.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, property_name } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    // Check if user already exists
    const existing = await sbQuery('bp_users', `email=eq.${encodeURIComponent(email)}`);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await sbQuery('bp_users', '', 'POST', {
      email,
      magic_link_token: token,
      token_expires: tokenExpires.toISOString(),
    });

    // If property name provided, create a bp_customer record linked to this user
    if (property_name) {
      const customer = await sbQuery('bp_customers', '', 'POST', {
        name: property_name,
        email: email,
        status: 'active',
      });

      // Link user to customer
      await sbQuery('bp_users', `id=eq.${user[0].id}`, 'PATCH', {
        customer_id: customer[0].id,
      });
    }

    // Send magic link via SendGrid
    const magicLink = `${req.headers.origin}/api/bp/auth/verify?token=${token}`;

    const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: 'Welcome to Booking Proof',
        }],
        from: { email: 'hello@bookingproof.co', name: 'Booking Proof' },
        content: [{
          type: 'text/html',
          value: `
            <h1>Welcome to Booking Proof</h1>
            <p>Click the link below to sign in to your account:</p>
            <p><a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background: #b87333; color: #0a0a0a; text-decoration: none; border-radius: 6px; font-weight: 600;">Sign In to Booking Proof</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
            <p style="color: #666; font-size: 14px;">If you didn't create this account, you can safely ignore this email.</p>
          `,
        }],
      }),
    });

    if (!sgResponse.ok) {
      console.error('[BP Signup] SendGrid error:', await sgResponse.text());
      // Don't fail signup if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Account created. Check your email for the magic link.',
    });

  } catch (error) {
    console.error('[BP Signup] Error:', error);
    return res.status(500).json({
      error: 'Signup failed',
      message: error.message,
    });
  }
}
