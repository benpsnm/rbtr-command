'use strict';

// POST /api/onboarding/send-pack
// Sends onboarding pack to customer via SendGrid:
//   - Formal quote (link to /quote-doc.html?id=X)
//   - Customer agreement (link to /agreement-doc.html?id=X)
//   - Insurance evidence request
// Tracks message IDs back into psnm_quotes and psnm_agreements.

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPatch } = require('../standalone/_db');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL       = process.env.SENDGRID_FROM_EMAIL || 'sales@palletstoragenearme.co.uk';
const FROM_NAME        = 'Ben — Pallet Storage Near Me';
const BASE_URL         = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://rbtr-jarvis.vercel.app';

async function sendEmail({ to, subject, html, customArgs = {} }) {
  if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not configured');
  const body = {
    personalizations: [{ to: [{ email: to }], custom_args: customArgs }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [{ type: 'text/html', value: html }],
    tracking_settings: {
      click_tracking: { enable: true },
      open_tracking: { enable: true },
    },
  };
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const sgMessageId = r.headers.get('x-message-id') || null;
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`SendGrid ${r.status}: ${text}`);
  }
  return sgMessageId;
}

function buildPackEmail({ customer, quote, agreement, quoteUrl, agreementUrl }) {
  const name = customer.contact_name ? customer.contact_name.split(' ')[0] : 'there';
  const pallets = quote.pallet_count;
  const monthly = quote.monthly_storage_cost ? `£${Number(quote.monthly_storage_cost).toFixed(2)}` : 'see quote';
  const validUntil = quote.valid_until || '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111;margin:0;padding:0}
.wrap{max-width:600px;margin:0 auto;padding:32px 24px}
h1{font-size:22px;font-weight:700;margin:0 0 8px}
.highlight{background:#f5f5f5;border-radius:8px;padding:16px 20px;margin:20px 0}
.btn{display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;margin:6px 0}
.section-title{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#666;font-weight:600;margin-top:28px;margin-bottom:8px}
.muted{color:#666;font-size:13px}
hr{border:none;border-top:1px solid #e0e0e0;margin:24px 0}
</style></head>
<body><div class="wrap">
<p class="muted">Pallet Storage Near Me · Unit 3C, Hellaby Industrial Estate, Rotherham S66 8HR</p>
<h1>Your storage quote + agreement</h1>
<p>Hi ${name},</p>
<p>Thanks for your interest in PSNM. I've put together everything you need to get started. Three things attached below:</p>

<div class="highlight">
  <strong>Quote ${agreement ? `(${quote.quote_number})` : ''}</strong><br>
  ${pallets} pallets · ${monthly}/month est. · Valid until ${validUntil}<br>
  <a class="btn" href="${quoteUrl}" style="display:inline-block;margin-top:10px">View quote →</a>
</div>

${agreement ? `<div class="highlight">
  <strong>Storage Agreement (${agreement.agreement_number})</strong><br>
  Read it, sign it, and email the signed copy back to me.<br>
  <a class="btn" href="${agreementUrl}" style="display:inline-block;margin-top:10px">View agreement →</a>
</div>` : ''}

<div class="section-title">Insurance — 3rd step</div>
<p>Before your first pallet arrives, I need one document from you:</p>
<ul>
  <li><strong>Certificate of insurance</strong> — confirming you hold goods-in-storage cover (minimum sum insured: declared value of your stock at peak)</li>
  <li>The policy must extend to goods held at <em>third-party premises</em> (not just your own premises)</li>
  <li>Your broker can issue this in minutes if you ask</li>
</ul>
<p>Just email the certificate to <a href="mailto:${FROM_EMAIL}">${FROM_EMAIL}</a> and I'll check it off.</p>

<hr>
<p><strong>Next steps:</strong></p>
<ol>
  <li>Review the quote</li>
  <li>Sign and return the agreement</li>
  <li>Email your insurance certificate</li>
  <li>I'll confirm your start date and first goods-in slot</li>
</ol>

<p>Any questions — call me directly: <strong>07506 255033</strong>. I'm on site most days.</p>

<p>Cheers,<br><strong>Ben Greenwood</strong><br>Pallet Storage Near Me<br>07506 255033</p>

<p class="muted" style="margin-top:24px;font-size:12px">Pallet Storage Near Me · Unit 3C Hellaby Industrial Estate · Rotherham S66 8HR<br>
Your personal data is held and processed in accordance with our <a href="${BASE_URL}/terms.html" style="color:#666">Privacy Notice</a>. We hold your business contact details to provide storage services. Retention period: 6 years from end of trading relationship.</p>
</div></body></html>`;
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { customer_id, quote_id, agreement_id } = req.body;
    if (!customer_id || !quote_id) return res.status(400).json({ error: 'customer_id and quote_id required' });

    const [customers, quotes, agreements] = await Promise.all([
      sbGet('psnm_customers', { id: `eq.${customer_id}`, select: '*' }),
      sbGet('psnm_quotes', { id: `eq.${quote_id}`, select: '*' }),
      agreement_id ? sbGet('psnm_agreements', { id: `eq.${agreement_id}`, select: '*' }) : Promise.resolve([]),
    ]);

    if (!customers.length) return res.status(404).json({ error: 'customer_not_found' });
    if (!quotes.length) return res.status(404).json({ error: 'quote_not_found' });

    const customer = customers[0];
    const quote = quotes[0];
    const agreement = agreements[0] || null;

    if (!customer.email) return res.status(400).json({ error: 'customer has no email address — add one first' });

    const quoteUrl     = `${BASE_URL}/quote-doc.html?id=${quote.id}`;
    const agreementUrl = agreement ? `${BASE_URL}/agreement-doc.html?id=${agreement.id}` : null;

    const html = buildPackEmail({ customer, quote, agreement, quoteUrl, agreementUrl });
    const subject = `Your pallet storage quote + agreement — ${customer.business_name}`;

    const sgMessageId = await sendEmail({
      to: customer.email,
      subject,
      html,
      customArgs: { customer_id, quote_id, agreement_id: agreement_id || '' },
    });

    const now = new Date().toISOString();

    // Update quote + agreement status and SendGrid message ID
    await Promise.all([
      sbPatch('psnm_quotes', { id: quote_id }, { status: 'sent', sent_at: now, sg_message_id: sgMessageId }).catch(() => null),
      agreement_id ? sbPatch('psnm_agreements', { id: agreement_id }, { status: 'sent', sent_at: now, sg_message_id: sgMessageId }).catch(() => null) : Promise.resolve(),
    ]);

    return res.status(200).json({ ok: true, sg_message_id: sgMessageId, sent_to: customer.email });
  } catch (e) {
    console.error('[onboarding/send-pack]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
