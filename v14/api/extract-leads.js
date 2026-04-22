// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT-LEADS · Anthropic structured extraction for PSNM warm leads
// Vercel serverless function. Ported from netlify/functions/extract-leads.js
// to Vercel's req/res handler signature. Same behaviour, identical prompt.
// Keeps ANTHROPIC_API_KEY server-side.
// ═══════════════════════════════════════════════════════════════════════════
//
// Request:
//   POST /api/extract-leads
//   { kind: 'whichwarehouse' | 'past_quotes' | 'manual_leads', text: string }
//
// Response:
//   { leads: [ { company, contact_name, contact_email, contact_phone,
//                pallets_requested, duration_months, quote_amount_gbp,
//                location, source_date, lead_source, temperature,
//                replied, quote_sent, notes } ],
//     raw: string, model: string, usage }
//
// No writes. Extraction only. Ben approves in preview UI, then /api/supabase-proxy
// does the actual insert.

const EXTRACTION_PROMPT = `
You extract structured lead data from pasted text for PSNM (Pallet Storage
Near Me), a small warehouse business in Rotherham, UK.

Return ONLY a single JSON object with this exact shape:
{
  "leads": [
    {
      "company": "string (required)",
      "contact_name": "string or null",
      "contact_email": "string or null",
      "contact_phone": "string or null",
      "pallets_requested": "integer or null",
      "duration_months": "integer or null",
      "quote_amount_gbp": "number or null (monthly rate or total, whichever is given)",
      "location": "string or null (city / area)",
      "source_date": "ISO date string (YYYY-MM-DD) or null — when the enquiry was received",
      "lead_source": "one of: whichwarehouse | direct_call | direct_email | referral | walk_in | cold_outreach | web_form | linkedin | whatsapp",
      "temperature": "one of: hot | warm | cold | dead",
      "replied": "boolean — has Ben replied / is there a reply in the thread?",
      "quote_sent": "boolean — has a quote been sent?",
      "notes": "string — one short line of context (max 120 chars)"
    }
  ]
}

Rules:
- Extract every distinct company / enquiry you find. Do not deduplicate aggressively — if in doubt, include it.
- For WhichWarehouse weekly brief: kind='whichwarehouse', lead_source='whichwarehouse'. Temperature='hot' if received in last 7 days, else 'warm'.
- For past quote emails: kind='past_quotes'. lead_source best-guess from the email context. temperature='warm' if reply seen in last 30 days, else 'cold'.
- For manual paste (a list of companies Ben remembers): kind='manual_leads'. Default temperature='warm', replied=false, quote_sent=false unless stated.
- Phone numbers: UK format, keep as written.
- Dates: ISO YYYY-MM-DD. If only relative ("3 days ago") is given, return null and put a note.
- Missing fields: return null, not empty string.
- Do not invent data. If you can't extract a field, null it.
- No preamble, no code fences, no commentary. Return JUST the JSON object.
`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel env vars.', leads: [] });
    return;
  }

  const payload = typeof req.body === 'string' ? (function () {
    try { return JSON.parse(req.body || '{}'); } catch { return null; }
  })() : (req.body || {});
  if (!payload) { res.status(400).json({ error: 'Invalid JSON', leads: [] }); return; }

  const { kind = 'manual_leads', text } = payload;
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    res.status(400).json({ error: 'text required (min 10 chars)', leads: [] });
    return;
  }

  const userMsg = `Source kind: ${kind}\n\n---\n\n${text.slice(0, 40000)}`;
  // Use env-configurable model; default to opus-4-7 (Tier 1+) with auto-fallback to 4-6.
  const PRIMARY = process.env.ANTHROPIC_MODEL_HEAVY || 'claude-opus-4-7';
  const FALLBACK = 'claude-opus-4-6';

  async function callModel(model) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
  }

  try {
    let r = await callModel(PRIMARY);
    if (!r.ok && (r.status === 404 || r.status === 400) && PRIMARY !== FALLBACK) {
      console.warn('[extract-leads] primary model rejected, falling back');
      r = await callModel(FALLBACK);
    }

    if (!r.ok) {
      const errText = await r.text();
      console.error('[extract-leads] anthropic error', r.status, errText);
      res.status(502).json({ error: 'anthropic_error', status: r.status, detail: errText.slice(0, 500), leads: [] });
      return;
    }

    const data = await r.json();
    const raw = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Strip fences / extract first JSON object
    let cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];

    let parsed = { leads: [] };
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
      console.warn('[extract-leads] parse failed', e.message, cleaned.slice(0, 300));
      res.status(200).json({ leads: [], raw, parse_error: e.message });
      return;
    }

    const leads = Array.isArray(parsed.leads) ? parsed.leads : [];
    res.status(200).json({ leads, raw, model: data.model, usage: data.usage });
  } catch (err) {
    console.error('[extract-leads] fetch error', err);
    res.status(500).json({ error: err.message, leads: [] });
  }
};
