'use strict';

// ── PSNM Auto-Responder · Phase 4 · Drafter ──────────────────────────────────
// Generates a response draft in Ben's voice. Shadow mode — inserts into
// psnm_enquiry_drafts with status='pending_approval'. Never sends.
//
// POST /api/autorespond/draft
// Auth: x-rbtr-auth header | psnm_session cookie | CRON_SECRET
// Body: { enquiry_id?, enquiry_text, subject, from_email, from_name?, classification, enrichment? }
// Returns: { draft_id, subject, body_text, body_html, next_step, drafter_notes }

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const RBTR_TOKEN    = process.env.RBTR_AUTH_TOKEN;
const CRON_SECRET   = process.env.CRON_SECRET;

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
function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { error: 'supabase_not_configured' };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return r.json();
}

// ── Ben's voice system prompt (large — cache-eligible) ───────────────────────
// This prompt is the single source of truth for how Ben responds to enquiries.
// Update here and all drafts immediately reflect the change.
const BEN_VOICE_SYSTEM = `You are writing email responses FOR Ben Greenwood, the sole owner of Pallet Storage Near Me (PSNM). You write in his exact voice. Ben will review every response before it goes out — your job is to draft something he can approve with minimal edits.

── PSNM FACTS (only state facts from this list — never invent) ──────────────────
Location: Unit 3C, Hellaby Industrial Estate, Rotherham, South Yorkshire S66 8HR
Goods accepted: AMBIENT ONLY (packaged, non-perishable, non-hazardous, room temperature)
Goods NOT accepted: chilled, frozen, temperature-controlled, hazardous materials, chemicals, pharmaceuticals, food requiring refrigeration, explosives, radioactive
No fulfilment services, no pick-and-pack, no e-commerce dispatch
Capacity: 1,602 pallet spaces (do not state this unless directly asked)
Rates: £3.95/pallet/week (1-100 pallets) | £3.50/pallet/week (101-500) | £2.95/pallet/week (500+)
Handling: £3.50 per pallet movement (in or out)
Minimum commitment: 12 weeks initial term, then 30-day rolling notice
Onboarding: typically 3-5 working days from contract signed
Phone: 07506 255033
Email: sales@palletstoragenearme.co.uk
Website: palletstoragenearme.co.uk
Motorway access: M18 / M1 junction (do not state drive times unless verified)

── VOICE RULES ──────────────────────────────────────────────────────────────────
1. South Yorkshire voice: direct, honest, no corporate padding
2. Short sentences. Plain words. No jargon.
3. "Right" not "Okay". "Sorted" not "Completed". "Cheers" not "Kind regards"
4. NEVER use: "please don't hesitate to contact us", "I hope this email finds you well",
   "as per my previous email", "at your earliest convenience", "going forward",
   "touch base", "moving forward", "synergy", "leverage", "reaching out"
5. Sign-off always: "Cheers\nBen\nPallet Storage Near Me\n07506 255033"
6. British English: colour, organised, neighbour, centre, programme
7. If you don't know something — say so honestly rather than hedging
8. Rates: NEVER quote exact rates in the opening email unless the enquirer specifically asked for a price. Say "send over a quote" or "we can get you a quote" instead.

── RESPONSE STRUCTURE ───────────────────────────────────────────────────────────
1. Acknowledge the enquiry in one natural sentence (no "Thank you for your enquiry")
2. If goods are hazmat/chilled/prohibited: apologise briefly, state PSNM is ambient only, suggest they contact a specialist warehouse. Short and done.
3. If genuine storage enquiry: ask for what's missing from: pallet count, goods description, when needed, postcode for collection/delivery
4. If all info is present: confirm what PSNM can offer and propose a next step (call, site visit, formal quote)
5. Sign-off

── OUTPUT FORMAT ────────────────────────────────────────────────────────────────
Return ONLY valid JSON:
{
  "subject": "Re: [original subject or descriptive subject]",
  "body_text": "plain text email body",
  "body_html": "<p>html version of same email</p>",
  "next_step": "call_back|email_back|site_visit|send_quote|no_action",
  "drafter_notes": "notes for Ben: confidence level, anything he should double-check, tone flags"
}`;

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

  const { enquiry_id, enquiry_text, subject, from_email, from_name, classification, enrichment } = body;

  if (!enquiry_text || !from_email) {
    return res.status(400).json({ ok: false, error: 'enquiry_text and from_email required' });
  }

  const clf = classification || {};
  const enr = enrichment || {};

  // Build context block for the drafter
  const contextLines = [
    `── Enquiry context ───────────────────────────────────────────────────────────`,
    `From: ${from_name ? `${from_name} <${from_email}>` : from_email}`,
    subject ? `Subject: ${subject}` : null,
    '',
  ];

  if (clf.type) contextLines.push(`Enquiry type: ${clf.type}`);
  if (clf.goods_type)    contextLines.push(`Goods: ${clf.goods_type}`);
  if (clf.pallet_count)  contextLines.push(`Pallet count mentioned: ${clf.pallet_count}`);
  if (clf.duration_weeks) contextLines.push(`Duration mentioned: ${clf.duration_weeks} weeks`);
  if (clf.urgency)       contextLines.push(`Urgency: ${clf.urgency}`);
  if (clf.hazmat_flag)   contextLines.push(`HAZMAT FLAG: true — goods appear hazardous`);
  if (clf.chilled_flag)  contextLines.push(`CHILLED FLAG: true — goods appear temperature-controlled`);
  if (clf.summary)       contextLines.push(`Summary: ${clf.summary}`);
  if (clf.red_flags?.length) contextLines.push(`Red flags: ${clf.red_flags.join(', ')}`);
  contextLines.push('');

  if (enr.companies_house?.company_name) {
    contextLines.push(`Company: ${enr.companies_house.company_name} (${enr.companies_house.company_status || 'unknown status'})`);
    if (enr.companies_house.sic_codes?.length) {
      contextLines.push(`SIC codes: ${enr.companies_house.sic_codes.slice(0, 3).join(', ')}`);
    }
  }
  if (enr.distance?.label) {
    contextLines.push(`Distance from S66 8HR: ${enr.distance.label}`);
  }
  if (enr.domain_history?.known_customer) {
    contextLines.push(`Known customer: YES — they may already store with us`);
  } else if (enr.domain_history?.previous_enquiries > 0) {
    contextLines.push(`Previous enquiries from this domain: ${enr.domain_history.previous_enquiries}`);
  }

  const userMessage = [
    contextLines.filter(l => l !== null).join('\n'),
    `── Original email ───────────────────────────────────────────────────────────`,
    enquiry_text.slice(0, 6000),
  ].join('\n');

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: [
          {
            type: 'text',
            text: BEN_VOICE_SYSTEM,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('[draft] Anthropic error:', aiRes.status, errText.slice(0, 200));
      return res.status(502).json({ ok: false, error: 'ai_api_error', status: aiRes.status });
    }

    const aiJson = await aiRes.json();
    const rawText = (aiJson.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

    let draftData = null;
    const stripped = rawText.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
    try { draftData = JSON.parse(stripped); } catch {}
    if (!draftData) {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) { try { draftData = JSON.parse(m[0]); } catch {} }
    }

    if (!draftData?.body_text) {
      console.error('[draft] Failed to parse Claude response:', rawText.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'parse_error', raw: rawText.slice(0, 200) });
    }

    // Enforce canonical sign-off — replace anything after last "Cheers" line
    const SIGN_OFF = 'Cheers\nBen\nPallet Storage Near Me\n07506 255033';
    const cheersIdx = draftData.body_text.lastIndexOf('Cheers');
    if (cheersIdx !== -1) {
      draftData.body_text = draftData.body_text.slice(0, cheersIdx) + SIGN_OFF;
    } else {
      draftData.body_text = draftData.body_text.trimEnd() + '\n\n' + SIGN_OFF;
    }

    // Build HTML version if not provided or minimal
    if (!draftData.body_html || draftData.body_html.length < 50) {
      draftData.body_html = '<p>' + draftData.body_text
        .split('\n\n')
        .map(p => p.replace(/\n/g, '<br>'))
        .join('</p><p>') + '</p>';
    }

    const subject_clean = draftData.subject || `Re: ${subject || 'Pallet storage enquiry'}`;
    const confidence = clf.confidence || 50;
    const status = confidence >= 40 ? 'pending_approval' : 'low_confidence_skipped';

    // Insert draft into psnm_enquiry_drafts
    const draftRow = {
      enquiry_id:        enquiry_id || null,
      draft_subject:     subject_clean,
      draft_body_text:   draftData.body_text,
      draft_body_html:   draftData.body_html,
      classification:    clf,
      enrichment:        enr,
      confidence_score:  confidence,
      status,
      drafter_notes:     draftData.drafter_notes || null,
    };

    const inserted = await sbInsert('psnm_enquiry_drafts', draftRow);
    const draftId = Array.isArray(inserted) ? inserted[0]?.id : null;

    if (inserted?.error) {
      console.error('[draft] DB insert failed:', inserted.error);
    }

    return res.status(200).json({
      ok: true,
      draft_id:      draftId,
      subject:       subject_clean,
      body_text:     draftData.body_text,
      body_html:     draftData.body_html,
      next_step:     draftData.next_step || 'email_back',
      drafter_notes: draftData.drafter_notes || null,
      status,
      confidence,
    });

  } catch (e) {
    console.error('[draft] unhandled error:', e.message);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

module.exports = handler;
