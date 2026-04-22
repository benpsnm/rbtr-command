// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT-LEADS · Anthropic structured extraction for PSNM warm leads
// Runs on Netlify Functions. Keeps ANTHROPIC_API_KEY server-side.
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

exports.handler = async function (event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY not set in Netlify env vars.',
        leads: [],
      }),
    };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: 'Invalid JSON' }; }

  const { kind = 'manual_leads', text } = payload;
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'text required (min 10 chars)', leads: [] }) };
  }

  const userMsg = `Source kind: ${kind}\n\n---\n\n${text.slice(0, 40000)}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        system: EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[extract-leads] anthropic error', res.status, errText);
      return {
        statusCode: 502,
        headers: cors,
        body: JSON.stringify({ error: 'anthropic_error', status: res.status, detail: errText.slice(0, 500), leads: [] }),
      };
    }

    const data = await res.json();
    const raw = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Strip fences if any leaked in
    let cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    // Grab the first JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];

    let parsed = { leads: [] };
    try { parsed = JSON.parse(cleaned); }
    catch (e) {
      console.warn('[extract-leads] parse failed', e.message, cleaned.slice(0, 300));
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: [], raw, parse_error: e.message }),
      };
    }

    const leads = Array.isArray(parsed.leads) ? parsed.leads : [];

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads, raw, model: data.model, usage: data.usage }),
    };
  } catch (err) {
    console.error('[extract-leads] fetch error', err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message, leads: [] }),
    };
  }
};
