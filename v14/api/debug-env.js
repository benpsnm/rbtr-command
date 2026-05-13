// Debug endpoint to check env vars
export default async function handler(req, res) {
  const envCheck = {
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? `${process.env.ELEVENLABS_API_KEY.slice(0, 10)}...` : 'NOT SET',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.slice(0, 10)}...` : 'NOT SET',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.slice(0, 10)}...` : 'NOT SET',
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || 'NOT SET',
  };

  res.json(envCheck);
}
