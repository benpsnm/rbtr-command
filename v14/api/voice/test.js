// ═══════════════════════════════════════════════════════════════════════════
// Voice Test Playback
// POST /api/voice/test
// Tests a voice with sample text via ElevenLabs TTS
// ═══════════════════════════════════════════════════════════════════════════

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { voice_id, text } = req.body;

  if (!voice_id || !text) {
    return res.status(400).json({ error: 'voice_id and text required' });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${await response.text()}`);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('[Voice Test] Error:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
    });
  }
}
