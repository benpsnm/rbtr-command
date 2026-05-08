'use strict';

// RBTR Content Drafter — generates Ben-voice social posts from workshop events
// Input:  build_phase (string), photos (string[] optional), vibe, source_event, context_note
// Output: ig_short, ig_medium, ig_long, yt_title, yt_desc, tiktok
//         Saved to psnm_content_drafts, full object returned as JSON
//
// Vibe options: build-progress | behind-the-scenes | sponsor-shoutout | family | philosophy
// Brand values: Honest / Family / Inspiring
// Audience feeling: inspired / moved / part of journey

const { checkAuth } = require('../auth/middleware');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL         = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

const VIBE_OPTIONS = ['build-progress', 'behind-the-scenes', 'sponsor-shoutout', 'family', 'philosophy'];
const REQUIRED_FIELDS = ['ig_short', 'ig_medium', 'ig_long', 'yt_title', 'yt_desc', 'tiktok'];

// Cached once per cold start — prompt-caching header keeps it warm on Anthropic side
const BEN_VOICE_SYSTEM = `You write social media content for Ben Greenwood — the builder behind RBTR (Rock Bottom to Roaming).

WHO BEN IS:
Ben is a 20-year self-taught fabricator and welder from South Yorkshire (Rotherham/Barnsley). He's building a Mercedes Arocs 6x6 33-tonne expedition truck solo, from scratch, to drive his family — partner Sarah, sons Hudson (7) and Benson (6) — across 45 countries over 45 months. He owes £200,000 to people who trusted him. Every penny of content revenue goes back to repay that debt. No self-pity. Just forward motion and accountability made visible. His core belief: "Through heartache produces beautiful things."

BEN'S VOICE — these rules are absolute:
- South Yorkshire. Direct. Short sentences. Never corporate, never presenter-voice
- "Right" not "Okay". "Sorted" not "Completed". "Cracking on" not "Moving forward"
- Emotional honesty without self-pity. The hard stuff gets acknowledged, not wallowed in
- Never motivational-poster language. If it sounds like a quote on a gym wall, cut it
- Swearing is fine where it fits naturally — don't perform it or force it
- Specific beats abstract every time. "45 minutes on the buffer before the money shot" beats "hard work pays off"
- Workshop floor energy. Not YouTube presenter energy. Not LinkedIn thought-leader energy

THREE BRAND VALUES — every post passes all three or it gets cut:
1. HONEST — real cost, real struggle, real wins. No glossing. No fake polish
2. FAMILY — Sarah, the boys, the community. This is a family story, not a solo hero arc
3. INSPIRING — makes someone watching think "I could build something too" — not manufactured motivation, but "here's what's actually possible"

AUDIENCE SHOULD FEEL (in this order):
1. Inspired to do something big themselves
2. Emotionally moved (they should feel something, not just scroll past)
3. Part of the journey — not spectators, participants

HASHTAG RULES:
- IG short: 3-5 tags max, relevant, no generic spam
- IG medium: 5-7 tags
- IG long: 7-10 tags
- TikTok: 3-5 tags, lean into native TikTok tags (#fyp only if it genuinely fits)
- Tags like #motivation #blessed #grind are banned

NEVER WRITE:
- "What a day!" / "Loving this project!" / "You're not ready for this"
- Fake hype of any kind
- Third-person ("Ben and his team...")
- Generic "hard work pays off" phrasing
- Emoji overload (1-2 max per post, and only if they genuinely add something)`;

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function saveDraft(payload) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_content_drafts`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`DB write failed ${r.status}: ${err}`);
  }
  const rows = await r.json();
  return rows[0];
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await checkAuth(req);
  if (!auth.ok) return res.status(401).json({ error: 'unauthorized' });

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    build_phase,
    photos        = [],
    vibe          = 'build-progress',
    context_note  = '',
    source_event  = '',
  } = req.body || {};

  if (!build_phase) return res.status(400).json({ error: 'build_phase required' });
  if (!VIBE_OPTIONS.includes(vibe)) {
    return res.status(400).json({ error: `vibe must be one of: ${VIBE_OPTIONS.join(', ')}` });
  }

  const userPrompt = `Generate social media content for this workshop moment.

BUILD PHASE: ${build_phase}
VIBE: ${vibe}${context_note ? `\nCONTEXT: ${context_note}` : ''}
PHOTOS: ${photos.length ? `${photos.length} photo(s) available` : 'none'}

Return ONLY valid JSON with these exact keys — no wrapper text, no markdown fences, raw JSON only:

{
  "ig_short": "under 150 chars, punchy, Ben's voice, 3-5 hashtags",
  "ig_medium": "3-5 sentences, real workshop detail, emotional hook, 5-7 hashtags",
  "ig_long": "8-12 sentences, full story arc, vulnerability, pulls the community in, 7-10 hashtags",
  "yt_title": "under 60 chars — builds curiosity from honesty, not clickbait",
  "yt_desc": "2-3 sentences for the short/reel — what happened + what the viewer will feel",
  "tiktok": "under 150 chars, more raw and immediate than IG, TikTok-native feel, 3-5 hashtags"
}`;

  let raw;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: [{ type: 'text', text: BEN_VOICE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'claude_error', detail: err });
    }
    const data = await r.json();
    raw = data.content?.[0]?.text?.trim() || '';
  } catch (e) {
    return res.status(500).json({ error: 'fetch_error', detail: e.message });
  }

  let content;
  try {
    content = JSON.parse(raw);
  } catch {
    return res.status(500).json({ error: 'parse_error', raw });
  }

  for (const key of REQUIRED_FIELDS) {
    if (!content[key]) return res.status(500).json({ error: `missing_field_${key}`, raw });
  }

  let saved = null;
  try {
    saved = await saveDraft({
      source_event : source_event || build_phase.slice(0, 200),
      photos       : photos.length ? photos : null,
      vibe,
      ig_short     : content.ig_short,
      ig_medium    : content.ig_medium,
      ig_long      : content.ig_long,
      yt_title     : content.yt_title,
      yt_desc      : content.yt_desc,
      tiktok       : content.tiktok,
      status       : 'draft',
    });
  } catch {
    // DB save non-fatal — content returned regardless
  }

  return res.status(200).json({ ...content, id: saved?.id || null });
};
