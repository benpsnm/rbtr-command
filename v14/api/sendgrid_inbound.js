'use strict';

// ── SendGrid Inbound Parse · reply capture handler ────────────────────────────
// Receives inbound emails forwarded by SendGrid's Inbound Parse service.
// No signature verification — Inbound Parse does not sign payloads.
// Auth: SENDGRID_INBOUND_SECRET query param (same pattern as atlas.js inboundEmail).
//
// On each inbound POST:
//   1. Parse multipart/form-data body → fields
//   2. Extract In-Reply-To / References / Message-ID from headers blob
//   3. Try to match to an outbound draft via sg_message_id ↔ In-Reply-To
//   4. Fall back to matching prospect via from_email
//   5. INSERT into psnm_inbound_replies
//   6. Fire Telegram alert
//   7. Always return 200 — avoid SendGrid retry storms on transient errors
//
// bodyParser: false — raw stream required for Busboy multipart parsing.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
  if (!r.ok) return null;
  return await r.json();
}

async function sbInsert(table, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return await r.json();
}

async function sendTelegramAlert(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => null);
}

// ── Multipart parser ──────────────────────────────────────────────────────────
// bodyParser is disabled so the body is always a raw stream — no Buffer/string
// fallbacks needed (unlike the atlas.js version which guards against pre-buffering).

async function parseMultipart(req) {
  const Busboy = require('busboy');
  return new Promise((resolve) => {
    const fields = {};
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits: { fileSize: 0, parts: 50 } });
    } catch (e) {
      console.warn('[inbound_parse] busboy init failed:', e.message);
      return resolve(fields);
    }
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (_name, stream) => stream.resume()); // discard attachments
    bb.on('close', () => resolve(fields));
    bb.on('error', (e) => { console.warn('[inbound_parse] busboy error:', e.message); resolve(fields); });
    req.pipe(bb);
  });
}

// ── Header extraction ─────────────────────────────────────────────────────────
// SendGrid Inbound Parse sends the full raw headers as a text field named 'headers'.
// Format is standard RFC 2822: "Header-Name: value\n" (may be folded with leading whitespace).

function extractHeaders(headersText) {
  if (!headersText) return { messageId: null, inReplyTo: null, references: null };
  const get = (name) => {
    const re = new RegExp(`^${name}:\\s*(.+?)(?=\\n[^\\s]|$)`, 'im');
    const m = headersText.match(re);
    if (!m) return null;
    // Unfold: collapse folded continuation lines (leading whitespace after newline)
    return m[1].replace(/\r?\n[ \t]+/g, ' ').trim();
  };
  return {
    messageId:  get('Message-ID') || get('Message-Id'),
    inReplyTo:  get('In-Reply-To'),
    references: get('References'),
  };
}

// ── From-field parser ─────────────────────────────────────────────────────────
// Handles "Display Name <email@domain.com>" and bare "email@domain.com" formats.

function parseFrom(fromField) {
  if (!fromField) return { email: null, name: null };
  const m = fromField.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (m) {
    return {
      name:  m[1].replace(/^["']|["']$/g, '').trim() || null,
      email: m[2].trim().toLowerCase(),
    };
  }
  return { email: fromField.trim().toLowerCase(), name: null };
}

// ── Draft matcher ─────────────────────────────────────────────────────────────
// sg_message_id is stored as the short SendGrid X-Message-Id (e.g. "XYr0qyZmSqqV646RVHB4pQ").
// In-Reply-To in a reply email will be the full Message-ID of the original sent email,
// typically "<XYr0qyZmSqqV646RVHB4pQ@smtp.sendgrid.net>".
// Strategy: strip angle brackets, extract the local part before '@', match exactly.

function extractLocalPart(messageId) {
  if (!messageId) return null;
  const stripped = messageId.replace(/[<>\s]/g, '');
  const atIdx = stripped.indexOf('@');
  return atIdx > 0 ? stripped.slice(0, atIdx) : stripped;
}

async function matchToDraft(inReplyTo) {
  if (!inReplyTo) return null;
  const localPart = extractLocalPart(inReplyTo);
  if (!localPart) return null;
  const rows = await sbSelect('psnm_atlas_drafts',
    `sg_message_id=eq.${encodeURIComponent(localPart)}&select=id,prospect_id&limit=1`);
  if (!rows?.[0]) return null;
  return { draft_id: rows[0].id, prospect_id: rows[0].prospect_id || null };
}

// ── Prospect matcher ──────────────────────────────────────────────────────────
// Falls back to from_email lookup if no draft match found via In-Reply-To.

async function matchToProspect(fromEmail) {
  if (!fromEmail) return null;
  const rows = await sbSelect('psnm_outreach_targets',
    `email=ilike.${encodeURIComponent(fromEmail)}&select=id&limit=1`);
  return rows?.[0]?.id || null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function handler(req, res) {
  // Always return 200 — SendGrid retries on any non-2xx, which would create duplicates.
  // Errors are logged but not surfaced.

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Auth: SENDGRID_INBOUND_SECRET query param
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
    const secret = process.env.SENDGRID_INBOUND_SECRET;
    if (secret && url.searchParams.get('secret') !== secret) {
      console.warn('[inbound_parse] invalid secret — rejecting');
      return res.status(200).json({ ok: false, error: 'invalid_secret' });
    }
  } catch (e) {
    console.warn('[inbound_parse] URL parse error:', e.message);
  }

  try {
    // ── 1. Parse multipart body ───────────────────────────────────────────────
    const fields = await parseMultipart(req);

    const fromRaw  = String(fields.from    || '');
    const toRaw    = String(fields.to      || '');
    const subject  = String(fields.subject || '').slice(0, 500);
    const bodyText = String(fields.text    || '').slice(0, 100000);
    const bodyHtml = String(fields.html    || '').slice(0, 200000);
    const headersText = String(fields.headers || '');
    const rawEmail    = String(fields.email   || '').slice(0, 500000); // full RFC822

    const { email: fromEmail, name: fromName } = parseFrom(fromRaw);
    const { email: toEmail }                   = parseFrom(toRaw);

    // ── 2. Extract thread headers ─────────────────────────────────────────────
    const { messageId, inReplyTo, references } = extractHeaders(headersText);

    // Build raw_headers JSONB — key headers for later inspection
    const rawHeaders = {
      'Message-ID':  messageId  || null,
      'In-Reply-To': inReplyTo  || null,
      'References':  references || null,
      'From':        fromRaw    || null,
      'To':          toRaw      || null,
      'Subject':     subject    || null,
    };

    // ── 3. Match to draft via In-Reply-To → sg_message_id ────────────────────
    let matchedDraftId   = null;
    let matchedProspectId = null;
    let matchSource      = 'none';

    const draftMatch = await matchToDraft(inReplyTo).catch(() => null);
    if (draftMatch) {
      matchedDraftId    = draftMatch.draft_id;
      matchedProspectId = draftMatch.prospect_id;
      matchSource       = 'draft_in_reply_to';
    } else {
      // ── 4. Fall back to prospect match via from_email ─────────────────────
      const prospectId = await matchToProspect(fromEmail).catch(() => null);
      if (prospectId) {
        matchedProspectId = prospectId;
        matchSource       = 'prospect_email';
      }
    }

    // ── 5. INSERT into psnm_inbound_replies ───────────────────────────────────
    const row = {
      from_email:           fromEmail,
      from_name:            fromName     || null,
      to_email:             toEmail      || null,
      subject:              subject      || null,
      body_text:            bodyText     || null,
      body_html:            bodyHtml     || null,
      message_id:           messageId    || null,
      in_reply_to:          inReplyTo    || null,
      references_header:    references   || null,
      raw_headers:          rawHeaders,
      raw_email:            rawEmail     || null,
      matched_draft_id:     matchedDraftId,
      matched_prospect_id:  matchedProspectId,
      status:               'unread',
    };

    const inserted = await sbInsert('psnm_inbound_replies', row);
    const replyId  = Array.isArray(inserted) ? inserted[0]?.id : null;

    // ── 6. Telegram alert ─────────────────────────────────────────────────────
    if (inserted?.error) {
      console.error('[inbound_parse] DB insert failed:', inserted.error);
      await sendTelegramAlert([
        `🚨 <b>Inbound reply NOT STORED</b>`,
        `From: ${fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail}`,
        `Subject: ${subject || '(no subject)'}`,
        ``,
        `DB insert failed:`,
        `<code>${String(inserted.error).slice(0, 300)}</code>`,
        ``,
        `⚠️ Reply IS NOT in the database. Manual recovery via Vercel logs or SendGrid activity log.`,
      ].join('\n')).catch(() => null);
    } else {
      const snippet  = bodyText.replace(/\s+/g, ' ').trim().slice(0, 120);
      const matchTag = matchSource === 'draft_in_reply_to'
        ? `✅ Matched draft <code>${matchedDraftId?.slice(0, 8)}</code>`
        : matchSource === 'prospect_email'
          ? `🔍 Matched prospect <code>${matchedProspectId?.slice(0, 8)}</code>`
          : `⚠️ No match found — review manually`;

      const msg = [
        `📩 <b>Inbound reply</b>`,
        `From: ${fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail}`,
        `Subject: ${subject || '(no subject)'}`,
        ``,
        snippet ? `"${snippet}${bodyText.length > 120 ? '…' : ''}"` : '(no body)',
        ``,
        matchTag,
      ].join('\n');

      await sendTelegramAlert(msg).catch(() => null);
    }

    // ── 7. Auto-responder trigger (shadow mode) ──────────────────────────────
    // Fire-and-forget — intentionally not awaited. Triggers classify→enrich→draft
    // chain as a separate Vercel invocation. Output queued in psnm_enquiry_drafts.
    // NEVER sends email. Set AUTORESPONDER_ENABLED=false in env to disable.
    if (replyId && !inserted?.error && process.env.AUTORESPONDER_ENABLED !== 'false') {
      const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
      const host  = req.headers.host || 'rbtr-jarvis.vercel.app';
      fetch(`${proto}://${host}/api/autorespond/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rbtr-auth': process.env.RBTR_AUTH_TOKEN || '',
        },
        body: JSON.stringify({
          reply_id:   replyId,
          from_email: fromEmail,
          from_name:  fromName  || null,
          subject:    subject   || null,
          body_text:  bodyText  || null,
        }),
      }).catch(e => console.warn('[inbound_parse] auto-responder trigger error:', e.message));
    }

    return res.status(200).json({
      ok: true,
      reply_id:    replyId,
      match_source: matchSource,
      matched_draft_id:    matchedDraftId,
      matched_prospect_id: matchedProspectId,
    });

  } catch (e) {
    // Log but always return 200 — prevents SendGrid retry storm
    console.error('[inbound_parse] unhandled error:', e.message, e.stack);
    return res.status(200).json({ ok: false, error: 'internal_error' });
  }
}

// Disable Vercel's automatic body parser — Busboy needs the raw multipart stream.
handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
