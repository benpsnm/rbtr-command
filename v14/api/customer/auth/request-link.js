'use strict';
// PSNM Customer Portal — Magic Link Request
// POST /api/customer/auth/request-link
// Sends magic link email to customer

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'hello@palletstoragenearme.co.uk';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sbQuery(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!r.ok) return null;
  return r.json();
}

async function sbInsert(table, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbInsert ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

async function sendMagicLink(email, token, customerName) {
  const magicLink = `https://rbtr-jarvis.vercel.app/customer-portal/dashboard.html?token=${token}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 700; color: #1a1a1a; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
    .button { display: inline-block; background: #1a1a1a; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">PSNM</div>
      <div style="font-size: 14px; color: #666;">Pallet Storage Near Me</div>
    </div>

    <div class="content">
      <h2 style="margin-top: 0;">Access Your Customer Portal</h2>
      <p>Hi${customerName ? ' ' + customerName : ''},</p>
      <p>Click the button below to access your PSNM customer portal. This link is valid for 30 minutes.</p>
      <p style="text-align: center;">
        <a href="${magicLink}" class="button">Access Portal</a>
      </p>
      <p style="font-size: 14px; color: #666;">Or copy this link into your browser:<br>
        <span style="word-break: break-all;">${magicLink}</span>
      </p>
    </div>

    <div class="footer">
      <p>PSNM — Pallet Storage Near Me<br>
      1,602-space warehouse, Hellaby, Rotherham S66 8HR<br>
      <a href="https://palletstoragenearme.co.uk" style="color: #1a1a1a;">palletstoragenearme.co.uk</a></p>
      <p style="font-size: 12px;">If you didn't request this link, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const sgPayload = {
    personalizations: [{ to: [{ email }] }],
    from: { email: SENDGRID_FROM, name: 'PSNM Customer Portal' },
    subject: 'Your PSNM Customer Portal Access Link',
    content: [
      { type: 'text/plain', value: `Access your PSNM customer portal: ${magicLink}\n\nThis link is valid for 30 minutes.` },
      { type: 'text/html', value: emailHtml },
    ],
  };

  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sgPayload),
  });

  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`SendGrid ${r.status}: ${err.slice(0, 200)}`);
  }

  return true;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const { email } = body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Valid email required' });
  }

  try {
    // Look up customer by email
    const customers = await sbQuery('psnm_customers', `email=eq.${encodeURIComponent(email)}&limit=1`);

    // Always return success to avoid leaking customer existence
    if (!customers || customers.length === 0) {
      console.log('[request-link] Email not found (no error returned to client):', email);
      return res.status(200).json({ ok: true, message: 'If that email is registered, a magic link has been sent.' });
    }

    const customer = customers[0];

    // Generate cryptographic token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

    // Insert session
    await sbInsert('psnm_customer_sessions', {
      customer_id: customer.id,
      token,
      token_expires: expiresAt,
      ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      user_agent: req.headers['user-agent'] || null,
    });

    // Send magic link email
    await sendMagicLink(email, token, customer.company || customer.contact_name);

    return res.status(200).json({
      ok: true,
      message: 'If that email is registered, a magic link has been sent.',
    });

  } catch (e) {
    console.error('[request-link] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Failed to send magic link' });
  }
};
