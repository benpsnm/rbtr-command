// ═══════════════════════════════════════════════════════════════════════════
// Tech scan check — runs daily at 07:00 UTC
// Checks if tech market scan is due (>= 3 days since last scan)
// If due and no open task exists, creates a new rbtr_tasks entry
// ═══════════════════════════════════════════════════════════════════════════

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbGet(table, qs = '') {
  if (!SUPA_URL || !SUPA_KEY) return null;
  const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json' };
  if (SUPA_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPA_KEY}`;
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, { headers: h });
  return r.ok ? r.json() : null;
}

async function sbPost(table, body) {
  if (!SUPA_URL || !SUPA_KEY) return null;
  const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (SUPA_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPA_KEY}`;
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
  });
  return r.ok ? r.json() : null;
}

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) {
    res.status(401).send('unauthorized');
    return;
  }

  try {
    const fs = require('fs');
    const techScanPath = '/Users/bengreenwood/Documents/RBTR-Brain/00-Inbox/LAST-TECH-SCAN.md';

    // Check if file exists and parse last scan date
    let daysSince = 999; // default to "overdue" if file doesn't exist
    if (fs.existsSync(techScanPath)) {
      const content = fs.readFileSync(techScanPath, 'utf8');
      const dateMatch = content.match(/\*\*Last scan date:\*\* (\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const lastScan = new Date(dateMatch[1]);
        const now = new Date();
        daysSince = Math.floor((now - lastScan) / 86400000);
      }
    }

    // If less than 3 days, no action needed
    if (daysSince < 3) {
      res.status(200).json({ ok: true, action: 'skipped', days_since: daysSince, reason: 'scan not due yet' });
      return;
    }

    // Check if open task already exists
    const existingTasks = await sbGet('rbtr_tasks',
      'title=eq.Tech market scan due&status=in.(open,in_progress)&select=id');

    if (existingTasks && existingTasks.length > 0) {
      res.status(200).json({
        ok: true,
        action: 'skipped',
        days_since: daysSince,
        reason: 'task already exists',
        task_id: existingTasks[0].id
      });
      return;
    }

    // Create new task
    const today = new Date().toISOString().split('T')[0];
    const newTask = await sbPost('rbtr_tasks', {
      title: 'Tech market scan due',
      description: 'Open Claude chat and tap "tech scan" — Claude will research current tools and flag top 2-4 candidates',
      priority: 'medium',
      category: 'ops',
      due_date: today,
      assigned_to: 'ben',
      status: 'open',
      source: 'agent',
      project: 'ops',
    });

    res.status(200).json({
      ok: true,
      action: 'created',
      days_since: daysSince,
      task_id: newTask?.[0]?.id
    });

  } catch (err) {
    console.error('[cron-tech-scan-check]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
