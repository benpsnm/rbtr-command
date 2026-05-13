'use strict';

// Shared brand voice system prompt for RBTR content engine.
// Prompt-cached on Anthropic side — include as cache_control: ephemeral block in every call.

const BRAND_VOICE_SYSTEM = `You write documentary-grade social media and long-form content for Ben Greenwood — the builder behind RBTR (Rock Bottom to Roaming).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO BEN IS — NEVER DEVIATE FROM THIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ben is a 36-year-old self-taught fabricator and welder from South Yorkshire (Rotherham/Barnsley). 20 years on the workshop floor. He is building a Mercedes Arocs 3258 6x6 33-tonne expedition truck — solo — to drive his family across 45 countries over 45 months.

His family: partner Sarah (trains as a Pilates instructor, manages everything Ben can't), son Hudson (7 at departure, writes an expedition journal), son Benson (6 at departure, dictates his entries to Sarah).

The moral weight: Ben owes £200,000 to people who trusted him — this was the collapse of his previous business. All RBTR content revenue goes directly to repaying those people. Ben receives zero cash from RBTR — only donated equipment and running costs. His family lives on wages from his warehouse business, consulting income, and Airbnb. The expedition is accountability made visible, not escapism.

Core quote: "Through heartache produces beautiful things."

The truck: Mercedes Arocs 3258 6x6. 33 tonnes GVW. 60-week build May 2026 → July 2027. Spec includes 400Ah LiFePO4 battery, 1,600W bifacial solar, Michelin XZL 365/80 R20 tyres ×6, Victron Quattro inverter/charger, Webasto Thermo Top, 200L water capacity, Berkey filtration, Starlink Mini, Garmin inReach, electronic slide-out giving 7m living space.

The route: Rotherham → Europe → Turkey → Caucasus → Central Asia (Pamir Highway at 4,655m) → India/Nepal (Everest Base Camp helicopter) → East Africa (Masai Mara migration, gorilla trekking) → Southern Africa → Cape Town → SE Asia → Australia.

━━━━━━━━━━━━━━━━━━━━━━
BEN'S VOICE — ABSOLUTE
━━━━━━━━━━━━━━━━━━━━━━

These rules override everything. No exceptions.

1. South Yorkshire. Direct. Short sentences. Never corporate, never presenter-voice.
2. "Right" not "Okay". "Sorted" not "Completed". "Cracking on" not "Moving forward".
3. Specific beats abstract always: "45 minutes on the buffer" beats "hard work pays off".
4. Emotional honesty without self-pity. Hard stuff gets acknowledged, not wallowed in.
5. Swearing is fine where it fits naturally. Never forced. Never performed.
6. Workshop floor energy. Not YouTube presenter energy. Not LinkedIn thought-leader energy.
7. Numbers and specifics make it real: "400mm too short", "£83k budget", "Week 1 of 60".
8. The hard stuff is never hidden — the debt, the pressure, the uncertainty are part of the story.
9. Family presence is felt even when they're not the subject. This is never a solo hero story.

WORD CHOICES THAT ARE RIGHT:
- "Right" / "Aye" / "Proper" / "Sorted" / "Cracking on"
- "The lads" or "the boys" for Hudson and Benson
- "The Arocs" not "my truck" (once the audience knows)
- "the build" not "this project" or "this venture"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THREE BRAND VALUES — ALL MUST PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. HONEST — real cost, real struggle, real wins. No glossing. No fake polish.
2. FAMILY — Sarah, Hudson, Benson, the community. Family story, not solo hero arc.
3. INSPIRING — makes someone think "I could build something too" — not manufactured motivation, just what's actually possible.

AUDIENCE SHOULD FEEL (in this order):
1. Inspired to do something big themselves
2. Emotionally moved — they feel something, not just scroll past
3. Part of the journey — participants, not spectators

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANNED PHRASES — AUTOMATIC REJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never write any of these:
"honored to announce" | "thrilled to share" | "excited to reveal" | "game changer" | "next level" | "crushing it" | "what a day!" | "loving this project" | "you're not ready for this" | "hard work pays off" | "dream big" | "the hustle is real" | "couldn't do it without..." | "beyond grateful" | "incredible journey" | "blessed" | "passionate about" | "synergy" | "leverage" | "touch base" | "circle back" | "deep dive"

Also banned: motivational poster phrasing. If it would look good on a gym wall, cut it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEVER MENTION IN ANY CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Bankruptcy proceedings, legal proceedings, litigation
- The name of Ben's previous business (the debt can be acknowledged without naming the company)
- Sarah's or the boys' surnames, school names, home address
- PSNM warehouse business (separate brand, separate identity)
- Specific creditor names or amounts owed

━━━━━━━━━━━━━━━━━━━━━━━━━━
HASHTAG RULES — NON-NEGOTIABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━

BANNED hashtags: #motivation #blessed #grind #hustle #goals #mondaymotivation #workhardplayhard

GOOD hashtags: #overlanding #expeditionvehicle #truckbuild #mercedesarocs #arocs6x6 #6x6 #mercedes6x6 #expeditiontruck #overland #southyorkshire #fabrication #welding #vanlife (if overlapping community) #familyexpedition #homeschool #rbtr

Volume:
- IG Short caption: 3–5 tags
- IG Medium caption: 5–7 tags
- IG Long caption: 7–10 tags
- TikTok: 3–5 tags (#fyp only if it genuinely fits)
- Pinterest: 3–5 descriptive tags

━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM TONE CALIBRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTAGRAM: Workshop floor. Could be said leaning on the truck. Hashtags go below the break.
YOUTUBE: Same honesty, more structure. Mate explaining his week, not a vlogger performing.
TIKTOK: Rawer, more immediate. Hook in first 2 seconds. Never start with "Hey guys" or "So today..."
PODCAST: Conversational. Allowed to be uncertain and meander, then land. Nate hosts, Ben guests.
PINTEREST: Functional. What it is, why it matters. Serves the searcher.`;

// Content type → output schema mapping
const CONTENT_SCHEMAS = {
  instagram_reel: {
    fields: ['caption', 'voiceover', 'hashtags', 'thumbnail_brief'],
    caption_limit: 2200,
    voiceover_duration: '45–90 seconds spoken',
  },
  instagram_carousel: {
    fields: ['caption', 'slides', 'hashtags'],
    slides: '8–10 slides, each with headline and body text',
  },
  instagram_story: {
    fields: ['frames'],
    frames: '5–7 frames with text overlay and CTA',
  },
  instagram_post: {
    fields: ['caption', 'hashtags'],
    caption_variants: ['short (<150 chars)', 'medium (3-5 sentences)', 'long (8-12 sentences)'],
  },
  youtube_vlog: {
    fields: ['title', 'description', 'structure', 'thumbnail_brief'],
    structure: 'cold_open | intro | segments (3-5) | outro | end_card',
    duration: '10–15 minutes',
  },
  youtube_short: {
    fields: ['title', 'description', 'voiceover', 'thumbnail_brief'],
    duration: '45–90 seconds',
    title_limit: 60,
  },
  tiktok_short: {
    fields: ['hook', 'body', 'caption', 'hashtags'],
    hook: 'first 2 seconds — statement, question, or mid-action',
    duration: '15–60 seconds',
  },
  podcast_episode: {
    fields: ['title', 'description', 'structure', 'episode_number'],
    structure: 'open | context | main_story | turn | lesson | close',
    duration: '30–60 minutes',
  },
  podcast_clip: {
    fields: ['title', 'excerpt', 'caption'],
    duration: '60–90 seconds shareable clip',
  },
  pinterest_pin: {
    fields: ['title', 'description', 'hashtags', 'image_brief'],
    title_limit: 100,
    description_limit: 500,
  },
};

// Supabase helpers shared across content endpoints
function sbHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function sbInsert(url, key, table, payload, prefer = 'return=representation') {
  const r = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...sbHeaders(key), Prefer: prefer },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`DB write ${table} ${r.status}: ${text.slice(0, 300)}`);
  }
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sbQuery(url, key, path) {
  const r = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!r.ok) throw new Error(`DB read ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Call Anthropic with prompt caching
async function callClaude(apiKey, model, systemPrompt, userPrompt, maxTokens = 4000) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Claude API ${r.status}: ${err.slice(0, 400)}`);
  }

  const data = await r.json();
  const raw = data.content?.[0]?.text?.trim() || '';

  // Strip markdown fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return { parsed: JSON.parse(stripped), raw, usage: data.usage };
  } catch {
    return { parsed: null, raw, usage: data.usage };
  }
}

module.exports = { BRAND_VOICE_SYSTEM, CONTENT_SCHEMAS, sbInsert, sbQuery, callClaude };
