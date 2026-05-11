'use strict';
// Garmin Connect OAuth 2.0 callback handler
// Feature branch: feature/garmin-integration
// NOT DEPLOYED — awaiting Vercel restoration + Garmin developer app registration
//
// Flow:
//   1. Ben clicks "Connect Garmin" in Command Centre → Settings
//   2. Command Centre redirects to Garmin OAuth endpoint with client_id
//   3. Ben logs in to Garmin Connect and approves permissions
//   4. Garmin redirects back to /api/garmin/oauth-callback?code=AUTH_CODE&state=STATE
//   5. This handler exchanges the code for access + refresh tokens
//   6. Tokens stored in Supabase (rbtr_wellness_garmin_tokens table — create when deploying)
//   7. Command Centre shows "Garmin Connected" in Wellness → Garmin Overnight card

const GARMIN_CLIENT_ID     = process.env.GARMIN_CLIENT_ID;
const GARMIN_CLIENT_SECRET = process.env.GARMIN_CLIENT_SECRET;
const GARMIN_REDIRECT_URI  = process.env.GARMIN_REDIRECT_URI || 'https://rbtr-jarvis.vercel.app/api/garmin/oauth-callback';
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(302, `/error?msg=garmin_oauth_denied&detail=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Exchange auth code for tokens
    const tokenRes = await fetch('https://connectapi.garmin.com/oauth-service/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${GARMIN_CLIENT_ID}:${GARMIN_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: GARMIN_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Token exchange failed: ${tokenRes.status} ${body}`);
    }

    const tokens = await tokenRes.json();
    // tokens: { access_token, refresh_token, expires_in, token_type }

    // Upsert tokens into Supabase (single-row — only one Garmin account)
    await fetch(`${SUPABASE_URL}/rest/v1/rbtr_wellness_garmin_tokens?id=eq.ben`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });

    // Redirect back to Wellness section
    res.redirect(302, '/?section=sec-wellness&garmin=connected');
  } catch (err) {
    console.error('[garmin/oauth-callback]', err);
    res.status(500).json({ error: err.message });
  }
}
