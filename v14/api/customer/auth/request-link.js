// ═══════════════════════════════════════════════════════════════════════════
// Customer Portal - Request Magic Link
// POST /api/customer/auth/request-link
// Generates magic link token and sends email via SendGrid
// ═══════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

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

  if (!response.ok) return method === 'GET' ? [] : null;
  return method === 'POST' || method === 'GET' ? await response.json() : null;
}

async function sendEmail(to, subject, html) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@palletstoragenearme.co.uk', name: 'PSNM Customer Portal' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });

  return response.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    // Look up customer by email
    const customers = await sbQuery('psnm_customers', `email=eq.${encodeURIComponent(email)}`);

    if (customers.length === 0) {
      return res.status(404).json({ error: 'No customer account found with this email address' });
    }

    const customer = customers[0];

    // Generate secure token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store session token
    await sbQuery('psnm_customer_sessions', '', 'POST', {
      customer_id: customer.id,
      token,
      token_expires: tokenExpires.toISOString(),
    });

    // Build magic link
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/customer/auth/verify?token=${token}`;

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: #000000; padding: 32px; text-align: center;">
            <h1 style="margin: 0; color: #b87333; font-family: 'Rye', serif; font-size: 36px; letter-spacing: 2px;">PSNM</h1>
            <p style="margin: 8px 0 0 0; color: #999999; font-size: 14px;">Pallet Storage Near Me</p>
          </div>

          <div style="padding: 40px 32px;">
            <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #1a1a1a;">Your Login Link</h2>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #555555; line-height: 1.6;">
              Click the button below to access your PSNM customer portal. This link will expire in 1 hour.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${magicLink}"
                 style="display: inline-block; padding: 14px 32px; background: #b87333; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                Access Customer Portal
              </a>
            </div>

            <p style="margin: 32px 0 0 0; font-size: 13px; color: #999999; line-height: 1.6;">
              If you didn't request this login link, you can safely ignore this email.
            </p>
          </div>

          <div style="background: #f5f5f5; padding: 24px 32px; border-top: 1px solid #e5e5e5;">
            <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
              © ${new Date().getFullYear()} PSNM. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailSent = await sendEmail(email, 'Your PSNM Customer Portal Login Link', emailHtml);

    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login link sent to your email',
    });

  } catch (error) {
    console.error('[Customer Request Link Error]', error);
    return res.status(500).json({
      error: 'Failed to generate login link',
      message: error.message,
    });
  }
}
