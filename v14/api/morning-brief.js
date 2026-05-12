// ═══════════════════════════════════════════════════════════════════════════
// RBTR · Morning brief — voice-first script generator
//
// Flow:
//   1. Fetch full data contract (briefing-data.js logic inlined)
//   2. Compose strict voice-brief prompt (no markdown, 300-450 words,
//      banned-word list, specific structure)
//   3. Call Claude (Opus 4.6)
//   4. Persist script + metadata to daily_briefs
//   5. Return script text so the client can play it via TTS
//
// The client is deliberately dumb — it just fetches this and speaks the result.
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const STORAGE_BUCKET = 'daily-briefs';

// Voice config — Daniel free-tier as fallback if Ben's chosen voice needs paid plan
const PREFERRED_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'M7ya1YbaeFaPXljg9BpK'; // Hannah
const FALLBACK_VOICE_ID  = 'onwK4e9ZLuTAKqWW03F9';   // Daniel (British, free-tier)
const TTS_MODEL_ID       = 'eleven_multilingual_v2';

const PSNM_BREAKEVEN_PALLETS = 827;
const DEPARTURE_DATE = '2027-07-01';
const PHOTOSHOOT_DATE = '2026-06-10';
const ROTHERHAM = { lat: 53.4302, lon: -1.3568 };

// ── Supabase helper ─────────────────────────────────────────────────────────
async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const headers = { apikey: SUPABASE_KEY };
    if (SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type':'application/json', Prefer:'return=representation' };
    if (SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method:'POST', headers, body: JSON.stringify(row) });
    if (!r.ok) return { error: await r.text(), status: r.status };
    return await r.json();
  } catch (e) { return { error: e.message }; }
}
async function sbUpsertDailyBrief(row) {
  // Try update first (by brief_date), fall back to insert
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type':'application/json', Prefer:'return=representation,resolution=merge-duplicates' };
    if (SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/daily_briefs?on_conflict=brief_date`, { method:'POST', headers, body: JSON.stringify(row) });
    if (!r.ok) return { error: await r.text(), status: r.status };
    return await r.json();
  } catch (e) { return { error: e.message }; }
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const daysUntil = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
const daysSince = (iso) => iso ? Math.floor((Date.now() - new Date(iso)) / 86400000) : null;

function getWeekIso() {
  const d = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getEndOfWeek() {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const daysToFriday = 5 - day;
  const friday = new Date(now);
  friday.setUTCDate(friday.getUTCDate() + (daysToFriday >= 0 ? daysToFriday : daysToFriday + 7));
  return friday.toISOString().slice(0, 10);
}

// ── Data gathering (identical contract to /api/briefing-data) ─────────────────
async function gatherAllData() {
  const today_iso = new Date().toISOString().slice(0, 10);
  const [
    builtDad,
    yWins,
    yRefl,
    openGoals,
    moodGap,
    psnmPallets,
    psnmWarmLeads,
    psnmNewEnq,
    psnmUrgent,
    psnmOverdue,
    psnmOutreach,
    sponsorHot,
    sponsorReplies,
    sponsorQueued,
    sponsorWeek,
    buildInProg,
    buildWkStart,
    buildPhotosGap,
    audience,
    resurrection,
    resurrectionTasks,
    nateDue,
    legal,
    cash,
    billsWk,
    weather,
    outreachReplies,
    workshopTasks,
    customerTouchpoints,
    rbtrBuildTasks,
    sarahFamilyTasks,
    airbnbTasks,
    taskCompletedYesterday,
    dealFlow,
    contentDue,
    blockedSystems,
    lastDiagnosis,
    garminSleep,
    mindsetYesterday,
    todaysPlan,
    weekGoals,
    yesterdayDailyLog,
  ] = await Promise.all([
    // Dynamic Built Dad: try start_date first, fall back to stored day_number
    sbSelect('jarvis_builtdad', 'id=eq.1&select=start_date').then(async r => {
      if (r?.[0]?.start_date) return Math.floor((Date.now() - new Date(r[0].start_date)) / 86400000) + 1;
      const fb = await sbSelect('jarvis_builtdad', 'id=eq.1&select=day_number');
      return fb?.[0]?.day_number ?? null;
    }),
    sbSelect('jarvis_accomplishments', `achieved_at=gte.${yesterday()}T00:00:00&achieved_at=lt.${today()}T00:00:00&select=title,category`).then(r => r ?? []),
    sbSelect('evening_reflections', `reflection_date=eq.${yesterday()}&select=mood_score,one_line,one_line_reflection,tomorrow_priority`).then(r => r?.[0] || null),
    sbSelect('jarvis_goals', 'scope=eq.day&status=eq.open&select=title,priority&order=priority.asc&limit=10').then(r => r ?? []),
    sbSelect('evening_reflections', 'select=reflection_date&order=reflection_date.desc&limit=1').then(r => r?.[0] ? daysSince(r[0].reflection_date) : null),
    sbSelect('psnm_occupancy_snapshots', 'select=pallets,date&order=date.desc&limit=1').then(r => r?.[0]?.pallets ?? null),
    // Warm leads: due for contact today + hot leads
    Promise.all([
      sbSelect('psnm_warm_leads',
        `next_contact_date=lte.${today_iso}&temperature=neq.dead&status=neq.won&select=company,contact_name,temperature,pallets_count,last_contact_type&order=score.desc&limit=10`),
      sbSelect('psnm_warm_leads',
        `temperature=eq.hot&select=company,contact_name,pallets_count,quote_amount&order=score.desc&limit=5`),
    ]).then(([dueToday, hot]) => ({
      due_today: dueToday ?? null,
      hot_count: Array.isArray(hot) ? hot.length : null,
      hot_leads: hot ?? null,
    })),
    sbSelect('psnm_enquiries', `created_at=gte.${new Date(Date.now()-86400000).toISOString()}&select=id,company,pallets,status,source`).then(r => r ?? null),
    sbSelect('psnm_enquiries', 'status=eq.urgent&select=id,company,pallets,start_date,contact_name').then(r => r ?? null),
    sbSelect('psnm_enquiries', `followup_date=lt.${today()}&status=not.in.(won,lost,complete)&select=id,company,followup_date,pallets`).then(r => r ?? null),
    sbSelect('psnm_outreach_targets', `next_touch_at=gte.${today()}T00:00:00&next_touch_at=lt.${today()}T23:59:59&status=neq.do_not_contact&select=company,industry,email,next_touch_at`).then(r => r ?? null),
    sbSelect('sponsor_signals', `seen_at=gte.${new Date(Date.now()-86400000).toISOString()}&heat=eq.hot&select=sponsor,signal,heat`).then(r => r ?? null),
    // Replies pending = sponsor_targets with status='awaiting_reply'
    sbSelect('sponsor_targets', "status=eq.awaiting_reply&select=brand_name,last_contact_at,tier").then(r => r ?? null),
    // Touches due today = sponsor_targets with next_action_at on today
    sbSelect('sponsor_targets', `next_action_at=gte.${today()}T00:00:00&next_action_at=lt.${today()}T23:59:59&select=brand_name,next_action,tier`).then(r => r ?? null),
    // Approach due this week
    sbSelect('sponsor_targets', `next_action_at=gte.${today()}&next_action_at=lte.${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}&select=brand_name,next_action,tier,next_action_at&order=next_action_at.asc`).then(r => r ?? null),
    sbSelect('build_sections', 'status=eq.in_progress&select=name,started_at,target_complete').then(r => r ?? null),
    sbSelect('build_sections', `planned_start=gte.${today()}&planned_start=lte.${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}&select=name,planned_start`).then(r => r ?? null),
    sbSelect('build_photos', 'select=taken_at&order=taken_at.desc&limit=1').then(r => r?.[0] ? daysSince(r[0].taken_at) : null),
    (async () => {
      const view = await sbSelect('audience_latest', 'select=platform,total,daily_growth,growth_30d');
      if (Array.isArray(view) && view.length > 0) {
        return {
          total: view.reduce((s,r)=>s+(Number(r.total)||0),0),
          growth_24h: view.reduce((s,r)=>s+(Number(r.daily_growth)||0),0),
          growth_30d: view.reduce((s,r)=>s+(Number(r.growth_30d)||0),0),
        };
      }
      const r = await sbSelect('audience_snapshots', 'select=total,captured_at&order=captured_at.desc&limit=2');
      if (!r || r.length === 0) return { total: null, growth_24h: null, growth_30d: null };
      return { total: r[0].total, growth_24h: r.length > 1 ? r[0].total - r[1].total : null, growth_30d: null };
    })(),
    sbSelect('resurrection_log', 'select=day_number,started_at&order=day_number.desc&limit=1').then(r => r?.[0] ?? null),
    sbSelect('resurrection_tasks', `scheduled_for=eq.${today()}&select=task,status`).then(r => r ?? null),
    sbSelect('nate_checkins', 'select=checkin_at&order=checkin_at.desc&limit=1').then(r => {
      if (!r || r.length === 0) return null;
      return daysSince(r[0].checkin_at) >= 7;
    }),
    Promise.all([
      sbSelect('legal_apa_status',             'select=signed,signed_date,notes&order=updated_at.desc&limit=1'),
      sbSelect('axel_brothers_pathway',  'select=status,next_milestone,next_milestone_at&order=updated_at.desc&limit=1'),
      sbSelect('legal_axel_brothers_status',   'select=winding_up_type,creditor_status_confirmed,ben_personal_exposure,ip_consulted&order=last_reviewed_at.desc&limit=1'),
      sbSelect('legal_guy_sharron_pathway',    'select=current_stage,audience_threshold_met,audience_threshold_target&order=updated_at.desc&limit=1'),
      sbSelect('legal_debt_line_consultation', 'select=consultation_booked,consultation_date,pre_rebrand_status,follow_up_required&order=created_at.desc&limit=1'),
    ]).then(([apa, axelPath, axelStat, guy, debtLine]) => ({
      apa_signed: apa?.[0]?.signed ?? null,
      debt_line_booked: debtLine?.[0]?.consultation_booked ?? null,
      debt_line_pre_rebrand: debtLine?.[0]?.pre_rebrand_status ?? null,
      axel_brothers: axelPath?.[0]?.status ?? null,
      axel_winding_up_type: axelStat?.[0]?.winding_up_type ?? null,
      axel_creditor_confirmed: axelStat?.[0]?.creditor_status_confirmed ?? null,
      guy_sharron: guy?.[0]?.current_stage ?? null,
    })),
    sbSelect('bank_accounts', 'select=name,balance,updated_at').then(r => r ?? null),
    sbSelect('bills', `due_date=gte.${today()}&due_date=lte.${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}&select=name,amount,due_date`).then(r => r ?? null),
    (async () => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ROTHERHAM.lat}&longitude=${ROTHERHAM.lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon&forecast_days=1`);
        const j = await r.json();
        const c = j.current || {};
        return {
          now_temp: c.temperature_2m ?? null,
          high: j.daily?.temperature_2m_max?.[0] ?? null,
          low: j.daily?.temperature_2m_min?.[0] ?? null,
          rain: j.daily?.precipitation_probability_max?.[0] ?? null,
        };
      } catch { return null; }
    })(),
    // ── Outreach replies — unresponded interested/questions from check-outreach-replies.js
    sbSelect('psnm_outreach_replies',
      `received_at=gte.${new Date(Date.now()-48*3600000).toISOString()}&classification=in.(interested,questions)&ben_responded=eq.false&do_not_contact=eq.false&select=id,from_email,subject,classification,next_action,outreach_id&order=received_at.desc`
    ).then(r => r ?? []),
    // Workshop / hands-on tasks (top 5 open across build + consulting projects)
    sbSelect('rbtr_tasks', `status=eq.open&project=in.(RBTR-Build,Eternal-Kustoms,PSNM,Coffee-Brothers)&order=priority.asc,due_date.asc&limit=5&select=description,priority,due_date,project`).then(r => r ?? null),
    // Customer touchpoints: unresponded outreach replies + pending enquiries
    Promise.all([
      sbSelect('psnm_outreach_replies', 'ben_responded=eq.false&classification=in.(interested,questions)&select=company,classification,last_message&order=received_at.desc&limit=5').then(r => r ?? null).catch(() => null),
      sbSelect('psnm_enquiries', `status=in.(pending_approval,awaiting_response)&created_at=gte.${new Date(Date.now()-86400000).toISOString()}&select=company,pallets,status&limit=5`).then(r => r ?? null),
    ]).then(([replies, pending]) => ({ replies_needing_response: replies, enquiries_pending: pending, total: (replies?.length ?? 0) + (pending?.length ?? 0) })),
    // RBTR build progress — top 3 open tasks
    sbSelect('rbtr_tasks', 'project=in.(RBTR,RBTR-Build)&status=eq.open&order=priority.asc&limit=3&select=description,priority,due_date').then(r => r ?? null),
    // Sarah / family tasks due in 3 days
    sbSelect('rbtr_tasks', `project=in.(AirBnB-CriticalPath,Family,AirBnB-Sarah)&status=eq.open&due_date=lte.${new Date(Date.now()+3*86400000).toISOString().slice(0,10)}&order=due_date.asc,priority.asc&limit=5&select=description,priority,due_date,project`).then(r => r ?? null),
    // AirBnB tasks due in 7 days
    sbSelect('rbtr_tasks', `project=in.(AirBnB-CriticalPath,AirBnB-Sarah,AirBnB)&status=eq.open&due_date=lte.${new Date(Date.now()+7*86400000).toISOString().slice(0,10)}&order=due_date.asc,priority.asc&limit=5&select=description,priority,due_date`).then(r => r ?? null),
    // Tasks completed yesterday
    sbSelect('rbtr_tasks', `status=eq.complete&completed_at=gte.${yesterday()}T00:00:00&completed_at=lte.${yesterday()}T23:59:59&order=priority.asc&limit=5&select=description,priority,project`).then(r => r ?? null),
    // Deal flow — active deals across consulting + sales projects
    sbSelect('rbtr_tasks', "project=in.(Coffee-Brothers,T6.1-Sale,Eternal-Kustoms,Nate-Swap)&status=eq.open&priority=lte.2&order=priority.asc,due_date.asc&limit=5&select=description,priority,project,due_date").then(r => r ?? null),
    // Content due in next 24h
    sbSelect('psnm_content_drafts', `status=in.(approved,scheduled)&scheduled_at=gte.${new Date().toISOString()}&scheduled_at=lte.${new Date(Date.now()+86400000).toISOString()}&select=caption,platform,scheduled_at&order=scheduled_at.asc&limit=3`).then(r => r ?? null).catch(() => null),
    // Blocked systems tasks
    sbSelect('rbtr_tasks', 'status=eq.blocked&blocked_reason=not.is.null&order=priority.asc&limit=5&select=description,priority,project,blocked_reason').then(r => r ?? null),
    // Auto-diagnose last run
    sbSelect('rbtr_auto_diagnosis_log', 'order=created_at.desc&limit=1').then(r => r?.[0] ?? null),
    // Wellness: yesterday's check-in + Garmin data (if synced) + bloods reminder
    (async () => {
      try {
        const yest = yesterday();
        const [daily, lastBloods] = await Promise.all([
          sbSelect('rbtr_wellness_daily', `date=eq.${yest}&limit=1`),
          sbSelect('rbtr_wellness_bloods', 'order=date.desc&limit=1'),
        ]);
        const d = daily?.[0] ?? null;
        const lastPanel = lastBloods?.[0] ?? null;
        const daysSincePanel = lastPanel?.date ? daysSince(lastPanel.date) : null;
        return {
          sleep_hours:    d?.sleep_hours ?? null,
          sleep_score:    d?.sleep_score ?? null,
          hrv:            d?.hrv ?? null,
          resting_hr:     d?.resting_hr ?? null,
          recovery_score: d?.recovery_score ?? null,
          garmin_synced:  !!(d?.sleep_score || d?.hrv),
          training_done:  d?.training_done ?? null,
          training_type:  d?.training_type ?? null,
          last_bloods_date: lastPanel?.date ?? null,
          days_since_bloods: daysSincePanel,
          bloods_overdue: daysSincePanel !== null && daysSincePanel > 180,
        };
      } catch { return null; }
    })(),
    // Extended mindset from yesterday's evening reflection
    sbSelect('evening_reflections', `reflection_date=eq.${yesterday()}&select=mood_score,one_line,one_line_reflection,tomorrow_priority,raw_thoughts,what_hit_me`).then(r => r?.[0] ?? null),
    // Today's plan — tasks due today ordered by priority
    sbSelect('rbtr_tasks', `due_date=eq.${today_iso}&status=in.(open,in_progress)&order=priority.asc&limit=5&select=description,priority,project`).then(r => r ?? []),
    // Week goals — try rbtr_week_goals first (may not exist yet), fallback to P1-P2 tasks due by Friday
    (async () => {
      const weekIso = getWeekIso();
      const goals = await sbSelect('rbtr_week_goals', `week_iso=eq.${weekIso}&order=status.asc&limit=3&select=goal,target_outcome,status,progress_pct`).catch(() => null);
      if (Array.isArray(goals) && goals.length > 0) return { source: 'week_goals_table', items: goals };
      const endOfWeek = getEndOfWeek();
      const fallback = await sbSelect('rbtr_tasks', `due_date=lte.${endOfWeek}&status=in.(open,in_progress)&priority=lte.2&order=priority.asc&limit=3&select=description,priority,project,due_date`).catch(() => null);
      return { source: 'tasks_fallback', items: fallback ?? [] };
    })(),
    // Yesterday's daily log events (table may not exist yet — graceful null)
    sbSelect('rbtr_daily_log', `log_date=eq.${yesterday()}&order=created_at.asc`).catch(() => null),
  ]);

  return {
    date: today(),
    day_name: new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
    date_spoken: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    days_to_departure: daysUntil(DEPARTURE_DATE),
    days_to_photoshoot: daysUntil(PHOTOSHOOT_DATE),
    built_dad_day: builtDad,
    yesterday_wins: yWins,
    yesterday_mood: yRefl?.mood_score ?? null,
    yesterday_reflection: yRefl?.one_line ?? yRefl?.one_line_reflection ?? null,
    yesterday_priority_set: yRefl?.tomorrow_priority ?? null,
    open_goals_today: openGoals.map(g => g.title),
    mood_log_gap_days: moodGap,
    psnm_pallets_current: psnmPallets,
    psnm_pallets_to_breakeven: psnmPallets != null ? PSNM_BREAKEVEN_PALLETS - psnmPallets : null,
    psnm_warm_leads_due_today: psnmWarmLeads?.due_today ?? null,
    psnm_hot_leads: psnmWarmLeads?.hot_leads ?? null,
    psnm_hot_lead_count: psnmWarmLeads?.hot_count ?? null,
    psnm_new_enquiries_24h: psnmNewEnq,
    psnm_urgent_enquiries: psnmUrgent,
    psnm_overdue_followups: psnmOverdue,
    psnm_outreach_batch_today: psnmOutreach,
    sponsor_hot_signals: sponsorHot,
    sponsor_replies_pending: sponsorReplies,
    sponsor_touches_queued_today: sponsorQueued,
    sponsor_approach_due_this_week: sponsorWeek,
    build_sections_in_progress: buildInProg,
    build_section_starting_this_week: buildWkStart,
    build_photos_not_uploaded: buildPhotosGap,
    audience_total: audience.total,
    audience_24h_growth: audience.growth_24h,
    resurrection_day_number: resurrection?.day_number ?? null,
    resurrection_tasks_today: resurrectionTasks,
    nate_checkin_due: nateDue,
    apa_signed: legal.apa_signed,
    debt_line_consultation_booked: legal.debt_line_booked,
    axel_brothers_status: legal.axel_brothers,
    guy_sharron_stage: legal.guy_sharron,
    cash_position: cash,
    bills_due_this_week: billsWk,
    weather_today: weather,
    outreach_replies_unresponded: Array.isArray(outreachReplies) ? outreachReplies : [],
    wellness: garminSleep,
    workshop_tasks: workshopTasks,
    customer_touchpoints: customerTouchpoints,
    rbtr_build_tasks: rbtrBuildTasks,
    sarah_family_tasks: sarahFamilyTasks,
    airbnb_tasks: airbnbTasks,
    tasks_completed_yesterday: taskCompletedYesterday,
    deal_flow: dealFlow,
    content_due_24h: contentDue,
    blocked_systems_tasks: blockedSystems,
    last_diagnosis: lastDiagnosis && lastDiagnosis.created_at &&
      (Date.now() - new Date(lastDiagnosis.created_at).getTime()) < 18 * 3600000
      ? lastDiagnosis : null,
    mindset_yesterday: mindsetYesterday,
    todays_plan: Array.isArray(todaysPlan) ? todaysPlan : [],
    week_goals: weekGoals,
    yesterday_daily_log: Array.isArray(yesterdayDailyLog) ? yesterdayDailyLog : [],
  };
}

// ── Appendix C — brief script prompt (v3 spec) ──────────────────────────────
function composePrompt(data, clientExtras) {
  // Client may add calendar events + house_jobs_remaining that only live browser-side
  const merged = { ...data, ...(clientExtras || {}) };

  return `You are generating the morning voice brief for Ben Greenwood. This brief will be SPOKEN aloud via ElevenLabs TTS and delivered as a WhatsApp voice note (or Telegram, or SMS+link) at 06:00 Europe/London. Ben will listen while making coffee.

TARGET LENGTH: 300–450 words (2:00–3:00 spoken at natural pace).

DATA PROVIDED

You will receive a JSON object \`data\` containing all relevant figures. The keys are documented in /api/briefing-data. Key fields:

- data.date (YYYY-MM-DD), data.weekday, data.days_to_departure, data.built_dad_day, data.weather
- data.overnight: { wins, flags, reflection_from_last_night, priority_set_yesterday, priority_completed }
- data.tasks_completed_yesterday: array of { description, priority, project } — tasks marked complete yesterday. PRIMARY source for "yesterday's wins" narrative.
- data.yesterday_daily_log: array of { event_type, description, related_project } — manually logged events (deploys, decisions, milestones, cash). Supplement to tasks_completed_yesterday. May be empty.
- data.todays_plan: array of { description, priority, project } — tasks due today, ordered by priority. Use to frame what's happening today.
- data.week_goals: { source: 'week_goals_table'|'tasks_fallback', items: array } — if source=week_goals_table, items are { goal, target_outcome, status, progress_pct }; if source=tasks_fallback, items are { description, priority, project, due_date }. Use to frame the week context.
- data.psnm: { pallets_current, pallets_to_breakeven, warm_leads_due_today, hot_leads, hot_lead_count, new_enquiries_24h, urgent_enquiries, overdue_followups, outreach_batch_today }
- data.outreach_replies_unresponded: array of { from_email, classification, next_action, outreach_id } — cold outreach replies needing Ben's attention (classification=interested or questions, not yet responded to)
- data.sponsors: { hot_signals (array), replies_pending, touches_queued_today, approach_due_this_week }
- data.build: { sections_in_progress (array), section_starting_this_week, photos_gap_days }
- data.audience: { total, growth_24h, resurrection_day_number, resurrection_tasks_today }
- data.personal: { mood_log_gap_days, nate_checkin_due, house_jobs_remaining }
- data.legal: { apa_signed, debt_line_booked, axel_brothers_status, guy_sharron_stage, audience_to_threshold }
- data.finance: { cash_position, bills_due_this_week }
- data.wellness: { sleep_hours, sleep_score, hrv, resting_hr, recovery_score, garmin_synced, training_done, training_type, last_bloods_date, days_since_bloods, bloods_overdue } — Ben's wellness data from yesterday. If garmin_synced is false, only show manually-logged fields (sleep_hours, training_done). If no data at all, skip section entirely.
- data.workshop_tasks: array of { description, priority, due_date, project } — physical hands-on tasks across build + consulting
- data.customer_touchpoints: { replies_needing_response, enquiries_pending, total } — customer actions requiring Ben's response today
- data.rbtr_build_tasks: array of { description, priority, due_date } — RBTR truck build open tasks (top 3)
- data.sarah_family_tasks: array of { description, priority, due_date, project } — tasks Sarah/family need to act on in next 3 days
- data.airbnb_tasks: array of { description, priority, due_date } — AirBnB critical path tasks due in 7 days
- data.deal_flow: array of { description, priority, project, due_date } — active deals across Coffee Brothers, T6.1 sale, EK, Nate swap
- data.content_due_24h: array of { caption, platform, scheduled_at } — social content due to post in next 24h
- data.blocked_systems_tasks: array of { description, priority, project, blocked_reason } — tasks stuck waiting on something
- data.last_diagnosis: last auto-diagnosis run result (null if >18h old or none) — if present, surface key finding only
- data.mindset_yesterday: { mood_score, raw_thoughts, what_hit_me } — extended evening reflection from yesterday

STRUCTURE (LOOSE, NOT RIGID)

Write as one continuous spoken brief. No headings, no bullets, no numbered lists. Flow like a trusted assistant briefing Ben in person.

Order of content (adapt naturally):

1. Open. "Morning Ben. [Weekday] [date]. [N] days to departure."

2. Yesterday's wins — LEAD with this, it's the daily continuity frame.
   Source: data.tasks_completed_yesterday PLUS data.yesterday_daily_log (if entries exist).
   Format: "Yesterday you [specific win], [specific win], and [specific win]." Name 2-3 real things — use actual task descriptions, shorten for speech. If daily log has deploy/cash/milestone events, weave those in too. If data.mindset_yesterday has raw_thoughts or what_hit_me, close with one honest line. If no data at all, skip.

3. Today's plan — the narrative bridge from yesterday to today.
   Source: data.todays_plan (tasks due today, priority order).
   Format: "Today — [P1 item] on [project], then [P2 item]." Keep to 1 sentence. If empty, skip.

4. Week goals — the bigger frame.
   Source: data.week_goals. If source=week_goals_table: name up to 3 goals with progress % if nonzero. If source=tasks_fallback: name top 1-2 high-priority items due this week. Format: "By Friday: [goal 1], [goal 2]." If items empty, skip.

5. Warehouse. Pallets current vs break-even. Warm leads due for follow-up today (data.psnm_warm_leads_due_today) — name each company and their temperature. Hot leads (data.psnm_hot_leads) — name them. Today's inbound enquiries, flag urgent ones by company. Outreach batch status. Overdue follow-ups — name them specifically.

5b. Outreach replies. If data.outreach_replies_unresponded or data.customer_touchpoints.replies_needing_response has entries, name each company and their classification ("interested" or "has questions"). These are replies to cold outreach — they need a response. A suggested draft is waiting in Supabase. Say: "[Company] replied — [classification]. Draft's ready, needs your go-ahead." If none, skip this section entirely.

6. Truck. Sponsor hot signals — NAME the sponsors ("Michelin opened your T1 four times yesterday afternoon"). Build work calling for attention this week (data.rbtr_build_tasks — name the top task). Resurrection day number and what to post today. Audience movement in absolute numbers.

7. Workshop plan. If data.workshop_tasks has entries, name the top 1-2 physical tasks for today and which project they belong to. "In the workshop today: [task] on [project]." Skip if empty.

8. Deal flow. If data.deal_flow has entries, name active deals briefly. "Coffee Brothers quote still open. T6.1 sale — [next step]." Skip if empty.

9. AirBnB + Sarah. If data.airbnb_tasks or data.sarah_family_tasks has anything due this week, surface the most time-critical item. "Sarah needs to [action] by [date] for the AirBnB launch." One sentence max. Skip if nothing due.

10. Content + blocked. If data.content_due_24h has entries, name the platform and timing ("Instagram post goes out at 2pm — check it's approved"). If data.blocked_systems_tasks has entries, name the top blocker ("Vercel billing still blocking — unblocks deploy"). Skip each if empty.

11. Personal. Built Dad day number. Mood log gaps. Nate check-in if due. House jobs if a threshold has been crossed.

11b. Wellness. ONLY include this section if data.wellness has any values. Keep to one sentence max. If Garmin is synced: "Last night — [X]h sleep, HRV [Y], recovery [Z]." If training was logged yesterday: "Trained [type] yesterday." If bloods are overdue (days_since_bloods > 180): "Bloods are overdue — book Medichecks today." Skip entire section if data.wellness is null or all fields are null.

12. Structural dependencies. APA signing, Debt Line consultation, Axel Brothers status, Guy & Sharron audience threshold — surface ONLY if action is due or a gate is approaching. If data.last_diagnosis is non-null, surface its single key finding in one sentence. Silent otherwise.

13. One last thing. Close with the single most important action today. "One last thing — call Michelin before 3pm. That's the move today."

14. Sign off. "That's your day."

TONE RULES — STRICT

- Natural spoken British English. Read it aloud in your head as you write.
- No "firstly, secondly, thirdly" — flowing sentences.
- No bullet points or numbered lists in output.
- Specific numbers beat vague descriptions. "183 pallets" not "a few hundred pallets".
- Name specific sponsors, specific companies, specific tasks.
- Skip any category entirely if there is nothing material to say. Don't pad.
- Acknowledge wins where they happened. Don't perform.
- No urgency unless genuinely urgent.
- No motivational filler. No "let's make it a great one".

BANNED WORDS (regenerate if any appear):
leverage, synergy, passionate, ecosystem, robust, unlock, value-add, circle back, bandwidth, holistic, empower, reach out, cutting-edge, streamline, actionable insights

NARRATIVE DISCIPLINE (regenerate if any appear):
Jo Riley, Simon Aylett, JMW, JMW Solicitors, Golf build, the Golf

OUTPUT FORMAT

Return ONLY the brief script text. No preamble, no markdown, no explanatory notes. Start with "Morning Ben." and end with "That's your day." or similar short sign-off.

The text you output will be passed directly to ElevenLabs TTS. Any stray formatting (asterisks, hashes, brackets) will be read aloud by the voice.

DATA:
${JSON.stringify(merged, null, 2)}`;
}

// ── WS-D.2 · Resolve voice_id → human-readable name via ElevenLabs /v1/voices/:id ─
const VOICE_NAME_CACHE = new Map();
async function resolveVoiceName(voiceId) {
  if (!voiceId || !ELEVENLABS_API_KEY) return null;
  if (VOICE_NAME_CACHE.has(voiceId)) return VOICE_NAME_CACHE.get(voiceId);
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/voices/' + voiceId, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const name = j.name || null;
    VOICE_NAME_CACHE.set(voiceId, name);
    return name;
  } catch { return null; }
}

// ── ElevenLabs TTS render ───────────────────────────────────────────────────
async function renderAudio(text) {
  if (!ELEVENLABS_API_KEY) return { ok: false, reason: 'no_api_key' };

  async function tryVoice(voiceId) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL_ID,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });
    if (!r.ok) {
      const errTxt = await r.text();
      return { ok: false, status: r.status, error: errTxt.slice(0, 300) };
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return { ok: true, voice_used: voiceId, audio: buf };
  }

  // WS-D.1 · log voice resolution context on every render attempt
  console.log('[morning-brief.voice]', {
    env_voice_id: process.env.ELEVENLABS_VOICE_ID || null,
    env_key_len: ELEVENLABS_API_KEY ? ELEVENLABS_API_KEY.length : 0,
    preferred_voice: PREFERRED_VOICE_ID,
    fallback_voice: FALLBACK_VOICE_ID,
  });

  let result = await tryVoice(PREFERRED_VOICE_ID);
  if (!result.ok && result.status === 402 && PREFERRED_VOICE_ID !== FALLBACK_VOICE_ID) {
    console.warn('[morning-brief] preferred voice paid-only, falling back to Daniel');
    result = await tryVoice(FALLBACK_VOICE_ID);
  }
  // WS-D.2 · resolve the actual voice_id to a human-readable name
  if (result.ok && result.voice_used) {
    result.voice_name = await resolveVoiceName(result.voice_used);
  }
  return result;
}

// ── Supabase Storage upload ─────────────────────────────────────────────────
async function uploadToStorage(filename, audioBuffer) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false, reason: 'no_supabase' };
  try {
    const headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
    };
    if (SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const url = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filename}`;
    const r = await fetch(url, { method: 'POST', headers, body: audioBuffer });
    if (!r.ok) {
      // 409 means already exists; try update
      if (r.status === 409) {
        const r2 = await fetch(url, { method: 'PUT', headers, body: audioBuffer });
        if (!r2.ok) return { ok: false, status: r2.status, error: (await r2.text()).slice(0, 300) };
      } else {
        return { ok: false, status: r.status, error: (await r.text()).slice(0, 300) };
      }
    }
    // Public URL pattern (bucket is public)
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
    return { ok: true, public_url: publicUrl, bytes: audioBuffer.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Estimate audio duration from word count (155 wpm British natural)
function estimateDurationSecs(wordCount) {
  return Math.round((wordCount / 155) * 60);
}

async function callClaude(prompt) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Claude ${r.status}: ${txt.slice(0, 300)}`);
  }
  const j = await r.json();
  return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

const BANNED_WORDS = [
  'leverage','synergy','passionate about','ecosystem','robust','unlock',
  'Jo Riley','Simon Aylett','JMW Solicitors',
];
function validateScript(s) {
  const wordCount = s.split(/\s+/).filter(Boolean).length;
  const bannedHit = BANNED_WORDS.filter(w => new RegExp('\\b' + w + '\\b', 'i').test(s));
  const hasMarkdown = /\*\*|#{1,6}\s|```|^- /m.test(s);
  const opensWell = /^morning\s+ben/i.test(s.trim());
  return {
    word_count: wordCount,
    banned_words_used: bannedHit,
    has_markdown: hasMarkdown,
    opens_with_morning_ben: opensWell,
    passes: bannedHit.length === 0 && !hasMarkdown && opensWell && wordCount >= 250 && wordCount <= 550,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────
// ── Evening debrief handler (merged from evening-debrief.js) ────────────────
async function handleEveningDebrief(req, res) {
  if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' }); return; }
  const todayStr = new Date().toISOString().slice(0, 10);
  const [mood, tasks, calls, goals] = await Promise.all([
    sbSelect('ben_mood_log', `date=eq.${todayStr}&select=mood,energy,sleep_hours,notes&limit=1`).then(r => r?.[0] || null),
    sbSelect('ben_tasks', `due_date=eq.${todayStr}&select=title,status`).then(r => r || []),
    sbSelect('psnm_outreach_touches', `created_at=gte.${todayStr}T00:00:00&select=company,outcome`).then(r => r || []),
    sbSelect('ben_goals', `tier=eq.today&status=eq.open&select=title&order=priority.asc&limit=3`).then(r => r || []),
  ]);
  const data = {
    date: todayStr,
    weekday: new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
    mood_score: mood?.mood ?? null,
    energy_score: mood?.energy ?? null,
    tasks_completed: tasks.filter(t => t.status === 'done' || t.status === 'complete').length,
    tasks_total: tasks.length,
    calls_logged: calls.length,
    calls_won: calls.filter(c => c.outcome === 'won' || c.outcome === 'booked').length,
    top3_tomorrow: goals.map(g => g.title),
  };
  const prompt = `You are generating Ben Greenwood's 9pm evening debrief. Spoken via ElevenLabs TTS.
TARGET: 100–150 words (45–60 seconds).
DATA: ${JSON.stringify(data)}
PATTERN: "Ben. Evening. Today you [factual summary]. [One win if genuine.] [One honest note on what was hard, if material.] Tomorrow's Top 3 start with [first from top3_tomorrow or 'nothing set yet']. Sleep well."
TONE: Direct. No filler. No "great job". Acknowledge real data.
BANNED: leverage, synergy, passionate, ecosystem, robust, unlock, value-add, circle back, bandwidth, holistic, empower, reach out
OUTPUT: Script text only. Start "Ben. Evening." End "Sleep well."`;
  const script = await callClaude(prompt);
  let audioUrl = null;
  if (ELEVENLABS_API_KEY) {
    const tts = await renderAudio(script);
    if (tts.ok) {
      const upload = await uploadToStorage(`debrief-${todayStr}.mp3`, tts.audio);
      if (upload.ok) audioUrl = upload.public_url;
    }
  }
  res.status(200).json({ ok: true, script, audio_url: audioUrl, data, generated_at: new Date().toISOString() });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // ?mode=evening → evening debrief
  const url = new URL(req.url, `https://${req.headers?.host || 'x'}`);
  if (url.searchParams.get('mode') === 'evening') {
    return handleEveningDebrief(req, res);
  }

  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });
    return;
  }

  // Accept client-side extras in POST body
  let clientExtras = {};
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      clientExtras = body.extras || {};
    } catch {}
  }

  // Phase 1 (v3.0): ?force=1 bypasses any same-day cache and regenerates.
  // Manual-trigger semantics: if a brief already exists for today AND force is
  // not set, return the cached row instead of burning Anthropic + ElevenLabs credits.
  const forceRegen = (req.url || '').includes('force=1') || clientExtras.force === true;
  if (!forceRegen && req.method === 'GET') {
    const existing = await sbSelect('daily_briefs', `brief_date=eq.${today()}&select=*`);
    if (Array.isArray(existing) && existing[0] && existing[0].script_text && existing[0].script_text !== '(generating)' && existing[0].script_text !== '(failed)') {
      res.status(200).json({
        cached: true,
        script: existing[0].script_text,
        audio_url: existing[0].audio_url,
        audio_duration_secs: existing[0].audio_duration_secs,
        generated_at: existing[0].generated_at,
      });
      return;
    }
  }

  try {
    // 1. Gather data
    const data = await gatherAllData();

    // 2. Compose prompt
    const prompt = composePrompt(data, clientExtras);

    // 3. Mark a generating row in daily_briefs
    const briefDate = data.date;
    const sourcesUsed = {
      populated: Object.entries({ ...data, ...clientExtras }).filter(([, v]) => v != null && !(Array.isArray(v) && v.length === 0)).map(([k]) => k),
    };
    await sbUpsertDailyBrief({
      brief_date: briefDate,
      script_text: '(generating)',
      delivery_status: 'generating',
      data_sources_used: sourcesUsed,
    });

    // 4. Call Claude
    const script = await callClaude(prompt);

    // 5. Validate
    const validation = validateScript(script);

    // 6. Render audio (server-side ElevenLabs)
    let audioMeta = { ok: false };
    let audioUrl = null;
    let audioDurationSecs = null;
    if (validation.passes || true) {  // render even if soft-fail; Ben can review
      const tts = await renderAudio(script);
      if (tts.ok) {
        // Upload mp3 to Supabase Storage
        const filename = `brief-${briefDate}.mp3`;
        const upload = await uploadToStorage(filename, tts.audio);
        if (upload.ok) {
          audioUrl = upload.public_url;
          audioDurationSecs = estimateDurationSecs(validation.word_count);
          audioMeta = {
            ok: true,
            voice_used: tts.voice_used,
            voice_name: tts.voice_name || null,
            bytes: upload.bytes,
            estimated_seconds: audioDurationSecs,
          };
        } else {
          audioMeta = { ok: false, stage: 'upload', ...upload };
        }
      } else {
        audioMeta = { ok: false, stage: 'tts', ...tts };
      }
    }

    // 7. Update row with final script + audio info (WS-D.1/D.2 voice tracking)
    await sbUpsertDailyBrief({
      brief_date: briefDate,
      script_text: script,
      script_word_count: validation.word_count,
      audio_url: audioUrl,
      audio_duration_secs: audioDurationSecs,
      voice_id_used: audioMeta.voice_used || null,
      voice_name_resolved: audioMeta.voice_name || null,
      delivery_status: audioUrl ? 'rendered' : 'delivered',
      delivered_at: new Date().toISOString(),
      data_sources_used: sourcesUsed,
    });

    res.status(200).json({
      script,
      validation,
      audio_url: audioUrl,
      audio_duration_secs: audioDurationSecs,
      audio_meta: audioMeta,
      data_sources_used: sourcesUsed,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[morning-brief] error', err);
    await sbUpsertDailyBrief({
      brief_date: today(),
      script_text: '(failed)',
      delivery_status: 'failed',
      error_message: err.message.slice(0, 500),
    });
    res.status(500).json({ error: err.message });
  }
};
