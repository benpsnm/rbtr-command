'use strict';
// Atlas v3 — DispatcherAgent
// Sends approved drafts via SendGrid. Respects daily rate limits, dedup guard.
// FROM address: reads EMAIL_FROM env var (default: sales@palletstoragenearme.co.uk)

const db = require('./_av3_db');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM       = process.env.EMAIL_FROM       || 'sales@palletstoragenearme.co.uk';
const EMAIL_FROM_NAME  = process.env.EMAIL_FROM_NAME  || 'Ben @ Pallet Storage Near Me';
const EMAIL_REPLY_TO   = process.env.EMAIL_REPLY_TO   || 'replies@parse.palletstoragenearme.co.uk';
const DAILY_SEND_LIMIT = parseInt(process.env.ATLAS_DAILY_SEND_LIMIT || '50', 10);

async function getAtlasConfig() {
  const cfg = await db.select('psnm_atlas_config', 'limit=1');
  return Array.isArray(cfg) ? cfg[0] : {};
}

async function getTodaySendCount() {
  const today = new Date().toISOString().slice(0, 10);
  // Count sends from both legacy and v3 tables
  const [legacySent, v3Sent] = await Promise.all([
    db.select('psnm_atlas_drafts', `status=eq.sent&sent_at=gte.${today}T00:00:00&select=id`),
    db.select('prospect_drafts', `status=eq.sent&sent_at=gte.${today}T00:00:00&select=id`),
  ]);
  return (Array.isArray(legacySent) ? legacySent.length : 0) +
         (Array.isArray(v3Sent) ? v3Sent.length : 0);
}

async function sendViaEmail(draft, prospect) {
  if (!SENDGRID_API_KEY) {
    return { ok: false, error: 'SENDGRID_API_KEY not set', stub: true };
  }

  const toEmail = prospect.decision_maker_email || prospect.email;
  if (!toEmail) return { ok: false, error: 'no_email_address' };

  const payload = {
    personalizations: [{
      to: [{ email: toEmail, name: prospect.decision_maker_name || prospect.company }],
      custom_args: {
        v3_draft_id:   draft.id,
        prospect_id:   draft.prospect_id,
        source:        'atlas_v3',
      },
    }],
    from: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
    reply_to: { email: EMAIL_REPLY_TO, name: EMAIL_FROM_NAME },
    subject: draft.subject,
    content: [{ type: 'text/plain', value: draft.body }],
    tracking_settings: {
      click_tracking:  { enable: true },
      open_tracking:   { enable: true },
    },
  };

  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const sgMessageId = r.headers.get('x-message-id') || null;
  if (!r.ok) {
    const err = await r.text().catch(() => '');
    return { ok: false, error: `SendGrid ${r.status}: ${err.slice(0, 200)}` };
  }
  return { ok: true, sg_message_id: sgMessageId, to: toEmail };
}

async function sendTelegramAlert(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  }).catch(() => null);
}

class DispatcherAgent {
  // Dispatch a single approved draft. Returns { ok, draft_id, sent, sg_message_id }
  async dispatchOne(draft) {
    // Get the associated prospect
    const prospects = await db.select('prospects', `id=eq.${draft.prospect_id}&limit=1`);
    const prospect = Array.isArray(prospects) ? prospects[0] : null;
    if (!prospect) return { ok: false, draft_id: draft.id, error: 'prospect_not_found' };

    // Dedup guard: has anything been sent to this prospect in the last 24h?
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const recentSends = await db.select('prospect_drafts',
      `prospect_id=eq.${draft.prospect_id}&status=eq.sent&sent_at=gte.${oneDayAgo}&limit=1`);
    if (Array.isArray(recentSends) && recentSends.length > 0) {
      // Mark superseded
      await db.update('prospect_drafts', { id: draft.id }, { status: 'superseded' });
      await sendTelegramAlert(`⚠️ Atlas v3: Draft superseded (24h dedup guard)\nCompany: ${prospect.company}\nDraft: ${draft.id.slice(0, 8)}`);
      return { ok: false, draft_id: draft.id, reason: 'dedup_24h', action: 'superseded' };
    }

    // Send
    const sendResult = await sendViaEmail(draft, prospect);
    if (!sendResult.ok) {
      await db.update('prospect_drafts', { id: draft.id }, { status: 'failed' });
      return { ok: false, draft_id: draft.id, error: sendResult.error };
    }

    const now = new Date().toISOString();

    // Update draft record
    await db.update('prospect_drafts', { id: draft.id }, {
      status: 'sent',
      sent_at: now,
      sg_message_id: sendResult.sg_message_id,
    });

    // Update prospect
    await db.update('prospects', { id: draft.prospect_id }, {
      last_touched_at: now,
      touch_count:     (prospect.touch_count || 0) + 1,
      pipeline_stage:  'dispatched',
    });
    await db.logStageTransition(draft.prospect_id, 'drafted', 'dispatched', 'DispatcherAgent',
      `draft=${draft.id.slice(0, 8)} to=${sendResult.to}`);

    return {
      ok: true,
      draft_id:      draft.id,
      prospect_id:   draft.prospect_id,
      company:       prospect.company,
      to:            sendResult.to,
      sg_message_id: sendResult.sg_message_id,
      sent_at:       now,
    };
  }

  // Dispatch batch of approved drafts (respects rate limits)
  async runBatch(limit = 10) {
    // Check atlas config for pause flag
    const config = await getAtlasConfig();
    if (config?.paused) return { ok: true, processed: 0, reason: 'atlas_paused' };

    const dailyLimit = config?.daily_send_limit || DAILY_SEND_LIMIT;
    const todayCount = await getTodaySendCount();
    const headroom = dailyLimit - todayCount;

    if (headroom <= 0) return { ok: true, processed: 0, reason: 'daily_limit_reached', sent_today: todayCount };

    const maxToSend = Math.min(limit, headroom);

    // Find approved drafts in v3 table
    const approved = await db.select('prospect_drafts',
      `status=eq.approved&order=approved_at.asc.nullslast&limit=${maxToSend}`);
    if (!Array.isArray(approved) || approved.length === 0) {
      return { ok: true, processed: 0, reason: 'no_approved_drafts', headroom };
    }

    const results = [];
    for (const draft of approved) {
      if (results.length > 0) await new Promise(r => setTimeout(r, 500));
      const r = await this.dispatchOne(draft);
      results.push(r);
    }

    const sent = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok && !r.reason?.includes('dedup')).length;

    if (sent > 0) {
      await sendTelegramAlert(`📬 Atlas v3: ${sent} email${sent !== 1 ? 's' : ''} dispatched\n${results.filter(r => r.ok).map(r => `• ${r.company} → ${r.to}`).join('\n')}`);
    }

    return { ok: true, processed: approved.length, sent, failed, sent_today: todayCount + sent };
  }
}

module.exports = DispatcherAgent;
