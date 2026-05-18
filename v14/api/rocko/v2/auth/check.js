// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 Auth Check
// GET /api/rocko/v2/auth/check
// Verifies device token from Authorization header
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      authenticated: false,
      error: 'Missing or invalid Authorization header'
    });
  }

  const deviceToken = authHeader.substring(7);

  try {
    // Look up device token in sessions
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rocko_v2_sessions?device_token=eq.${deviceToken}&limit=1`,
      { headers: sbHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to query sessions');
    }

    const sessions = await response.json();

    if (!sessions || sessions.length === 0) {
      return res.status(401).json({
        authenticated: false,
        error: 'Invalid device token'
      });
    }

    const session = sessions[0];

    return res.status(200).json({
      authenticated: true,
      user_id: session.user_id,
      device_id: session.id,
      device_name: session.device,
      paired_at: session.metadata?.paired_at || session.started_at
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Auth check failed',
      message: error.message
    });
  }
}
