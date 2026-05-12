'use strict';

// ── PSNM Auto-Responder · Phase 2 · Classifier ───────────────────────────────
// Classifies an inbound enquiry email using Claude with prompt caching.
// Shadow mode only — never sends, never approves, just classifies.
//
// POST /api/autorespond/classify
// Auth: x-rbtr-auth header | psnm_session cookie | CRON_SECRET header
// Body: { enquiry_text, sender_domain, subject, from_email?, from_name? }
// Returns: { type, pallet_count, duration_weeks, goods_type, hazmat_flag,
//            chilled_flag, urgency, red_flags, confidence, summary }

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const RBTR_TOKEN    = process.env.RBTR_AUTH_TOKEN;
const CRON_SECRET   = process.env.CRON_SECRET;

// ── Auth (x-rbtr-auth | cookie session | CRON_SECRET) ────────────────────────
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

// ── Classifier system prompt (large — cache-eligible) ────────────────────────
const CLASSIFIER_SYSTEM = `You are a specialist email classifier for PSNM (Pallet Storage Near Me), an ambient pallet storage warehouse at Hellaby Industrial Estate, Rotherham S66 8HR, England.

PSNM stores AMBIENT goods only. Hard exclusions:
- No chilled, frozen, or temperature-controlled goods
- No hazardous materials, chemicals, explosives, corrosives, flammables
- No pharmaceuticals or medical supplies
- No radioactive materials
- No live animals

Your job: classify each inbound enquiry email accurately.

CLASSIFICATION TYPES:
- storage_enquiry: genuine request for pallet storage information
- quote_request: specifically asking for a price/quote
- price_check: asking about rates only, may be shopping around
- existing_customer: from someone who appears to already store with PSNM
- already_placed: enquirer mentions they have already found alternative storage or are no longer looking
- job_application: looking for employment
- press: media, PR, or journalist enquiry
- complaint: dissatisfied customer or complaint
- spam: marketing emails, automated outreach, obvious spam
- other: anything else (partnership proposals, supplier pitches, etc.)

URGENCY LEVELS:
- immediate: needs storage within 1-2 days, words like "urgent", "ASAP", "today", "tomorrow"
- this_week: needs storage this week
- within_month: needs storage within 4 weeks
- planning: researching options, no immediate need
- unknown: not mentioned

OUTPUT FORMAT — return ONLY valid JSON, no prose, no markdown:
{
  "type": "storage_enquiry",
  "pallet_count": 50,
  "duration_weeks": 12,
  "goods_type": "ambient packaged clothing",
  "hazmat_flag": false,
  "chilled_flag": false,
  "urgency": "within_month",
  "red_flags": [],
  "confidence": 87,
  "summary": "Clothing wholesaler in Leeds seeking 50 pallets ambient storage from next month"
}

CONFIDENCE scoring guidance:
- 90-100: crystal clear, all key info present (pallet count, goods type, timing, business context)
- 70-89: good signal but some info missing (e.g. no pallet count stated in email body)
- 50-69: partial info, may be residential/consumer, some ambiguity
- 30-49: very vague, no business context, or hard to categorise
- 0-29: spam, gibberish, already_placed, or completely irrelevant

IMPORTANT — attachment blind spot: You can only read the email body text. If the email says "see attached" or "details in the PDF" for key information like pallet count or goods type, you cannot read those attachments. In this case: set confidence to max 65 and add "attachment_required" to red_flags.

IMPORTANT — urgency over-scoring guard: If an email uses urgency words ("urgent", "ASAP") but provides no pallet count, no goods description, and no business context, do NOT score urgency as "immediate". Set urgency to "unknown" and reduce confidence by 20 points. Vague urgency language from non-business senders should be treated with scepticism.

red_flags array — include any of: "spam", "hazmat", "chilled_goods", "residential_sender",
"unrealistic_demand", "competitor_research", "no_business_context", "suspicious_domain",
"attachment_required", "vague_urgency"`;

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

  if (!ANTHROPIC_KEY) return res.status(500).json({ ok: false, error: 'ANTHROPIC_API_KEY not configured' });

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

  const { enquiry_text, sender_domain, subject, from_email, from_name } = body;
  if (!enquiry_text || typeof enquiry_text !== 'string') {
    return res.status(400).json({ ok: false, error: 'enquiry_text required' });
  }

  const senderContext = [
    from_name   ? `Sender name: ${from_name}` : null,
    from_email  ? `Sender email: ${from_email}` : null,
    sender_domain ? `Sender domain: ${sender_domain}` : null,
    subject     ? `Email subject: ${subject}` : null,
  ].filter(Boolean).join('\n');

  const userMessage = [
    senderContext,
    '',
    'Email body:',
    enquiry_text.slice(0, 8000),
  ].filter(s => s !== null).join('\n').trim();

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: [
          {
            type: 'text',
            text: CLASSIFIER_SYSTEM,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('[classify] Anthropic error:', aiRes.status, errText.slice(0, 200));
      return res.status(502).json({ ok: false, error: 'ai_api_error', status: aiRes.status });
    }

    const aiJson = await aiRes.json();
    const rawText = (aiJson.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

    // Extract JSON — handle prose wrapper or markdown fences
    let classification = null;
    const stripped = rawText.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
    try { classification = JSON.parse(stripped); } catch {}
    if (!classification) {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) { try { classification = JSON.parse(m[0]); } catch {} }
    }

    if (!classification) {
      console.error('[classify] Failed to parse Claude response:', rawText.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'parse_error', raw: rawText.slice(0, 200) });
    }

    // Normalise + sanity-check fields
    classification.type           = String(classification.type || 'other');
    classification.pallet_count   = Number.isFinite(classification.pallet_count) ? classification.pallet_count : null;
    classification.duration_weeks = Number.isFinite(classification.duration_weeks) ? classification.duration_weeks : null;
    classification.goods_type     = String(classification.goods_type || 'unknown').slice(0, 200);
    classification.hazmat_flag    = Boolean(classification.hazmat_flag);
    classification.chilled_flag   = Boolean(classification.chilled_flag);
    classification.urgency        = String(classification.urgency || 'unknown');
    classification.red_flags      = Array.isArray(classification.red_flags) ? classification.red_flags : [];
    classification.confidence     = Math.max(0, Math.min(100, Number(classification.confidence) || 50));
    classification.summary        = String(classification.summary || '').slice(0, 300);

    return res.status(200).json({ ok: true, classification });

  } catch (e) {
    console.error('[classify] unhandled error:', e.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

module.exports = handler;
