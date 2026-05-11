// ═══════════════════════════════════════════════════════════════════════════
// RBTR · Auto-diagnose — post-build self-check
//
// Called at the end of every autonomous build. Verifies what shipped,
// auto-fixes reversible issues, surfaces remaining items via rbtr_tasks.
// Ben hears the summary in the next Rocko brief.
//
// Auth: Bearer CRON_SECRET (same as all agent-facing endpoints)
// ═══════════════════════════════════════════════════════════════════════════

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID || null;

const RBTR_REPO = path.join(os.homedir(), 'Desktop', 'rbtr-command');
const PSNM_REPO = path.join(os.homedir(), 'Desktop', 'psnm');
const INBOX_DIR = path.join(os.homedir(), 'Documents', 'RBTR-Brain', '00-Inbox');

// ── Auth ─────────────────────────────────────────────────────────────────────
function requireAuth(req) {
  if (!CRON_SECRET) return false;
  const authHeader = (req.headers['authorization'] || '').trim();
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === CRON_SECRET;
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
function sbHeaders() {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) {
    h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  }
  return h;
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
      headers: sbHeaders(),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const headers = { ...sbHeaders(), Prefer: 'return=representation' };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(row),
    });
    if (!r.ok) return { error: await r.text(), status: r.status };
    return await r.json();
  } catch (e) { return { error: e.message }; }
}

async function sbCountTable(table) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const headers = { ...sbHeaders(), Prefer: 'count=exact' };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=0`, {
      method: 'HEAD',
      headers,
    });
    if (!r.ok) return null;
    const contentRange = r.headers.get('content-range') || '';
    const match = contentRange.match(/\/(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  } catch { return null; }
}

// ── Context gatherers ────────────────────────────────────────────────────────
async function getGitCommits(repoPath, label) {
  try {
    const since = new Date(Date.now() - 86400000).toISOString();
    const { stdout } = await execAsync(
      `git -C "${repoPath}" log --since="${since}" --oneline --no-merges 2>/dev/null || echo ""`
    );
    const lines = stdout.trim().split('\n').filter(Boolean);
    return { repo: label, commits: lines, count: lines.length };
  } catch {
    return { repo: label, commits: [], count: 0, error: 'git_unavailable' };
  }
}

async function getVercelDeploys() {
  if (!VERCEL_TOKEN) return { deploys: [], error: 'no_token' };
  try {
    const since = Date.now() - 86400000;
    let url = 'https://api.vercel.com/v6/deployments?limit=20&state=ERROR,READY,BUILDING';
    if (VERCEL_TEAM_ID) url += `&teamId=${VERCEL_TEAM_ID}`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    if (!r.ok) return { deploys: [], error: `vercel_api_${r.status}` };
    const j = await r.json();
    const recent = (j.deployments || []).filter(d => d.createdAt > since);
    return {
      deploys: recent.map(d => ({
        uid: d.uid,
        url: d.url,
        state: d.state,
        name: d.name,
        created_at: new Date(d.createdAt).toISOString(),
      })),
    };
  } catch (e) {
    return { deploys: [], error: e.message };
  }
}

async function getTableCounts() {
  const tables = [
    'rbtr_tasks',
    'rbtr_routine_log',
    'rbtr_auto_diagnosis_log',
    'daily_briefs',
    'psnm_enquiries',
    'sponsor_targets',
  ];
  const counts = {};
  await Promise.all(tables.map(async t => {
    counts[t] = await sbCountTable(t);
  }));
  return counts;
}

async function getRecentTasks() {
  const since = new Date(Date.now() - 86400000).toISOString();
  return await sbSelect('rbtr_tasks', `created_at=gte.${since}&status=in.(open,blocked)&select=id,description,priority,status,source,project,blocked_reason`) || [];
}

async function getInboxFiles() {
  try {
    if (!fs.existsSync(INBOX_DIR)) return { files: [], error: 'inbox_not_found' };
    const since = Date.now() - 86400000;
    const entries = fs.readdirSync(INBOX_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const full = path.join(INBOX_DIR, f);
        const stat = fs.statSync(full);
        return { name: f, modified: stat.mtimeMs, path: full };
      })
      .filter(f => f.modified > since)
      .sort((a, b) => b.modified - a.modified);
    return { files: entries.map(f => f.name), count: entries.length };
  } catch (e) {
    return { files: [], error: e.message };
  }
}

// ── Categorise findings ──────────────────────────────────────────────────────
function categorise({ commits, deploys, tableCounts, recentTasks, inboxFiles }) {
  const findings = { shipped: [], unverified: [], auto_fixable: [], needs_ben: [] };

  // Commits with corresponding successful deploy = shipped
  const successfulDeploys = (deploys.deploys || []).filter(d => d.state === 'READY');
  const failedDeploys = (deploys.deploys || []).filter(d => d.state === 'ERROR');

  commits.forEach(repoCommits => {
    if (repoCommits.count > 0) {
      if (successfulDeploys.length > 0) {
        findings.shipped.push({
          type: 'git_commit_deployed',
          description: `${repoCommits.count} commit(s) in ${repoCommits.repo} with live deploy`,
          detail: repoCommits.commits.slice(0, 3),
        });
      } else if (deploys.error === 'no_token' || !VERCEL_TOKEN) {
        findings.unverified.push({
          type: 'git_commit_deploy_unverified',
          description: `${repoCommits.count} commit(s) in ${repoCommits.repo} — deploy status unknown (no Vercel token)`,
          detail: repoCommits.commits.slice(0, 3),
        });
      } else {
        findings.unverified.push({
          type: 'git_commit_no_deploy',
          description: `${repoCommits.count} commit(s) in ${repoCommits.repo} but no successful Vercel deploy in last 24h`,
          detail: repoCommits.commits.slice(0, 3),
        });
      }
    }
  });

  // Migration 56 written but table missing = log for manual paste
  if (tableCounts['rbtr_auto_diagnosis_log'] === null) {
    findings.auto_fixable.push({
      type: 'migration_pending',
      description: 'Migration 56 (rbtr_auto_diagnosis_log) written but table not yet in Supabase',
      action: 'paste_migration',
      detail: 'Paste 56_auto_diagnosis_log.sql at https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new',
    });
  } else {
    findings.shipped.push({
      type: 'table_live',
      description: 'rbtr_auto_diagnosis_log table confirmed live in Supabase',
      detail: `Row count: ${tableCounts['rbtr_auto_diagnosis_log']}`,
    });
  }

  // Failed deploys = potentially auto-fixable (retry)
  failedDeploys.forEach(d => {
    findings.auto_fixable.push({
      type: 'deploy_failed',
      description: `Vercel deploy ${d.uid} failed for ${d.name}`,
      action: 'retry_deploy',
      detail: d,
    });
  });

  // Inbox files = document of build activity (shipped)
  if (inboxFiles.count > 0) {
    findings.shipped.push({
      type: 'inbox_files_written',
      description: `${inboxFiles.count} file(s) written to RBTR-Brain inbox`,
      detail: inboxFiles.files.slice(0, 5),
    });
  }

  // Recent open tasks from agents = may need Ben
  const agentTasks = recentTasks.filter(t => t.source && t.source.startsWith('agent'));
  const blockedTasks = recentTasks.filter(t => t.status === 'blocked');

  agentTasks.forEach(t => {
    findings.needs_ben.push({
      type: 'agent_open_task',
      description: t.description,
      priority: t.priority || 2,
      project: t.project || 'rbtr',
      task_id: t.id,
    });
  });

  blockedTasks.filter(t => !agentTasks.find(a => a.id === t.id)).forEach(t => {
    findings.needs_ben.push({
      type: 'blocked_task',
      description: `${t.description}${t.blocked_reason ? ' — blocked: ' + t.blocked_reason : ''}`,
      priority: t.priority || 2,
      project: t.project || 'rbtr',
      task_id: t.id,
    });
  });

  return findings;
}

// ── Auto-fix: safe and bounded ───────────────────────────────────────────────
async function attemptAutoFixes(findings, autoFixLog) {
  let autoFixedCount = 0;

  for (const item of findings.auto_fixable) {
    if (item.type === 'migration_pending') {
      // Do not auto-execute DDL — log it only
      autoFixLog.push({
        type: item.type,
        action: 'logged_for_manual',
        message: item.detail,
      });
    }

    if (item.type === 'deploy_failed' && VERCEL_TOKEN) {
      // Retry once via Vercel API
      try {
        const retryUrl = `https://api.vercel.com/v13/deployments/${item.detail.uid}/redeploy`;
        const r = await fetch(retryUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (r.ok) {
          autoFixedCount++;
          autoFixLog.push({
            type: item.type,
            action: 'deploy_retried',
            uid: item.detail.uid,
            result: 'queued',
          });
        } else {
          autoFixLog.push({
            type: item.type,
            action: 'deploy_retry_failed',
            uid: item.detail.uid,
            status: r.status,
          });
        }
      } catch (e) {
        autoFixLog.push({ type: item.type, action: 'deploy_retry_error', error: e.message });
      }
    }
  }

  return autoFixedCount;
}

// ── Write Obsidian report ────────────────────────────────────────────────────
async function writeReport(isoTs, triggeredBy, buildSummary, findings, autoFixLog, tableCounts, commits, deploys) {
  try {
    if (!fs.existsSync(INBOX_DIR)) return null;
    const filename = `AUTO-DIAGNOSIS-${isoTs}.md`;
    const filePath = path.join(INBOX_DIR, filename);

    const lines = [
      `# Auto-Diagnosis — ${isoTs}`,
      '',
      `**Triggered by:** ${triggeredBy}`,
      `**Build summary:** ${buildSummary || '(none)'}`,
      `**Run at:** ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Shipped: ${findings.shipped.length}`,
      `- Unverified: ${findings.unverified.length}`,
      `- Auto-fixable: ${findings.auto_fixable.length}`,
      `- Needs Ben: ${findings.needs_ben.length}`,
      '',
      '## Commits (last 24h)',
      ...commits.map(c => `- **${c.repo}**: ${c.count} commit(s)${c.error ? ` (${c.error})` : ''}`),
      ...commits.flatMap(c => c.commits.slice(0, 5).map(l => `  - ${l}`)),
      '',
      '## Vercel Deploys (last 24h)',
      deploys.error ? `- Error: ${deploys.error}` : '',
      ...(deploys.deploys || []).map(d => `- [${d.state}] ${d.name} — ${d.created_at}`),
      deploys.deploys?.length === 0 ? '- None' : '',
      '',
      '## Supabase Table Counts',
      ...Object.entries(tableCounts).map(([t, c]) => `- ${t}: ${c === null ? 'MISSING' : c}`),
      '',
      '## Shipped',
      findings.shipped.length === 0 ? '- None' : '',
      ...findings.shipped.map(f => `- [${f.type}] ${f.description}`),
      '',
      '## Unverified',
      findings.unverified.length === 0 ? '- None' : '',
      ...findings.unverified.map(f => `- [${f.type}] ${f.description}`),
      '',
      '## Auto-fixable',
      findings.auto_fixable.length === 0 ? '- None' : '',
      ...findings.auto_fixable.map(f => `- [${f.type}] ${f.description}`),
      '',
      '## Auto-fix log',
      autoFixLog.length === 0 ? '- Nothing attempted' : '',
      ...autoFixLog.map(l => `- [${l.action}] ${l.message || l.type}`),
      '',
      '## Needs Ben',
      findings.needs_ben.length === 0 ? '- Nothing' : '',
      ...findings.needs_ben.map(f => `- [P${f.priority}] ${f.description}`),
    ].filter(l => l !== '');

    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
    return filePath;
  } catch (e) {
    return null;
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = typeof req.body === 'string'
    ? JSON.parse(req.body || '{}')
    : (req.body || {});
  const { triggered_by, build_summary } = body;

  if (!triggered_by) {
    return res.status(400).json({ error: 'triggered_by required' });
  }

  // Gather all context in parallel
  const [
    rbtrCommits,
    psnmCommits,
    deploys,
    tableCounts,
    recentTasks,
    inboxFiles,
  ] = await Promise.all([
    getGitCommits(RBTR_REPO, 'rbtr-command'),
    getGitCommits(PSNM_REPO, 'psnm'),
    getVercelDeploys(),
    getTableCounts(),
    getRecentTasks(),
    getInboxFiles(),
  ]);

  const commits = [rbtrCommits, psnmCommits];
  const findings = categorise({ commits, deploys, tableCounts, recentTasks, inboxFiles });

  // Auto-fix attempts
  const autoFixLog = [];
  const autoFixedCount = await attemptAutoFixes(findings, autoFixLog);

  // Write Obsidian report
  const isoTs = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = await writeReport(
    isoTs, triggered_by, build_summary, findings, autoFixLog, tableCounts, commits, deploys
  );

  // Insert tasks for needs-ben items
  for (const item of findings.needs_ben) {
    if (!item.task_id) {
      await sbInsert('rbtr_tasks', {
        description: item.description,
        source: 'agent_diagnose',
        priority: item.priority || 2,
        status: 'open',
        project: item.project || 'rbtr',
      });
    }
  }

  // Insert diagnosis log row
  const topBenTask = findings.needs_ben[0]?.description || null;
  const logRow = {
    triggered_by,
    build_summary: build_summary || null,
    shipped_count: findings.shipped.length,
    auto_fixed_count: autoFixedCount,
    ben_needed_count: findings.needs_ben.length,
    top_ben_task: topBenTask,
    full_findings: {
      shipped: findings.shipped,
      unverified: findings.unverified,
      auto_fixable: findings.auto_fixable,
      needs_ben: findings.needs_ben,
      auto_fix_log: autoFixLog,
    },
    full_report_path: reportPath,
  };
  const logResult = await sbInsert('rbtr_auto_diagnosis_log', logRow);
  const logId = Array.isArray(logResult) ? logResult[0]?.id : null;

  return res.status(200).json({
    ok: true,
    log_id: logId,
    shipped_count: findings.shipped.length,
    unverified_count: findings.unverified.length,
    auto_fixed_count: autoFixedCount,
    ben_needed_count: findings.needs_ben.length,
    top_ben_task: topBenTask,
    report_path: reportPath,
  });
};
