// ═══════════════════════════════════════════════════════════════════════════
// Google OAuth Callback
// GET /api/rocko/v2/google/auth/callback?code=...&state=...
// Exchanges code for tokens, stores in rocko_v2_integrations
// ═══════════════════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REDIRECT_URI = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}/api/rocko/v2/google/auth/callback`
  : 'http://localhost:3000/api/rocko/v2/google/auth/callback';

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Error</title></head>
      <body style="font-family: monospace; padding: 40px;">
        <h2>OAuth Error</h2>
        <p>Google OAuth failed: ${error}</p>
        <p><a href="/m/jarvis.html">Return to JARVIS</a></p>
      </body>
      </html>
    `);
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'code and state required' });
  }

  try {
    const stateData = JSON.parse(state);
    const { user_id = 'ben', scopes } = stateData;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Store in rocko_v2_integrations
    const integration = {
      user_id,
      service: 'google',
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      scopes: scope.split(' '),
      metadata: { requested_scopes: scopes },
      created_at: new Date().toISOString()
    };

    // Upsert (update if exists, insert if not)
    await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_integrations`, {
      method: 'POST',
      headers: {
        ...sbHeaders(),
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(integration)
    });

    // Success page
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: monospace; padding: 40px; background: #0a0a0a; color: #fafafa;">
        <h2 style="color: #60a5fa;">✓ Google Connected</h2>
        <p>Rocko can now access your Gmail and Calendar.</p>
        <p style="margin-top: 20px;"><a href="/m/jarvis.html" style="color: #c87a3a;">Return to JARVIS</a></p>
        <script>
          // Auto-close after 2 seconds if opened in popup
          if (window.opener) {
            setTimeout(() => window.close(), 2000);
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Error</title></head>
      <body style="font-family: monospace; padding: 40px;">
        <h2>OAuth Error</h2>
        <p>${error.message}</p>
        <p><a href="/m/jarvis.html">Return to JARVIS</a></p>
      </body>
      </html>
    `);
  }
}
