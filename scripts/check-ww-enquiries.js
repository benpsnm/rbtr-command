'use strict';

// ── PSNM WhichWarehouse Enquiry Auto-Draft System ─────────────────────────────
// Polls Gmail every 10 min (via launchd) for incoming WW enquiry emails.
// For each new enquiry:
//   1. Extracts structured data via Claude
//   2. Classifies WW suitability for PSNM
//   3. Drafts a reply in Ben's voice
//   4. Saves to psnm_ww_enquiries (Supabase)
//   5. Inserts rbtr_tasks entry (P1, PSNM project)
//   6. Fires Telegram alert (if TELEGRAM_CHAT_ID set)
//
// Run: node check-ww-enquiries.js
// State: .ww-enquiry-check-state.json

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
const GMAIL_USER    = process.env.PSNM_GMAIL_USER || 'palletstoragenearme@gmail.com';
const GMAIL_PASS    = process.env.PSNM_GMAIL_APP_PASSWORD;

const DRY_RUN    = process.argv.includes('--dry-run');
const STATE_FILE = path.join(__dirname, '.ww-enquiry-check-state.json');
const LOG_FILE   = `${process.env.HOME}/Library/Logs/ww-enquiry-check.log`;

// ── WW detection patterns ─────────────────────────────────────────────────────
// WhichWarehouse can send from noreply@whichwarehouse.co.uk or similar.
// Subject and body patterns are broader — they forward in various formats.

const WW_FROM_PATTERNS = [
  /whichwarehouse/i,
  /which.?warehouse/i,
  /ww-leads/i,
];

const WW_SUBJECT_PATTERNS = [
  /storage enquiry/i,
  /warehouse enquiry/i,
  /new enquiry/i,
  /client looking/i,
  /pallet enquiry/i,
  /storage request/i,
  /storage lead/i,
];

const WW_BODY_PATTERNS = [
  /client looking for/i,
  /we have a client/i,
  /please see (comments|details|requirements)/i,
  /preferred location/i,
  /via whichwarehouse/i,
  /whichwarehouse\.co\.uk/i,
  /storage requirements/i,
  /number of pallets/i,
];

function detectWW(from, subject, bodyPreview) {
  const fromMatch    = WW_FROM_PATTERNS.some(p => p.test(from));
  const subjectMatch = WW_SUBJECT_PATTERNS.some(p => p.test(subject));
  const bodyMatch    = WW_BODY_PATTERNS.some(p => p.test(bodyPreview));
  if (fromMatch) return 'definite';
  if (subjectMatch && bodyMatch) return 'definite';
  if (subjectMatch || bodyMatch) return 'possible';
  return false;
}

// ── Logging ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { last_checked: new Date(Date.now() - 48 * 3600000).toISOString(), seen_ids: [] };
  }
}

function saveState(state) {
  // Keep seen_ids capped at 500 — dedup ring buffer
  if (state.seen_ids && state.seen_ids.length > 500) {
    state.seen_ids = state.seen_ids.slice(-500);
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
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
    log(`[sb] Insert error [${table}]: ${err.slice(0, 200)}`);
    return null;
  }
  return r.json();
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
  if (!r.ok) return null;
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

// ── Body extraction ───────────────────────────────────────────────────────────
function extractBodyPreview(rawSource) {
  const src = typeof rawSource === 'string' ? rawSource : rawSource.toString('utf8');
  const sep = src.indexOf('\r\n\r\n');
  const body = sep !== -1 ? src.slice(sep + 4) : src;
  return body
    .replace(/--[A-Za-z0-9_+/=]+\r?\n/g, '')
    .replace(/Content-[^\r\n]+\r?\n/g, '')
    .replace(/=\?[^?]+\?[BQbq]\?[^?]+\?=/g, '')
    .replace(/=[0-9A-Fa-f]{2}/g, '')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 2000);
}

// ── Gmail IMAP fetch ──────────────────────────────────────────────────────────
async function fetchNewEmails(sinceIso) {
  if (!GMAIL_PASS) {
    log('PSNM_GMAIL_APP_PASSWORD not set — Gmail check skipped. Add to scripts/.env');
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

    // Check INBOX and [Gmail]/All Mail to catch WW emails regardless of where they land
    for (const mailbox of ['INBOX', '[Gmail]/All Mail']) {
      let lock;
      try {
        lock = await client.getMailboxLock(mailbox);
      } catch {
        continue; // mailbox may not exist in some configurations
      }

      try {
        const sinceDate = new Date(sinceIso);

        for await (const msg of client.fetch(
          { since: sinceDate },
          { envelope: true, uid: true, source: true }
        )) {
          const fromAddr = msg.envelope.from?.[0]?.address?.toLowerCase() || '';
          const fromName = msg.envelope.from?.[0]?.name || '';
          const subject  = msg.envelope.subject || '';
          const bodyText = msg.source ? extractBodyPreview(msg.source) : '';
          const messageId = msg.envelope.messageId || `uid-${msg.uid}`;

          const detection = detectWW(fromAddr + ' ' + fromName, subject, bodyText);
          if (!detection) continue;

          log(`Possible WW email (${detection}): "${subject}" from ${fromAddr}`);

          results.push({
            uid:         msg.uid,
            messageId,
            from:        fromAddr,
            fromName:    fromName,
            subject,
            date:        msg.envelope.date || new Date(),
            bodyPreview: bodyText,
            detection,   // 'definite' | 'possible'
          });
        }
      } finally {
        lock.release();
      }
    }
  } catch (err) {
    log(`IMAP error: ${err.message}`);
    if (err.authenticationFailed) {
      log('Auth failed — check PSNM_GMAIL_APP_PASSWORD in scripts/.env');
    }
  } finally {
    try { await client.logout(); } catch {}
  }

  // Dedup within this batch (same messageId across mailboxes)
  const seen = new Set();
  return results.filter(r => {
    if (seen.has(r.messageId)) return false;
    seen.add(r.messageId);
    return true;
  });
}

// ── WW classifier + extractor system prompt (cache-eligible) ─────────────────
const WW_CLASSIFIER_SYSTEM = `You are classifying WhichWarehouse.co.uk enquiry emails for PSNM (Pallet Storage Near Me), an ambient-only pallet storage warehouse at Hellaby Industrial Estate, Rotherham S66 8HR.

PSNM FACTS:
- AMBIENT ONLY. No chilled. No frozen. No temperature-controlled. No hazmat. No pharma.
- Rates: £3.95/pallet/week (1-49), £3.45/pallet/week (50-149), £2.95/pallet/week (150+)
- 4-week rolling minimum.
- Location: S66 8HR, Rotherham — M18/M1 junction, South Yorkshire
- Capacity: up to ~1,600 pallets. Single unit, not a 3PL operation.

SUITABILITY CLASSIFICATION:
- FULL_FIT: ambient storage, 1-300 pallets, within 100 miles of Rotherham S66, no specialist needs. We want this business.
- PARTIAL_FIT: mostly ambient with small frozen/chilled portion (we take the ambient), OR location is 100-150 miles (possible with right volume), OR volume is 300-500 (we can discuss).
- WRONG_FIT_KEEP_DOOR_OPEN: frozen/chilled-only, under 5 pallets for short term, OR over 150 miles away. Worth staying friendly for future ambient Yorkshire leads.
- WRONG_FIT_DECLINE: hazmat/chemicals/explosives/radioactive we legally cannot take, or clearly beyond our capacity at 500+ pallets with zero flexibility.
- UNCLEAR: genuine enquiry but missing critical info to classify — we need to ask.

IMPORTANT — extract everything visible in the forwarded email:
- Client's preferred location/region (not WW's address)
- Number of pallets requested
- What they are storing (goods type)
- Whether frozen, chilled, or ambient storage required
- Any special requirements (racking, picking, fulfilment — all of which PSNM does NOT offer)
- Client name and company if visible in the forwarded text
- Urgency signals

Return ONLY valid JSON — no commentary, no markdown:
{
  "suitability": "FULL_FIT|PARTIAL_FIT|WRONG_FIT_KEEP_DOOR_OPEN|WRONG_FIT_DECLINE|UNCLEAR",
  "confidence": 0-100,
  "extracted": {
    "location": "...",
    "pallet_count": null,
    "product_type": "...",
    "frozen_needed": false,
    "chilled_needed": false,
    "hazmat_flag": false,
    "distance_from_s66_miles": null,
    "special_requirements": "...",
    "contact_name": null,
    "contact_company": null,
    "urgency": "immediate|this_week|within_month|planning|unknown"
  },
  "reason": "one sentence explaining the classification decision"
}`;

// ── WW drafter system prompt (cache-eligible) ─────────────────────────────────
const WW_DRAFTER_SYSTEM = `You write email replies FOR Ben Greenwood (owner of PSNM — Pallet Storage Near Me) in response to WhichWarehouse.co.uk enquiry forwards.

BEN'S VOICE: South Yorkshire. Direct. Short sentences. Honest. No corporate padding. Real person, not a template.
NEVER SAY: "please don't hesitate to contact us", "I hope this email finds you well", "going forward", "touch base", "leverage", "reaching out", "at your earliest convenience".
SIGN-OFF: Always exactly "Cheers\nBen\nPallet Storage Near Me\n07506 255033"

PSNM FACTS (use only these):
- Location: Unit 3C, Hellaby Industrial Estate, Rotherham S66 8HR — M18/M1 junction
- AMBIENT ONLY. No chilled. No frozen. No hazmat.
- Rates: £3.95/pallet/week (1-49 pallets), £3.45 (50-149), £2.95 (150+)
- Handling: £3.50 per pallet movement
- Minimum: 4-week rolling minimum
- Honest scale: single warehouse unit, not a 3PL — never overpromise
- Phone: 07506 255033

DRAFT BY CLASSIFICATION:
FULL_FIT — direct and confident, under 150 words:
  Acknowledge receipt. Confirm we can take it. Calculate the right rate tier if pallet count is known. Propose a call or site visit. Be specific.

PARTIAL_FIT — honest, under 150 words:
  State clearly what we CAN take. Be upfront about the limitation. If we can handle the ambient portion, say so explicitly. Propose next step.

WRONG_FIT_KEEP_DOOR_OPEN — polite, under 80 words:
  Thank them for the forward. One-sentence reason why we can't take this one. Ask WW to keep PSNM in mind for future ambient/Yorkshire leads. Warm not cold.
  Example for frozen: "Thanks for the forward. Bit of a tricky one for us — the frozen food requirement is a hard no, we're ambient storage only at Hellaby. We can't touch temp-controlled goods. Worth keeping PSNM on your list for future ambient enquiries in Yorkshire though — that's our wheelhouse."

WRONG_FIT_DECLINE — brief, under 50 words:
  Honest decline. State why. No ask to keep in touch if hazmat.

UNCLEAR — ask two specific questions, under 80 words:
  Identify exactly what's missing and ask for it directly.

Return ONLY valid JSON:
{
  "subject": "Re: [original subject or descriptive one if subject is generic]",
  "body_text": "plain text reply body",
  "next_step": "call_back|email_back|no_action|needs_info",
  "drafter_notes": "confidence and anything Ben should double-check before sending"
}`;

// ── Claude calls ──────────────────────────────────────────────────────────────
async function classifyAndExtract(email) {
  const client = new Anthropic.default({ apiKey: ANTHROPIC_KEY });

  const prompt = [
    `From: ${email.fromName ? `${email.fromName} <${email.from}>` : email.from}`,
    `Subject: ${email.subject}`,
    `Date: ${email.date}`,
    '',
    'Email body:',
    email.bodyPreview,
  ].join('\n');

  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: [{ type: 'text', text: WW_CLASSIFIER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.text || '{}';
  const json = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    const m = json.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Failed to parse classifier response: ${raw.slice(0, 100)}`);
  }
}

async function draftReply(email, classification) {
  const client = new Anthropic.default({ apiKey: ANTHROPIC_KEY });

  const extracted = classification.extracted || {};
  const prompt = [
    `Suitability: ${classification.suitability}`,
    `Reason: ${classification.reason}`,
    extracted.pallet_count ? `Pallet count: ${extracted.pallet_count}` : null,
    extracted.location     ? `Client location: ${extracted.location}` : null,
    extracted.product_type ? `Goods: ${extracted.product_type}` : null,
    extracted.frozen_needed ? 'Frozen storage needed: YES' : null,
    extracted.chilled_needed ? 'Chilled storage needed: YES' : null,
    extracted.special_requirements ? `Special requirements: ${extracted.special_requirements}` : null,
    extracted.contact_name ? `Contact: ${extracted.contact_name}` : null,
    extracted.contact_company ? `Company: ${extracted.contact_company}` : null,
    '',
    'Original email subject: ' + email.subject,
    '',
    'Forwarded email body:',
    email.bodyPreview,
  ].filter(Boolean).join('\n');

  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6',
    max_tokens: 800,
    system: [{ type: 'text', text: WW_DRAFTER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = msg.content[0]?.text || '{}';
  const json = raw.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(json);
  } catch {
    const m = json.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`Failed to parse drafter response: ${raw.slice(0, 100)}`);
  }
}

// ── Main processing pipeline ──────────────────────────────────────────────────
async function processEnquiry(email, state) {
  log(`Processing WW enquiry: "${email.subject}" from ${email.from}`);

  // Classify + draft in parallel — classifier is faster (Haiku), drafter may need re-run
  let classification;
  try {
    classification = await classifyAndExtract(email);
    log(`Classification: ${classification.suitability} (${classification.confidence}%) — ${classification.reason}`);
  } catch (err) {
    log(`Classify error: ${err.message}`);
    classification = {
      suitability: 'UNCLEAR',
      confidence: 0,
      extracted: {},
      reason: 'Classification failed — review manually',
    };
  }

  let draft;
  try {
    draft = await draftReply(email, classification);
    log(`Draft ready: "${draft.subject}" — next_step: ${draft.next_step}`);
  } catch (err) {
    log(`Draft error: ${err.message}`);
    draft = {
      subject: `Re: ${email.subject}`,
      body_text: '[Draft generation failed — classify manually and draft reply]',
      next_step: 'needs_info',
      drafter_notes: `Draft failed: ${err.message}`,
    };
  }

  // Canonical sign-off enforcement
  const SIGN_OFF = 'Cheers\nBen\nPallet Storage Near Me\n07506 255033';
  const cheersIdx = (draft.body_text || '').lastIndexOf('Cheers');
  if (cheersIdx !== -1) {
    draft.body_text = draft.body_text.slice(0, cheersIdx) + SIGN_OFF;
  } else {
    draft.body_text = (draft.body_text || '').trimEnd() + '\n\n' + SIGN_OFF;
  }

  // Insert to Supabase
  const row = {
    gmail_thread_id:       null,
    gmail_message_id:      email.messageId,
    received_at:           email.date instanceof Date ? email.date.toISOString() : String(email.date),
    from_email:            email.from,
    from_name:             email.fromName || null,
    subject:               email.subject,
    raw_email_body:        email.bodyPreview,
    extracted_data:        classification.extracted || {},
    classification:        classification.suitability,
    confidence:            classification.confidence || 0,
    classification_reason: classification.reason || null,
    draft_subject:         draft.subject,
    draft_body:            draft.body_text,
    draft_next_step:       draft.next_step || null,
    drafter_notes:         draft.drafter_notes || null,
    draft_gmail_message_id: null,
    ben_status:            'pending_review',
    ben_responded_at:      null,
    won_lost:              null,
    notes:                 null,
    source:                'ww_auto',
    detection_type:        email.detection,
  };

  const inserted = await sbInsert('psnm_ww_enquiries', row);
  const enquiryId = Array.isArray(inserted) ? inserted[0]?.id : null;
  log(`Saved to psnm_ww_enquiries: id=${enquiryId}`);

  // Insert rbtr_tasks — always P1 for WW enquiries
  const today = new Date().toISOString().slice(0, 10);
  const ext = classification.extracted || {};
  const displayName = ext.contact_company || ext.contact_name || email.from.split('@')[1] || 'Unknown';
  await sbInsert('rbtr_tasks', {
    description: `WW enquiry: ${displayName} — ${classification.suitability} — reply draft ready`,
    priority: 1,
    status: 'open',
    source: 'ww_auto',
    source_detail: `check-ww-enquiries.js | enquiry_id=${enquiryId}`,
    project: 'PSNM',
    due_date: today,
  });

  // Telegram alert
  const suitEmoji = {
    FULL_FIT: '✅',
    PARTIAL_FIT: '🟡',
    WRONG_FIT_KEEP_DOOR_OPEN: '🔶',
    WRONG_FIT_DECLINE: '❌',
    UNCLEAR: '❓',
  }[classification.suitability] || '📩';

  const pallets = ext.pallet_count ? `${ext.pallet_count} pallets` : 'unknown pallets';
  const location = ext.location || 'location unknown';
  const goods = ext.product_type || 'goods unknown';

  await sendTelegram([
    `${suitEmoji} <b>WW enquiry — ${classification.suitability}</b>`,
    `${pallets} · ${goods} · ${location}`,
    `Confidence: ${classification.confidence}%`,
    ``,
    `<i>${classification.reason}</i>`,
    ``,
    `Draft ready in psnm_ww_enquiries. Review + approve.`,
    `Next step: ${draft.next_step || 'check draft'}`,
  ].join('\n'));

  // Push messageId to dedup list
  if (!state.seen_ids) state.seen_ids = [];
  state.seen_ids.push(email.messageId);

  log(`Done: ${email.from} — ${classification.suitability}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) log('--- WW enquiry check start [DRY-RUN — no writes] ---');
  else log('--- WW enquiry check start ---');

  if (!DRY_RUN && !ANTHROPIC_KEY) {
    log('FATAL: ANTHROPIC_API_KEY not set — cannot classify or draft. Check scripts/.env');
    process.exit(1);
  }

  const state = loadState();
  log(`Polling inbox: ${GMAIL_USER}`);
  log(`Checking for WW emails since ${state.last_checked}`);

  const emails = await fetchNewEmails(state.last_checked);

  if (emails.length === 0) {
    log('No WW enquiry emails found');
    if (!DRY_RUN) saveState({ ...state, last_checked: new Date().toISOString() });
    return;
  }

  log(`Found ${emails.length} potential WW email(s)`);

  if (DRY_RUN) {
    for (const email of emails) {
      log(`[DRY-RUN] Would process: "${email.subject}" from ${email.from} (${email.detection})`);
    }
    log('--- WW enquiry check complete [DRY-RUN — state not updated] ---');
    return;
  }

  for (const email of emails) {
    // Dedup via state file
    if (state.seen_ids?.includes(email.messageId)) {
      log(`Skip (already processed): ${email.subject} / ${email.messageId}`);
      continue;
    }

    // Dedup via Supabase
    const existing = await sbSelect(
      'psnm_ww_enquiries',
      `gmail_message_id=eq.${encodeURIComponent(email.messageId)}&select=id&limit=1`
    );
    if (existing?.length > 0) {
      log(`Skip (already in DB): ${email.messageId}`);
      if (!state.seen_ids) state.seen_ids = [];
      state.seen_ids.push(email.messageId);
      continue;
    }

    try {
      await processEnquiry(email, state);
    } catch (err) {
      log(`Unhandled error processing ${email.from}: ${err.message}`);
    }
  }

  saveState({ ...state, last_checked: new Date().toISOString() });
  log('--- WW enquiry check complete ---');
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
