/**
 * JARVIS Cockpit Data API
 * GET /api/cockpit
 *
 * Returns aggregated data for JARVIS cockpit view:
 * - rbtr_daily_log (yesterday's wins)
 * - rbtr_tasks (today's tasks)
 * - rbtr_week_goals (current week)
 * - psnm_customers (pipeline stats)
 * - str_bookings (STR stats)
 * - rbtr_wellness_daily (today's wellness)
 *
 * Auth: JWT cookie (via checkAuth middleware)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Supabase helper ──────────────────────────────────────────────────────────
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

// ── Date helpers ─────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

function getWeekIso() {
  const d = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getWeekStartEnd() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const todayIso = today();
    const yesterdayIso = yesterday();
    const weekIso = getWeekIso();
    const { start: weekStart, end: weekEnd } = getWeekStartEnd();

    // Fetch all data in parallel
    const [
      dailyLog,
      todayTasks,
      weekGoals,
      psnmCustomers,
      strBookings,
      wellnessToday
    ] = await Promise.all([
      // Yesterday's wins/events
      sbSelect('rbtr_daily_log', `log_date=eq.${yesterdayIso}&order=created_at.desc&limit=10`),

      // Today's tasks
      sbSelect('rbtr_tasks', `due_date=eq.${todayIso}&status=in.(open,in_progress,blocked)&order=priority.asc&limit=10`),

      // Week goals
      sbSelect('rbtr_week_goals', `week_iso=eq.${weekIso}&order=created_at.asc`),

      // PSNM customers (all, for stats)
      sbSelect('psnm_customers', 'select=id,status,business_name'),

      // STR bookings (all, for stats)
      sbSelect('str_bookings', 'select=id,check_in,check_out,status,gross_revenue,net_revenue'),

      // Today's wellness
      sbSelect('rbtr_wellness_daily', `date=eq.${todayIso}&limit=1`)
    ]);

    // Process PSNM stats
    const psnmStats = psnmCustomers ? {
      total: psnmCustomers.length,
      live: psnmCustomers.filter(c => c.status === 'live').length,
      quotes: psnmCustomers.filter(c => c.status === 'quote_sent').length,
      leads: psnmCustomers.filter(c => c.status === 'lead').length
    } : { total: 0, live: 0, quotes: 0, leads: 0 };

    // Process STR stats
    const strStats = strBookings ? (() => {
      const thisWeek = strBookings.filter(b => {
        const checkIn = new Date(b.check_in);
        return checkIn >= new Date(weekStart) && checkIn <= new Date(weekEnd);
      });

      const totalRevenue = strBookings.reduce((sum, b) => {
        return sum + (parseFloat(b.net_revenue) || 0);
      }, 0);

      return {
        thisWeekBookings: thisWeek.length,
        totalBookings: strBookings.length,
        revenue: totalRevenue
      };
    })() : { thisWeekBookings: 0, totalBookings: 0, revenue: 0 };

    // Return aggregated data
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        dailyLog: dailyLog || [],
        todayTasks: todayTasks || [],
        weekGoals: weekGoals || [],
        psnm: psnmStats,
        str: strStats,
        wellness: wellnessToday && wellnessToday.length > 0 ? wellnessToday[0] : null
      }
    });

  } catch (err) {
    console.error('Cockpit data fetch error:', err);
    res.status(500).json({
      error: 'Failed to fetch cockpit data',
      message: err.message
    });
  }
};
