// ═══════════════════════════════════════════════════════════════════════════
// RBTR · Morning briefing data gatherer
//
// Returns the full data contract Rocko uses to compose the morning briefing.
// Pulls from Supabase + Open-Meteo. Each field is independently fault-tolerant:
// if a source isn't ready yet (table doesn't exist, no data, transient error)
// it returns `null` rather than throwing. Rocko's prompt knows how to handle
// nulls ("you don't yet track X — ask Ben if he wants to start").
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

const PSNM_BREAKEVEN_PALLETS = 827;
const DEPARTURE_DATE = '2027-07-01';
const PHOTOSHOOT_DATE = '2026-06-10';
const ROTHERHAM = { lat: 53.4302, lon: -1.3568 };

// ── Supabase helper ──────────────────────────────────────────────────────────
async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const headers = { apikey: SUPABASE_KEY };
    if (SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
    const r = await fetch(url, { headers });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const daysUntil = (iso) => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 86400000));
const daysSince = (iso) => iso ? Math.floor((Date.now() - new Date(iso)) / 86400000) : null;

// ── Data getters (each returns null on miss) ─────────────────────────────────

async function getBuiltDadDay() {
  const rows = await sbSelect('jarvis_builtdad', 'id=eq.1&select=day_number');
  return rows?.[0]?.day_number ?? null;
}

async function getYesterdayWins() {
  const rows = await sbSelect('jarvis_accomplishments',
    `achieved_at=gte.${yesterday()}T00:00:00&achieved_at=lt.${today()}T00:00:00&select=title,category`);
  return rows ?? [];
}

async function getYesterdayMoodAndReflection() {
  const rows = await sbSelect('evening_reflections',
    `reflection_date=eq.${yesterday()}&select=mood_score,one_line,one_line_reflection,tomorrow_priority`);
  const r = rows?.[0];
  return {
    mood: r?.mood_score ?? null,
    reflection: r?.one_line ?? r?.one_line_reflection ?? null,
    priority_set: r?.tomorrow_priority ?? null,
  };
}

async function getMoodLogGap() {
  const rows = await sbSelect('evening_reflections',
    'select=reflection_date&order=reflection_date.desc&limit=1');
  return rows?.[0] ? daysSince(rows[0].reflection_date) : null;
}

async function getOpenGoalsToday() {
  const rows = await sbSelect('jarvis_goals',
    'scope=eq.day&status=eq.open&select=title,priority&order=priority.asc&limit=10');
  return rows ?? [];
}

async function getHouseJobsRemaining() {
  // WS-C.6 · query Supabase first, fall back to null if table has no rows
  // (browser may still be source-of-truth via localStorage until a sync job is wired).
  const rows = await sbSelect('house_jobs', "status=neq.done&select=id");
  if (Array.isArray(rows) && rows.length >= 0) return rows.length;
  return null;
}

// PSNM — live from migration 15 tables.
async function getLatestPsnmOccupancy() {
  const rows = await sbSelect('psnm_occupancy_snapshots', 'select=pallets,date&order=date.desc&limit=1');
  return rows?.[0]?.pallets ?? null;
}
async function getNewPsnmEnquiries24h() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const rows = await sbSelect('psnm_enquiries', `created_at=gte.${since}&select=id,company,pallets,status,source`);
  return rows ?? null;
}
async function getUrgentPsnmEnquiries() {
  const rows = await sbSelect('psnm_enquiries', "status=eq.urgent&select=id,company,pallets,start_date,contact_name");
  return rows ?? null;
}
async function getOverduePsnmFollowups() {
  const today_iso = today();
  const rows = await sbSelect('psnm_enquiries',
    `followup_date=lt.${today_iso}&status=not.in.(won,lost,complete)&select=id,company,followup_date,pallets`);
  return rows ?? null;
}
async function getTodaysOutreachBatch() {
  // "Today's outreach batch" = targets with next_touch_at scheduled for today
  const rows = await sbSelect('psnm_outreach_targets',
    `next_touch_at=gte.${today()}T00:00:00&next_touch_at=lt.${today()}T23:59:59&status=neq.do_not_contact&select=company,industry,email,next_touch_at`);
  return rows ?? null;
}

// Sponsor pipeline — also future tables
async function getSponsorHotSignals24h() {
  const since = new Date(Date.now() - 86400000).toISOString();
  const rows = await sbSelect('sponsor_signals', `seen_at=gte.${since}&heat=eq.hot&select=sponsor,signal,heat`);
  return rows ?? null;
}
async function getSponsorRepliesPending() {
  // Replies pending = sponsor_targets with status='awaiting_reply'
  const rows = await sbSelect('sponsor_targets', 'status=eq.awaiting_reply&select=brand_name,last_contact_at,tier');
  return rows ?? null;
}
async function getSponsorTouchesQueuedToday() {
  const rows = await sbSelect('sponsor_targets',
    `next_action_at=gte.${today()}T00:00:00&next_action_at=lt.${today()}T23:59:59&select=brand_name,next_action,tier`);
  return rows ?? null;
}
async function getSponsorsApproachDueThisWeek() {
  const wkAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const rows = await sbSelect('sponsor_targets',
    `next_action_at=gte.${today()}&next_action_at=lte.${wkAhead}&select=brand_name,next_action,tier,next_action_at&order=next_action_at.asc`);
  return rows ?? null;
}

// Build / content / audience — WS-C.3 real tables (build_bible_sections)
async function getBuildInProgress() {
  // Appendix A canonical table is build_bible_sections with current_status
  const rows = await sbSelect('build_bible_sections',
    "current_status=eq.in_progress&select=section_title,progress_percent,estimated_complete_date");
  return rows ?? [];
}
async function getBuildStartingThisWeek() {
  const wkAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const rows = await sbSelect('build_bible_sections',
    `current_status=eq.planned&estimated_start_date=gte.${today()}&estimated_start_date=lte.${wkAhead}&select=section_title,estimated_start_date`);
  return rows ?? [];
}
async function getBuildPhotosGap() {
  // Days since latest build_progress_updates row for an in-progress section
  const rows = await sbSelect('build_progress_updates',
    'select=update_date&order=update_date.desc&limit=1');
  if (!Array.isArray(rows) || !rows.length) return null;
  return daysSince(rows[0].update_date);
}
async function getAudienceLatestAndGrowth() {
  // Prefer the helper view (migration 19) — sums across platforms, correct 30d growth
  const viewRows = await sbSelect('audience_latest', 'select=platform,handle,total,daily_growth,growth_30d,engagement_rate');
  if (Array.isArray(viewRows) && viewRows.length > 0) {
    const total = viewRows.reduce((s,r)=>s + (Number(r.total)||0), 0);
    const growth_24h = viewRows.reduce((s,r)=>s + (Number(r.daily_growth)||0), 0);
    const growth_30d = viewRows.reduce((s,r)=>s + (Number(r.growth_30d)||0), 0);
    return { total, growth_24h, growth_30d, by_platform: viewRows };
  }
  // Fallback: legacy schema
  const rows = await sbSelect('audience_snapshots', 'select=total,captured_at&order=captured_at.desc&limit=2');
  if (!rows || rows.length === 0) return { total: null, growth_24h: null, growth_30d: null, by_platform: null };
  const total = rows[0].total;
  const growth = rows.length > 1 ? rows[0].total - rows[1].total : null;
  return { total, growth_24h: growth, growth_30d: null, by_platform: null };
}

async function getContentSummary() {
  const since24 = new Date(Date.now() - 86400000).toISOString();
  const today   = new Date().toISOString().slice(0,10);
  const [published24h, scheduledToday, drafts] = await Promise.all([
    sbSelect('content_pieces', `status=eq.published&published_at=gte.${since24}&select=piece_type,platform,title,sponsor_mentioned,views`),
    sbSelect('content_pieces', `status=eq.scheduled&scheduled_for=gte.${today}T00:00:00&scheduled_for=lt.${today}T23:59:59&select=piece_type,platform,title,scheduled_for`),
    sbSelect('content_pieces', "status=in.(idea,scripted,filmed,edited)&select=piece_type,title,status&order=updated_at.desc&limit=10"),
  ]);
  return {
    published_24h: published24h ?? null,
    scheduled_today: scheduledToday ?? null,
    drafts_in_pipeline: drafts ?? null,
  };
}
async function getResurrection() {
  // WS-C.5 · use Appendix A canonical resurrection_log (day_number, platform, date_actual, tasks)
  const rows = await sbSelect('resurrection_log',
    'select=day_number,platform,date_actual,tasks&order=day_number.desc&limit=1');
  return rows?.[0] ?? null;
}
async function getResurrectionTasksToday() {
  // Today's tasks come from the latest-day row's jsonb tasks array
  const latest = await sbSelect('resurrection_log',
    'select=tasks&order=day_number.desc&limit=1');
  const t = latest?.[0]?.tasks;
  return Array.isArray(t) ? t : [];
}

// Personal · WS-C.6 · Nate checkin interval is Ben-configurable via jarvis_settings
async function getNateCheckinDue() {
  const [rows, settingRows] = await Promise.all([
    sbSelect('nate_checkins', 'select=checkin_at&order=checkin_at.desc&limit=1'),
    sbSelect('jarvis_settings', "setting_key=eq.nate_checkin_interval_days&select=setting_value"),
  ]);
  const intervalDays = Number(settingRows?.[0]?.setting_value) || 7;
  if (!rows || rows.length === 0) return null;
  const days = daysSince(rows[0].checkin_at);
  return { days_since: days, overdue: days >= intervalDays, interval_days: intervalDays };
}

// Legal / structural — reads from pathway tables (mig 16) + richer status tables (mig 18)
async function getLegalStatus() {
  const [apa, axelPath, axelStat, guy, debtLine] = await Promise.all([
    sbSelect('legal_apa_status', 'select=signed,signed_date,file_url,notes,updated_at&order=updated_at.desc&limit=1'),
    sbSelect('axel_brothers_pathway', 'select=status,next_milestone,next_milestone_at,audience_threshold_met&order=updated_at.desc&limit=1'),
    sbSelect('legal_axel_brothers_status',  'select=winding_up_type,creditor_status_confirmed,ben_personal_exposure,ip_consulted,ip_name&order=last_reviewed_at.desc&limit=1'),
    sbSelect('legal_guy_sharron_pathway',   'select=current_stage,audience_threshold_met,audience_threshold_target,letter_sent,response_received&order=updated_at.desc&limit=1'),
    sbSelect('legal_debt_line_consultation','select=consultation_booked,consultation_date,pre_rebrand_status,follow_up_required,follow_up_date&order=created_at.desc&limit=1'),
  ]);
  return {
    apa_signed: apa?.[0]?.signed ?? null,
    apa_signed_date: apa?.[0]?.signed_date ?? null,
    // Debt Line
    debt_line_booked: debtLine?.[0]?.consultation_booked ?? null,
    debt_line_pre_rebrand: debtLine?.[0]?.pre_rebrand_status ?? null,
    debt_line_date: debtLine?.[0]?.consultation_date ?? null,
    debt_line_follow_up_required: debtLine?.[0]?.follow_up_required ?? null,
    // Axel Brothers — combine pathway + winding-up status
    axel_brothers: axelPath?.[0]?.status ?? null,
    axel_brothers_next: axelPath?.[0]?.next_milestone ?? null,
    axel_winding_up_type: axelStat?.[0]?.winding_up_type ?? null,
    axel_creditor_status_confirmed: axelStat?.[0]?.creditor_status_confirmed ?? null,
    axel_ip_consulted: axelStat?.[0]?.ip_consulted ?? null,
    axel_ben_exposure: axelStat?.[0]?.ben_personal_exposure ?? null,
    // Guy Sharron
    guy_sharron: guy?.[0]?.current_stage ?? null,
    guy_sharron_threshold_met: guy?.[0]?.audience_threshold_met ?? null,
    guy_sharron_threshold_target: guy?.[0]?.audience_threshold_target ?? null,
  };
}

// Financial — WS-C.7 · four separate entities, NEVER commingled
async function getFourEntityCash() {
  const [personal, psnm, rbtr, ek] = await Promise.all([
    sbSelect('personal_cash_log', 'select=balance_gbp,logged_at,note&order=logged_at.desc&limit=1'),
    sbSelect('psnm_cash_log',     'select=balance_gbp,logged_at,note&order=logged_at.desc&limit=1'),
    sbSelect('rbtr_fund_log',     'select=balance_gbp,logged_at,note&order=logged_at.desc&limit=1'),
    sbSelect('ek_cash_log',       'select=balance_gbp,logged_at,note&order=logged_at.desc&limit=1'),
  ]);
  return {
    personal: personal?.[0] ?? null,
    psnm:     psnm?.[0] ?? null,
    rbtr:     rbtr?.[0] ?? null,
    ek:       ek?.[0] ?? null,
  };
}
async function getBillsDueThisWeek() {
  const wkAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const rows = await sbSelect('bills',
    `due_date=gte.${today()}&due_date=lte.${wkAhead}&paid=eq.false&select=entity,name,amount_gbp,due_date&order=due_date.asc`);
  return rows ?? [];
}

// Weather (Open-Meteo, no key)
async function getWeather() {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ROTHERHAM.lat}&longitude=${ROTHERHAM.lon}&current=temperature_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon&forecast_days=1`);
    const j = await r.json();
    const c = j.current || {};
    return {
      now_temp: c.temperature_2m ?? null,
      now_wind: c.wind_speed_10m ?? null,
      now_code: c.weather_code ?? null,
      high: j.daily?.temperature_2m_max?.[0] ?? null,
      low: j.daily?.temperature_2m_min?.[0] ?? null,
      rain_probability: j.daily?.precipitation_probability_max?.[0] ?? null,
    };
  } catch (e) { return null; }
}

// ── Handler ──────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // Run all in parallel — each handles its own failures
  const [
    builtDadDay,
    yesterdayWins,
    yesterdayMoodRefl,
    openGoals,
    moodLogGap,
    psnmPallets,
    psnmNewEnq,
    psnmUrgent,
    psnmOverdue,
    psnmOutreach,
    sponsorHot,
    sponsorReplies,
    sponsorQueued,
    sponsorWeek,
    buildInProgress,
    buildStartingWk,
    buildPhotosGap,
    audience,
    content,
    resurrection,
    resurrectionTasks,
    nateDue,
    legal,
    cashFourEntity,
    billsWeek,
    weather,
    houseJobsRemaining,
  ] = await Promise.all([
    getBuiltDadDay(),
    getYesterdayWins(),
    getYesterdayMoodAndReflection(),
    getOpenGoalsToday(),
    getMoodLogGap(),
    getLatestPsnmOccupancy(),
    getNewPsnmEnquiries24h(),
    getUrgentPsnmEnquiries(),
    getOverduePsnmFollowups(),
    getTodaysOutreachBatch(),
    getSponsorHotSignals24h(),
    getSponsorRepliesPending(),
    getSponsorTouchesQueuedToday(),
    getSponsorsApproachDueThisWeek(),
    getBuildInProgress(),
    getBuildStartingThisWeek(),
    getBuildPhotosGap(),
    getAudienceLatestAndGrowth(),
    getContentSummary(),
    getResurrection(),
    getResurrectionTasksToday(),
    getNateCheckinDue(),
    getLegalStatus(),
    getFourEntityCash(),     // WS-C.7 replaces getCashPosition
    getBillsDueThisWeek(),
    getWeather(),
    getHouseJobsRemaining(),
  ]);

  const psnmCurrent = psnmPallets;

  const data = {
    date: today(),
    days_to_departure: daysUntil(DEPARTURE_DATE),
    days_to_photoshoot: daysUntil(PHOTOSHOOT_DATE),
    built_dad_day: builtDadDay,

    // Overnight / yesterday
    yesterday_wins: yesterdayWins,
    yesterday_mood: yesterdayMoodRefl.mood,
    yesterday_reflection: yesterdayMoodRefl.reflection,
    yesterday_priority_set: yesterdayMoodRefl.priority_set,

    // PSNM
    psnm_pallets_current: psnmCurrent,
    psnm_pallets_to_breakeven: psnmCurrent != null ? PSNM_BREAKEVEN_PALLETS - psnmCurrent : null,
    psnm_new_enquiries_24h: psnmNewEnq,
    psnm_urgent_enquiries: psnmUrgent,
    psnm_overdue_followups: psnmOverdue,
    psnm_outreach_batch_today: psnmOutreach,

    // RBTR sponsors
    sponsor_hot_signals: sponsorHot,
    sponsor_replies_pending: sponsorReplies,
    sponsor_touches_queued_today: sponsorQueued,
    sponsor_approach_due_this_week: sponsorWeek,

    // RBTR build
    build_sections_in_progress: buildInProgress,
    build_section_starting_this_week: buildStartingWk,
    build_photos_not_uploaded: buildPhotosGap,

    // RBTR audience + content
    audience_total: audience.total,
    audience_24h_growth: audience.growth_24h,
    audience_30d_growth: audience.growth_30d ?? null,
    audience_by_platform: audience.by_platform ?? null,
    content_published_24h: content?.published_24h ?? null,
    content_scheduled_today: content?.scheduled_today ?? null,
    content_drafts_in_pipeline: content?.drafts_in_pipeline ?? null,
    resurrection_day_number: resurrection?.day_number ?? null,
    resurrection_tasks_today: resurrectionTasks,

    // Personal
    open_goals_today: openGoals,
    mood_log_gap_days: moodLogGap,
    nate_checkin_due: nateDue,
    house_jobs_remaining: houseJobsRemaining,  // WS-C.6 sourced from house_jobs table

    // Legal / structural
    apa_signed: legal.apa_signed,
    debt_line_consultation_booked: legal.debt_line_booked,
    axel_brothers_status: legal.axel_brothers,
    guy_sharron_stage: legal.guy_sharron,

    // Cash — FOUR SEPARATE ENTITIES, never commingled (WS-C.7)
    cash_personal: cashFourEntity.personal,
    cash_psnm:     cashFourEntity.psnm,
    cash_rbtr:     cashFourEntity.rbtr,
    cash_ek:       cashFourEntity.ek,
    bills_due_this_week: billsWeek,

    // Weather (Rotherham)
    weather_today: weather,
  };

  // Lightweight metadata
  const sources = Object.entries(data)
    .filter(([k, v]) => v !== null && !(Array.isArray(v) && v.length === 0))
    .map(([k]) => k);

  res.status(200).json({
    generated_at: new Date().toISOString(),
    populated_fields: sources,
    null_fields: Object.entries(data).filter(([, v]) => v === null).map(([k]) => k),
    data,
  });
};
