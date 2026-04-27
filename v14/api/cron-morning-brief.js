// ═══════════════════════════════════════════════════════════════════════════
// Scheduled morning brief — wired to Vercel Cron
// Runs daily at 06:00 UTC → triggers /api/morning-brief internally →
// optionally sends WhatsApp voice note via Twilio.
//
// Config in vercel.json:
//   { "crons": [{ "path": "/api/cron-morning-brief", "schedule": "0 6 * * *" }] }
// ═══════════════════════════════════════════════════════════════════════════

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM;     // e.g. 'whatsapp:+14155238886'
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM;        // e.g. '+14155238886' — used for SMS fallback
const BEN_WHATSAPP = process.env.BEN_WHATSAPP || 'whatsapp:+447506255033';
const BEN_PHONE    = process.env.BEN_PHONE || '+447506255033';

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbGet(table, qs = '') {
  if (!SUPA_URL || !SUPA_KEY) return null;
  const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json' };
  if (SUPA_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPA_KEY}`;
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, { headers: h });
  return r.ok ? r.json() : null;
}

async function sendPsnmBrief() {
  const CAPACITY = 1602;
  const BREAKEVEN = 912;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return { ok: false, reason: 'TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN not set' };

  const now = new Date();
  const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  // Occupancy
  const snapshots = await sbGet('psnm_occupancy_snapshots', 'order=date.desc&limit=1&select=pallets_count,date');
  const pallets = snapshots?.[0]?.pallets_count ?? null;
  const pctFull = pallets != null ? Math.round((pallets / CAPACITY) * 100) : null;
  const toBreakeven = pallets != null ? Math.max(0, BREAKEVEN - pallets) : null;

  // Yesterday outreach touches
  const touches = await sbGet('psnm_outreach_touches', `sent_date=eq.${yesterday}&select=id,status`);
  const touchCount = Array.isArray(touches) ? touches.length : '?';
  const replyCount = Array.isArray(touches) ? touches.filter(t => t.status === 'replied').length : '?';

  // New enquiries last 24h
  const since = new Date(now - 86400000).toISOString();
  const enquiries = await sbGet('psnm_enquiries', `created_at=gte.${since}&select=id,company,source`);
  const newEnquiries = Array.isArray(enquiries) ? enquiries.length : '?';

  // Format message
  const palletsLine = pallets != null
    ? `📦 *${pallets}* pallets stored (${pctFull}% of ${CAPACITY.toLocaleString()})\n🎯 *${toBreakeven}* to break-even (target: ${BREAKEVEN})`
    : `📦 No occupancy snapshot logged yet — log one via the PSNM portal`;

  const msg = [
    `🏭 *PSNM Daily Brief — ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}*`,
    ``,
    palletsLine,
    ``,
    `📬 *Outreach yesterday (${yesterday})*`,
    `  Sent: ${touchCount} · Replies: ${replyCount}`,
    ``,
    `🔥 *New enquiries (last 24h)*: ${newEnquiries}`,
    newEnquiries > 0 && Array.isArray(enquiries)
      ? enquiries.slice(0, 3).map(e => `  — ${e.company || 'unknown'} (${e.source || '—'})`).join('\n')
      : null,
    ``,
    `_rbtr-jarvis.vercel.app/psnm_`,
  ].filter(l => l !== null).join('\n');

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
  });
  const tgJson = await tg.json().catch(() => ({}));
  return { ok: tgJson.ok, pallets, toBreakeven, touchCount, replyCount, newEnquiries };
}

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) {
    res.status(401).send('unauthorized');
    return;
  }

  // ?mode=psnm-brief → send PSNM data card to Telegram
  const url = new URL(req.url, `https://${req.headers?.host || 'x'}`);
  if (url.searchParams.get('mode') === 'psnm-brief') {
    const result = await sendPsnmBrief();
    res.status(result.ok ? 200 : 502).json(result);
    return;
  }

  // ?mode=evening → trigger evening debrief instead of morning brief
  if (url.searchParams.get('mode') === 'evening') {
    const origin = `https://${req.headers?.host || 'rbtr-jarvis.vercel.app'}`;
    const r = await fetch(`${origin}/api/morning-brief?mode=evening`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const result = await r.json();
    const out = { steps: [{ step: 'evening-debrief', ok: r.ok, audio_url: result.audio_url }] };
    if (r.ok && result.audio_url && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (chatId) {
          const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendAudio`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, audio: result.audio_url, caption: `🌙 Evening debrief · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`, title: 'ROCKO · Evening debrief', performer: 'ROCKO' }),
          });
          out.steps.push({ step: 'telegram', ok: tg.ok });
        }
      } catch (e) { out.steps.push({ step: 'telegram', ok: false, error: e.message }); }
    }
    res.status(200).json({ ok: r.ok, ...out });
    return;
  }

  const origin = `https://${req.headers?.host || 'rbtr-jarvis.vercel.app'}`;
  const out = { steps: [] };

  try {
    // 1. Generate brief (renders audio + persists row)
    const r = await fetch(`${origin}/api/morning-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extras: {} }),
    });
    const result = await r.json();
    out.steps.push({ step: 'morning-brief', ok: r.ok, audio_url: result.audio_url });

    if (!r.ok) {
      res.status(502).json(out);
      return;
    }

    // 2a. Telegram voice note (preferred, no sandbox expiry)
    let telegramOk = false;
    if (process.env.TELEGRAM_BOT_TOKEN && result.audio_url) {
      try {
        const tg = await fetch(`${origin}/api/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_url: result.audio_url, caption: `🌅 Morning brief · ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}` }),
        });
        const tgJson = await tg.json().catch(()=>({}));
        telegramOk = tg.ok && tgJson.ok !== false;
        out.steps.push({ step: 'telegram', ok: telegramOk, message_id: tgJson.result?.message_id, error: !telegramOk ? tgJson.description || tgJson.error : null });
      } catch (e) { out.steps.push({ step: 'telegram', ok: false, error: e.message }); }
    } else if (result.audio_url) {
      out.steps.push({ step: 'telegram', ok: false, skipped: true, reason: 'TELEGRAM_BOT_TOKEN not set' });
    }

    // 2a.fallback — if Telegram failed, try Twilio SMS with audio link.
    // Only fires when telegram step exists and didn't succeed, and Twilio + SMS_FROM are configured.
    if (!telegramOk && TWILIO_SID && TWILIO_AUTH && TWILIO_SMS_FROM && result.audio_url) {
      try {
        const smsUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
        const creds = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
        const body = `🌅 Morning brief — Telegram failed, listen here: ${result.audio_url}`;
        const form = new URLSearchParams();
        form.set('From', TWILIO_SMS_FROM);
        form.set('To', BEN_PHONE);
        form.set('Body', body);
        const sms = await fetch(smsUrl, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        const smsJson = await sms.json().catch(() => ({}));
        out.steps.push({ step: 'sms_fallback', ok: sms.ok, sid: smsJson.sid, error: !sms.ok ? smsJson.message : null });
      } catch (e) { out.steps.push({ step: 'sms_fallback', ok: false, error: e.message }); }
    }

    // 2b. WhatsApp voice note via Twilio (only if configured)
    if (TWILIO_SID && TWILIO_AUTH && TWILIO_FROM && result.audio_url) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      const creds = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');
      const form = new URLSearchParams();
      form.set('From', TWILIO_FROM);
      form.set('To', BEN_WHATSAPP);
      form.set('Body', `🌅 Morning brief · ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}`);
      form.set('MediaUrl', result.audio_url);

      const tw = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const twJson = await tw.json().catch(() => ({}));
      out.steps.push({ step: 'whatsapp', ok: tw.ok, sid: twJson.sid, error: !tw.ok ? twJson.message : null });
    } else {
      out.steps.push({ step: 'whatsapp', ok: false, skipped: true, reason: 'TWILIO env not configured' });
    }

    res.status(200).json({ ok: true, ...out, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[cron-morning-brief]', err);
    res.status(500).json({ error: err.message, ...out });
  }
};
