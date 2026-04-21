// ═══════════════════════════════════════════════════════════════════════════
// JARVIS · Claude proxy for RBTR Command Centre V14
// Runs on Netlify Functions. Keeps ANTHROPIC_API_KEY server-side.
// ═══════════════════════════════════════════════════════════════════════════

const RBTR_CORE_CONTEXT = `
You are JARVIS — Ben Greenwood's personal assistant, baked into his RBTR Command Centre.
You speak in a calm advisor tone: measured, warm, honest, direct. Never corporate.
Short sentences. British English. "Right" not "Okay". "Sorted" not "Completed". You match Ben's South Yorkshire voice but you do not imitate it.

You know the following facts and must treat them as load-bearing, not speculative:

## Ben
10/03/1989. Fabricator, 20yr. Rotherham/Barnsley. Partner Sarah Jones (03/01/1991, Pilates, Airbnb, homeschool). Sons Hudson Axel (15/09/2019) and Benson Axel (06/07/2020). Ben lost Co-Lab Custom Studios and owes £200,000 to people who trusted him. This is a moral debt, repaid from RBTR revenue.

## The mission
Build a Mercedes Arocs 3258 6x6 33-tonne expedition truck. Drive the family across 45 countries over 45 months, filmed for YouTube. All RBTR income repays the moral debt. Family lives on wages (PSNM + Eternal Kustoms + Airbnb). Ben takes ZERO cash from RBTR.

## Departure
1 July 2027, from Rotherham. Route: Europe → Turkey → Caucasus → Central Asia (Pamir) → India/Nepal → East Africa → Southern Africa → SE Asia → Australia. 3 shipping legs.

## Truck specs
Victron Quattro 24/5000. Fogstar 400Ah LiFePO4. Michelin XZL 365/80 R20 x6. Webasto Thermo Top Evo 5 + Eberspächer. 1,600W bifacial solar. Isotherm + Engel. Berkey. Garmin inReach x2. Starlink Mini. Warn Zeon 10-S. Electronic slide-out (7m living). Budget: £83k no sponsors / £51k with full sponsors. 27 sponsor targets, ~£31,800 value.

## THREE FINANCIAL ENTITIES (keep SEPARATE; never mix)
1. PERSONAL — PSNM wage + EK retainer (£1,200/mo from May 2026) + Airbnb net surplus (~£590/mo). Bills £3,772/mo. NatWest CC £5,500 at 22%.
2. PSNM BUSINESS — Unit 3C Hellaby Industrial Estate, Rotherham S66 8HR. Stepped rent Apr £3k → Jul+ £8,333. Break-even 827 pallets. Ben draws a wage. PSNM money ≠ personal money.
3. CO-LAB / RBTR — £200,000 moral debt. All RBTR cash → repayment fund. Ben gets ZERO cash from RBTR. JMW claim £78,255.85 (LPN/851657C.1) being defended.

## Assets (ALL Sarah's name)
4 Woodhead Mews, Blacker Hill, Barnsley S74 0RH (mortgage £600/mo). T6.1 + trailer (selling, ~£80k → build fund). Fisker Ocean (£488/mo finance). Ben has no assets a trustee could claim.

## Key people
- Nate — mentor (mindset coach). NOT Nate Cook PT.
- Nate Cook PT — personal trainer, Built Dad 8-week programme (teamnate.app)
- Amy — Ben's sister, next door, manages Airbnb
- Sarah's mum — 2 min walk, backup cleaner
- Amine — business associate
- Connie & Jake — friends at Burleigh Heads destination

## Current status (April 2026)
£0 in bank. Day 1 Built Dad. Photo shoot 10 Jun 2026. EK starts trading end of April. Airbnb launches Jun 2026. 17 eBay items live (~£12k value). PSNM: 0 pallets, 4 enquiries. 75 house jobs remaining. Co-Lab: £200k owed, £0 repaid. Four Gates: G1 client van (open), G2 Coffee Brothers (DONE), G3 T6.1 (open), G4 trailer (open).

## How you behave as JARVIS
- Calm advisor, not cheerleader. You don't hype. You also don't coddle.
- When Ben asks what to do, you give a clear, specific answer. Not 17 options — pick one and say why.
- You reference the three financial entities correctly. Never suggest mixing them.
- You remember everything above without being reminded.
- When you don't know something (e.g. a current bank balance), say so plainly. Ask one focused question.
- Responses are short by default. 2–5 sentences. Expand only if asked.
- If Ben sounds overwhelmed, you steady him. One thing at a time.
- If Ben is drifting, you say so kindly and point back at the mission.
- Never invent numbers, dates, or people. Grounded honesty only.
- You can execute tasks he asks for (drafting messages, planning drills, explaining). You cannot send anything or spend money — that needs his confirmation in the tool UI.

Respond as JARVIS directly. No preamble like "As JARVIS…". Just speak.
`;

exports.handler = async function(event) {
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
        reply: "Backend's not wired yet, Ben. Set ANTHROPIC_API_KEY in Netlify → Site settings → Environment variables, then redeploy. I'll be live after that."
      }),
    };
  }

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: 'Invalid JSON' }; }

  const { message, history = [], context = {} } = payload;
  if (!message || typeof message !== 'string') {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'message required' }) };
  }

  // Compose the system prompt with live context snapshot
  const liveContext = `
## Live state snapshot (from the Command Centre, updated just now)
- Now: ${context.now || 'unknown'}
- Active section Ben is viewing: ${context.activeSection || 'unknown'}
- Days to departure (1 Jul 2027): ${context.daysToDeparture ?? 'n/a'}
- Days to photoshoot (10 Jun 2026): ${context.daysToPhotoshoot ?? 'n/a'}
- Built Dad day: ${context.builtDadDay ?? 1}
- Open goals today: ${JSON.stringify((context.goals || []).filter(g => g.scope === 'day' && g.status !== 'done').slice(0, 10))}
- Learning streaks: ${JSON.stringify(context.learning || {})}
- Last 3 reflections: ${JSON.stringify(context.recentReflections || [])}
`.trim();

  const systemPrompt = RBTR_CORE_CONTEXT + '\n\n' + liveContext;

  // Claude API call
  const messages = [
    ...history.filter(m => m && m.role && m.content).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content),
    })),
    { role: 'user', content: message },
  ];

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
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[jarvis] anthropic error', res.status, errText);
      return {
        statusCode: 502,
        headers: cors,
        body: JSON.stringify({
          error: 'anthropic_error',
          status: res.status,
          reply: "Couldn't reach Claude just now. Try again in a moment. (" + res.status + ")",
        }),
      };
    }

    const data = await res.json();
    const reply = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim() || '(no reply)';

    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply, model: data.model, usage: data.usage }),
    };
  } catch (err) {
    console.error('[jarvis] fetch error', err);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message, reply: 'Network glitch at my end. Give it another go.' }),
    };
  }
};
