// Supabase proxy — keeps the service_role key server-side.
// Use for: logging goals, reflections, sessions, tool registry, signals.
//
// Expected payload:
//   { table: 'goals', op: 'insert'|'select'|'update'|'delete', row?: {...}, match?: {...} }
//
// Frontend never touches service_role key.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_TABLES = new Set([
  'jarvis_goals',
  'jarvis_accomplishments',
  'jarvis_reflections',
  'jarvis_learning_sessions',
  'jarvis_learning_streaks',
  'jarvis_tool_registry',
  'jarvis_signals',
  'jarvis_conversations',
]);

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Supabase env vars not set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: cors, body: 'Invalid JSON' }; }

  const { table, op, row, match } = body;
  if (!ALLOWED_TABLES.has(table)) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'table not allowed' }) };
  }

  const base = `${SUPABASE_URL}/rest/v1/${table}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  try {
    let url = base;
    let method = 'GET';
    let payload;

    if (op === 'insert') { method = 'POST'; payload = JSON.stringify(row); }
    else if (op === 'select') { method = 'GET'; if (match) { const q = Object.entries(match).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&'); url = `${base}?${q}`; } }
    else if (op === 'update') { method = 'PATCH'; const q = Object.entries(match||{}).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&'); url = `${base}?${q}`; payload = JSON.stringify(row); }
    else if (op === 'delete') { method = 'DELETE'; const q = Object.entries(match||{}).map(([k,v])=>`${k}=eq.${encodeURIComponent(v)}`).join('&'); url = `${base}?${q}`; }
    else return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'op must be insert|select|update|delete' }) };

    const r = await fetch(url, { method, headers, body: payload });
    const text = await r.text();
    return { statusCode: r.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: text || '[]' };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
