'use strict';

// ── RBTR · Sponsor Outreach Drafter ─────────────────────────────────────────
// POST /api/sponsors/draft
// Input:  { sponsor_name, sponsor_category, ask_summary, ask_value_gbp,
//           hq_country, notes, sponsor_id (optional — for back-ref) }
// Output: inserts to psnm_sponsor_outreach, returns the row
//
// Prompt strategy:
//   System = full Ben voice + RBTR vision (cached — 5-min TTL)
//   User   = specific sponsor data (per-call)
//
// Auth: requireAuth (x-rbtr-auth header or cookie)

const path = require('path');
const { requireAuth } = require(path.join(__dirname, '../auth/middleware'));

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL         = 'claude-sonnet-4-6';

// ── Supabase helpers ─────────────────────────────────────────────────────────

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbInsert(table, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return r.json();
}

// ── System prompt (cached) ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a sponsor outreach drafter for RBTR — Rock Bottom to Roaming.

RBTR is a family expedition project. Ben Greenwood, a Rotherham fabricator with 20 years self-taught experience, is building a Mercedes Arocs 3258 6x6 33-tonne expedition truck from scratch. Solo builder. His partner Sarah and sons Hudson (7) and Benson (6) will drive it across 45 countries over 45 months, departing 1 July 2027. The entire build is documented on YouTube.

RBTR TRUCK SPEC (reference for product context):
- Power: 500–520hp via Midland Turbo remap
- Suspension: Goldschmitt full air system
- Recovery: RED Winches front and rear
- Safety: Brigade 360° cameras + Smartrack tracking + Rosco CMS
- Lighting: Strands LED full vehicle
- Heat: Webasto Thermo Top Evo 5 + Truma Combi backup
- Shower: Infinity recirculating hot water system
- Toilet: Clesana C1 waterless
- Kitchen: Miele dishwasher + Quooker boiling water tap
- Power system: Victron Quattro 24/5000 + Fogstar 400Ah LiFePO4 + 1,600W bifacial solar
- Tyres: Michelin XZL 365/80 R20 ×6 super singles
- Rooftop sleeping: Alu-Cab Gen 3-R (rear) + iKamper Skycamp 4.0 (forward)
- Navigation/comms: Garmin inReach ×2 + Starlink Mini
- Camera: Sony cinema body + DJI Mavic 3 Pro + GoPro Hero 13 ×3

BEN'S VOICE — NON-NEGOTIABLE:
- South Yorkshire. Direct. Short sentences. Plain words. No waffle.
- British English: recognise, colour, whilst, cheers, organised.
- "Right" not "Okay". No corporate language. No buzzwords.
- Honest about the scale of the ask — not apologetic, not arrogant.
- Specific. Name the exact product. Name the exact use on the truck.
- Never open with "I hope this email finds you well" or any variant.
- Every sentence earns its place.
- Sign off every email: "Cheers\\nBen"
- Body length: 120–180 words only (not counting subject or sign-off).

BRAND VALUES — every email passes through these three:
1. Honest — real version, no fake polish
2. Family — Sarah and the boys are part of this story
3. Inspiring — makes someone want to start something big themselves

WHAT SPONSORS GET (mention at least one of these):
- Named product featured across 14 months of YouTube build content + 45-month expedition
- Authentic audience of builders, adventurers, and families attempting serious things
- Option for a dedicated review/feature segment in the build series

CLOSING LINE — always include this as the final line of the body, before the sign-off:
"If you'd like to be reviewed in our build content, reply with REVIEW and we'll add a feature segment for [sponsor's exact product name]."

PROHIBITIONS:
- Never mention Co-Lab, debt, financial collapse, legal history, Riley, or Aylett
- Don't use financial hardship as a hook — hook on craft, the Arocs, the route, or product fit
- No speculation about the sponsor's internal operations or budget
- Don't write "unique opportunity", "exciting journey", "incredible adventure", or similar
- No padding. No filler sentences. If a word doesn't earn its place, cut it.
- Body must be 120–180 words.

OUTPUT — valid JSON only, no markdown fences, no preamble:
{
  "subject": "under 70 chars, specific to this sponsor, no clickbait",
  "body": "full email body using \\\\n for line breaks, including the REVIEW closing line and Cheers\\\\nBen sign-off",
  "named_asks": ["array of exact products/services requested"],
  "why_we_picked_them": "one sentence — the real product fit reason",
  "ask_value_estimate": "£X value-in-kind or cash equivalent",
  "confidence": "high|medium|low based on how well-known this brand is in the expedition/overland space"
}`;

// ── Per-sponsor user message ─────────────────────────────────────────────────

function buildUserMessage(sponsor) {
  const lines = [];
  lines.push(`Draft a cold outreach email from Ben to this sponsor:\n`);
  lines.push(`Brand: ${sponsor.sponsor_name}`);
  lines.push(`Category: ${sponsor.sponsor_category}`);
  lines.push(`What we're asking for: ${sponsor.ask_summary}`);
  lines.push(`Estimated value: £${sponsor.ask_value_gbp || 'TBC'}`);
  lines.push(`Headquartered: ${sponsor.hq_country || 'unknown'}`);
  if (sponsor.notes) lines.push(`Context notes: ${sponsor.notes}`);
  lines.push(`\nUse the truck spec in the system prompt to make the product placement specific and credible.`);
  lines.push(`Return valid JSON only.`);
  return lines.join('\n');
}

// ── Claude API call ──────────────────────────────────────────────────────────

async function callClaude(sponsor) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      temperature: 0.7,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        { role: 'user', content: buildUserMessage(sponsor) },
      ],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Anthropic ${r.status}: ${err.slice(0, 300)}`);
  }

  const data = await r.json();
  const text = (data.content?.[0]?.text || '').trim();
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`Parse failed — raw: ${text.slice(0, 300)}`);
  return JSON.parse(m[0]);
}

// ── Handler ──────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const auth = requireAuth(req);
  if (!auth.authorized) { res.status(401).json({ error: 'Unauthorised', reason: auth.reason }); return; }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch { res.status(400).json({ error: 'invalid_json' }); return; }

  const {
    sponsor_name,
    sponsor_category,
    ask_summary,
    ask_value_gbp,
    hq_country,
    notes,
  } = body;

  if (!sponsor_name) { res.status(400).json({ error: 'sponsor_name required' }); return; }
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'supabase_env_missing' }); return; }

  try {
    const parsed = await callClaude({ sponsor_name, sponsor_category, ask_summary, ask_value_gbp, hq_country, notes });

    const row = {
      sponsor_name,
      sponsor_category:      sponsor_category || null,
      contact_email_guess:   body.contact_email_guess || null,
      contact_role_guess:    body.contact_role_guess || 'Marketing Manager',
      draft_subject:         parsed.subject || null,
      draft_body:            parsed.body || null,
      asks:                  JSON.stringify(parsed.named_asks || []),
      why_we_picked_them:    parsed.why_we_picked_them || null,
      sponsor_value_estimate: parsed.ask_value_estimate || `£${ask_value_gbp || 'TBC'}`,
      confidence:            parsed.confidence || 'medium',
      status:                'draft_pending_review',
    };

    const inserted = await sbInsert('psnm_sponsor_outreach', row);
    if (inserted?.error) {
      return res.status(500).json({ error: 'db_insert_failed', detail: inserted });
    }

    res.status(200).json({
      ok: true,
      draft: Array.isArray(inserted) ? inserted[0] : inserted,
      subject: parsed.subject,
      confidence: parsed.confidence,
    });

  } catch (err) {
    console.error('[sponsors/draft]', err.message);
    res.status(500).json({ error: err.message });
  }
};
