// ═══════════════════════════════════════════════════════════════════════════
// Daily database backup — P1.2 from v2 spec
//
// Runs nightly via Vercel Cron. Exports every whitelisted table as a JSON
// object, gzip-compresses to a single file, uploads to the 'backups' Storage
// bucket keyed by date. Keeps last 30 daily + first-of-month forever.
//
// Config in vercel.json:
//   { "crons": [{ "path": "/api/cron-backup", "schedule": "0 3 * * *" }] }
// ═══════════════════════════════════════════════════════════════════════════

const zlib = require('zlib');
const SUPABASE_URL = process.env.SUPABASE_URL;
// Phase 1 (v3.0): env renamed to SUPABASE_SERVICE_ROLE; kept _KEY fallback.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'backups';

// Backup is configured on Vercel cron '0 3 * * *' which fires at 03:00 UTC =
// 04:00 local during BST, 03:00 local during GMT. Spec prefers Europe/London
// timing — Vercel Hobby plan only supports UTC crons, so this is the closest
// approximation. Ben: if you want strict 03:00 local every night, move to
// Vercel Pro (cron tz support) or a Supabase Edge Function with pg_cron.

// Back up EVERY table we can see, not just the target 29. Orphan tables
// (jarvis_*, content_pieces, axel_brothers_pathway, etc.) are load-bearing
// and a partial backup is not a backup. New tables added in migration 24
// are included explicitly.
const BACKUP_TABLES = [
  // ── Appendix A target 29 ──
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
  // ── Kept orphans (load-bearing for front end + Telegram + Built Dad) ──
  'jarvis_goals','jarvis_accomplishments','jarvis_reflections',
  'jarvis_learning_sessions','jarvis_learning_streaks',
  'jarvis_tool_registry','jarvis_signals','jarvis_conversations','jarvis_builtdad',
  'jarvis_sensitive_access_log',
  'build_bible_attachments',
  'content_pieces',
  'axel_brothers_pathway',
  'sponsor_touch_schedule','sponsor_hot_signals',
];

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, ...extra };
  if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function ensureBucket() {
  const check = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, { headers: sbHeaders() });
  if (check.ok) return { existed: true };
  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 50 * 1024 * 1024 }),
  });
  if (!create.ok) {
    const txt = await create.text();
    throw new Error(`bucket create failed: ${create.status} ${txt.slice(0,200)}`);
  }
  return { created: true };
}

async function dumpTable(t) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, { headers: sbHeaders() });
    if (!r.ok) return { table: t, error: await r.text(), count: 0 };
    const rows = await r.json();
    return { table: t, count: Array.isArray(rows) ? rows.length : 0, rows };
  } catch (e) { return { table: t, error: e.message, count: 0 }; }
}

module.exports = async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers?.authorization !== `Bearer ${secret}`) { res.status(401).send('unauthorized'); return; }
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'Supabase env not set' }); return; }

  try {
    await ensureBucket();

    const dumps = await Promise.all(BACKUP_TABLES.map(dumpTable));
    const summary = {
      captured_at: new Date().toISOString(),
      total_tables: dumps.length,
      total_rows: dumps.reduce((s, d) => s + (d.count || 0), 0),
      tables: dumps.map(d => ({ table: d.table, count: d.count, error: d.error })),
    };

    // Build the dump object
    const bundle = {
      summary,
      data: Object.fromEntries(dumps.map(d => [d.table, d.rows || null])),
    };

    // Gzip the JSON
    const jsonBuf = Buffer.from(JSON.stringify(bundle));
    const gz = zlib.gzipSync(jsonBuf);

    const date = new Date().toISOString().slice(0,10);
    const filename = `${date}/rbtr-backup-${date}.json.gz`;

    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
      method: 'POST',
      headers: sbHeaders({ 'Content-Type': 'application/gzip', 'x-upsert': 'true' }),
      body: gz,
    });
    if (!up.ok) {
      const t = await up.text();
      res.status(502).json({ error: 'upload failed', detail: t.slice(0, 300) });
      return;
    }

    // Retention: delete daily backups older than 30 days, except first-of-month.
    // List objects, filter, delete in parallel. Best-effort — don't fail backup on retention error.
    try {
      const list = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}?prefix=`, {
        method: 'POST',
        headers: sbHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prefix: '', limit: 1000 }),
      });
      const items = await list.json();
      const cutoff = Date.now() - 30 * 86400000;
      const toDelete = (Array.isArray(items) ? items : []).filter(o => {
        const name = o.name || '';
        const m = name.match(/(\d{4}-\d{2}-\d{2})/);
        if (!m) return false;
        const [y, mon, d] = m[1].split('-').map(Number);
        const t = Date.parse(`${m[1]}T00:00:00Z`);
        if (isNaN(t)) return false;
        if (d === 1) return false;                        // keep first-of-month forever
        return t < cutoff;
      });
      if (toDelete.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
          method: 'DELETE',
          headers: sbHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ prefixes: toDelete.map(o => o.name) }),
        });
      }
      summary.deleted_old = toDelete.length;
    } catch (e) { summary.retention_error = e.message; }

    res.status(200).json({
      ok: true,
      filename,
      bytes: gz.length,
      ...summary,
    });
  } catch (err) {
    console.error('[cron-backup]', err);
    res.status(500).json({ error: err.message });
  }
};
