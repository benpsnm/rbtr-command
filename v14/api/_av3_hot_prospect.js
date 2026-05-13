'use strict';
// Atlas v3 — HotProspectAgent
// Promotes high-engagement prospects to hot status based on email events + reply intent.
// Hot prospects surface prominently in Rocko's morning brief.

const db = require('./_av3_db');

// Score weights for hot promotion decision
const SIGNALS = {
  email_open:    5,
  email_click:   15,
  email_reply:   25,
  intent_interested: 40,
  intent_asking_question: 20,
  multiple_opens: 10,   // 3+ opens from same prospect
  recent_touch:  5,     // touched in last 48h
};

const HOT_THRESHOLD = 35;   // total signal score to become hot
const COLD_THRESHOLD = 10;  // below this = depromote from hot

async function getEngagementSignals(prospectId) {
  const oneDayAgo  = new Date(Date.now() - 86400000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [events, replies, drafts] = await Promise.all([
    // SendGrid events (opens, clicks) from v3 drafts
    db.select('psnm_outreach_events',
      `created_at=gte.${sevenDaysAgo}&select=event_type,created_at`
    ).then(async rows => {
      // Link via draft sg_message_ids for this prospect
      if (!Array.isArray(rows)) return [];
      const pDrafts = await db.select('prospect_drafts', `prospect_id=eq.${prospectId}&sg_message_id=not.is.null&select=sg_message_id`);
      const msgIds = new Set((pDrafts || []).map(d => d.sg_message_id));
      return rows.filter(r => msgIds.has(r.sg_message_id));
    }).catch(() => []),
    // Reply intent signals
    db.select('prospect_replies',
      `prospect_id=eq.${prospectId}&received_at=gte.${sevenDaysAgo}&select=intent,intent_confidence,received_at`
    ).catch(() => []),
    // Draft metadata
    db.select('prospect_drafts',
      `prospect_id=eq.${prospectId}&status=in.(sent,dispatched)&select=id,sent_at,touch_number`
    ).catch(() => []),
  ]);

  return { events: events || [], replies: replies || [], drafts: drafts || [] };
}

function computeHotScore(signals, prospect) {
  let score = 0;
  const { events, replies, drafts } = signals;

  // Email engagement signals
  const opens = events.filter(e => e.event_type === 'open');
  const clicks = events.filter(e => e.event_type === 'click');

  if (opens.length > 0) score += SIGNALS.email_open;
  if (opens.length >= 3) score += SIGNALS.multiple_opens;
  if (clicks.length > 0) score += SIGNALS.email_click;

  // Reply intent signals
  for (const r of replies) {
    if (r.intent === 'interested') score += SIGNALS.intent_interested;
    else if (r.intent === 'asking_question') score += SIGNALS.intent_asking_question;
    if (r.intent === 'unsubscribe' || r.intent === 'complaint') {
      score = -100; // force dead
      break;
    }
  }

  // Recent touch bonus
  if (prospect.last_touched_at) {
    const daysSinceTouch = (Date.now() - new Date(prospect.last_touched_at).getTime()) / 86400000;
    if (daysSinceTouch <= 2) score += SIGNALS.recent_touch;
  }

  // High fit score bonus
  if ((prospect.fit_score || 0) >= 75) score += 10;

  return { score, opens: opens.length, clicks: clicks.length, replies_count: replies.length };
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

class HotProspectAgent {
  // Evaluate a single dispatched prospect for hot promotion. Returns { ok, prospect_id, action }
  async evaluateOne(prospect) {
    const signals = await getEngagementSignals(prospect.id);
    const { score, opens, clicks, replies_count } = computeHotScore(signals, prospect);

    const wasHot = prospect.hot_flag;
    const now = new Date().toISOString();

    if (score <= -50) {
      // Force to dead (unsubscribe/complaint)
      await db.update('prospects', { id: prospect.id }, {
        hot_flag: false, status: 'unsubscribed', pipeline_stage: 'dead',
      });
      return { ok: true, prospect_id: prospect.id, action: 'force_dead', score };
    }

    if (!wasHot && score >= HOT_THRESHOLD) {
      // Promote to hot
      await db.update('prospects', { id: prospect.id }, {
        hot_flag: true, hot_since: now, pipeline_stage: 'hot',
      });
      await db.logStageTransition(prospect.id, prospect.pipeline_stage, 'hot',
        'HotProspectAgent', `score=${score} opens=${opens} clicks=${clicks} replies=${replies_count}`);
      await sendTelegramAlert(`🔥 *HOT PROSPECT*: ${prospect.company}\nScore: ${score} | ${opens} opens | ${clicks} clicks | ${replies_count} replies\nFit: ${prospect.fit_score || '?'}/100 | Stage: hot`);
      return { ok: true, prospect_id: prospect.id, action: 'promoted_hot', score };
    }

    if (wasHot && score < COLD_THRESHOLD) {
      // Depromote
      await db.update('prospects', { id: prospect.id }, {
        hot_flag: false, pipeline_stage: 'dispatched',
      });
      await db.logStageTransition(prospect.id, 'hot', 'dispatched',
        'HotProspectAgent', `score=${score} dropped below cold threshold`);
      return { ok: true, prospect_id: prospect.id, action: 'demoted_cold', score };
    }

    return { ok: true, prospect_id: prospect.id, action: 'no_change', score, was_hot: wasHot };
  }

  // Evaluate all dispatched/replied prospects for hot promotion
  async runBatch(limit = 30) {
    const active = await db.select('prospects',
      `pipeline_stage=in.(dispatched,replied,hot)&status=eq.active&order=last_touched_at.desc.nullslast&limit=${limit}`);
    if (!Array.isArray(active) || active.length === 0) {
      return { ok: true, processed: 0, reason: 'no_active_dispatched_prospects' };
    }

    const results = [];
    for (const p of active) {
      const r = await this.evaluateOne(p);
      results.push(r);
    }

    const promoted = results.filter(r => r.action === 'promoted_hot').length;
    const demoted = results.filter(r => r.action === 'demoted_cold').length;

    return { ok: true, processed: active.length, promoted, demoted };
  }

  // Get current hot prospects list (for brief + UI)
  async getHotProspects(limit = 10) {
    return db.select('prospects',
      `hot_flag=eq.true&status=eq.active&order=hot_since.desc.nullslast&limit=${limit}&select=id,company,city,fit_score,touch_count,last_touched_at,hot_since,last_reply_intent,pipeline_stage,decision_maker_name,decision_maker_email,pallet_estimate`);
  }
}

module.exports = HotProspectAgent;
