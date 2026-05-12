'use strict';

// ── PSNM Outreach Reply Tracker ───────────────────────────────────────────────
// Runs every 15 min via launchd. Checks Gmail INBOX for replies from outreach
// contacts, classifies them via Claude, inserts to psnm_outreach_replies, fires
// Telegram alert for hot replies, inserts rbtr_tasks for "interested" replies,
// drafts a suggested response and saves it to Supabase for Ben to review.
//
// Prerequisites (one-time Ben setup):
//   1. Google Account → Security → 2-Step Verification → App Passwords → "PSNM Outreach"
//      → paste 16-char code as GMAIL_APP_PASSWORD in scripts/.env
//   2. Add ANTHROPIC_API_KEY to scripts/.env
//   3. Send /start to your Telegram bot → forward to @userinfobot → paste chat_id as TELEGRAM_CHAT_ID

const path      = require('path');
const fs        = require('fs');
const { ImapFlow } = require('imapflow');
const Anthropic  = require('@anthropic-ai/sdk');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://mpxgyobotiqcawmqlhbf.supabase.co';
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const TELEGRAM_BOT  = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT = process.env.TELEGRAM_CHAT_ID;
const GMAIL_USER    = process.env.GMAIL_USER    || 'beniproautobodies@gmail.com';
const GMAIL_PASS    = process.env.GMAIL_APP_PASSWORD;

const STATE_FILE = path.join(__dirname, '.outreach-check-state.json');
const LOG_FILE   = `${process.env.HOME}/Library/Logs/outreach-reply-check.log`;

// ── Outreach contacts — May 2026 batch ───────────────────────────────────────
// Update this list when new batches go out. outreach_id is the dedup slug.
const OUTREACH_CONTACTS = [
  // Batch 1 — 2026-05-11
  { company: 'Pricecheck Pharmaceuticals', email: 'debbie.harrison@pricecheck.uk.com',        outreach_id: 'pricecheck-pharma-2026-05-11' },
  { company: 'GW Engineering',             email: 'graeme@gw-engineering.co.uk',              outreach_id: 'gw-engineering-2026-05-11'     },
  { company: 'Newell & Wright Transport',  email: 'traffic@nwtransport.com',                  outreach_id: 'newell-wright-2026-05-11'      },
  { company: 'Renoco Engineering Ltd',     email: 'renocoeng@aol.com',                        outreach_id: 'renoco-engineering-2026-05-11' },
  { company: 'Yorkshire Manufacturing',    email: 'sales@ymlimited.co.uk',                    outreach_id: 'yorkshire-mfg-2026-05-11'      },
  { company: 'NM Metal Recycling',         email: 'info@nmmetalrecycling.co.uk',              outreach_id: 'nm-metal-recycling-2026-05-11' },
  { company: 'WKH Group',                  email: 'enquiries@wkhgroup.co.uk',                 outreach_id: 'wkh-group-2026-05-11'          },
  { company: 'Medequip Derby City',        email: 'derbycity@medequip-uk.com',                outreach_id: 'medequip-derby-2026-05-11'     },
  { company: 'Building Materials Yorks',   email: 'sales@buildingmaterialsyorkshire.co.uk',   outreach_id: 'bmy-2026-05-11'               },
  // Batch 2 — 2026-05-11
  { company: 'International Stones UK',    email: 'mat@istones.co.uk',                        outreach_id: 'intl-stones-2026-05-11'        },
  { company: 'Clugston Distribution',      email: 'nick.brogden@clugston.co.uk',              outreach_id: 'clugston-2026-05-11'           },
  { company: 'Stanton Logistics',          email: 'chrism@stantonlogistics.co.uk',            outreach_id: 'stanton-logistics-2026-05-11'  },
  { company: 'All Shires Foods',           email: 'adam@allshiresfoods.co.uk',                outreach_id: 'all-shires-foods-2026-05-11'   },
];

const CONTACT_BY_EMAIL = new Map(
  OUTREACH_CONTACTS.map(c => [c.email.toLowerCase(), c])
);

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── State — persists last_checked timestamp ───────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    // Default to 7 days ago on first run so we catch any recent replies
    return { last_checked: new Date(Date.now() - 7 * 86400000).toISOString() };
  }
}
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) {
    h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  }
  return h;
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const r = await fetch(url, { headers: sbHeaders() });
  if (!r.ok) return null;
  return r.json();
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    const err = await r.text();
    log(`Supabase insert error [${table}]: ${err}`);
    return null;
  }
  return r.json();
}

// ── Telegram alert ────────────────────────────────────────────────────────────
async function sendTelegram(text) {
  if (!TELEGRAM_BOT || !TELEGRAM_CHAT) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(e => log(`Telegram error: ${e.message}`));
}

// ── rbtr_tasks insert ─────────────────────────────────────────────────────────
async function insertTask(description, priority, dueDate) {
  return sbInsert('rbtr_tasks', {
    description,
    priority,
    status: 'open',
    source: 'outreach_reply_tracker',
    source_detail: 'Auto-generated by check-outreach-replies.js',
    project: 'PSNM',
    due_date: dueDate,
  });
}

// ── Body extraction — strip headers + MIME from raw email source ──────────────
function extractBodyPreview(rawSource) {
  const src = typeof rawSource === 'string' ? rawSource : rawSource.toString('utf8');
  // Find end of headers (blank line)
  const sep = src.indexOf('\r\n\r\n');
  const body = sep !== -1 ? src.slice(sep + 4) : src;
  // Strip MIME boundaries, Content- headers, encoded-word headers
  let text = body
    .replace(/--[A-Za-z0-9_+/=]+\r?\n/g, '')
    .replace(/Content-[^\r\n]+\r?\n/g, '')
    .replace(/=\?[^?]+\?[BQbq]\?[^?]+\?=/g, '')
    .replace(/=[0-9A-Fa-f]{2}/g, '') // quoted-printable
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text.slice(0, 500);
}

// ── Gmail IMAP fetch ──────────────────────────────────────────────────────────
async function fetchNewReplies(sinceIso) {
  if (!GMAIL_PASS) {
    log('GMAIL_APP_PASSWORD not set — Gmail check skipped. Add to scripts/.env');
    return [];
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    logger: false,
  });

  const results = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const sinceDate = new Date(sinceIso);

      for await (const msg of client.fetch(
        { since: sinceDate },
        { envelope: true, uid: true, source: true }
      )) {
        const fromAddr = msg.envelope.from?.[0]?.address?.toLowerCase();
        if (!fromAddr) continue;

        const contact = CONTACT_BY_EMAIL.get(fromAddr);
        if (!contact) continue; // Not from an outreach contact

        const messageId = msg.envelope.messageId || `uid-${msg.uid}`;
        const bodyPreview = msg.source ? extractBodyPreview(msg.source) : '';

        results.push({
          uid: msg.uid,
          messageId,
          threadId: null, // IMAP doesn't expose Gmail thread IDs directly
          from: fromAddr,
          subject: msg.envelope.subject || '(no subject)',
          date: msg.envelope.date || new Date(),
          company: contact.company,
          outreach_id: contact.outreach_id,
          bodyPreview,
        });
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    log(`IMAP error: ${err.message}`);
    if (err.authenticationFailed) {
      log('Authentication failed — check GMAIL_APP_PASSWORD in scripts/.env');
    }
  } finally {
    try { await client.logout(); } catch {}
  }

  return results;
}

// ── Claude classifier ─────────────────────────────────────────────────────────
const CLASSIFIER_SYSTEM = `You are classifying email replies to B2B cold outreach for a pallet storage facility (PSNM — Pallet Storage Near Me, Hellaby Industrial Estate, Rotherham S66). The original emails offered affordable ambient pallet storage to local businesses.

Classify the reply into exactly one category:
- interested: they want to discuss, ask for availability, pricing, or next steps
- not_interested: clear decline or "we're sorted" / "not needed"
- questions: they want more information before deciding (not a yes, not a no)
- out_of_office: automated auto-reply
- unsubscribe: they want to be removed from contact
- unclear: human-authored but genuinely ambiguous

Return ONLY valid JSON — no commentary, no markdown:
{
  "classification": "<category>",
  "confidence": <0-100>,
  "suggested_next_action": "<one sentence action for Ben>",
  "key_points": ["<point 1>", "<point 2>"]
}`;

async function classify(reply) {
  if (!ANTHROPIC_KEY) {
    log('ANTHROPIC_API_KEY not set — classification skipped');
    return {
      classification: 'unclear',
      confidence: 0,
      suggested_next_action: 'Review manually — no API key for auto-classification',
      key_points: [],
    };
  }

  try {
    const client = new Anthropic.default({ apiKey: ANTHROPIC_KEY });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CLASSIFIER_SYSTEM,
      messages: [{
        role: 'user',
        content: `Company: ${reply.company}\nSubject: ${reply.subject}\nReply text:\n${reply.bodyPreview}`,
      }],
    });

    const raw = msg.content[0]?.text || '{}';
    // Strip any accidental markdown fences
    const json = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(json);
  } catch (err) {
    log(`Classification error: ${err.message}`);
    return {
      classification: 'unclear',
      confidence: 0,
      suggested_next_action: 'Review manually — classification failed',
      key_points: [],
    };
  }
}

// ── Reply drafter — saves suggested text to Supabase, Ben reviews + sends ─────
const DRAFTER_SYSTEM = `You are writing an email reply on behalf of Ben Greenwood, owner of PSNM (Pallet Storage Near Me), a pallet storage facility at Hellaby Industrial Estate, Rotherham S66 8HR, near the M18 J1 motorway junction.

Tone: South Yorkshire. Direct. Short sentences. Confident but not pushy. Feels like it came from a real person, not a template.

Standard PSNM facts:
- Ambient storage only (no chilled, no hazmat)
- Pricing: from around £4–5 per pallet per week for 50+ pallets, higher for small quantities, negotiable on volume
- Access: forklift handled, Mon–Fri, advance notice preferred
- Can typically onboard within a week

Write a short reply (3–6 sentences). Match the energy of their email. If they asked specific questions, answer them directly. End with a clear next step (call, visit, or send a number to call).

Return ONLY the email body text — no subject line, no JSON, no "Dear" header.`;

async function draftReply(reply, classification) {
  if (!ANTHROPIC_KEY) return null;
  if (!['interested', 'questions'].includes(classification.classification)) return null;

  try {
    const client = new Anthropic.default({ apiKey: ANTHROPIC_KEY });
    const tone = classification.classification === 'interested'
      ? 'They are interested. Move toward a call or visit.'
      : `They have questions: ${(classification.key_points || []).join('; ')}. Answer those directly.`;

    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: DRAFTER_SYSTEM,
      messages: [{
        role: 'user',
        content: `Company: ${reply.company}\nTheir reply subject: ${reply.subject}\nTheir message:\n${reply.bodyPreview}\n\nInstruction: ${tone}`,
      }],
    });

    return msg.content[0]?.text?.trim() || null;
  } catch (err) {
    log(`Draft error: ${err.message}`);
    return null;
  }
}

// ── Urgency handling — Telegram + rbtr_tasks ──────────────────────────────────
async function handleUrgency(reply, classification) {
  const c = classification.classification;
  const confidence = classification.confidence || 0;
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const in2days   = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  if (c === 'interested' && confidence > 70) {
    const tgMsg = `<b>PSNM — Interested reply</b>\n\nFrom: ${reply.company} (${reply.from})\nSubject: ${reply.subject}\n\nNext: ${classification.suggested_next_action}\n\nDraft reply saved in Supabase. Respond within 24h.`;
    await sendTelegram(tgMsg);
    await insertTask(
      `Reply from ${reply.company} — interested, respond within 24h. Draft in psnm_outreach_replies.`,
      1,
      tomorrow
    );
    log(`Telegram alert sent for ${reply.company} (interested)`);

  } else if (c === 'questions') {
    await insertTask(
      `Reply from ${reply.company} — has questions, draft response ready in psnm_outreach_replies.`,
      2,
      in2days
    );

  } else if (c === 'unsubscribe') {
    // Mark do_not_contact in Supabase — handled in main via the row insert
    log(`${reply.company} — unsubscribe. Marked do_not_contact. No task created.`);
    // Note: auto-acknowledge email requires SMTP/Gmail OAuth — not implemented in this script.
    // Ben should manually send a brief "removed from list" reply.
  }
  // out_of_office and not_interested: no action needed
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log('--- Outreach reply check start ---');

  const state = loadState();
  log(`Checking for replies since ${state.last_checked}`);

  const replies = await fetchNewReplies(state.last_checked);

  if (replies.length === 0) {
    log('No new replies from outreach contacts');
    saveState({ last_checked: new Date().toISOString() });
    return;
  }

  log(`Found ${replies.length} reply(ies) from outreach contacts`);

  for (const reply of replies) {
    // Dedup — skip if already in Supabase
    const existing = await sbSelect(
      'psnm_outreach_replies',
      `gmail_message_id=eq.${encodeURIComponent(reply.messageId)}&select=id`
    );
    if (existing && existing.length > 0) {
      log(`Skip (already logged): ${reply.company} / ${reply.messageId}`);
      continue;
    }

    log(`Processing: ${reply.company} <${reply.from}>`);

    const [classification, suggestedReply] = await Promise.all([
      classify(reply),
      draftReply(reply, { classification: 'pending' }), // draft after classify below
    ]);

    // Re-draft with actual classification
    const finalDraft = await draftReply(reply, classification);

    const row = {
      outreach_id:              reply.outreach_id,
      gmail_thread_id:          reply.threadId,
      gmail_message_id:         reply.messageId,
      from_email:               reply.from,
      received_at:              reply.date instanceof Date ? reply.date.toISOString() : reply.date,
      subject:                  reply.subject,
      body_preview:             reply.bodyPreview,
      classification:           classification.classification,
      classification_confidence: classification.confidence,
      key_points:               classification.key_points ? JSON.stringify(classification.key_points) : null,
      next_action:              classification.suggested_next_action,
      suggested_reply:          finalDraft,
      ben_responded:            false,
      do_not_contact:           classification.classification === 'unsubscribe',
    };

    const inserted = await sbInsert('psnm_outreach_replies', row);
    if (!inserted) {
      log(`Insert failed for ${reply.company} — will retry next run`);
      continue;
    }

    await handleUrgency(reply, classification);

    log(`Logged: ${reply.company} — ${classification.classification} (${classification.confidence}%)`);
  }

  saveState({ last_checked: new Date().toISOString() });
  log('--- Outreach reply check complete ---');
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
