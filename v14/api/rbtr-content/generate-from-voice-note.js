'use strict';

// POST /api/rbtr-content/generate-from-voice-note
//
// Takes a voice note transcript (Ben uploads manually — no auto-polling),
// extracts the key stories / build moments / decisions, then generates
// platform-ready content variants for each major topic found.
//
// Input:
//   transcript   {string}   — full text of the voice note (Ben types or pastes)
//   recorded_at  {string?}  — ISO datetime of the recording (default: now)
//   max_topics   {number?}  — max story topics to extract (default: 3)
//   platforms    {string[]?}— which platforms to generate for (default: all)
//
// Output:
//   { topics: [...], drafts_by_topic: [...] }
//   — Each topic gets a set of platform drafts saved to rbtr_content_drafts

const { requireAuth } = require('../auth/middleware');
const { BRAND_VOICE_SYSTEM, sbInsert, callClaude } = require('./_brand-voice');

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE;
const ANT_KEY  = process.env.ANTHROPIC_API_KEY;
const MODEL    = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

const ALL_PLATFORMS = ['instagram', 'youtube', 'tiktok'];
// Note: podcast and pinterest are not auto-generated from voice notes —
// they require more curation. But they can be added via platforms param.

function extractionPrompt(transcript, maxTopics) {
  return `You are listening to a voice note from Ben Greenwood, building his RBTR expedition truck.

VOICE NOTE TRANSCRIPT:
---
${transcript}
---

Extract the ${maxTopics} most content-worthy story moments or topics from this transcript.

For each topic, provide:
1. A clear one-line summary of what happened or what Ben is thinking about
2. The emotional core — what's really being said underneath the surface
3. The best platform fit — where this story will land hardest
4. A vibe classification

Return ONLY raw JSON — no markdown fences:

{
  "topics": [
    {
      "summary": "One-line: what happened or what Ben is saying",
      "emotional_core": "What this is really about under the surface",
      "build_relevance": "How this connects to the Arocs build or expedition prep",
      "best_platform": "instagram | youtube | tiktok | podcast",
      "vibe": "build-progress | behind-the-scenes | sponsor-showcase | family | philosophy | wellness | route",
      "content_brief": "Detailed brief for content generation — what to capture, what Ben would say, what the viewer should feel"
    }
  ]
}

Rules:
- Only extract topics that are genuinely content-worthy (something real happened, something honest was said)
- Skip logistics, admin, or anything that would bore a viewer
- The emotional core is more important than the literal content
- Maximum ${maxTopics} topics`;
}

function contentPrompt(topic, platforms) {
  return `Generate platform content from this RBTR build moment.

TOPIC: ${topic.summary}
EMOTIONAL CORE: ${topic.emotional_core}
BUILD RELEVANCE: ${topic.build_relevance}
CONTENT BRIEF: ${topic.content_brief}
VIBE: ${topic.vibe}

PLATFORMS TO GENERATE: ${platforms.join(', ')}

Return ONLY raw JSON for each platform requested:

{
  "instagram": {
    "short_caption": "Under 150 chars, punchy, Ben's voice, 3-5 hashtags",
    "long_caption": "8-12 sentences, full story arc, honest, pulls community in. Hashtags at end.",
    "reel_hook": "First 2 seconds of the reel — mid-action or statement",
    "reel_voiceover": "Full spoken script for a 60-90 second reel"
  },
  "youtube": {
    "title": "Under 60 chars",
    "description": "2-3 sentences. What the viewer gets.",
    "voiceover": "Spoken script for YT Short, 60-90 seconds"
  },
  "tiktok": {
    "hook": "First 2 seconds",
    "script": "Full TikTok script, 15-60 seconds",
    "caption": "Under 150 chars with hashtags"
  }
}

Only include keys for platforms listed in PLATFORMS TO GENERATE.
Every word must pass all three brand values: HONEST, FAMILY, INSPIRING.`;
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
    transcript,
    recorded_at  = new Date().toISOString(),
    max_topics   = 3,
    platforms    = ALL_PLATFORMS,
  } = req.body || {};

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 20) {
    return res.status(400).json({ error: 'transcript required (min 20 chars)' });
  }

  const capped = Math.min(Math.max(parseInt(max_topics, 10) || 3, 1), 5);
  const requestedPlatforms = ALL_PLATFORMS.filter(p => platforms.includes(p));
  if (requestedPlatforms.length === 0) {
    return res.status(400).json({ error: 'at least one valid platform required (instagram|youtube|tiktok)' });
  }

  // Step 1 — extract topics from transcript
  let topics;
  try {
    const result = await callClaude(
      ANT_KEY,
      MODEL,
      BRAND_VOICE_SYSTEM,
      extractionPrompt(transcript.trim(), capped),
      2000
    );
    if (!result.parsed || !Array.isArray(result.parsed.topics)) {
      return res.status(500).json({ error: 'extraction_parse_error', raw: result.raw.slice(0, 500) });
    }
    topics = result.parsed.topics.slice(0, capped);
  } catch (e) {
    return res.status(502).json({ error: 'claude_extraction_error', detail: e.message });
  }

  // Step 2 — generate platform content for each topic
  const weekDate = new Date(recorded_at);
  weekDate.setDate(weekDate.getDate() - ((weekDate.getDay() + 6) % 7));
  const weekDateStr = weekDate.toISOString().split('T')[0];

  const draftsByTopic = [];

  for (const topic of topics) {
    let content;
    try {
      const result = await callClaude(
        ANT_KEY,
        MODEL,
        BRAND_VOICE_SYSTEM,
        contentPrompt(topic, requestedPlatforms),
        3000
      );
      if (!result.parsed) continue;
      content = result.parsed;
    } catch (_) {
      continue;
    }

    const topicDrafts = { topic, saved: [] };

    // Instagram
    if (content.instagram && requestedPlatforms.includes('instagram')) {
      const ig = content.instagram;
      try {
        const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_drafts', {
          platform      : 'instagram',
          content_type  : 'reel',
          vibe          : topic.vibe,
          body          : ig.reel_voiceover || ig.long_caption || '',
          caption       : ig.long_caption || null,
          voiceover     : ig.reel_voiceover || null,
          source_signal : 'voice_note',
          source_summary: topic.summary.slice(0, 200),
          week_date     : weekDateStr,
          status        : 'draft',
        });
        topicDrafts.saved.push({ id: row?.id, platform: 'instagram', type: 'reel' });
      } catch (_) {}

      // Also save the short caption as a separate post draft
      if (ig.short_caption) {
        try {
          const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_drafts', {
            platform      : 'instagram',
            content_type  : 'post',
            vibe          : topic.vibe,
            body          : ig.short_caption,
            caption       : ig.short_caption,
            source_signal : 'voice_note',
            source_summary: topic.summary.slice(0, 200),
            week_date     : weekDateStr,
            status        : 'draft',
          });
          topicDrafts.saved.push({ id: row?.id, platform: 'instagram', type: 'post' });
        } catch (_) {}
      }
    }

    // YouTube
    if (content.youtube && requestedPlatforms.includes('youtube')) {
      const yt = content.youtube;
      try {
        const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_drafts', {
          platform      : 'youtube',
          content_type  : 'short',
          vibe          : topic.vibe,
          title         : yt.title || null,
          body          : yt.voiceover || yt.description || '',
          description   : yt.description || null,
          voiceover     : yt.voiceover || null,
          source_signal : 'voice_note',
          source_summary: topic.summary.slice(0, 200),
          week_date     : weekDateStr,
          status        : 'draft',
        });
        topicDrafts.saved.push({ id: row?.id, platform: 'youtube', type: 'short' });
      } catch (_) {}
    }

    // TikTok
    if (content.tiktok && requestedPlatforms.includes('tiktok')) {
      const tt = content.tiktok;
      try {
        const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_drafts', {
          platform      : 'tiktok',
          content_type  : 'short',
          vibe          : topic.vibe,
          body          : tt.script || '',
          caption       : tt.caption || null,
          voiceover     : tt.script || null,
          source_signal : 'voice_note',
          source_summary: topic.summary.slice(0, 200),
          week_date     : weekDateStr,
          status        : 'draft',
        });
        topicDrafts.saved.push({ id: row?.id, platform: 'tiktok', type: 'short' });
      } catch (_) {}
    }

    topicDrafts.content = content;
    draftsByTopic.push(topicDrafts);
  }

  const totalSaved = draftsByTopic.reduce((s, t) => s + t.saved.length, 0);

  return res.status(200).json({
    ok            : true,
    topics_found  : topics.length,
    drafts_created: totalSaved,
    drafts_by_topic: draftsByTopic,
  });
};
