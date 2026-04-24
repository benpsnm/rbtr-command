// ═══════════════════════════════════════════════════════════════════════════
// Notifications endpoint
//
// POST /api/notifications  → { type, severity, title, body, data }
//   Writes to `notifications` table, pushes text to Telegram, returns notification id.
//
// GET /api/notifications?unread=1  → last 20 notifications (unread only if flag set)
// POST /api/notifications/read     → { id } or { all: true } — marks read
//
// 5 notification types:
//   hot_signal       (critical)  — warm lead replied, quote opened 3x
//   quote_opened     (high)      — first open of a sent quote
//   low_cash         (critical)  — balance < threshold
//   schedule_conflict(normal)    — overlapping events
//   rocko_proactive  (normal)    — pattern detection by ROCKO
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, ...extra };
  if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function getStoredChatId() {
  if (TELEGRAM_CHAT_ID) return TELEGRAM_CHAT_ID;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/jarvis_signals?type=eq.telegram_chat&select=payload&order=created_at.desc&limit=1`, { headers: sbHeaders() });
    const rows = await r.json();
    return rows?.[0]?.payload?.chat_id || null;
  } catch { return null; }
}

async function sendTelegram(text) {
  if (!TELEGRAM_TOKEN) return { ok: false, reason: 'no_token' };
  const chatId = await getStoredChatId();
  if (!chatId) return { ok: false, reason: 'no_chat_id' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const j = await r.json();
    return { ok: j.ok, message_id: j.result?.message_id };
  } catch (e) { return { ok: false, error: e.message }; }
}

const SEVERITY_EMOJI = { critical: '🚨', high: '⚠️', normal: '💬', low: 'ℹ️' };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const url = new URL(req.url, `https://${req.headers?.host || 'x'}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  // POST /api/notifications/read
  if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'read') {
    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch {}
    if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'no_supabase' }); return; }
    if (body.all) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications?read_at=is.null`, {
        method: 'PATCH',
        headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ read_at: new Date().toISOString() }),
      });
      res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    } else if (body.id) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications?id=eq.${body.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ read_at: new Date().toISOString() }),
      });
      res.status(r.ok ? 200 : 502).json({ ok: r.ok });
    } else {
      res.status(400).json({ error: 'id or all required' });
    }
    return;
  }

  // GET /api/notifications
  if (req.method === 'GET') {
    if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(200).json([]); return; }
    const unreadOnly = url.searchParams.get('unread') === '1';
    const filter = unreadOnly ? '&read_at=is.null' : '';
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications?order=created_at.desc&limit=20${filter}`, { headers: sbHeaders() });
      const rows = await r.json();
      res.status(200).json(Array.isArray(rows) ? rows : []);
    } catch (e) { res.status(200).json([]); }
    return;
  }

  // POST /api/notifications  (create + push)
  if (req.method === 'POST') {
    let body = {};
    try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch {}

    const { type, severity = 'normal', title, body: bodyText, data } = body;
    if (!type) { res.status(400).json({ error: 'type required' }); return; }

    const channelDelivered = [];

    // Send Telegram text
    const emoji = SEVERITY_EMOJI[severity] || '💬';
    const tgText = `${emoji} *${title || type}*\n${bodyText || ''}`;
    const tg = await sendTelegram(tgText);
    if (tg.ok) channelDelivered.push('telegram');
    channelDelivered.push('portal');

    // Write to notifications table
    let notifId = null;
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: 'POST',
          headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
          body: JSON.stringify({ type, severity, title, body: bodyText, data: data || null, channel_delivered: channelDelivered }),
        });
        const rows = await r.json();
        notifId = Array.isArray(rows) ? rows[0]?.id : rows?.id;
      } catch {}
    }

    res.status(201).json({ ok: true, id: notifId, telegram: tg, channels: channelDelivered });
    return;
  }

  res.status(405).json({ error: 'GET, POST, or POST /read' });
};
