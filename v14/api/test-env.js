// Test endpoint to dump environment variables
export default async function handler(req, res) {
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL || 'NOT SET',
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE || 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT SET',
    RBTR_AUTH_TOKEN: process.env.RBTR_AUTH_TOKEN ? 'SET' : 'NOT SET',
    SESSION_SIGNING_KEY: process.env.SESSION_SIGNING_KEY ? 'SET' : 'NOT SET',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET',
  };

  return res.status(200).json(envVars);
}
