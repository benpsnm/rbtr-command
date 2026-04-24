// Supabase proxy — keeps service_role key server-side.
// Phase 1 (v3.0): env var renamed from SUPABASE_SERVICE_ROLE_KEY → SUPABASE_SERVICE_ROLE.
// Back-compat fallback kept so a stale deploy doesn't 500.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Optional header-based auth. If RBTR_AUTH_TOKEN is set in env, every request
// must send x-rbtr-auth matching it. Missing env = no enforcement (dev-safe).
const RBTR_AUTH_TOKEN = process.env.RBTR_AUTH_TOKEN;

const ALLOWED_TABLES = new Set([
  // ── Appendix A target 29 tables ──
  'sponsor_targets','sponsor_contacts','sponsor_intelligence_reports',
  'sponsor_touches','sponsor_touch_templates','sponsor_proposals',
  'build_bible_sections','build_progress_updates',
  'audience_snapshots','platform_baselines','share_tokens',
  'daily_briefs','evening_reflections','resurrection_log',
  'voice_recording_sessions','voice_clones',
  'psnm_enquiries','psnm_customers','psnm_occupancy_snapshots',
  'psnm_quotes','psnm_outreach_targets','psnm_outreach_touches','psnm_content_queue',
  'psnm_invoices',
  'legal_apa_status','legal_axel_brothers_status',
  'legal_debt_line_consultation','legal_guy_sharron_pathway',
  'reconciliation_audit',
  // ── Kept orphans — load-bearing for existing front end + Telegram ──
  'jarvis_goals','jarvis_accomplishments','jarvis_reflections',
  'jarvis_learning_sessions','jarvis_learning_streaks',
  'jarvis_tool_registry','jarvis_signals','jarvis_conversations','jarvis_builtdad',
  'jarvis_sensitive_access_log',
  'build_bible_attachments',
  'content_pieces','audience_latest',
  'axel_brothers_pathway',
  'sponsor_touch_schedule','sponsor_hot_signals','sponsor_touches_due_week',
  // ── ROCKO Max (Phase 2 · workstream B) ──
  'rocko_memories',
  // ── Atlas v2 (migration 27) ──
  'psnm_offer_config','psnm_call_scripts','atlas_daily_actions',
  'psnm_cash_log','personal_cash_log','rbtr_fund_log','personal_priorities',
  // ── CC partial overnight (migration 28) ──
  'house_jobs','nate_checkins','bills','jarvis_settings',
  // ── Phase 2.6 (migrations 29 + 30) ──
  'user_profiles','sarah_goals','sarah_reflections',
  'financial_transactions','bank_connections','house_cash_log',
  // ── Phase 1.6 Workstream A (migration 32) ──
  // Ben portal tables
  'ben_goals','ben_mood_log','ben_notes','ben_nate_conversations',
  'ben_colab_events','ben_dro_status','ben_tasks',
  'family_sons','family_sons_events','family_peanut','family_peanut_events',
  // RBTR tables
  'rbtr_guy_martin_pathway','rbtr_build_log','rbtr_route_phases',
  'rbtr_audience_snapshots','rbtr_account_resurrection',
  // Eternal tables
  'eternal_hours_log','eternal_estimates','eternal_invoices',
  'eternal_builds','eternal_shareholder_payments',
  // House portal tables
  'house_suppliers','house_job_supplier_assignments','house_costs',
  'house_bookings','house_inventory','house_compliance','house_message_templates',
  // Sarah portal tables
  'sarah_today_log','sarah_pilates_progress','sarah_wellness_log','sarah_content_calendar',
  // RBTR portal tables (additional)
  'rbtr_gates','rbtr_predeparture_checklist','rbtr_sponsor_proposals',
  'rbtr_sponsor_intelligence','rbtr_sponsor_touches',
  // Phase 1.6 Workstream B (migration 32_psnm_templates)
  'psnm_warm_leads','psnm_email_templates','psnm_touch_schedule',
  // Phase 1.6 Workstream C+D (migrations 33+34)
  'contacts','contact_interactions','sops','sop_executions',
  // Phase 1.6 Workstream E (migration 35)
  'notifications',
]);

// Classification-aware blocks. AUTH never goes through the browser proxy.
const BLOCKED_TABLES = new Set([
  'rbtr_api_keys',          // AUTH
]);
// LEGAL_SENSITIVE tables: browser reads allowed but logged to sensitive_access_log.
const LEGAL_SENSITIVE = new Set([
  'colab_payments',
  'psnm_invoices',
  'legal_apa_status',
  'axel_brothers_pathway',           // kept orphan, still legal-sensitive
  'legal_axel_brothers_status',
  'legal_debt_line_consultation',
  'legal_guy_sharron_pathway',
  'ek_cash_log',                     // WS-C.7 · Eternal Kustoms Ltd ledger
]);

// WS-C.8 · map every briefing-data field to its source table + query. Returned
// by {action:'briefing_audit'} for debugging when a field unexpectedly goes null.
const BRIEFING_AUDIT_MAP = {
  built_dad_day:              { table: 'jarvis_builtdad',          query: "id=eq.1&select=day_number" },
  yesterday_mood:             { table: 'evening_reflections',      query: "reflection_date=yesterday&select=mood_score" },
  yesterday_reflection:       { table: 'evening_reflections',      query: "reflection_date=yesterday&select=one_line,one_line_reflection" },
  yesterday_priority_set:     { table: 'evening_reflections',      query: "reflection_date=yesterday&select=tomorrow_priority" },
  yesterday_wins:             { table: 'jarvis_accomplishments',   query: "achieved_at between yesterday 00:00 and today 00:00" },
  mood_log_gap_days:          { table: 'evening_reflections',      query: "max(reflection_date)" },
  open_goals_today:           { table: 'jarvis_goals',             query: "scope=day&status=open" },
  psnm_pallets_current:       { table: 'psnm_occupancy_snapshots', query: "order=date.desc limit 1" },
  psnm_new_enquiries_24h:     { table: 'psnm_enquiries',           query: "created_at>=now()-24h" },
  psnm_urgent_enquiries:      { table: 'psnm_enquiries',           query: "status=urgent" },
  psnm_overdue_followups:     { table: 'psnm_enquiries',           query: "followup_date<today AND status NOT IN (won,lost,complete)" },
  psnm_outreach_batch_today:  { table: 'psnm_outreach_targets',    query: "next_touch_at=today AND status!=do_not_contact" },
  sponsor_hot_signals:        { table: 'sponsor_signals',          query: "seen_at>=now()-24h AND heat=hot (table may not exist yet)" },
  sponsor_replies_pending:    { table: 'sponsor_targets',          query: "status=awaiting_reply" },
  sponsor_touches_queued_today: { table: 'sponsor_targets',        query: "next_action_at=today" },
  sponsor_approach_due_this_week: { table: 'sponsor_targets',      query: "next_action_at in next 7 days" },
  build_sections_in_progress: { table: 'build_bible_sections',     query: "current_status=in_progress" },
  build_section_starting_this_week: { table: 'build_bible_sections', query: "current_status=planned AND estimated_start_date in next 7 days" },
  build_photos_not_uploaded:  { table: 'build_progress_updates',   query: "days since latest update_date" },
  audience_total:             { table: 'audience_latest (view) OR audience_snapshots', query: "latest row" },
  audience_24h_growth:        { table: 'audience_latest OR audience_snapshots',        query: "today - yesterday" },
  audience_30d_growth:        { table: 'audience_latest',           query: "sum(growth_30d)" },
  audience_by_platform:       { table: 'audience_latest',           query: "row per platform" },
  resurrection_day_number:    { table: 'resurrection_log',          query: "max(day_number)" },
  resurrection_tasks_today:   { table: 'resurrection_log',          query: "max(day_number)→tasks jsonb" },
  nate_checkin_due:           { table: 'nate_checkins + jarvis_settings', query: "last checkin_at vs interval setting" },
  house_jobs_remaining:       { table: 'house_jobs',                query: "count where status!=done" },
  apa_signed:                 { table: 'legal_apa_status',          query: "latest row" },
  debt_line_consultation_booked: { table: 'legal_debt_line_consultation', query: "latest row" },
  axel_brothers_status:       { table: 'axel_brothers_pathway',     query: "latest updated_at" },
  guy_sharron_stage:          { table: 'legal_guy_sharron_pathway', query: "current_stage latest row" },
  cash_personal:              { table: 'personal_cash_log',         query: "latest row" },
  cash_psnm:                  { table: 'psnm_cash_log',             query: "latest row" },
  cash_rbtr:                  { table: 'rbtr_fund_log',             query: "latest row" },
  cash_ek:                    { table: 'ek_cash_log (LEGAL_SENSITIVE)', query: "latest row" },
  bills_due_this_week:        { table: 'bills',                     query: "due_date in next 7 days AND paid=false" },
  weather_today:              { table: '(external) open-meteo.com', query: "current + daily for Rotherham" },
};

// Service-role headers for direct PostgREST reads/writes.
// Used by auth actions to fetch user_profiles after login.
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'Supabase env vars not set.' }); return; }

  // Phase 1 (v3.0): perimeter guard. Require x-rbtr-auth for cross-origin /
  // non-browser callers. Same-origin browser loads of the Command Centre are
  // exempt — the token can't be safely shipped to the browser, and this
  // deployment is the Command Centre's only browser client.
  if (RBTR_AUTH_TOKEN) {
    const supplied = req.headers?.['x-rbtr-auth'];
    const origin   = req.headers?.origin || '';
    const referer  = req.headers?.referer || '';
    const host     = req.headers?.host || '';
    // Accept the exact production host, any vercel preview URL for this project,
    // and localhost dev. Be strict — substring match on the host.
    const isSameOrigin =
      host && (origin.includes(host) || referer.includes(host)) &&
      (host === 'rbtr-jarvis.vercel.app' ||
       host.endsWith('.vercel.app') ||
       host.startsWith('localhost'));
    if (supplied !== RBTR_AUTH_TOKEN && !isSameOrigin) {
      res.status(401).json({ error: 'x-rbtr-auth header missing or invalid' });
      return;
    }
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Phase 2.6 WS1 · auth actions (login / logout / me)
  // Proxies Supabase GoTrue endpoints with the anon key. Returns session
  // tokens which the client stores and passes back as Authorization header.
  if (body.action === 'auth_login') {
    const ANON = process.env.SUPABASE_ANON_KEY;
    if (!ANON) { res.status(500).json({ error: 'SUPABASE_ANON_KEY not set' }); return; }
    const { email, password } = body;
    if (!email || !password) { res.status(400).json({ error: 'email + password required' }); return; }
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) { res.status(r.status).json({ error: j.error_description || j.msg || 'login failed' }); return; }
      // Fetch user profile for role + portal_access
      const profileR = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${j.user?.id}&select=role,portal_access,display_name,avatar_url`, {
        headers: sbHeaders(),
      });
      const profile = profileR.ok ? (await profileR.json())[0] : null;
      res.status(200).json({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
        expires_at: j.expires_at,
        user: { id: j.user?.id, email: j.user?.email },
        profile,
      });
      return;
    } catch (e) { res.status(500).json({ error: e.message }); return; }
  }
  if (body.action === 'auth_me') {
    const token = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) { res.status(401).json({ error: 'no token' }); return; }
    if (!SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      res.status(500).json({ error: 'Supabase env not configured for auth' });
      return;
    }
    const ANON = process.env.SUPABASE_ANON_KEY;
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: ANON, Authorization: `Bearer ${token}` },
      });
      if (!r.ok) { res.status(r.status).json({ error: 'invalid token' }); return; }
      const user = await r.json();
      const profileR = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}&select=role,portal_access,display_name,avatar_url`, { headers: sbHeaders() });
      const profile = profileR.ok ? (await profileR.json())[0] : null;
      res.status(200).json({ user: { id: user.id, email: user.email }, profile });
      return;
    } catch (e) { res.status(500).json({ error: e.message }); return; }
  }
  if (body.action === 'auth_logout') {
    // Server-side logout just signals the client to drop the token.
    // Supabase token revocation would require the refresh_token; optional.
    res.status(200).json({ ok: true });
    return;
  }

  // WS-C.8 · /api/supabase-proxy {action:'briefing_audit'} — dev-mode introspection
  // of every field in /api/briefing-data, its source table + query. Gated by
  // x-rbtr-auth (not publicly reachable). No table access — pure static map.
  if (body.action === 'briefing_audit') {
    if (!RBTR_AUTH_TOKEN || req.headers?.['x-rbtr-auth'] !== RBTR_AUTH_TOKEN) {
      res.status(401).json({ error: 'briefing_audit requires valid x-rbtr-auth' });
      return;
    }
    res.status(200).json({
      generated_at: new Date().toISOString(),
      fields: BRIEFING_AUDIT_MAP,
    });
    return;
  }

  const { table, op, row, match } = body;
  if (BLOCKED_TABLES.has(table)) {
    res.status(403).json({ error: 'blocked: table classified AUTH' });
    return;
  }
  if (!ALLOWED_TABLES.has(table) && !LEGAL_SENSITIVE.has(table)) {
    res.status(400).json({ error: 'table not allowed' });
    return;
  }
  // Audit LEGAL_SENSITIVE reads before proceeding (fire-and-forget)
  if (LEGAL_SENSITIVE.has(table)) {
    try {
      const auditHeaders = {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      };
      if (SUPABASE_KEY.startsWith('eyJ')) {
        auditHeaders['Authorization'] = `Bearer ${SUPABASE_KEY}`;
      }
      // Await so serverless function doesn't terminate before the log insert lands.
      await fetch(`${SUPABASE_URL}/rest/v1/jarvis_sensitive_access_log`, {
        method: 'POST',
        headers: auditHeaders,
        body: JSON.stringify({
          table_name: table,
          classification: 'LEGAL_SENSITIVE',
          operation: op,
          request_ip: req.headers?.['x-forwarded-for'] || null,
          user_agent: req.headers?.['user-agent'] || null,
        }),
      }).catch(() => {});
    } catch (e) {}
  }

  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  // Supabase key auth:
  // - New sb_secret_* keys: apikey header ONLY (Bearer gets rejected by Postgres, not a JWT)
  // - Legacy JWT (service_role): apikey + Authorization Bearer both work
  // Either way, sending apikey alone is universally valid.
  const isLegacyJwt = SUPABASE_KEY.startsWith('eyJ');
  const headers = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (isLegacyJwt) {
    headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  }

  try {
    let url = base;
    let method = 'GET';
    let payload;

    if (op === 'insert') { method = 'POST'; payload = JSON.stringify(row); }
    else if (op === 'select') { method = 'GET'; if (match) { url = `${base}?${Object.entries(match).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&')}`; } }
    else if (op === 'update') { method = 'PATCH'; url = `${base}?${Object.entries(match||{}).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&')}`; payload = JSON.stringify(row); }
    else if (op === 'delete') { method = 'DELETE'; url = `${base}?${Object.entries(match||{}).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&')}`; }
    else { res.status(400).json({ error: 'op must be insert|select|update|delete' }); return; }

    const r = await fetch(url, { method, headers, body: payload });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type','application/json').send(text || '[]');
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
