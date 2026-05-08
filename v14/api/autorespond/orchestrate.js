'use strict';

// ── PSNM Auto-Responder · Orchestrator ───────────────────────────────────────
// Internal endpoint: classify → enrich → draft, in sequence.
// Called fire-and-forget by sendgrid_inbound.js after reply capture.
// Shadow mode — all output queued in psnm_enquiry_drafts. NEVER sends.
//
// POST /api/autorespond/orchestrate
// Auth: x-rbtr-auth header | psnm_session cookie | CRON_SECRET
// Body: { reply_id, from_email, from_name?, subject?, body_text? }
//       OR { reply_id } — will fetch reply from psnm_inbound_replies

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RBTR_TOKEN   = process.env.RBTR_AUTH_TOKEN;
const CRON_SECRET  = process.env.CRON_SECRET;

// ── Auth ──────────────────────────────────────────────────────────────────────
function checkAuth(req) {
  const headerToken = req.headers['x-rbtr-auth'];
  if (headerToken !== undefined) {
    if (!RBTR_TOKEN) return false;
    const a = Buffer.from(headerToken);
    const b = Buffer.from(RBTR_TOKEN);
    return a.length === b.length && require('crypto').timingSafeEqual(a, b);
  }
  const cronHeader = req.headers['x-cron-secret'] || req.headers['authorization'];
  if (cronHeader) {
    const token = cronHeader.replace(/^Bearer\s+/, '');
    if (CRON_SECRET && token === CRON_SECRET) return true;
  }
  try {
    const { parse } = require('cookie');
    const { verify } = require('jsonwebtoken');
    const cookies = parse(req.headers.cookie || '');
    const session = cookies['psnm_session'];
    if (!session) return false;
    const payload = verify(session, process.env.SESSION_SIGNING_KEY, { algorithms: ['HS256'] });
    return payload.role === 'wms' && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { error: 'not_configured' };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return r.json();
}

// ── Internal fetch helper ─────────────────────────────────────────────────────
// Calls another endpoint on the same host using the RBTR auth token.
// Avoids network round-trip by using the same process env, same host.

async function callInternal(req, path, payload) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || 'localhost';
  const url  = `${protocol}://${host}${path}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rbtr-auth': RBTR_TOKEN || '',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25000),
  });

  if (!r.ok) {
    const errBody = await r.text().catch(() => '');
    throw new Error(`${path} returned ${r.status}: ${errBody.slice(0, 200)}`);
  }
  return r.json();
}

// ── Handler ───────────────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
    return res.status(204).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!checkAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  let body = {};
  try {
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    body = JSON.parse(raw);
  } catch { return res.status(400).json({ ok: false, error: 'invalid_json' }); }

  const { reply_id } = body;
  let { from_email, from_name, subject, body_text } = body;

  // If only reply_id provided, fetch the reply details
  if (reply_id && (!from_email || !body_text)) {
    const rows = await sbSelect('psnm_inbound_replies',
      `id=eq.${encodeURIComponent(reply_id)}&select=id,from_email,from_name,subject,body_text&limit=1`);
    const reply = Array.isArray(rows) ? rows[0] : null;
    if (!reply) {
      return res.status(404).json({ ok: false, error: 'reply_not_found', reply_id });
    }
    from_email = from_email || reply.from_email;
    from_name  = from_name  || reply.from_name;
    subject    = subject    || reply.subject;
    body_text  = body_text  || reply.body_text;
  }

  if (!from_email || !body_text) {
    return res.status(400).json({ ok: false, error: 'from_email and body_text required (or valid reply_id)' });
  }

  const sender_domain = from_email.split('@')[1] || '';
  const enquiry_id    = reply_id || null;
  let decision        = 'error';
  let draftId         = null;
  let classificationResult = null;
  let confidence      = 0;
  const notes_parts   = [];

  try {
    // ── 1. Classify ────────────────────────────────────────────────────────────
    let classification = null;
    try {
      const classifyRes = await callInternal(req, '/api/autorespond/classify', {
        enquiry_text: body_text,
        sender_domain,
        subject,
        from_email,
        from_name,
      });
      classification = classifyRes.ok ? classifyRes.classification : null;
      classificationResult = classification;
    } catch (e) {
      notes_parts.push(`classify failed: ${e.message.slice(0, 100)}`);
    }

    confidence = classification?.confidence || 0;

    // Skip drafting for spam or low-confidence
    if (classification?.type === 'spam' || confidence < 40) {
      decision = confidence < 40 ? 'low_confidence_skipped' : 'no_response';
      notes_parts.push(`type=${classification?.type}, confidence=${confidence}`);
    } else {
      // ── 2. Enrich ──────────────────────────────────────────────────────────
      let enrichment = null;
      try {
        const enrichRes = await callInternal(req, '/api/autorespond/enrich', {
          from_email,
          sender_domain,
          from_name,
        });
        enrichment = enrichRes.ok ? enrichRes.enrichment : null;
      } catch (e) {
        notes_parts.push(`enrich failed (non-fatal): ${e.message.slice(0, 80)}`);
      }

      // ── 3. Draft ───────────────────────────────────────────────────────────
      try {
        const draftRes = await callInternal(req, '/api/autorespond/draft', {
          enquiry_id,
          enquiry_text: body_text,
          subject,
          from_email,
          from_name,
          classification,
          enrichment,
        });

        if (draftRes.ok) {
          draftId  = draftRes.draft_id;
          decision = 'drafted';
          notes_parts.push(`draft_id=${draftId}, next_step=${draftRes.next_step}`);
        } else {
          decision = 'error';
          notes_parts.push(`draft endpoint error: ${JSON.stringify(draftRes).slice(0, 100)}`);
        }
      } catch (e) {
        decision = 'error';
        notes_parts.push(`draft failed: ${e.message.slice(0, 100)}`);
      }
    }

  } catch (e) {
    decision = 'error';
    notes_parts.push(`orchestrator error: ${e.message.slice(0, 100)}`);
    console.error('[orchestrate] unhandled error:', e.message);
  }

  // ── 4. Log decision ─────────────────────────────────────────────────────────
  const logRow = {
    enquiry_id:       enquiry_id,
    decision,
    confidence_score: confidence,
    classification:   classificationResult,
    draft_id:         draftId,
    notes:            notes_parts.join(' | ') || null,
  };

  await sbInsert('psnm_autoresponse_log', logRow).catch(e => {
    console.error('[orchestrate] log insert failed:', e.message);
  });

  console.log(`[orchestrate] ${from_email} → decision=${decision}, confidence=${confidence}, draft_id=${draftId || 'none'}`);

  return res.status(200).json({
    ok: true,
    decision,
    confidence,
    draft_id: draftId,
    notes: notes_parts.join(' | ') || null,
  });
}

module.exports = handler;
