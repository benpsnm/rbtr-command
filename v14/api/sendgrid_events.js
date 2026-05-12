'use strict';

// ── SendGrid Event Webhook · standalone handler ───────────────────────────────
// Separate from atlas.js so bodyParser can be disabled and the raw request body
// is available for ECDSA P-256 signature verification before JSON parsing.
//
// handler.config = { api: { bodyParser: false } } at the bottom of this file
// tells Vercel's @vercel/node runtime NOT to pre-parse the body. We read chunks
// manually, verify the signature against the exact bytes SendGrid signed, then
// parse JSON ourselves.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
  if (!r.ok) return null;
  return await r.json();
}

async function sbUpdate(table, match, row) {
  const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return await r.json();
}

async function sendTelegramAlert(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  }).catch(() => null);
}

// ── Raw body reader (async iterator — bodyParser must be disabled) ─────────────
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// ── Handler ───────────────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const SG_PUB_KEY = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  const signature  = req.headers['x-twilio-email-event-webhook-signature'];
  const timestamp  = req.headers['x-twilio-email-event-webhook-timestamp'];

  // Read raw body bytes before any parsing
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'body_read_failed', detail: e.message });
  }

  // Signature verification against the exact bytes SendGrid signed
  if (SG_PUB_KEY) {
    if (!signature || !timestamp) {
      return res.status(401).json({ ok: false, error: 'missing_signature_headers' });
    }
    try {
      const verifier = crypto.createVerify('SHA256');
      verifier.update(timestamp + rawBody);
      if (!verifier.verify(SG_PUB_KEY, signature, 'base64')) {
        return res.status(401).json({ ok: false, error: 'invalid_signature' });
      }
    } catch (e) {
      return res.status(401).json({ ok: false, error: 'signature_verification_failed', detail: e.message });
    }
  }

  // Parse JSON only after signature passes
  let events;
  try {
    const parsed = JSON.parse(rawBody);
    events = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid_json', detail: e.message });
  }

  // ── Event processing (verbatim from atlas.js sendgridEvents) ─────────────────

  const touchOutcomeMap = {
    delivered:   'delivered',
    open:        'opened',
    click:       'clicked',
    bounce:      'bounced',
    spamreport:  'spam',
    unsubscribe: 'unsubscribed',
  };

  const results = [];
  for (const ev of events) {
    const sgEventId  = ev.sg_event_id  || null;
    const draftId    = ev.draft_id     || null;
    const leadId     = ev.lead_id      || null;
    const eventType  = ev.event        || 'unknown';
    const occurredAt = ev.timestamp    ? new Date(ev.timestamp * 1000).toISOString() : new Date().toISOString();

    // Insert event row (ON CONFLICT DO NOTHING via Prefer header)
    if (sgEventId) {
      await fetch(`${SUPABASE_URL}/rest/v1/psnm_outreach_events`, {
        method: 'POST',
        headers: sbHeaders({ Prefer: 'resolution=ignore-duplicates,return=minimal' }),
        body: JSON.stringify({
          sg_event_id:  sgEventId,
          sg_message_id: ev.sg_message_id || null,
          draft_id:     draftId,
          lead_id:      leadId,
          event_type:   eventType,
          email:        ev.email     || null,
          url:          ev.url       || null,
          useragent:    ev.useragent || null,
          ip:           ev.ip        || null,
          reason:       ev.reason    || null,
          raw:          ev,
          occurred_at:  occurredAt,
        }),
      }).catch(() => null);
    }

    // Update touch outcome (find most-recent sent touch for this lead)
    const outcome = touchOutcomeMap[eventType];
    if (outcome && leadId) {
      const touches = await sbSelect('psnm_outreach_touches',
        `target_id=eq.${leadId}&outcome=eq.sent&select=id&order=touched_at.desc&limit=1`);
      if (touches?.[0]) {
        await sbUpdate('psnm_outreach_touches', { id: touches[0].id }, { outcome }).catch(() => null);
      }
    }

    // Terminal event: update draft status
    if (draftId && (eventType === 'bounce' || eventType === 'spamreport')) {
      const newStatus = eventType === 'bounce' ? 'bounced' : 'spam_flagged';
      await sbUpdate('psnm_atlas_drafts', { id: draftId }, { status: newStatus }).catch(() => null);
    }

    // Telegram alerts for actionable events
    if (eventType === 'bounce') {
      await sendTelegramAlert(`⚠️ Bounce: ${ev.email}\nReason: ${ev.reason || 'unknown'}${draftId ? `\nDraft: ${draftId}` : ''}`).catch(() => null);
    } else if (eventType === 'spamreport') {
      await sendTelegramAlert(`🚨 Spam report: ${ev.email}${draftId ? `\nDraft: ${draftId}` : ''}`).catch(() => null);
    } else if (eventType === 'click') {
      await sendTelegramAlert(`🔗 Link clicked: ${ev.email}\n${ev.url || ''}`).catch(() => null);
    }

    results.push({ sg_event_id: sgEventId, event_type: eventType, stored: !!sgEventId });
  }

  return res.status(200).json({ ok: true, processed: results.length, events: results });
}

// Disable Vercel's automatic body parser — raw bytes must reach this handler
// intact so ECDSA signature verification works against the exact bytes SendGrid signed.
handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
