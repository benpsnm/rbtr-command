'use strict';

// POST /api/onboarding/portal-login
// Step 1 of magic link auth: customer enters email, we send them a link.
// No auth required (public endpoint — customer-facing).
// Rate limiting: implemented via Supabase (max 3 tokens issued per 15 minutes).

const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPatch } = require('../standalone/_db');
const { generateMagicToken } = require('./_portal_auth');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL       = process.env.SENDGRID_FROM_EMAIL || 'sales@palletstoragenearme.co.uk';
const BASE_URL         = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://rbtr-jarvis.vercel.app';

async function sendMagicLink(email, token, businessName) {
  if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
  const magicUrl = `${BASE_URL}/customer-portal.html?token=${token}`;
  const name = businessName || 'there';
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:15px;color:#111;margin:0;padding:0}
.wrap{max-width:520px;margin:0 auto;padding:40px 24px}
h2{font-size:20px;font-weight:700;margin:0 0 16px}
.btn{display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:700;font-size:16px;margin:20px 0}
.muted{color:#666;font-size:13px;margin-top:24px}
</style></head>
<body><div class="wrap">
<p style="color:#666;font-size:13px;margin-bottom:16px">Pallet Storage Near Me</p>
<h2>Your portal login link</h2>
<p>Hi ${name},</p>
<p>Click the button below to access your PSNM customer portal. This link expires in <strong>15 minutes</strong>.</p>
<a class="btn" href="${magicUrl}">Open my portal →</a>
<p>If you didn't request this, ignore this email — your account is not at risk.</p>
<p>Having trouble? Call Ben: <strong>07506 255033</strong></p>
<p class="muted">This link expires after 15 minutes or on first use. To get a new link, return to the portal login page.</p>
</div></body></html>`;

  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: FROM_EMAIL, name: 'PSNM Portal' },
      subject: 'Your PSNM portal login link',
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`SendGrid ${r.status}: ${text}`);
  }
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'valid email required' });

    const lower = email.trim().toLowerCase();

    // Look up portal user
    const users = await sbGet('psnm_customer_portal_users', { email: `eq.${lower}`, is_active: 'eq.true', select: 'id,customer_id,login_token_expires' });
    if (!users.length) {
      // Always return ok to avoid email enumeration
      return res.status(200).json({ ok: true, message: 'If this email is registered, a login link has been sent.' });
    }

    const user = users[0];

    // Load customer for display name
    const customers = await sbGet('psnm_customers', { id: `eq.${user.customer_id}`, select: 'business_name,contact_name' });
    const customer = customers[0] || {};
    const displayName = customer.contact_name?.split(' ')[0] || customer.business_name || '';

    // Generate token
    const token = generateMagicToken();
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await sbPatch('psnm_customer_portal_users', { id: user.id }, {
      login_token: token,
      login_token_expires: expires,
    });

    await sendMagicLink(lower, token, displayName);

    return res.status(200).json({ ok: true, message: 'If this email is registered, a login link has been sent.' });
  } catch (e) {
    console.error('[onboarding/portal-login]', e.message);
    // Return ok even on error to prevent enumeration
    return res.status(200).json({ ok: true, message: 'If this email is registered, a login link has been sent.' });
  }
};
