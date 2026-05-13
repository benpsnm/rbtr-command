'use strict';

// POST /api/rbtr-content/generate-week
//
// Aggregates all signal sources from a given week and generates a full
// content calendar draft for the FOLLOWING week (5–7 posts/videos).
//
// Signal sources pulled:
//   - rbtr_daily_log (win/milestone/decision events for the week)
//   - rbtr_tasks (tasks completed in the week, project='rbtr' or 'truck')
//   - rbtr_week_goals (current week's goal set)
//
// Input:
//   week_date {string?} — any ISO date within the target week (default: this week)
//
// Output:
//   { week, signals, calendar: [...], drafts_created: N }
//   — calendar entries written to rbtr_content_calendar
//   — drafts generated and saved to rbtr_content_drafts

const { requireAuth } = require('../auth/middleware');
const { BRAND_VOICE_SYSTEM, sbInsert, sbQuery, callClaude } = require('./_brand-voice');

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE;
const ANT_KEY  = process.env.ANTHROPIC_API_KEY;
const MODEL    = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

function getWeekBounds(inputDate) {
  const d = inputDate ? new Date(inputDate) : new Date();
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    monday : mon.toISOString().split('T')[0],
    sunday : sun.toISOString().split('T')[0],
    isoWeek: `${mon.getFullYear()}-W${String(Math.ceil((((mon - new Date(mon.getFullYear(), 0, 1)) / 86400000) + new Date(mon.getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, '0')}`,
  };
}

function nextWeekMonday(weekBounds) {
  const d = new Date(weekBounds.monday);
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

async function pullSignals(weekBounds) {
  const { monday, sunday } = weekBounds;
  const [dailyLog, tasks, weekGoals] = await Promise.allSettled([
    sbQuery(SUPA_URL, SUPA_KEY,
      `rbtr_daily_log?log_date=gte.${monday}&log_date=lte.${sunday}&order=log_date.asc&select=log_date,event_type,description,related_project`),
    sbQuery(SUPA_URL, SUPA_KEY,
      `rbtr_tasks?status=eq.complete&updated_at=gte.${monday}T00:00:00Z&updated_at=lte.${sunday}T23:59:59Z&project=in.(rbtr,truck,build,expedition)&select=description,project,priority,completed_at`),
    sbQuery(SUPA_URL, SUPA_KEY,
      `rbtr_week_goals?week_iso=ilike.${monday.slice(0, 4)}%&order=created_at.desc&limit=10&select=goal,target_outcome,status,progress_pct`),
  ]);

  return {
    daily_log  : dailyLog.status  === 'fulfilled' ? dailyLog.value  : [],
    tasks      : tasks.status     === 'fulfilled' ? tasks.value     : [],
    week_goals : weekGoals.status === 'fulfilled' ? weekGoals.value : [],
  };
}

function buildCalendarPrompt(weekBounds, signals, nextWeekStart) {
  const signalSummary = [
    signals.daily_log.length
      ? `DAILY LOG EVENTS (${signals.daily_log.length}):\n${signals.daily_log.map(e => `  [${e.log_date}] ${e.event_type.toUpperCase()}: ${e.description}`).join('\n')}`
      : 'DAILY LOG: no entries this week',

    signals.tasks.length
      ? `COMPLETED TASKS (${signals.tasks.length}):\n${signals.tasks.map(t => `  [${t.project}] ${t.description}`).join('\n')}`
      : 'COMPLETED TASKS: none logged',

    signals.week_goals.length
      ? `WEEK GOALS:\n${signals.week_goals.map(g => `  ${g.status === 'done' ? '✓' : '○'} ${g.goal} (${g.progress_pct}%)`).join('\n')}`
      : 'WEEK GOALS: none set',
  ].join('\n\n');

  return `You are planning the content calendar for RBTR (Rock Bottom to Roaming) for the week starting ${nextWeekStart}.

Here is everything that happened in the Arocs build / expedition planning this week (${weekBounds.monday} → ${weekBounds.sunday}):

${signalSummary}

━━━━━━━━━━━━━━━━━━━━━━━━
CALENDAR PLANNING TASK
━━━━━━━━━━━━━━━━━━━━━━━━

Based on the week's signals, plan 5–7 pieces of content for the following week (${nextWeekStart}).

Rules:
- Mix platforms: minimum 2 Instagram, 1 YouTube (vlog or short), 1 TikTok per week
- Each piece must draw from a real signal from this week — no invented events
- Spread across the week: don't cluster everything Monday
- Balance build-progress content with family/philosophy angles
- Lead with the most story-worthy signal for the week

Return ONLY raw JSON — no markdown fences, no wrapper text:

{
  "week_theme": "One sentence describing the narrative thread of this week's content",
  "lead_story": "The single most content-worthy thing that happened this week",
  "calendar": [
    {
      "planned_date": "${nextWeekStart}",
      "platform": "instagram",
      "content_type": "reel",
      "vibe": "build-progress",
      "title": "Short working title",
      "slot_note": "What this piece covers and why it matters this week",
      "draft_prompt": "Detailed brief for content generation: what happened, what to show, what Ben would say about it"
    },
    ... 4–6 more entries
  ]
}

Valid platforms: instagram | youtube | tiktok | podcast | pinterest
Valid content_types: reel | carousel | story | post | vlog | short | episode | clip | pin
Valid vibes: build-progress | behind-the-scenes | sponsor-showcase | family | philosophy | wellness | route`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

  const { week_date } = req.body || {};

  const weekBounds   = getWeekBounds(week_date);
  const nextMonday   = nextWeekMonday(weekBounds);

  // Pull all signals
  let signals;
  try {
    signals = await pullSignals(weekBounds);
  } catch (e) {
    return res.status(500).json({ error: 'signal_pull_failed', detail: e.message });
  }

  // Generate calendar plan via Claude
  let plan;
  try {
    const result = await callClaude(
      ANT_KEY,
      MODEL,
      BRAND_VOICE_SYSTEM,
      buildCalendarPrompt(weekBounds, signals, nextMonday),
      3000
    );
    if (!result.parsed) {
      return res.status(500).json({ error: 'parse_error', raw: result.raw.slice(0, 500) });
    }
    plan = result.parsed;
  } catch (e) {
    return res.status(502).json({ error: 'claude_error', detail: e.message });
  }

  if (!Array.isArray(plan.calendar) || plan.calendar.length === 0) {
    return res.status(500).json({ error: 'empty_calendar', raw: plan });
  }

  // Write calendar entries to rbtr_content_calendar
  const calendarRows = [];
  const calendarErrors = [];
  for (const slot of plan.calendar) {
    try {
      const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_calendar', {
        planned_date : slot.planned_date,
        platform     : slot.platform,
        content_type : slot.content_type,
        vibe         : slot.vibe || null,
        title        : slot.title || null,
        slot_note    : slot.slot_note || null,
        status       : 'planned',
      });
      calendarRows.push({ id: row?.id, ...slot });
    } catch (e) {
      calendarErrors.push({ slot: slot.title, error: e.message });
    }
  }

  // Auto-generate the draft for the lead story (top item in calendar)
  let leadDraft = null;
  if (plan.calendar[0]?.draft_prompt) {
    try {
      const firstSlot = plan.calendar[0];
      // Quick single-platform draft for the top story
      const draftResult = await callClaude(
        ANT_KEY,
        MODEL,
        BRAND_VOICE_SYSTEM,
        `Generate content for this specific RBTR moment.\n\nEVENT: ${firstSlot.draft_prompt}\nPLATFORM: ${firstSlot.platform}\nCONTENT TYPE: ${firstSlot.content_type}\nVIBE: ${firstSlot.vibe || 'build-progress'}\n\nReturn raw JSON with keys: title, body, caption, hashtags, voiceover (if applicable), thumbnail_brief (if applicable), description (if applicable). All fields in Ben's voice.`,
        2500
      );

      if (draftResult.parsed) {
        const d = draftResult.parsed;
        const saved = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_drafts', {
          platform      : firstSlot.platform,
          content_type  : firstSlot.content_type,
          vibe          : firstSlot.vibe || 'build-progress',
          title         : d.title || firstSlot.title,
          body          : d.body || d.voiceover || d.description || d.caption || '',
          caption       : d.caption || null,
          hashtags      : d.hashtags || null,
          voiceover     : d.voiceover || null,
          description   : d.description || null,
          thumbnail_brief: d.thumbnail_brief || null,
          source_signal : 'week_generate',
          source_summary: plan.lead_story?.slice(0, 200) || firstSlot.title,
          week_date     : nextMonday,
          status        : 'draft',
        });
        leadDraft = { id: saved?.id, platform: firstSlot.platform, type: firstSlot.content_type };

        // Link draft to calendar entry
        if (calendarRows[0]?.id && saved?.id) {
          await fetch(`${SUPA_URL}/rest/v1/rbtr_content_calendar?id=eq.${calendarRows[0].id}`, {
            method : 'PATCH',
            headers: {
              apikey        : SUPA_KEY,
              Authorization : `Bearer ${SUPA_KEY}`,
              'Content-Type': 'application/json',
              Prefer        : 'return=minimal',
            },
            body   : JSON.stringify({ draft_id: saved.id, status: 'drafted' }),
          });
        }
      }
    } catch (_) {
      // Lead draft generation non-fatal
    }
  }

  return res.status(200).json({
    ok             : true,
    week           : weekBounds,
    next_week_start: nextMonday,
    week_theme     : plan.week_theme,
    lead_story     : plan.lead_story,
    signals_count  : {
      daily_log : signals.daily_log.length,
      tasks     : signals.tasks.length,
      week_goals: signals.week_goals.length,
    },
    calendar       : calendarRows,
    lead_draft     : leadDraft,
    calendar_errors: calendarErrors.length ? calendarErrors : undefined,
  });
};
