'use strict';
// Atlas v3 — shared Supabase helpers
// All agents import from here.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function select(table, qs = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function insert(table, rows, { returning = true } = {}) {
  const prefer = returning ? 'return=representation' : 'return=minimal';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: prefer }),
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbInsert(${table}) ${r.status}: ${err.slice(0, 200)}`);
  }
  return returning ? r.json() : null;
}

async function update(table, match, data) {
  const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbUpdate(${table}) ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

async function upsert(table, rows, onConflict) {
  const prefer = `return=representation,resolution=merge-duplicates`;
  const qs = onConflict ? `on_conflict=${onConflict}` : '';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: prefer }),
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbUpsert(${table}) ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

// Log a stage transition in prospect_status_log
async function logStageTransition(prospectId, fromStage, toStage, triggeredBy, notes = null) {
  try {
    await insert('prospect_status_log', { prospect_id: prospectId, from_stage: fromStage, to_stage: toStage, triggered_by: triggeredBy, notes }, { returning: false });
  } catch (e) {
    console.error('[av3_db.logStageTransition]', e.message);
  }
}

// Advance a prospect to a new pipeline stage (with audit log)
async function advanceStage(prospectId, currentStage, newStage, agentName, notes = null) {
  try {
    await Promise.all([
      update('prospects', { id: prospectId }, { pipeline_stage: newStage }),
      logStageTransition(prospectId, currentStage, newStage, agentName, notes),
    ]);
  } catch (e) {
    console.error('[av3_db.advanceStage]', e.message);
  }
}

module.exports = { select, insert, update, upsert, logStageTransition, advanceStage };
