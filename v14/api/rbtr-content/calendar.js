'use strict';

// GET /api/rbtr-content/calendar
//
// Returns the content calendar — planned, drafted, approved, and posted content
// for a given week or date range.
//
// Query params:
//   week      {string?}  — Monday ISO date of the week to show (default: current week)
//   range     {number?}  — number of weeks to show forward (default: 2)
//   status    {string?}  — comma-list to filter (default: all)
//   platform  {string?}  — filter to one platform
//
// Also handles:
//   PATCH /api/rbtr-content/calendar/:id — update a calendar entry (approve, link draft, skip)
//   POST  /api/rbtr-content/calendar     — create a manual calendar slot

const { requireAuth } = require('../auth/middleware');
const { sbQuery, sbInsert } = require('./_brand-voice');

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE;

function getWeekStart(inputDate) {
  const d = inputDate ? new Date(inputDate) : new Date();
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return mon.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function sbPatch(url, key, table, filters, payload) {
  const qs = Object.entries(filters).map(([k, v]) => `${k}=eq.${v}`).join('&');
  const r = await fetch(`${url}/rest/v1/${table}?${qs}`, {
    method : 'PATCH',
    headers: {
      apikey        : key,
      Authorization : `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer        : 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`DB patch ${table} ${r.status}: ${text.slice(0, 200)}`);
  }
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

  // ── POST — create manual calendar slot ─────────────────────────────────────
  if (req.method === 'POST') {
    const { planned_date, platform, content_type, vibe, title, slot_note } = req.body || {};

    if (!planned_date || !platform || !content_type) {
      return res.status(400).json({ error: 'planned_date, platform, content_type required' });
    }

    try {
      const row = await sbInsert(SUPA_URL, SUPA_KEY, 'rbtr_content_calendar', {
        planned_date,
        platform,
        content_type,
        vibe    : vibe || null,
        title   : title || null,
        slot_note: slot_note || null,
        status  : 'planned',
      });
      return res.status(201).json({ ok: true, slot: row });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── PATCH — update a calendar slot ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const url = new URL(req.url, `https://${req.headers?.host || 'x'}`);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.length - 1];

    if (!id || id === 'calendar') {
      return res.status(400).json({ error: 'slot id required in path: /api/rbtr-content/calendar/:id' });
    }

    const { status, draft_id, title, slot_note } = req.body || {};
    const validStatuses = ['planned', 'drafted', 'approved', 'posted', 'skipped'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const patch = {};
    if (status)    patch.status    = status;
    if (draft_id)  patch.draft_id  = draft_id;
    if (title)     patch.title     = title;
    if (slot_note) patch.slot_note = slot_note;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    try {
      const rows = await sbPatch(SUPA_URL, SUPA_KEY, 'rbtr_content_calendar', { id }, patch);
      return res.status(200).json({ ok: true, updated: rows[0] || null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ── GET — read calendar with drafts joined ──────────────────────────────────
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = new URL(req.url, `https://${req.headers?.host || 'x'}`);
  const weekParam    = url.searchParams.get('week');
  const rangeWeeks   = Math.min(parseInt(url.searchParams.get('range') || '2', 10), 8);
  const statusFilter = url.searchParams.get('status');
  const platformFilter = url.searchParams.get('platform');

  const weekStart = getWeekStart(weekParam);
  const weekEnd   = addDays(weekStart, rangeWeeks * 7 - 1);

  let calendarQS = `rbtr_content_calendar?planned_date=gte.${weekStart}&planned_date=lte.${weekEnd}&order=planned_date.asc,platform.asc`;
  if (statusFilter) {
    const statuses = statusFilter.split(',').filter(Boolean);
    calendarQS += statuses.length > 1
      ? `&status=in.(${statuses.join(',')})`
      : `&status=eq.${statuses[0]}`;
  }
  if (platformFilter) calendarQS += `&platform=eq.${platformFilter}`;

  let calendar, drafts;
  try {
    calendar = await sbQuery(SUPA_URL, SUPA_KEY, calendarQS);
  } catch (e) {
    return res.status(500).json({ error: 'calendar_read_failed', detail: e.message });
  }

  // Fetch any linked drafts in one query
  const draftIds = [...new Set(calendar.filter(c => c.draft_id).map(c => c.draft_id))];
  if (draftIds.length > 0) {
    try {
      drafts = await sbQuery(SUPA_URL, SUPA_KEY,
        `rbtr_content_drafts?id=in.(${draftIds.join(',')})&select=id,platform,content_type,vibe,title,status,caption,body,scheduled_at,posted_at`);
    } catch (_) {
      drafts = [];
    }
  } else {
    drafts = [];
  }

  const draftMap = Object.fromEntries(drafts.map(d => [d.id, d]));

  // Also pull any drafts from this period that aren't in the calendar yet
  let unscheduledDrafts = [];
  try {
    unscheduledDrafts = await sbQuery(SUPA_URL, SUPA_KEY,
      `rbtr_content_drafts?week_date=gte.${weekStart}&week_date=lte.${weekEnd}&status=in.(draft,approved)&order=created_at.desc&select=id,platform,content_type,vibe,title,status,caption,week_date,created_at`);
  } catch (_) {}

  // Group calendar by date
  const byDate = {};
  for (const slot of calendar) {
    const dateKey = slot.planned_date;
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push({
      ...slot,
      draft: slot.draft_id ? (draftMap[slot.draft_id] || null) : null,
    });
  }

  // Summary stats
  const stats = {
    total_slots    : calendar.length,
    planned        : calendar.filter(c => c.status === 'planned').length,
    drafted        : calendar.filter(c => c.status === 'drafted').length,
    approved       : calendar.filter(c => c.status === 'approved').length,
    posted         : calendar.filter(c => c.status === 'posted').length,
    skipped        : calendar.filter(c => c.status === 'skipped').length,
    unscheduled_drafts: unscheduledDrafts.length,
  };

  return res.status(200).json({
    ok               : true,
    week_start       : weekStart,
    week_end         : weekEnd,
    range_weeks      : rangeWeeks,
    stats,
    by_date          : byDate,
    unscheduled_drafts: unscheduledDrafts,
  });
};
