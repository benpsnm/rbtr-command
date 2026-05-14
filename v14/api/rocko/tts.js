// ═══════════════════════════════════════════════════════════════════════════
// Rocko TTS Proxy
// POST /api/rocko/tts
// Proxies text-to-speech requests to ElevenLabs API server-side
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function getActiveVoiceId(userId) {
  if (!userId || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const url = `${SUPABASE_URL}/rest/v1/user_voices?user_id=eq.${userId}&is_active=eq.true&select=voice_id`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) return null;

    const voices = await response.json();
    return voices.length > 0 ? voices[0].voice_id : null;
  } catch (error) {
    console.error('[TTS] Failed to fetch custom voice:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'M7ya1YbaeFaPXljg9BpK';

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({
      error: 'TTS unavailable',
      message: 'ELEVENLABS_API_KEY not configured server-side',
      fallback: 'text_only',
    });
  }

  const { text, user_id } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    // Check for custom voice, fall back to default
    const customVoiceId = await getActiveVoiceId(user_id);
    const voiceId = customVoiceId || DEFAULT_VOICE_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.75,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Rocko TTS] ElevenLabs API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'TTS API failed',
        message: errorText,
        fallback: 'text_only',
      });
    }

    // Convert stream to buffer (Vercel serverless doesn't support .pipe())
    const audioBuffer = await response.arrayBuffer();

    // Send audio back to client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[Rocko TTS] Error:', error);
    return res.status(500).json({
      error: 'TTS processing failed',
      message: error.message,
      fallback: 'text_only',
    });
  }
}
