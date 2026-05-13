// ═══════════════════════════════════════════════════════════════════════════
// Rocko TTS Proxy
// POST /api/rocko/tts
// Proxies text-to-speech requests to ElevenLabs API server-side
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'M7ya1YbaeFaPXljg9BpK';

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({
      error: 'TTS unavailable',
      message: 'ELEVENLABS_API_KEY not configured server-side',
      fallback: 'text_only',
    });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
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
