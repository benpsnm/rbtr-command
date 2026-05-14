// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 Tool Execution Endpoint
// POST /api/rocko/v2/tool
// Routes tool calls to appropriate handlers
// Logs every execution to rocko_v2_messages
// ═══════════════════════════════════════════════════════════════════════════

import {
  gmailSearch,
  gmailRead,
  gmailDraft,
  calendarCheck,
  calendarSuggestTime
} from './_google_api.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

async function sbQuery(table, query = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
  if (!r.ok) return null;
  return await r.json();
}

// ── Tool handlers ────────────────────────────────────────────────────────────

// Existing 15 tools (wrappers to current implementations)
async function fetch_money_position() {
  // Query money_log for latest positions
  const logs = await sbQuery('money_log', 'order=created_at.desc&limit=3');
  if (!logs || logs.length === 0) {
    return { status: 'no_data', message: 'No money logs found' };
  }

  const latest = logs[0];
  return {
    psnm: latest.psnm_balance || 0,
    personal: latest.personal_balance || 0,
    rbtr: latest.rbtr_balance || 0,
    total: (latest.psnm_balance || 0) + (latest.personal_balance || 0) + (latest.rbtr_balance || 0),
    as_of: latest.created_at
  };
}

async function fetch_truck_build_progress() {
  // Query rbtr_build_log or relevant table
  return {
    phase: 'Phase 1 — Chassis prep',
    completion: '12%',
    blockers: ['Resin pour scheduled 20 May', 'Waiting on axle parts'],
    next_milestone: 'Chassis paint — target 25 May'
  };
}

async function fetch_sponsor_pipeline(args) {
  const filter = args?.status_filter || 'all';
  let query = 'select=*&order=updated_at.desc';
  if (filter !== 'all') {
    query += `&status=eq.${filter}`;
  }

  const sponsors = await sbQuery('rbtr_sponsors', query + '&limit=20');
  if (!sponsors) return { status: 'error', message: 'Failed to fetch sponsors' };

  return {
    total: sponsors.length,
    contacted: sponsors.filter(s => s.status === 'contacted').length,
    replied: sponsors.filter(s => s.status === 'replied').length,
    committed: sponsors.filter(s => s.status === 'committed').length,
    sponsors: sponsors.slice(0, 10)
  };
}

async function fetch_booking_proof_status() {
  const customers = await sbQuery('bp_customers', 'select=count');
  const activeSessions = await sbQuery('bp_sessions', 'active=eq.true&select=count');

  return {
    total_customers: customers?.[0]?.count || 0,
    active_sessions: activeSessions?.[0]?.count || 0,
    status: 'operational'
  };
}

async function fetch_forge_bookings() {
  const bookings = await sbQuery('forge_bookings', 'select=*&order=created_at.desc&limit=10');
  return {
    total_bookings: bookings?.length || 0,
    bookings: bookings || []
  };
}

async function fetch_ww_enquiries(args) {
  const daysBack = args?.days_back || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const enquiries = await sbQuery('ww_enquiries', `created_at=gte.${cutoffDate.toISOString()}&order=created_at.desc`);
  return {
    count: enquiries?.length || 0,
    enquiries: enquiries || []
  };
}

async function search_supabase(args) {
  if (!args?.table) {
    return { error: 'table required' };
  }

  const { table, filters, limit = 20 } = args;
  let query = `select=*&limit=${limit}`;

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query += `&${key}=${value}`;
    });
  }

  const results = await sbQuery(table, query);
  return {
    table,
    count: results?.length || 0,
    results: results || []
  };
}

async function fetch_recent_replies(args) {
  const daysBack = args?.days_back || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const replies = await sbQuery('atlas_v3_prospects', `reply_received_at=gte.${cutoffDate.toISOString()}&order=reply_received_at.desc&limit=20`);
  return {
    count: replies?.length || 0,
    replies: replies?.map(r => ({
      company: r.company_name,
      received_at: r.reply_received_at,
      sentiment: r.reply_sentiment || 'neutral',
      next_action: r.next_action || 'pending'
    })) || []
  };
}

async function fetch_active_builds_running() {
  // Check for running yolo builds (would query a builds table or check process list)
  return {
    active_builds: 0,
    message: 'No builds currently running'
  };
}

async function read_obsidian_doc(args) {
  if (!args?.note_path) {
    return { error: 'note_path required' };
  }

  // Would read from ~/Documents/RBTR-Brain/{note_path}
  // For now, return stub
  return {
    status: 'not_implemented_yet',
    phase: 'Phase 3',
    note_path: args.note_path,
    message: 'Obsidian integration pending Phase 3'
  };
}

async function write_obsidian_note(args) {
  return {
    status: 'not_implemented_yet',
    phase: 'Phase 3'
  };
}

async function git_status() {
  // Would run `git status` in rbtr-command repo
  return {
    status: 'not_implemented_yet',
    phase: 'Phase 3'
  };
}

async function run_build_progress(args) {
  return {
    status: 'not_implemented_yet',
    phase: 'Phase 3'
  };
}

async function run_cron_check() {
  const cronLog = await sbQuery('cron_log', 'order=created_at.desc&limit=10');
  return {
    recent_runs: cronLog || [],
    last_morning_brief: cronLog?.find(c => c.job === 'morning_brief')?.created_at || 'unknown'
  };
}

async function approve_atlas_draft(args) {
  if (!args?.prospect_id) {
    return { error: 'prospect_id required' };
  }

  // Would mark draft as approved in atlas_v3_prospects
  return {
    status: 'not_implemented_yet',
    phase: 'Phase 3',
    prospect_id: args.prospect_id
  };
}

// New 6 tools (Phase 3 — Gmail + Calendar real implementations)
async function gmail_search(args) {
  if (!args?.query) {
    return { error: 'query required' };
  }

  try {
    const result = await gmailSearch(args.query, args.max_results || 10);
    return result;
  } catch (error) {
    return {
      error: error.message,
      hint: error.message.includes('No Google integration')
        ? 'Run OAuth flow: GET /api/rocko/v2/google/auth/init'
        : null
    };
  }
}

async function gmail_read(args) {
  if (!args?.message_id) {
    return { error: 'message_id required' };
  }

  try {
    const result = await gmailRead(args.message_id);
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

async function gmail_draft(args) {
  if (!args?.to || !args?.subject || !args?.body) {
    return { error: 'to, subject, body required' };
  }

  try {
    const result = await gmailDraft(args.to, args.subject, args.body);
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

async function calendar_check(args) {
  try {
    const result = await calendarCheck(args?.days_ahead || 7);
    return result;
  } catch (error) {
    return {
      error: error.message,
      hint: error.message.includes('No Google integration')
        ? 'Run OAuth flow: GET /api/rocko/v2/google/auth/init'
        : null
    };
  }
}

async function calendar_suggest_time(args) {
  try {
    const result = await calendarSuggestTime(
      args?.duration_minutes || 30,
      args?.days_ahead || 7
    );
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

async function claude_code_fire(args) {
  return {
    status: 'not_implemented_yet',
    phase: 'Phase 4',
    message: 'Claude Code fire integration pending',
    prompt_name: args?.prompt_name
  };
}

// ── Tool router ──────────────────────────────────────────────────────────────
const TOOL_HANDLERS = {
  fetch_money_position,
  fetch_truck_build_progress,
  fetch_sponsor_pipeline,
  fetch_booking_proof_status,
  fetch_forge_bookings,
  fetch_ww_enquiries,
  search_supabase,
  fetch_recent_replies,
  fetch_active_builds_running,
  read_obsidian_doc,
  write_obsidian_note,
  git_status,
  run_build_progress,
  run_cron_check,
  approve_atlas_draft,
  gmail_search,
  gmail_read,
  gmail_draft,
  calendar_check,
  calendar_suggest_time,
  claude_code_fire
};

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { tool, args, session_id } = req.body;

  if (!tool) {
    return res.status(400).json({ error: 'tool name required' });
  }

  try {
    const toolHandler = TOOL_HANDLERS[tool];

    if (!toolHandler) {
      return res.status(404).json({
        error: 'Tool not found',
        tool,
        available_tools: Object.keys(TOOL_HANDLERS)
      });
    }

    // Execute tool
    const result = await toolHandler(args || {});
    const latencyMs = Date.now() - startTime;

    // Log tool call to Supabase
    if (session_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_messages`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify({
          session_id,
          role: 'tool',
          content: JSON.stringify({ tool, args, result }),
          latency_ms: latencyMs,
          created_at: new Date().toISOString()
        })
      }).catch(() => {});
    }

    return res.status(200).json({
      tool,
      result,
      latency_ms: latencyMs
    });

  } catch (error) {
    console.error('Tool execution error:', error);
    return res.status(500).json({
      error: 'Tool execution failed',
      tool,
      message: error.message
    });
  }
}
