// ═══════════════════════════════════════════════════════════════════════════
// Telegram delivery for ROCKO briefs
//
// GET  /api/telegram?action=chat-id   → auto-detects Ben's chat_id from
//                                       bot updates, saves to Supabase
// POST /api/telegram                  → { audio_url, caption } sends voice
//                                       note to the saved chat_id
//
// Requires env: TELEGRAM_BOT_TOKEN (already set by Ben)
// Optional env: TELEGRAM_CHAT_ID (if set, skips discovery)
//
// Persistence: writes chat_id to jarvis_signals row with type='telegram_chat'
// so the cron can read it without hardcoding.
// ═══════════════════════════════════════════════════════════════════════════

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ENV_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, ...extra };
  if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function getStoredChatId() {
  if (ENV_CHAT_ID) return ENV_CHAT_ID;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/jarvis_signals?type=eq.telegram_chat&select=payload&order=created_at.desc&limit=1`, { headers: sbHeaders() });
  const rows = await r.json();
  return rows?.[0]?.payload?.chat_id || null;
}

async function saveChatId(chatId, who) {
  await fetch(`${SUPABASE_URL}/rest/v1/jarvis_signals`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ type: 'telegram_chat', payload: { chat_id: chatId, who } }),
  });
}

async function discoverChatId() {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
  const j = await r.json();
  if (!j.ok) return { error: 'getUpdates failed', detail: j };
  const messages = (j.result || []).map(u => u.message).filter(Boolean);
  if (!messages.length) return { error: 'no_messages', hint: 'Send /start or any message to your bot in Telegram first' };
  const latest = messages[messages.length - 1];
  return { chat_id: latest.chat.id, who: latest.chat.first_name || latest.chat.username || 'user' };
}

async function sendVoice(chatId, audioUrl, caption) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendAudio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      audio: audioUrl,
      caption: caption || '🌅 Morning brief',
      title: 'ROCKO · Morning brief',
      performer: 'ROCKO',
    }),
  });
  return await r.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!TOKEN) { res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' }); return; }

  const url = new URL(req.url, `https://${req.headers?.host||'x'}`);
  const action = url.searchParams.get('action');

  if (req.method === 'GET' && action === 'chat-id') {
    const out = await discoverChatId();
    if (out.chat_id) await saveChatId(out.chat_id, out.who);
    res.status(200).json(out);
    return;
  }

  if (req.method === 'POST') {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
    catch { res.status(400).json({ error: 'invalid json' }); return; }
    const { audio_url, caption } = body;
    if (!audio_url) { res.status(400).json({ error: 'audio_url required' }); return; }
    const chatId = await getStoredChatId();
    if (!chatId) { res.status(400).json({ error: 'no chat_id', hint: 'GET /api/telegram?action=chat-id first after DMing the bot' }); return; }
    const result = await sendVoice(chatId, audio_url, caption);
    res.status(result.ok ? 200 : 502).json(result);
    return;
  }

  res.status(405).json({ error: 'GET ?action=chat-id or POST {audio_url}' });
};
