// ═══════════════════════════════════════════════════════════════════════════
// Booking Proof Request Magic Link
// POST /api/bp/auth/request-link
// Sends magic link to existing user
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    // Find user by email
    const users = await sbQuery('bp_users', `email=eq.${encodeURIComponent(email)}`);

    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If that email is registered, a magic link has been sent.',
      });
    }

    const user = users[0];

    // Generate new magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with new token
    await sbQuery('bp_users', `id=eq.${user.id}`, 'PATCH', {
      magic_link_token: token,
      token_expires: tokenExpires.toISOString(),
    });

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
          subject: 'Sign in to Booking Proof',
        }],
        from: { email: 'hello@bookingproof.co', name: 'Booking Proof' },
        content: [{
          type: 'text/html',
          value: `
            <h1>Sign in to Booking Proof</h1>
            <p>Click the link below to sign in:</p>
            <p><a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background: #b87333; color: #0a0a0a; text-decoration: none; border-radius: 6px; font-weight: 600;">Sign In</a></p>
            <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
          `,
        }],
      }),
    });

    if (!sgResponse.ok) {
      console.error('[BP Request Link] SendGrid error:', await sgResponse.text());
    }

    return res.status(200).json({
      success: true,
      message: 'If that email is registered, a magic link has been sent.',
    });

  } catch (error) {
    console.error('[BP Request Link] Error:', error);
    return res.status(500).json({
      error: 'Failed to send magic link',
      message: error.message,
    });
  }
}
