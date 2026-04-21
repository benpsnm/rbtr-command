// ═══════════════════════════════════════════════════════════════════════════
// Voice Studio — consolidated endpoint (was voice-upload / voice-play / voice-clone)
//
// POST /api/voice-studio?action=upload  — multipart: file, person, script_title, script_used, duration_secs
// GET  /api/voice-studio?action=play&session_id=<uuid>
// POST /api/voice-studio?action=clone   — body: { session_ids, voice_name, person }
//
// Merged to fit under the Vercel Hobby 12-function cap so atlas.js can ship.
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BUCKET = 'voice-samples';

module.exports.config = { api: { bodyParser: false } };

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, ...extra };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handlePlay(req, res, query) {
  const sessionId = query.session_id;
  if (!sessionId) { res.status(400).send('session_id required'); return; }
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).send('env not set'); return; }
  try {
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/voice_recording_sessions?id=eq.${sessionId}&select=storage_path`, { headers: sbHeaders() });
    const rows = await r1.json();
    if (!rows?.[0]?.storage_path) { res.status(404).send('not found'); return; }
    const r2 = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${rows[0].storage_path}`, { headers: sbHeaders() });
    if (!r2.ok) { res.status(502).send('storage fetch failed'); return; }
    const buf = Buffer.from(await r2.arrayBuffer());
    res.setHeader('Content-Type', r2.headers.get('content-type') || 'audio/webm');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).send(buf);
  } catch (err) { res.status(500).send(err.message); }
}

function parseMultipart(buf, boundary) {
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buf.indexOf(delim);
  while (start !== -1) {
    const after = start + delim.length;
    const next = buf.indexOf(delim, after);
    if (next === -1) break;
    const raw = buf.slice(after, next - 2);
    const headerEnd = raw.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = next; continue; }
    const headers = raw.slice(0, headerEnd).toString('utf8');
    const payload = raw.slice(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]*)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    if (nameMatch) parts.push({ name: nameMatch[1], filename: filenameMatch?.[1], contentType: contentTypeMatch?.[1], data: payload });
    start = next;
  }
  return parts;
}

async function handleUpload(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'env not set' }); return; }
  const ctype = req.headers['content-type'] || '';
  const m = ctype.match(/boundary=(?:"([^"]+)"|([^;]+))/);
  if (!m) { res.status(400).json({ error: 'missing multipart boundary' }); return; }
  const boundary = m[1] || m[2];
  try {
    const body = await readBody(req);
    const parts = parseMultipart(body, boundary);
    const field = n => parts.find(p => p.name === n && !p.filename)?.data?.toString('utf8').trim() || null;
    const file = parts.find(p => p.name === 'file' && p.filename);
    if (!file) { res.status(400).json({ error: 'file required' }); return; }
    const person = field('person');
    if (person !== 'ben' && person !== 'sarah') { res.status(400).json({ error: "person must be 'ben' or 'sarah'" }); return; }
    const script_title = field('script_title');
    const script_used = field('script_used');
    const duration_secs = Number(field('duration_secs')) || null;
    const ext = (file.filename?.match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'webm').toLowerCase();
    const storagePath = `${person}/${new Date().toISOString().slice(0,10)}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
      method: 'POST',
      headers: sbHeaders({ 'Content-Type': file.contentType || 'audio/webm', 'x-upsert': 'true' }),
      body: file.data,
    });
    if (!uploadRes.ok) { res.status(502).json({ error: 'storage upload failed', status: uploadRes.status }); return; }
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/voice_recording_sessions`, {
      method: 'POST',
      headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({ person, script_title, script_used, duration_secs, storage_path: storagePath, file_size_bytes: file.data.length }),
    });
    if (!insertRes.ok) { res.status(502).json({ error: 'db insert failed', status: insertRes.status }); return; }
    const [row] = await insertRes.json();
    res.status(200).json({ session_id: row.id, person: row.person, duration_secs: row.duration_secs, file_size_bytes: row.file_size_bytes });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

async function handleClone(req, res) {
  if (!ELEVENLABS_API_KEY) { res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' }); return; }
  if (!SUPABASE_URL || !SUPABASE_KEY) { res.status(500).json({ error: 'Supabase env not set' }); return; }
  let body;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw.toString('utf8') || '{}');
  } catch { res.status(400).json({ error: 'invalid json' }); return; }
  const { session_ids, voice_name, person } = body;
  if (!Array.isArray(session_ids) || !session_ids.length) { res.status(400).json({ error: 'session_ids array required' }); return; }
  if (!voice_name) { res.status(400).json({ error: 'voice_name required' }); return; }
  if (person !== 'ben' && person !== 'sarah') { res.status(400).json({ error: "person must be 'ben' or 'sarah'" }); return; }
  try {
    const idList = session_ids.map(encodeURIComponent).join(',');
    const r1 = await fetch(`${SUPABASE_URL}/rest/v1/voice_recording_sessions?id=in.(${idList})&select=id,storage_path,person`, { headers: sbHeaders() });
    const sessions = await r1.json();
    if (!Array.isArray(sessions) || sessions.length === 0) { res.status(404).json({ error: 'sessions not found' }); return; }
    const blobs = await Promise.all(sessions.map(async s => {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${s.storage_path}`, { headers: sbHeaders() });
      if (!r.ok) throw new Error(`storage fetch failed for ${s.id}: ${r.status}`);
      return { buffer: Buffer.from(await r.arrayBuffer()), contentType: r.headers.get('content-type') || 'audio/webm', filename: s.storage_path.split('/').pop() };
    }));
    const boundary = '----rbtr' + Math.random().toString(36).slice(2);
    const chunks = [];
    const push = s => chunks.push(Buffer.from(s, 'utf8'));
    push(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${voice_name}\r\n`);
    push(`--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nRBTR clone for ${person}\r\n`);
    blobs.forEach(b => {
      push(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${b.filename}"\r\nContent-Type: ${b.contentType}\r\n\r\n`);
      chunks.push(b.buffer);
      push('\r\n');
    });
    push(`--${boundary}--\r\n`);
    const multipart = Buffer.concat(chunks);
    const elRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: multipart,
    });
    if (!elRes.ok) {
      const t = await elRes.text();
      const code = elRes.status;
      return res.status(code === 401 ? 401 : (code === 402 ? 402 : 502)).json({
        error: 'ElevenLabs voice creation failed', elevenlabs_status: code, elevenlabs_body: t.slice(0, 400),
      });
    }
    const elJson = await elRes.json();
    const voiceId = elJson.voice_id;
    const nowIso = new Date().toISOString();
    await Promise.all(sessions.map(s =>
      fetch(`${SUPABASE_URL}/rest/v1/voice_recording_sessions?id=eq.${s.id}`, {
        method: 'PATCH',
        headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ uploaded_to_elevenlabs: true, elevenlabs_voice_id: voiceId, elevenlabs_voice_name: voice_name, cloned_at: nowIso }),
      })
    ));
    res.status(200).json({ voice_id: voiceId, voice_name, person, session_count: sessions.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const action = url.searchParams.get('action');
  if (req.method === 'GET' && action === 'play') return handlePlay(req, res, Object.fromEntries(url.searchParams));
  if (req.method === 'POST' && action === 'upload') return handleUpload(req, res);
  if (req.method === 'POST' && action === 'clone') return handleClone(req, res);
  res.status(400).json({ error: 'action required: play|upload|clone' });
};
