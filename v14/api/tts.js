// ═══════════════════════════════════════════════════════════════════════════
// JARVIS · Text-to-speech via ElevenLabs
// Falls back to 204 No-Content if no ELEVENLABS_API_KEY is set — frontend
// then uses browser SpeechSynthesis instead. Zero lock-in.
// ═══════════════════════════════════════════════════════════════════════════

// Voice strategy: try env-configured voice first (Ben's library pick),
// fall back to Daniel — a free-tier premade voice (authoritative British — JARVIS-tier).
// Other good free-tier JARVIS candidates:
//   Paul   (5Q0t7uMcjvnagumLfvZi) — authoritative older American
//   George (JBFqnCBsd6RMkjVDRZzb) — raspy British
//   Brian  (nPczCjzI2devNBz1zQrb) — calm narrator
const FREE_TIER_FALLBACK_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';  // Daniel (British, free-tier)
const DEFAULT_VOICE_ID = FREE_TIER_FALLBACK_VOICE_ID;
const DEFAULT_MODEL_ID = 'eleven_turbo_v2_5';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Deliberate 204 → frontend falls back to browser voice silently.
    res.status(204).end();
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { text, voiceId, stability = 0.55, similarity = 0.75, style = 0.15, speakerBoost = true } = body;

  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'text required' });
    return;
  }

  // Cap input to avoid runaway costs
  const clippedText = text.slice(0, 1500);
  const preferredVoice = voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;

  async function callEleven(vid) {
    return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: clippedText,
        model_id: DEFAULT_MODEL_ID,
        voice_settings: {
          stability,
          similarity_boost: similarity,
          style,
          use_speaker_boost: !!speakerBoost,
        },
      }),
    });
  }

  try {
    let r = await callEleven(preferredVoice);
    let usedVoice = preferredVoice;

    // If the preferred voice needs a paid plan, fall back to free-tier Daniel
    if (r.status === 402 && preferredVoice !== FREE_TIER_FALLBACK_VOICE_ID) {
      console.warn('[tts] preferred voice requires paid plan — falling back to Daniel');
      r = await callEleven(FREE_TIER_FALLBACK_VOICE_ID);
      usedVoice = FREE_TIER_FALLBACK_VOICE_ID;
    }

    if (!r.ok) {
      const errTxt = await r.text();
      console.error('[tts] ElevenLabs error', r.status, errTxt.slice(0, 300));
      // Debug mode: return the error details so we can diagnose
      const debug = (req.query && req.query.debug) || (req.url && req.url.includes('debug=1'));
      if (debug) {
        res.status(r.status).json({ elevenlabs_status: r.status, elevenlabs_error: errTxt.slice(0, 500), voice_id: usedVoice });
        return;
      }
      // Fallback to 204 so client uses browser voice rather than silent fail
      res.status(204).end();
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[tts] fetch error', err);
    res.status(204).end();
  }
};
