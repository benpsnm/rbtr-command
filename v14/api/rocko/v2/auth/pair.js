// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 Device Pairing
// POST /api/rocko/v2/auth/pair
// Generates device token for mobile PWA authentication
// ═══════════════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAIRING_SECRET = process.env.ROCKO_PAIRING_SECRET || 'dev-pairing-secret';

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

function generatePairingCode() {
  // 6-digit code for easier manual entry
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode = 'qr', user_id = 'ben', device_name } = req.body;

  try {
    if (mode === 'qr') {
      // QR code pairing — generates token immediately
      const deviceToken = generateDeviceToken();
      const deviceId = `rocko_${Date.now()}`;

      // Store device token
      await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_sessions`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify({
          id: deviceId,
          user_id,
          device: device_name || 'Mobile PWA',
          device_token: deviceToken,
          started_at: new Date().toISOString(),
          metadata: { pairing_method: 'qr', paired_at: new Date().toISOString() }
        })
      });

      return res.status(200).json({
        mode: 'qr',
        device_id: deviceId,
        device_token: deviceToken,
        expires_in: null, // No expiry for device tokens
        instructions: 'Save this token in localStorage as "rocko_device_token"'
      });

    } else if (mode === 'code') {
      // Pairing code — generates temporary code that must be verified
      const pairingCode = generatePairingCode();
      const codeId = `code_${Date.now()}`;

      // Store pairing code (expires in 5 minutes)
      await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_pairing_codes`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify({
          id: codeId,
          code: pairingCode,
          user_id,
          device_name: device_name || 'Mobile PWA',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        })
      });

      return res.status(200).json({
        mode: 'code',
        pairing_code: pairingCode,
        expires_in: 300, // 5 minutes
        instructions: 'Enter this code on your mobile device within 5 minutes'
      });

    } else {
      return res.status(400).json({
        error: 'Invalid mode',
        valid_modes: ['qr', 'code']
      });
    }

  } catch (error) {
    console.error('Pairing error:', error);
    return res.status(500).json({
      error: 'Pairing failed',
      message: error.message
    });
  }
}
