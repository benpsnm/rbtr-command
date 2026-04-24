// ── Scheduled evening debrief — wired to Vercel Cron ─────────────────────
// Runs daily at 21:00 UTC (9pm UK winter, 10pm UK summer)
// Config in vercel.json: { "path": "/api/cron-evening-debrief", "schedule": "0 21 * * *" }

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getStoredChatId() {
  if (TELEGRAM_CHAT_ID) return TELEGRAM_CHAT_ID;
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const h = { apikey: SUPABASE_KEY };
    if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/jarvis_signals?type=eq.telegram_chat&select=payload&order=created_at.desc&limit=1`, { headers: h });
    const rows = await r.json();
    return rows?.[0]?.payload?.chat_id || null;
  } catch { return null; }
}

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) { res.status(401).send('unauthorized'); return; }

  const origin = `https://${req.headers?.host || 'rbtr-jarvis.vercel.app'}`;
  const out = { steps: [] };

  try {
    const r = await fetch(`${origin}/api/evening-debrief`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const result = await r.json();
    out.steps.push({ step: 'evening-debrief', ok: r.ok, audio_url: result.audio_url });

    if (!r.ok) { res.status(502).json(out); return; }

    // Telegram delivery
    if (TELEGRAM_TOKEN && result.audio_url) {
      const chatId = await getStoredChatId();
      if (chatId) {
        const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendAudio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            audio: result.audio_url,
            caption: `🌙 Evening debrief · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
            title: 'ROCKO · Evening debrief',
            performer: 'ROCKO',
          }),
        });
        const tgJson = await tg.json().catch(() => ({}));
        out.steps.push({ step: 'telegram', ok: tg.ok && tgJson.ok !== false, message_id: tgJson.result?.message_id });
      } else {
        out.steps.push({ step: 'telegram', ok: false, reason: 'no_chat_id' });
      }
    } else {
      out.steps.push({ step: 'telegram', ok: false, skipped: true });
    }

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    console.error('[cron-evening-debrief]', err);
    res.status(500).json({ error: err.message, ...out });
  }
};
