'use strict';

// POST /api/rbtr-content/generate-from-event
//
// Given a specific event from the build (e.g. "Goldschmitt suspension installed"),
// generates platform-ready content for every requested platform variant.
//
// Input:
//   event        {string}   — what happened. Be specific: "Fitted Michelin XZL tyres today, all 6"
//   vibe         {string}   — one of: build-progress | behind-the-scenes | sponsor-showcase | family | philosophy | wellness | route
//   build_week   {number?}  — 1–60 (Arocs build week, if known)
//   context_note {string?}  — extra detail for the AI
//   platforms    {string[]?}— subset of platforms (default: all 5)
//   source_signal{string?}  — signal origin (default: 'manual')
//
// Output: { drafts: [...], ids: [...] } — one draft per platform variant, saved to rbtr_content_drafts

const { requireAuth } = require('../auth/middleware');
const { BRAND_VOICE_SYSTEM, sbInsert, callClaude } = require('./_brand-voice');

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE;
const ANT_KEY  = process.env.ANTHROPIC_API_KEY;
const MODEL    = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

const VALID_VIBES = ['build-progress', 'behind-the-scenes', 'sponsor-showcase', 'family', 'philosophy', 'wellness', 'route'];
const ALL_PLATFORMS = ['instagram', 'youtube', 'tiktok', 'podcast', 'pinterest'];

function buildPrompt(event, vibe, buildWeek, contextNote, platforms) {
  const weekNote = buildWeek ? `This is Week ${buildWeek} of the 60-week Arocs build.` : '';
  const ctxNote = contextNote ? `\nADDITIONAL CONTEXT: ${contextNote}` : '';

  return `Generate documentary-grade content from this specific build event.

EVENT: ${event}
VIBE: ${vibe}
${weekNote}${ctxNote}

PLATFORMS REQUESTED: ${platforms.join(', ')}

Generate content for EACH platform listed. Return ONLY raw JSON — no markdown fences, no wrapper text.

JSON structure:
{
  "instagram": {
    "reel": {
      "caption": "Full IG caption with hashtags — up to 2200 chars. First line is the hook (no hashtags on first line). Hashtags in last paragraph.",
      "voiceover": "Spoken script for the reel, 45-90 seconds of spoken word. Ben's voice throughout. Starts mid-action.",
      "thumbnail_brief": "One sentence describing what the thumbnail should show.",
      "content_type": "reel"
    },
    "carousel": {
      "caption": "Main carousel caption with hashtags.",
      "slides": [
        {"slide": 1, "headline": "Slide 1 headline", "body": "Slide 1 body text"},
        ... 8-10 slides total, last slide is emotional land or CTA
      ],
      "content_type": "carousel"
    }
  },
  "youtube": {
    "short": {
      "title": "Under 60 chars. Curiosity from honesty.",
      "description": "2-3 sentences. Tell viewer exactly what they get. No hype.",
      "voiceover": "Spoken script for YT Short, 45-90 seconds. Starts with hook.",
      "thumbnail_brief": "One sentence. One clear emotion or action.",
      "content_type": "short"
    },
    "vlog_segment": {
      "title": "Vlog episode title, under 60 chars.",
      "description": "YouTube description. First 2 sentences are the hook. Rest is full context.",
      "structure": {
        "cold_open": "First 30 seconds script — must hook without logo bumper",
        "segments": ["Segment 1 title and 2-3 sentence outline", "Segment 2...", "Segment 3..."],
        "outro": "Sign-off script, 30 seconds. What comes next, why they should subscribe."
      },
      "thumbnail_brief": "One clear visual moment from the build.",
      "content_type": "vlog"
    }
  },
  "tiktok": {
    "short": {
      "hook": "First 2 seconds. Statement, question, or action mid-flow. Never 'Hey guys'.",
      "body": "Full TikTok script, 15-60 seconds. Raw, immediate.",
      "caption": "TikTok caption with hashtags. Under 150 chars.",
      "content_type": "short"
    }
  },
  "podcast": {
    "topic_pitch": {
      "title": "Episode title",
      "description": "2-3 sentence episode premise — for the host (Nate) and for show notes.",
      "discussion_points": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
      "key_question": "The question Nate should open with to unlock this topic.",
      "content_type": "episode"
    }
  },
  "pinterest": {
    "pin": {
      "title": "Pin title, under 100 chars. Functional, searchable.",
      "description": "Pin description, under 500 chars. What it is, who it's for, problem it solves.",
      "hashtags": ["tag1", "tag2", "tag3"],
      "image_brief": "What the pin image should show.",
      "content_type": "pin"
    }
  }
}

Only include keys for platforms in the PLATFORMS REQUESTED list.
Every field must pass all three brand values: HONEST, FAMILY, INSPIRING.
Every field must avoid all banned phrases.`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

  const {
    event,
    vibe          = 'build-progress',
    build_week    = null,
    context_note  = '',
    platforms     = ALL_PLATFORMS,
    source_signal = 'manual',
  } = req.body || {};

  if (!event || typeof event !== 'string' || event.trim().length < 5) {
    return res.status(400).json({ error: 'event is required (min 5 chars)' });
  }
  if (!VALID_VIBES.includes(vibe)) {
    return res.status(400).json({ error: `vibe must be one of: ${VALID_VIBES.join(', ')}` });
  }
  const requestedPlatforms = platforms.filter(p => ALL_PLATFORMS.includes(p));
  if (requestedPlatforms.length === 0) {
    return res.status(400).json({ error: 'at least one valid platform required' });
  }

  let generated;
  try {
    const result = await callClaude(
      ANT_KEY,
      MODEL,
      BRAND_VOICE_SYSTEM,
      buildPrompt(event.trim(), vibe, build_week, context_note, requestedPlatforms),
      6000
    );
    if (!result.parsed) {
      return res.status(500).json({ error: 'parse_error', raw: result.raw.slice(0, 500) });
    }
    generated = result.parsed;
  } catch (e) {
    return res.status(502).json({ error: 'claude_error', detail: e.message });
  }

  // Save each platform variant to rbtr_content_drafts
  const saved = [];
  const errors = [];
  const weekDate = new Date();
  weekDate.setDate(weekDate.getDate() - weekDate.getDay() + 1); // Monday
  const weekDateStr = weekDate.toISOString().split('T')[0];

  for (const platform of requestedPlatforms) {
    const platformData = generated[platform];
    if (!platformData) continue;

    for (const [type_key, variant] of Object.entries(platformData)) {
      try {
        const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_drafts', {
          platform,
          content_type  : variant.content_type || type_key,
          vibe,
          title         : variant.title || null,
          body          : variant.voiceover || variant.description || variant.body || variant.caption || '',
          caption       : variant.caption || null,
          hashtags      : variant.hashtags ? variant.hashtags : null,
          voiceover     : variant.voiceover || null,
          description   : variant.description || null,
          thumbnail_brief: variant.thumbnail_brief || null,
          source_signal,
          source_summary: event.trim().slice(0, 200),
          build_week    : build_week ? parseInt(build_week, 10) : null,
          week_date     : weekDateStr,
          status        : 'draft',
        });
        saved.push({ id: row?.id, platform, type: type_key });
      } catch (e) {
        errors.push({ platform, type: type_key, error: e.message });
      }
    }
  }

  return res.status(200).json({
    ok      : true,
    event   : event.trim(),
    vibe,
    platforms: requestedPlatforms,
    content : generated,
    saved,
    errors  : errors.length ? errors : undefined,
  });
};
