// GET /api/strategy-doc?name=locked_plan|atlas_v2|system_prompt
// Returns markdown text for Strategy tab in WMS.
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RBTR_AUTH_TOKEN = process.env.RBTR_AUTH_TOKEN;

function checkAuth(req) {
  if (!RBTR_AUTH_TOKEN) return { ok: true };
  const supplied = req.headers?.['x-rbtr-auth'];
  const origin = req.headers?.origin || '';
  const referer = req.headers?.referer || '';
  const host = req.headers?.host || '';
  const isSameOrigin = host && (origin.includes(host) || referer.includes(host)) &&
    (host === 'rbtr-jarvis.vercel.app' || host.endsWith('.vercel.app') || host.startsWith('localhost'));
  if (supplied === RBTR_AUTH_TOKEN || isSameOrigin) return { ok: true };
  return { ok: false, error: 'x-rbtr-auth header missing or invalid' };
}

const DOC_MAP = {
  locked_plan:   path.join(__dirname, '../../PSNM_LOCKED_PLAN_v1.md'),
  atlas_v2:      path.join(__dirname, '../../ATLAS_V2_FRAMEWORK.md'),
  system_prompt: path.join(__dirname, '_atlas_system_prompt.md'),
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'GET only' }); return; }

  const auth = checkAuth(req);
  if (!auth.ok) { res.status(401).json({ error: auth.error }); return; }

  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const name = url.searchParams.get('name');

  if (!name || !DOC_MAP[name]) {
    res.status(400).json({ error: 'name must be one of: ' + Object.keys(DOC_MAP).join(', ') });
    return;
  }

  try {
    const content = fs.readFileSync(DOC_MAP[name], 'utf8');
    res.status(200).json({ ok: true, name, content });
  } catch (e) {
    res.status(404).json({ ok: false, error: `Doc not found: ${name}`, detail: e.message });
  }
};
