// ═══════════════════════════════════════════════════════════════════════════
// Evening debrief — fires at 9pm UK daily via /api/cron-evening-debrief
//
// Pulls today's data, generates 45-60 sec script via Claude, renders via
// ElevenLabs (Hannah voice), delivers via Telegram.
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const PREFERRED_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'M7ya1YbaeFaPXljg9BpK';
const FALLBACK_VOICE_ID  = 'onwK4e9ZLuTAKqWW03F9';
const TTS_MODEL_ID       = 'eleven_multilingual_v2';
const STORAGE_BUCKET     = 'daily-briefs';

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, ...extra };
  if (SUPABASE_KEY?.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

const today = () => new Date().toISOString().slice(0, 10);

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function gatherDebriefData() {
  const todayStr = today();
  const [mood, tasks, calls, goals, psnmOccupancy] = await Promise.all([
    sbSelect('ben_mood_log', `date=eq.${todayStr}&select=mood,energy,sleep_hours,notes&limit=1`).then(r => r?.[0] || null),
    sbSelect('ben_tasks', `due_date=eq.${todayStr}&select=title,status,portal`).then(r => r || []),
    sbSelect('psnm_outreach_touches', `created_at=gte.${todayStr}T00:00:00&select=company,outcome`).then(r => r || []),
    sbSelect('ben_goals', `tier=eq.today&status=eq.open&select=title&order=priority.asc&limit=3`).then(r => r || []),
    sbSelect('psnm_occupancy_snapshots', 'select=pallets,date&order=date.desc&limit=1').then(r => r?.[0] || null),
  ]);

  const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'complete');
  const callsLogged = calls.length;
  const callsWon = calls.filter(c => c.outcome === 'won' || c.outcome === 'booked').length;

  return {
    date: todayStr,
    weekday: new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
    mood_score: mood?.mood ?? null,
    energy_score: mood?.energy ?? null,
    sleep_hours: mood?.sleep_hours ?? null,
    mood_notes: mood?.notes ?? null,
    tasks_completed: completedTasks.length,
    tasks_total: tasks.length,
    calls_logged: callsLogged,
    calls_won: callsWon,
    top3_tomorrow: goals.map(g => g.title),
    psnm_pallets: psnmOccupancy?.pallets ?? null,
  };
}

async function callClaude(data) {
  const prompt = `You are generating Ben Greenwood's evening debrief. This will be spoken via ElevenLabs TTS at 9pm and delivered as a Telegram voice note.

TARGET LENGTH: 100–150 words (45–60 seconds at natural pace).

DATA:
${JSON.stringify(data, null, 2)}

PATTERN: "Ben. Evening. Today you [brief factual summary of what happened — tasks, calls, pallets if material]. [One win sentence if genuine.] [One honest sentence on what was hard or left undone, if material.] Tomorrow's Top 3 start with [first priority from top3_tomorrow, or 'nothing set yet']. Sleep well."

TONE: Direct. No filler. No "great job". Acknowledge the real data. If mood was logged, weave it in naturally (e.g. "You logged a 7 mood — something landed today."). If nothing material happened, say that honestly.

BANNED: leverage, synergy, passionate, ecosystem, robust, unlock, value-add, circle back, bandwidth, holistic, empower, reach out, cutting-edge, streamline, actionable insights

OUTPUT: Only the script text. No markdown, no preamble. Start with "Ben. Evening." End with "Sleep well."`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

async function renderAudio(text) {
  if (!ELEVENLABS_API_KEY) return { ok: false, reason: 'no_api_key' };
  async function tryVoice(id) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + id, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: TTS_MODEL_ID, voice_settings: { stability: 0.55, similarity_boost: 0.75 } }),
    });
    if (!r.ok) return { ok: false, status: r.status, error: (await r.text()).slice(0, 200) };
    return { ok: true, audio: Buffer.from(await r.arrayBuffer()), voice_used: id };
  }
  let result = await tryVoice(PREFERRED_VOICE_ID);
  if (!result.ok && result.status === 402) result = await tryVoice(FALLBACK_VOICE_ID);
  return result;
}

async function uploadToStorage(filename, audioBuffer) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { ok: false };
  try {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' };
    if (SUPABASE_KEY.startsWith('eyJ')) headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${filename}`, { method: 'POST', headers, body: audioBuffer });
    if (!r.ok && r.status !== 409) return { ok: false, status: r.status };
    return { ok: true, public_url: `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}` };
  } catch (e) { return { ok: false, error: e.message }; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (!ANTHROPIC_API_KEY) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' }); return; }

  try {
    const data = await gatherDebriefData();
    const script = await callClaude(data);
    let audioUrl = null;
    if (ELEVENLABS_API_KEY) {
      const tts = await renderAudio(script);
      if (tts.ok) {
        const filename = `debrief-${data.date}.mp3`;
        const upload = await uploadToStorage(filename, tts.audio);
        if (upload.ok) audioUrl = upload.public_url;
      }
    }
    res.status(200).json({ ok: true, script, audio_url: audioUrl, data, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[evening-debrief]', err);
    res.status(500).json({ error: err.message });
  }
};
