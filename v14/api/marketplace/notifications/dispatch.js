'use strict';
// Marketplace — Telegram Notification Dispatch
// POST /api/marketplace/notifications/dispatch
// Sends Telegram messages for listing lifecycle events

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbInsert ${r.status}: ${err.slice(0, 200)}`);
  }
  return true;
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error('Telegram not configured');
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`Telegram API ${r.status}: ${err.slice(0, 200)}`);
  }

  const data = await r.json();
  return data.result.message_id;
}

function buildMessage(eventType, listingTitle, payload) {
  const messages = {
    listing_published: `
<b>📢 Listing Published</b>

<b>${listingTitle}</b> is now live on eBay!

${payload.ebay_url ? `View: ${payload.ebay_url}` : ''}
    `,
    watcher_added: `
<b>👀 New Watcher</b>

Someone added <b>${listingTitle}</b> to their watchlist!

Total watchers: ${payload.watcher_count || 1}
    `,
    question_asked: `
<b>❓ Buyer Question</b>

Question about <b>${listingTitle}</b>:

"${payload.question || 'No text'}"

From: ${payload.buyer_username || 'Unknown'}
<b>Action required:</b> Reply via eBay Messages
    `,
    sold: `
<b>🎉 SOLD!</b>

<b>${listingTitle}</b>

Price: £${payload.price || '?'}
Buyer: ${payload.buyer_username || 'Unknown'}

Awaiting payment...
    `,
    payment_received: `
<b>💰 Payment Received</b>

<b>${listingTitle}</b>

Amount: £${payload.amount || '?'}

<b>Action required:</b> Ship item to buyer
    `,
  };

  return messages[eventType] || `Event: ${eventType}\n\n${listingTitle}`;
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

  const { event_type, listing_id, listing_title, payload } = body;

  if (!event_type || !listing_title) {
    return res.status(400).json({ ok: false, error: 'event_type and listing_title required' });
  }

  try {
    // Check if this event type is enabled
    const subs = await sbQuery('marketplace_notification_subs',
      `event_type=eq.${event_type}&enabled=eq.true&limit=1`
    );

    if (!subs || subs.length === 0) {
      await sbInsert('marketplace_notifications_log', {
        listing_id,
        event_type,
        payload,
        status: 'skipped',
        error: 'Event type not subscribed',
      });

      return res.status(200).json({
        ok: true,
        status: 'skipped',
        message: 'Event type not subscribed',
      });
    }

    // Build and send message
    const message = buildMessage(event_type, listing_title, payload || {});

    let telegramMessageId = null;
    let status = 'sent';
    let error = null;

    try {
      telegramMessageId = await sendTelegramMessage(message);
    } catch (e) {
      status = 'failed';
      error = e.message;
      console.error('[notifications/dispatch] Telegram send failed:', e.message);
    }

    // Log dispatch
    await sbInsert('marketplace_notifications_log', {
      listing_id,
      event_type,
      payload,
      telegram_message_id: telegramMessageId,
      status,
      error,
    });

    return res.status(200).json({
      ok: true,
      status,
      telegram_message_id: telegramMessageId,
    });

  } catch (e) {
    console.error('[notifications/dispatch] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Dispatch failed: ' + e.message });
  }
};
