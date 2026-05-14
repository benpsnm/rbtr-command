// ═══════════════════════════════════════════════════════════════════════════
// Google OAuth Initiation
// GET /api/rocko/v2/google/auth/init?scopes=gmail,calendar
// Redirects to Google OAuth consent screen
// ═══════════════════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/rocko/v2/google/auth/callback`
  : 'http://localhost:3000/api/rocko/v2/google/auth/callback';

const SCOPE_MAP = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose'
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ]
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { scopes = 'gmail,calendar', user_id = 'ben' } = req.query;

  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
  }

  // Build scope list
  const requestedScopes = scopes.split(',');
  const scopeList = [];

  requestedScopes.forEach(scope => {
    if (SCOPE_MAP[scope]) {
      scopeList.push(...SCOPE_MAP[scope]);
    }
  });

  if (scopeList.length === 0) {
    return res.status(400).json({ error: 'No valid scopes requested' });
  }

  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopeList.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: JSON.stringify({ user_id, scopes })
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return res.redirect(authUrl);
}
