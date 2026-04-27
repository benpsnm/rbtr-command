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

// ── General's Brief — HTML-escaped Telegram field helper ────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendPsnmBrief() {
  const CAPACITY = 1602;
  const BREAKEVEN = 912;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

  if (!chatId || !token) return { ok: false, reason: 'TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN not set' };

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString().split('T')[0];
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const FRAMEWORK_DAYS = ['Reflection', 'Hormozi', 'Cardone', 'Holmes', 'StoryBrand', 'Brunson', 'Kennedy'];
  const todayFramework = FRAMEWORK_DAYS[now.getDay()];
  const julyCliff = new Date('2026-07-01T00:00:00Z');
  const daysToCliff = Math.ceil((julyCliff - now) / 86400000);

  // Pull all data concurrently
  const [snapshots, enquiries, hotLeads, pendingDrafts, recentTouches] = await Promise.all([
    sbGet('psnm_occupancy_snapshots', 'order=date.desc&limit=1&select=pallets,date'),
    sbGet('psnm_enquiries', 'status=not.eq.lost&order=created_at.desc&limit=20&select=id,company,pallets,status,created_at,source'),
    sbGet('psnm_outreach_targets', 'order=hot_flag.desc,priority_score.desc&limit=5&select=id,company,city,priority_score,hot_flag,decision_maker_name,estimated_pallet_need,current_touch_count,status,last_touched_at'),
    sbGet('psnm_atlas_drafts', 'status=eq.pending_approval&select=id'),
    sbGet('psnm_outreach_touches', `sent_date=gte.${sevenDaysAgo}&order=sent_date.desc&limit=15&select=id,target_id,sent_date,outcome,touch_type`),
  ]);

  // Process occupancy
  const pallets = snapshots?.[0]?.pallets ?? null;
  const pctFull = pallets != null ? Math.round((pallets / CAPACITY) * 100) : null;
  const toBreakeven = pallets != null ? Math.max(0, BREAKEVEN - pallets) : null;

  // Pipeline
  const activeEnquiries = Array.isArray(enquiries) ? enquiries : [];
  const pipelinePallets = activeEnquiries.reduce((s, e) => s + (Number(e.pallets) || 0), 0);

  // Pending drafts
  const pendingCount = Array.isArray(pendingDrafts) ? pendingDrafts.length : 0;

  // In-flight: recent touches, look up prospect names
  const touches = Array.isArray(recentTouches) ? recentTouches : [];
  const targetIds = [...new Set(touches.map(t => t.target_id).filter(Boolean))];
  let touchedProspects = [];
  if (targetIds.length) {
    const tProspects = await sbGet('psnm_outreach_targets', `id=in.(${targetIds.join(',')})&select=id,company,decision_maker_name`);
    const pm = Object.fromEntries((tProspects || []).map(p => [p.id, p]));
    touchedProspects = touches.map(t => ({
      ...t,
      company: pm[t.target_id]?.company || 'Unknown',
      contact: pm[t.target_id]?.decision_maker_name || null,
    }));
  }

  // Build structured data for AI
  const briefData = {
    date: dateStr,
    days_to_july_cliff: daysToCliff,
    occupancy: { pallets, capacity: CAPACITY, pct: pctFull, to_breakeven: toBreakeven },
    pipeline: { active_enquiries: activeEnquiries.length, pipeline_pallets: pipelinePallets,
      top_enquiries: activeEnquiries.slice(0, 5).map(e => ({ company: e.company, pallets: e.pallets, status: e.status })) },
    hot_leads: (hotLeads || []).map(l => ({
      company: l.company, city: l.city, contact: l.decision_maker_name,
      est_pallets: l.estimated_pallet_need, priority: l.priority_score,
      hot: l.hot_flag, touches: l.current_touch_count, last_touched: l.last_touched_at?.split('T')[0] || 'never',
    })),
    pending_drafts: pendingCount,
    recent_touches: touchedProspects.slice(0, 5).map(t => ({
      company: t.company, contact: t.contact, date: t.sent_date, outcome: t.outcome, type: t.touch_type,
    })),
    today_framework: todayFramework,
  };

  // AI-generated brief sections
  let sections = null;
  if (anthropicKey) {
    try {
      const sysPrompt = `You are a senior B2B sales strategist briefing Ben Greenwood, founder of Pallet Storage Near Me (PSNM). He needs to fill a 1,602-pallet warehouse (Unit 3C Hellaby Industrial Estate, Rotherham S66 8HR) and reach break-even (912 pallets) by 30 June 2026. He runs solo. His mental models: Hormozi value equation, Cardone 10X, Holmes Dream 100, Miller StoryBrand, Brunson hook/story/offer, Kennedy direct response.

Today's live data: ${JSON.stringify(briefData)}

Output a JSON object with EXACTLY these keys:
{
  "top_actions": [
    { "what": "specific action with named prospect, named time if applicable", "why": "strategic rationale using today's framework (${todayFramework})", "win": "what done looks like by end of today" },
    { "what": "...", "why": "...", "win": "..." },
    { "what": "...", "why": "...", "win": "..." }
  ],
  "inflight": [
    { "company": "prospect name", "last_touch": "date or 'never'", "status": "one-phrase status", "next": "specific next move" }
  ],
  "watch_for": ["one time-sensitive thing", "another if relevant"],
  "strategic_note": "One sharp sentence using today's framework (${todayFramework}). Direct and opinionated. No fluff."
}

Rules: top_actions must be SPECIFIC — named prospect, named action. No generics like 'follow up with leads'. Strategic note must name the framework. Return only valid JSON, no markdown wrapper.`;

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: 'Generate the daily General\'s Brief now.' }],
          system: sysPrompt,
        }),
      });
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const raw = aiJson?.content?.[0]?.text || '';
        const match = raw.match(/\{[\s\S]*\}/);
        sections = match ? JSON.parse(match[0]) : null;
      }
    } catch (_) { sections = null; }
  }

  // Build Telegram HTML message
  const line = '═══════════════════════════';
  const lines = [];

  lines.push(`${line}`);
  lines.push(`🎯 <b>PSNM DAILY BRIEF — ${esc(dateStr)}</b>`);
  lines.push(`${line}`);
  lines.push('');

  // Numbers block
  lines.push(`📊 <b>NUMBERS</b>`);
  if (pallets != null) {
    lines.push(`• Pallets stored: <b>${pallets}</b> / ${CAPACITY} (${pctFull}%)`);
    lines.push(`• Pipeline: <b>${pipelinePallets}</b> pallets across ${activeEnquiries.length} enquiries`);
    lines.push(`• To break-even: need <b>${toBreakeven}</b> more pallets`);
  } else {
    lines.push(`• No occupancy snapshot yet — log one in WMS → Stock`);
  }
  lines.push(`• Days to July rent cliff: <b>${daysToCliff}</b>`);
  lines.push('');

  // Top 3 actions
  lines.push(`🔥 <b>TODAY'S TOP 3 ACTIONS</b>`);
  if (sections?.top_actions?.length) {
    sections.top_actions.slice(0, 3).forEach((a, i) => {
      lines.push('');
      lines.push(`<b>${i + 1}. ${esc(a.what)}</b>`);
      lines.push(`   Why first: ${esc(a.why)}`);
      lines.push(`   Win condition: ${esc(a.win)}`);
    });
  } else {
    // Fallback: surface top hot leads as actions
    (hotLeads || []).slice(0, 3).forEach((l, i) => {
      lines.push(`${i + 1}. Call ${esc(l.decision_maker_name || l.company)} at ${esc(l.company)} — ${esc(l.estimated_pallet_need || '?')} pallets potential`);
    });
  }
  lines.push('');

  // Outreach queue
  lines.push(`📥 <b>OUTREACH QUEUE</b>`);
  lines.push(`• ${pendingCount} draft${pendingCount !== 1 ? 's' : ''} pending approval → WMS → Intelligence`);
  lines.push(`• Recent touches (7d): ${touches.length}`);
  lines.push('');

  // In-flight conversations
  if (sections?.inflight?.length) {
    lines.push(`🔄 <b>IN-FLIGHT</b>`);
    sections.inflight.slice(0, 4).forEach(c => {
      lines.push(`• <b>${esc(c.company)}</b> — ${esc(c.status)}`);
      lines.push(`  → ${esc(c.next)}`);
    });
    lines.push('');
  }

  // Watch for
  if (sections?.watch_for?.length) {
    lines.push(`⚠️ <b>WATCH FOR</b>`);
    sections.watch_for.slice(0, 3).forEach(w => lines.push(`• ${esc(w)}`));
    lines.push('');
  }

  // Strategic note
  lines.push(`🧠 <b>STRATEGIC NOTE (${esc(todayFramework)})</b>`);
  lines.push(sections?.strategic_note
    ? esc(sections.strategic_note)
    : `${todayFramework}: focus on highest-signal prospects first. One conversion beats ten cold touches.`);
  lines.push('');
  lines.push(`${line}`);
  lines.push(`<i>rbtr-jarvis.vercel.app/wms.html</i>`);

  const msg = lines.join('\n');

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const tgJson = await tg.json().catch(() => ({}));
  return { ok: tgJson.ok, pallets, toBreakeven, pendingDrafts: pendingCount, ai_used: !!sections, tg: tgJson };
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
