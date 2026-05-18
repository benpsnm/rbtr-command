// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 Verify Pairing Code
// POST /api/rocko/v2/auth/verify-code
// Exchanges pairing code for device token
// ═══════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function generateDeviceToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'code required' });
  }

  try {
    // Fetch pairing code from database
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rocko_v2_pairing_codes?code=eq.${code}&limit=1`,
      { headers: sbHeaders() }
    );

    if (!response.ok) {
      throw new Error('Failed to query pairing codes');
    }

    const codes = await response.json();

    if (!codes || codes.length === 0) {
      return res.status(404).json({
        error: 'Invalid pairing code',
        hint: 'Code may have expired or does not exist'
      });
    }

    const pairingRecord = codes[0];

    // Check if code expired
    if (new Date(pairingRecord.expires_at) < new Date()) {
      // Delete expired code
      await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_pairing_codes?id=eq.${pairingRecord.id}`, {
        method: 'DELETE',
        headers: sbHeaders()
      });

      return res.status(410).json({
        error: 'Pairing code expired',
        hint: 'Generate a new pairing code'
      });
    }

    // Generate device token
    const deviceToken = generateDeviceToken();
    const deviceId = `rocko_${Date.now()}`;

    // Create session with device token
    await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_sessions`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        id: deviceId,
        user_id: pairingRecord.user_id,
        device: pairingRecord.device_name || 'Mobile PWA',
        device_token: deviceToken,
        started_at: new Date().toISOString(),
        metadata: {
          pairing_method: 'code',
          pairing_code_used: code,
          paired_at: new Date().toISOString()
        }
      })
    });

    // Delete used pairing code
    await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_pairing_codes?id=eq.${pairingRecord.id}`, {
      method: 'DELETE',
      headers: sbHeaders()
    });

    return res.status(200).json({
      device_id: deviceId,
      device_token: deviceToken,
      user_id: pairingRecord.user_id,
      instructions: 'Save this token in localStorage as "rocko_device_token"'
    });

  } catch (error) {
    console.error('Code verification error:', error);
    return res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
}
