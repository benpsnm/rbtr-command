'use strict';
// Atlas v3 — ReplyIntentAgent
// Classifies inbound replies into 6 intent types and triggers appropriate next actions.
// Sources: psnm_inbound_replies (legacy) and prospect_replies (v3)

const db = require('./_av3_db');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are classifying reply emails from prospects that received a cold outreach email from PSNM — Pallet Storage Near Me, a 1,602-space ambient pallet warehouse in Hellaby, Rotherham S66 8HR.

Classify the intent of the reply. Return ONLY valid JSON:
{
  "intent": one of: "interested" | "not_now" | "wrong_contact" | "unsubscribe" | "asking_question" | "complaint" | "auto_reply" | "unknown",
  "intent_confidence": 0-100,
  "intent_reasoning": "one sentence",
  "next_action": one of: "call_now" | "send_quote" | "draft_reply" | "mark_dead" | "unsubscribe" | "forward_to_contact" | "no_action",
  "urgency": "immediate" | "this_week" | "low" | "none",
  "key_signal": "the specific word/phrase that determined intent"
}

Intent definitions:
- interested: positive engagement, wants to know more, mentions pallets/storage/prices
- not_now: polite decline, not current need, timing issue ("maybe later", "budgets frozen", "not this year")
- wrong_contact: correct company but wrong person, asks to redirect
- unsubscribe: explicit "remove me", "unsubscribe", "stop emailing", "not interested at all"
- asking_question: neutral enquiry seeking info without committing
- complaint: annoyed, aggressive, demands to stop
- auto_reply: out of office, automated response, no human signal
- unknown: cannot determine from context`;

async function claudeClassifyReply(subject, bodyText, context = '') {
  if (!ANTHROPIC_API_KEY) return null;

  const userMsg = `Subject: ${subject || '(no subject)'}\n\nReply body:\n${bodyText?.slice(0, 1500) || '(empty body)'}\n\n${context ? `Context: ${context}` : ''}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!r.ok) return null;
  const j = await r.json();
  const raw = (j.content || [])[0]?.text || '';
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// Heuristic fallback if Claude is unavailable
function heuristicClassifyReply(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();

  if (/out of office|auto.?reply|away from|on leave|annual leave|holiday/i.test(text))
    return { intent: 'auto_reply', intent_confidence: 90, next_action: 'no_action', urgency: 'none', key_signal: 'auto-reply detected' };

  if (/unsubscribe|remove me|stop emailing|stop contacting|do not contact|remove from|opt.?out/i.test(text))
    return { intent: 'unsubscribe', intent_confidence: 95, next_action: 'unsubscribe', urgency: 'immediate', key_signal: 'unsubscribe signal' };

  if (/not interested|no thank|not for us|don't need|not relevant|not applicable|already have/i.test(text))
    return { intent: 'not_now', intent_confidence: 80, next_action: 'mark_dead', urgency: 'none', key_signal: 'not interested' };

  if (/interested|tell me more|send me|what.s the|how much|pricing|rates|price|quote|availability|space available/i.test(text))
    return { intent: 'interested', intent_confidence: 85, next_action: 'call_now', urgency: 'this_week', key_signal: 'positive engagement' };

  if (/wrong person|not my area|try|contact|colleague|please forward|not responsible/i.test(text))
    return { intent: 'wrong_contact', intent_confidence: 80, next_action: 'forward_to_contact', urgency: 'this_week', key_signal: 'redirect signal' };

  return { intent: 'unknown', intent_confidence: 30, next_action: 'draft_reply', urgency: 'low', key_signal: 'no clear signal' };
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

class ReplyIntentAgent {
  // Classify a single reply. Returns { ok, reply_id, intent, next_action }
  async classifyOne(reply) {
    const { id, subject, body_text, from_email, from_name, in_reply_to } = reply;

    // Try Claude first
    let classification;
    try {
      classification = await claudeClassifyReply(subject, body_text,
        `From: ${from_name || ''} <${from_email}>`);
    } catch { classification = null; }

    // Fallback to heuristic
    if (!classification) classification = heuristicClassifyReply(subject, body_text);

    const now = new Date().toISOString();

    // Try to match to a v3 prospect via from_email
    let prospectId = reply.prospect_id || null;
    let draftId = reply.draft_id || null;

    if (!prospectId && from_email) {
      const domain = from_email.split('@')[1]?.toLowerCase();
      if (domain) {
        const matched = await db.select('prospects', `domain=eq.${encodeURIComponent(domain)}&status=eq.active&limit=1`);
        if (Array.isArray(matched) && matched.length > 0) {
          prospectId = matched[0].id;
        }
      }
    }

    // Try to match draft via in_reply_to / sg_message_id
    if (!draftId && in_reply_to) {
      const matchedDraft = await db.select('prospect_drafts',
        `sg_message_id=eq.${encodeURIComponent(in_reply_to)}&limit=1`);
      if (Array.isArray(matchedDraft) && matchedDraft.length > 0) {
        draftId = matchedDraft[0].id;
        if (!prospectId) prospectId = matchedDraft[0].prospect_id;
      }
    }

    // Insert or update in prospect_replies
    let replyRecord;
    if (reply._source === 'v3') {
      // Already in prospect_replies — just update the classification
      await db.update('prospect_replies', { id }, {
        intent:            classification.intent,
        intent_confidence: classification.intent_confidence,
        intent_reasoning:  classification.intent_reasoning,
        next_action:       classification.next_action,
        prospect_id:       prospectId,
        draft_id:          draftId,
      });
      replyRecord = { id };
    } else {
      // Insert fresh from legacy psnm_inbound_replies source
      const [inserted] = await db.insert('prospect_replies', {
        prospect_id:       prospectId,
        draft_id:          draftId,
        from_email:        from_email,
        from_name:         from_name || null,
        subject:           subject || null,
        body_text:         body_text?.slice(0, 5000) || null,
        message_id:        reply.message_id || null,
        in_reply_to:       in_reply_to || null,
        intent:            classification.intent,
        intent_confidence: classification.intent_confidence,
        intent_reasoning:  classification.intent_reasoning,
        next_action:       classification.next_action,
        ben_responded:     false,
        received_at:       reply.received_at || now,
      });
      replyRecord = inserted;
    }

    // Apply consequences based on intent
    if (prospectId) {
      await this._applyIntentConsequences(prospectId, classification);
    }

    // Alert Ben for actionable intents
    if (['interested', 'asking_question'].includes(classification.intent) && (classification.intent_confidence || 0) >= 60) {
      const company = from_name || from_email;
      const emoji = classification.intent === 'interested' ? '🔥' : '❓';
      await sendTelegramAlert(`${emoji} Atlas v3: Reply classified\n*${company}* → **${classification.intent}**\nNext: ${classification.next_action}\n_"${classification.key_signal}"_`);
    }

    return {
      ok: true,
      reply_id:    replyRecord?.id || id,
      prospect_id: prospectId,
      intent:      classification.intent,
      intent_confidence: classification.intent_confidence,
      next_action: classification.next_action,
    };
  }

  async _applyIntentConsequences(prospectId, classification) {
    const prospect = await db.select('prospects', `id=eq.${prospectId}&limit=1`).then(r => Array.isArray(r) ? r[0] : null);
    if (!prospect) return;

    const updates = {
      last_reply_intent: classification.intent,
      last_touched_at:   new Date().toISOString(),
    };

    if (classification.intent === 'unsubscribe' || classification.intent === 'complaint') {
      updates.status = 'unsubscribed';
      updates.pipeline_stage = 'dead';
    } else if (classification.intent === 'interested') {
      updates.hot_flag = true;
      updates.hot_since = new Date().toISOString();
      updates.pipeline_stage = 'replied';
    } else if (classification.intent === 'not_now') {
      updates.pipeline_stage = 'replied';
    } else if (classification.intent !== 'auto_reply') {
      updates.pipeline_stage = 'replied';
    }

    await db.update('prospects', { id: prospectId }, updates);

    if (['replied', 'dead'].includes(updates.pipeline_stage)) {
      await db.logStageTransition(prospectId, prospect.pipeline_stage, updates.pipeline_stage,
        'ReplyIntentAgent', `intent=${classification.intent}`);
    }
  }

  // Process unclassified replies from legacy psnm_inbound_replies
  async processLegacyReplies(limit = 20) {
    const legacy = await db.select('psnm_inbound_replies',
      `status=eq.unread&order=received_at.desc&limit=${limit}&select=id,from_email,from_name,subject,body_text,received_at,message_id,in_reply_to`);
    if (!Array.isArray(legacy) || legacy.length === 0) {
      return { ok: true, processed: 0, reason: 'no_unread_legacy_replies' };
    }

    const results = [];
    for (const r of legacy) {
      if (results.length > 0 && ANTHROPIC_API_KEY) await new Promise(resolve => setTimeout(resolve, 600));
      const classified = await this.classifyOne({ ...r, _source: 'legacy' });
      results.push(classified);
      // Mark as triaged in legacy table
      await db.update('psnm_inbound_replies', { id: r.id }, { status: 'triaged' }).catch(() => null);
    }

    const processed = results.filter(r => r.ok).length;
    const interested = results.filter(r => r.intent === 'interested').length;
    return { ok: true, processed, interested, results: results.map(r => ({ intent: r.intent, prospect_id: r.prospect_id })) };
  }

  // Process unclassified v3 prospect_replies
  async processV3Replies(limit = 20) {
    const unclassified = await db.select('prospect_replies',
      `intent=is.null&order=received_at.desc&limit=${limit}`);
    if (!Array.isArray(unclassified) || unclassified.length === 0) {
      return { ok: true, processed: 0, reason: 'no_unclassified_v3_replies' };
    }

    const results = [];
    for (const r of unclassified) {
      if (results.length > 0 && ANTHROPIC_API_KEY) await new Promise(resolve => setTimeout(resolve, 600));
      const classified = await this.classifyOne({ ...r, _source: 'v3' });
      results.push(classified);
    }

    return { ok: true, processed: results.length, results };
  }
}

module.exports = ReplyIntentAgent;
