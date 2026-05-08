'use strict';

// Supabase REST client using service role key (PostgREST).
// All standalone WMS endpoints use this — no service-role key ever reaches the browser.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
}

async function sbGet(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), { headers: headers() });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`[db] GET ${table} → ${r.status}: ${body}`);
  }
  return r.json();
}

async function sbPost(table, body, upsert = false) {
  const h = { ...headers() };
  if (upsert) h['Prefer'] = 'resolution=merge-duplicates,return=representation';
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`[db] POST ${table} → ${r.status}: ${text}`);
  }
  return r.json();
}

async function sbPatch(table, filter, body) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, `eq.${v}`));
  const r = await fetch(url.toString(), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`[db] PATCH ${table} → ${r.status}: ${text}`);
  }
  return r.json();
}

async function sbDelete(table, filter) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, `eq.${v}`));
  const r = await fetch(url.toString(), { method: 'DELETE', headers: headers() });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`[db] DELETE ${table} → ${r.status}: ${text}`);
  }
  return r.status === 204 ? null : r.json();
}

module.exports = { sbGet, sbPost, sbPatch, sbDelete };
