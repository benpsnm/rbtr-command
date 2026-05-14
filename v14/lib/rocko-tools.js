// ═══════════════════════════════════════════════════════════════════════════
// Rocko Tool Definitions
// ~30 tools for Rocko to interact with RBTR Command Centre
// Each tool: name, description, input_schema, execute function
// ═══════════════════════════════════════════════════════════════════════════

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Supabase helper ────────────────────────────────────────────────────────
async function sbQuery(table, qs = '', method = 'GET', body = null) {
  if (!SUPA_URL || !SUPA_KEY) throw new Error('Supabase not configured');
  const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json' };
  if (SUPA_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPA_KEY}`;
  const opts = { method, headers: h };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, opts);
  if (!r.ok) throw new Error(`Supabase ${method} ${table} failed: ${r.status}`);
  return method === 'GET' ? r.json() : { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export const ROCKO_TOOLS = [
  // ── Navigation ───────────────────────────────────────────────────────────
  {
    name: 'navigate_to_module',
    description: 'Navigate JARVIS interface to a specific module. Use when user asks to go somewhere or view something specific.',
    input_schema: {
      type: 'object',
      properties: {
        module_name: {
          type: 'string',
          description: 'Module identifier: psnm_atlas, psnm_customers, forge_bookings, rbtr_build, personal_tasks, etc',
        },
      },
      required: ['module_name'],
    },
    execute: async (input) => {
      return { action: 'navigate', target: input.module_name };
    },
  },

  // ── PSNM Atlas ───────────────────────────────────────────────────────────
  {
    name: 'fetch_atlas_funnel_status',
    description: 'Get current PSNM Atlas outreach funnel status: prospect count, dispatched today, replies, hot prospects, draft queue.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      const [targets, drafts, touches] = await Promise.all([
        sbQuery('psnm_outreach_targets', 'select=id,status,hot_flag'),
        sbQuery('psnm_atlas_drafts', 'status=eq.pending_approval&select=id'),
        sbQuery('psnm_outreach_touches', `sent_date=eq.${new Date().toISOString().split('T')[0]}&select=id,outcome`),
      ]);
      const hot = targets.filter(t => t.hot_flag).length;
      const dispatched = touches.length;
      const replies = touches.filter(t => t.outcome === 'reply').length;
      return {
        total_prospects: targets.length,
        hot_prospects: hot,
        dispatched_today: dispatched,
        replies_today: replies,
        draft_queue: drafts.length,
      };
    },
  },

  {
    name: 'fetch_outreach_drafts',
    description: 'Fetch pending outreach email drafts awaiting approval.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending_approval', 'approved', 'rejected'], description: 'Filter by status' },
        limit: { type: 'integer', default: 10 },
      },
    },
    execute: async (input) => {
      const status = input.status || 'pending_approval';
      const limit = input.limit || 10;
      const drafts = await sbQuery('psnm_atlas_drafts', `status=eq.${status}&order=created_at.desc&limit=${limit}&select=*`);
      return drafts;
    },
  },

  {
    name: 'send_outreach_dispatch',
    description: 'Trigger outreach email dispatch cycle. Sends approved drafts via SendGrid.',
    input_schema: {
      type: 'object',
      properties: {
        count: { type: 'integer', description: 'Max number to dispatch, defaults to all approved' },
      },
    },
    execute: async (input) => {
      // POST to /api/atlas3 with action=run_dispatch
      const res = await fetch(`${process.env.VERCEL_URL || 'https://rbtr-jarvis.vercel.app'}/api/atlas3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
        body: JSON.stringify({ action: 'run_dispatch', count: input.count }),
      });
      if (!res.ok) throw new Error(`Dispatch failed: ${res.status}`);
      const result = await res.json();
      return result;
    },
  },

  {
    name: 'approve_atlas_draft',
    description: 'Approve a specific outreach email draft by ID.',
    input_schema: {
      type: 'object',
      properties: {
        draft_id: { type: 'string', description: 'UUID of the draft to approve' },
      },
      required: ['draft_id'],
    },
    execute: async (input) => {
      await sbQuery('psnm_atlas_drafts', `id=eq.${input.draft_id}`, 'PATCH', { status: 'approved' });
      return { draft_id: input.draft_id, status: 'approved' };
    },
  },

  {
    name: 'fetch_recent_replies',
    description: 'Fetch recent replies from atlas prospects (PSNM + RBTR) in last 48 hours.',
    input_schema: {
      type: 'object',
      properties: {},
    },
    execute: async (input) => {
      const since = new Date(Date.now() - 48 * 3600000).toISOString();

      const [psnmReplies, rbtrReplies] = await Promise.all([
        sbQuery('psnm_atlas_replies', `received_at=gte.${since}&order=received_at.desc&select=*`).catch(() => []),
        sbQuery('rbtr_atlas_replies', `received_at=gte.${since}&order=received_at.desc&select=*`).catch(() => []),
      ]);

      return {
        psnm_replies: psnmReplies.length,
        rbtr_replies: rbtrReplies.length,
        total: psnmReplies.length + rbtrReplies.length,
        psnm: psnmReplies,
        rbtr: rbtrReplies,
      };
    },
  },

  // ── PSNM Customers ───────────────────────────────────────────────────────
  {
    name: 'fetch_psnm_customers',
    description: 'Fetch PSNM customer list, optionally filtered by status.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['enquiry', 'quote_sent', 'agreement_sent', 'live', 'churned'] },
        limit: { type: 'integer', default: 20 },
      },
    },
    execute: async (input) => {
      let qs = 'order=created_at.desc&select=*';
      if (input.status) qs = `status=eq.${input.status}&${qs}`;
      if (input.limit) qs += `&limit=${input.limit}`;
      const customers = await sbQuery('psnm_customers', qs);
      return customers;
    },
  },

  {
    name: 'create_quote',
    description: 'Create a new PSNM quote for a customer.',
    input_schema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'UUID of customer' },
        pallet_count: { type: 'integer' },
        services: { type: 'array', items: { type: 'string' }, description: 'Array of service codes' },
      },
      required: ['customer_id', 'pallet_count'],
    },
    execute: async (input) => {
      const quote = await sbQuery('psnm_quotes', '', 'POST', {
        customer_id: input.customer_id,
        pallet_count: input.pallet_count,
        services: input.services || [],
        status: 'draft',
      });
      return quote;
    },
  },

  // ── Tasks ────────────────────────────────────────────────────────────────
  {
    name: 'fetch_today_tasks',
    description: 'Fetch tasks due today from rbtr_tasks.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      const today = new Date().toISOString().split('T')[0];
      const tasks = await sbQuery('rbtr_tasks', `due_date=eq.${today}&status=in.(open,in_progress,blocked)&order=priority.asc,due_date.asc&select=*`);
      return tasks;
    },
  },

  {
    name: 'add_task',
    description: 'Add a new task to rbtr_tasks.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'integer', enum: [1, 2, 3], default: 2 },
        category: { type: 'string' },
        due_date: { type: 'string', format: 'date' },
      },
      required: ['title'],
    },
    execute: async (input) => {
      const task = await sbQuery('rbtr_tasks', '', 'POST', {
        title: input.title,
        priority: input.priority || 2,
        category: input.category || 'general',
        due_date: input.due_date || new Date().toISOString().split('T')[0],
        status: 'open',
        source: 'rocko',
      });
      return task;
    },
  },

  {
    name: 'complete_task',
    description: 'Mark a task as complete by ID.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'UUID of task' },
      },
      required: ['task_id'],
    },
    execute: async (input) => {
      await sbQuery('rbtr_tasks', `id=eq.${input.task_id}`, 'PATCH', { status: 'complete', completed_at: new Date().toISOString() });
      return { task_id: input.task_id, status: 'complete' };
    },
  },

  // ── Money ────────────────────────────────────────────────────────────────
  {
    name: 'fetch_money_position',
    description: 'Get current cash position for Ben + Sarah, this week banked, outstanding invoices.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      // Aggregate from multiple sources
      const [quotes, invoices, paidInvoices, strBookings, upcomingCosts] = await Promise.all([
        sbQuery('psnm_quotes', 'status=eq.accepted&select=monthly_rate').catch(() => []),
        sbQuery('psnm_invoices', 'status=eq.pending&select=amount').catch(() => []),
        sbQuery('psnm_invoices', 'status=eq.paid&select=amount').catch(() => []),
        sbQuery('str_bookings', `check_in=gte.${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]}&select=gross_revenue`).catch(() => []),
        sbQuery('rbtr_tasks', 'category=eq.cost&status=neq.completed&select=estimated_cost').catch(() => []),
      ]);

      const weeklyRevenue = quotes.reduce((sum, q) => sum + (parseFloat(q.monthly_rate) || 0), 0);
      const outstanding = invoices.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const paidTotal = paidInvoices.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const strRevenue = strBookings.reduce((sum, b) => sum + (parseFloat(b.gross_revenue) || 0), 0);
      const upcomingCostsTotal = upcomingCosts.reduce((sum, t) => sum + (parseFloat(t.estimated_cost) || 0), 0);

      const benSarahCombined = paidTotal + strRevenue;

      return {
        ben_sarah_combined: `£${benSarahCombined.toFixed(2)}`,
        this_week_banked: `£${weeklyRevenue.toFixed(2)} (PSNM) + £${strRevenue.toFixed(2)} (STR)`,
        outstanding_invoices: `£${outstanding.toFixed(2)} (${invoices.length} invoices)`,
        upcoming_costs: `£${upcomingCostsTotal.toFixed(2)}`,
      };
    },
  },

  // ── Build Progress ───────────────────────────────────────────────────────
  {
    name: 'fetch_truck_build_progress',
    description: 'Get RBTR truck build progress: stages complete, current stage, timeline.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      const stages = await sbQuery('cc_build_progress', 'order=stage_number.asc&select=*');
      const complete = stages.filter(s => s.status === 'complete').length;
      const total = stages.length;
      const current = stages.find(s => s.status === 'in_progress');
      return {
        total_stages: total,
        complete: complete,
        percent_complete: Math.round((complete / total) * 100),
        current_stage: current?.stage_name || 'None in progress',
      };
    },
  },

  {
    name: 'add_build_log',
    description: 'Add a build log entry note.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
      },
      required: ['content'],
    },
    execute: async (input) => {
      const note = await sbQuery('notes', '', 'POST', {
        content: input.content,
        category: 'build_log',
        created_by: 'ben',
      });
      return note;
    },
  },

  // ── Sponsors ─────────────────────────────────────────────────────────────
  {
    name: 'fetch_sponsor_pipeline',
    description: 'Get RBTR sponsor pipeline status.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      // Use rbtr_atlas_prospects table (migration 069)
      const sponsors = await sbQuery('rbtr_atlas_prospects', 'order=status.asc,value_estimate_gbp.desc&select=*');
      const statusCounts = sponsors.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
      const totalValue = sponsors.reduce((sum, s) => sum + (parseFloat(s.value_estimate_gbp) || 0), 0);

      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      const recentActivity = sponsors.filter(s => s.updated_at >= sevenDaysAgo).length;

      return {
        total_sponsors: sponsors.length,
        targets: statusCounts['target'] || 0,
        contacted: (statusCounts['drafted'] || 0) + (statusCounts['approved'] || 0) + (statusCounts['dispatched'] || 0),
        replied: statusCounts['replied'] || 0,
        signed: statusCounts['signed'] || 0,
        by_status: statusCounts,
        recent_activity_7d: recentActivity,
        total_value_gbp: totalValue,
        sponsors: sponsors.slice(0, 10), // top 10
      };
    },
  },

  // ── Forge ────────────────────────────────────────────────────────────────
  {
    name: 'fetch_forge_bookings',
    description: 'Fetch Forge STR bookings for a date range.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', format: 'date' },
        end_date: { type: 'string', format: 'date' },
      },
    },
    execute: async (input) => {
      let qs = 'order=check_in.asc&select=*';
      if (input.start_date) qs += `&check_in=gte.${input.start_date}`;
      if (input.end_date) qs += `&check_out=lte.${input.end_date}`;
      const bookings = await sbQuery('str_bookings', qs);
      return bookings;
    },
  },

  {
    name: 'fetch_booking_proof_status',
    description: 'Get Booking Proof SaaS status: MRR, customers, founding member slots.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      // Fetch from bp_* tables if they exist
      const [customers, settings] = await Promise.all([
        sbQuery('bp_customers', 'status=eq.active&select=monthly_value').catch(() => null),
        sbQuery('bp_settings', 'select=founding_member_mode,founding_member_slots').catch(() => null),
      ]);

      if (!customers) {
        return {
          mrr: 'bp_customers table not found',
          customers: 0,
          founding_members: 'bp_settings table not found',
          note: 'Booking Proof schema not yet migrated',
        };
      }

      const mrr = customers.reduce((sum, c) => sum + (parseFloat(c.monthly_value) || 0), 0);

      return {
        mrr: `£${mrr.toFixed(2)}`,
        customers: customers.length,
        founding_members: settings?.[0]?.founding_member_mode ? `${settings[0].founding_member_slots} slots` : 'Disabled',
      };
    },
  },

  // ── Personal ─────────────────────────────────────────────────────────────
  {
    name: 'add_note',
    description: 'Add a general note.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        category: { type: 'string' },
      },
      required: ['content'],
    },
    execute: async (input) => {
      const note = await sbQuery('notes', '', 'POST', {
        content: input.content,
        category: input.category || 'general',
        created_by: 'ben',
      });
      return note;
    },
  },

  {
    name: 'log_mood',
    description: 'Log current mood and energy level (1-10 scale).',
    input_schema: {
      type: 'object',
      properties: {
        mood_score: { type: 'integer', minimum: 1, maximum: 10 },
        energy_score: { type: 'integer', minimum: 1, maximum: 10 },
        note: { type: 'string' },
      },
      required: ['mood_score', 'energy_score'],
    },
    execute: async (input) => {
      const timeOfDay = new Date().getHours() < 12 ? 'morning' : (new Date().getHours() < 17 ? 'midday' : 'evening');
      const log = await sbQuery('rbtr_mood_log', '', 'POST', {
        mood_score: input.mood_score,
        energy_score: input.energy_score,
        time_of_day: timeOfDay,
        notes: input.note,
        user_id: 'ben',
      });
      return log;
    },
  },

  {
    name: 'check_habit',
    description: 'Mark a habit as completed for today.',
    input_schema: {
      type: 'object',
      properties: {
        habit_name: { type: 'string' },
      },
      required: ['habit_name'],
    },
    execute: async (input) => {
      const today = new Date().toISOString().split('T')[0];
      const log = await sbQuery('rbtr_habits_log', '', 'POST', {
        date: today,
        habit_name: input.habit_name,
        completed: true,
        user_id: 'ben',
      });
      return log;
    },
  },

  // ── System ───────────────────────────────────────────────────────────────
  {
    name: 'run_cron_check',
    description: 'Check status of a specific cron job.',
    input_schema: {
      type: 'object',
      properties: {
        cron_name: { type: 'string', description: 'Name of cron: morning-brief, backup, atlas-dispatch, etc' },
      },
      required: ['cron_name'],
    },
    execute: async (input) => {
      // Check cron_execution_log for recent runs
      const logs = await sbQuery('cron_execution_log', `cron_name=eq.${input.cron_name}&order=executed_at.desc&limit=5&select=*`).catch(() => null);

      if (!logs || logs.length === 0) {
        return {
          cron_name: input.cron_name,
          status: 'No recent executions found',
          last_run: null,
        };
      }

      const lastRun = logs[0];
      return {
        cron_name: input.cron_name,
        status: lastRun.status,
        last_run: lastRun.executed_at,
        recent_runs: logs.length,
        success_rate: `${logs.filter(l => l.status === 'success').length}/${logs.length}`,
      };
    },
  },

  {
    name: 'search_supabase',
    description: 'Generic Supabase table search with parameterized filters. Use as fallback when no specific tool exists.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name (alphanumeric + underscore only)' },
        filters: { type: 'string', description: 'PostgREST filter syntax, e.g. "status=eq.open&priority=eq.high"' },
        limit: { type: 'integer', default: 10 },
      },
      required: ['table'],
    },
    execute: async (input) => {
      // Sanitize table name - alphanumeric + underscore only
      const safeTable = input.table.replace(/[^a-zA-Z0-9_]/g, '');
      if (safeTable !== input.table) {
        throw new Error('Invalid table name - only alphanumeric and underscore allowed');
      }

      // Enforce max limit of 50
      const limit = Math.min(input.limit || 10, 50);

      // Build query string - PostgREST handles parameterization
      let qs = `select=*&limit=${limit}`;
      if (input.filters) {
        qs = `${input.filters}&${qs}`;
      }

      const results = await sbQuery(safeTable, qs);
      return {
        table: safeTable,
        count: results.length,
        results,
      };
    },
  },

  {
    name: 'fetch_rocko_brief_today',
    description: "Get today's Rocko morning brief summary.",
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      // Fetch today's key metrics
      const today = new Date().toISOString().split('T')[0];

      const [tasks, drafts, touches] = await Promise.all([
        sbQuery('rbtr_tasks', `due_date=eq.${today}&status=in.(open,in_progress)&select=title,priority`).catch(() => []),
        sbQuery('psnm_atlas_drafts', 'status=eq.pending_approval&select=id').catch(() => []),
        sbQuery('psnm_outreach_touches', `sent_date=eq.${today}&outcome=eq.reply&select=id`).catch(() => []),
      ]);

      return {
        date: today,
        tasks_due: tasks.length,
        draft_queue: drafts.length,
        replies_today: touches.length,
        summary: `${tasks.length} tasks due, ${drafts.length} drafts pending, ${touches.length} replies today`,
      };
    },
  },

  {
    name: 'fetch_ww_enquiries',
    description: 'Fetch WealthyWolves enquiries by status.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        limit: { type: 'integer', default: 20 },
      },
    },
    execute: async (input) => {
      let qs = 'order=created_at.desc&select=*';
      if (input.status) qs = `status=eq.${input.status}&${qs}`;
      if (input.limit) qs += `&limit=${input.limit}`;
      const enquiries = await sbQuery('psnm_enquiries', `source=eq.wealthywolves&${qs}`);
      return enquiries;
    },
  },

  {
    name: 'git_status',
    description: 'Get current git status of v14 codebase.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      const response = await fetch('http://localhost:3000/api/git/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Git status failed: ${response.status}`);
      }

      return await response.json();
    },
  },

  {
    name: 'read_obsidian_doc',
    description: 'Read a document from RBTR-Brain Obsidian vault.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path in RBTR-Brain/' },
      },
      required: ['path'],
    },
    execute: async (input) => {
      const response = await fetch('http://localhost:3000/api/obsidian/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: input.path }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Read failed: ${response.status}`);
      }

      return await response.json();
    },
  },

  {
    name: 'write_obsidian_note',
    description: 'Write a new note to RBTR-Brain/00-Inbox/.',
    input_schema: {
      type: 'object',
      properties: {
        filename: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['filename', 'content'],
    },
    execute: async (input) => {
      const response = await fetch('http://localhost:3000/api/obsidian/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: input.filename, content: input.content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Write failed: ${response.status}`);
      }

      return await response.json();
    },
  },

  {
    name: 'fetch_active_builds_running',
    description: 'Check if any autonomous builds are currently running by checking state files and git status.',
    input_schema: { type: 'object', properties: {} },
    execute: async () => {
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;

      const activeBuilds = [];

      // Check scripts/.state/ directory for state files
      const stateDir = '/Users/bengreenwood/Desktop/rbtr-command/scripts/.state';
      try {
        if (fs.existsSync(stateDir)) {
          const stateFiles = fs.readdirSync(stateDir);
          for (const file of stateFiles) {
            const filePath = path.join(stateDir, file);
            const stats = fs.statSync(filePath);
            const ageMinutes = (Date.now() - stats.mtimeMs) / 60000;
            // If modified in last 10 minutes, consider it active
            if (ageMinutes < 10) {
              activeBuilds.push({
                type: 'state_file',
                name: file,
                last_updated: stats.mtime,
                age_minutes: Math.round(ageMinutes),
              });
            }
          }
        }
      } catch (err) {
        // State dir doesn't exist or can't be read
      }

      // Check JARVIS-OVERNIGHT-PROGRESS.md timestamp
      const progressFile = '/Users/bengreenwood/Desktop/rbtr-command/v14/JARVIS-OVERNIGHT-PROGRESS.md';
      try {
        if (fs.existsSync(progressFile)) {
          const stats = fs.statSync(progressFile);
          const ageMinutes = (Date.now() - stats.mtimeMs) / 60000;
          if (ageMinutes < 60) {
            activeBuilds.push({
              type: 'progress_log',
              name: 'JARVIS-OVERNIGHT-PROGRESS.md',
              last_updated: stats.mtime,
              age_minutes: Math.round(ageMinutes),
            });
          }
        }
      } catch (err) {
        // File doesn't exist
      }

      return {
        active_builds: activeBuilds,
        count: activeBuilds.length,
        status: activeBuilds.length > 0 ? 'builds_detected' : 'idle',
      };
    },
  },

  {
    name: 'run_build_progress',
    description: 'Get progress for a specific build area by querying tasks.',
    input_schema: {
      type: 'object',
      properties: {
        area: { type: 'string', description: 'Build area: psnm, rbtr, forge, jarvis, booking-proof, etc' },
      },
      required: ['area'],
    },
    execute: async (input) => {
      // Query rbtr_tasks for the specified area/category
      const tasks = await sbQuery('rbtr_tasks', `category=eq.${input.area}&select=id,status,title,priority`).catch(() => []);

      if (tasks.length === 0) {
        return {
          area: input.area,
          total_tasks: 0,
          progress_percent: 100,
          message: `No tasks found for area: ${input.area}`,
        };
      }

      // Group by status
      const statusCounts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const completed = statusCounts['complete'] || 0;
      const total = tasks.length;
      const progressPercent = Math.round((completed / total) * 100);

      return {
        area: input.area,
        total_tasks: total,
        completed: completed,
        in_progress: statusCounts['in_progress'] || 0,
        open: statusCounts['open'] || 0,
        blocked: statusCounts['blocked'] || 0,
        progress_percent: progressPercent,
        by_status: statusCounts,
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════

export async function executeTool(toolName, input) {
  const tool = ROCKO_TOOLS.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  try {
    const result = await tool.execute(input);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Export for Anthropic API tool definitions
export function getAnthropicToolDefinitions() {
  return ROCKO_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));
}
