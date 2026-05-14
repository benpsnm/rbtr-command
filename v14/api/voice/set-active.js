// ═══════════════════════════════════════════════════════════════════════════
// Voice Set Active
// POST /api/voice/set-active
// Marks a voice as active for a user (deactivates others)
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) throw new Error('Supabase error');
  return method === 'PATCH' ? await response.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, voice_id } = req.body;

  if (!user_id || !voice_id) {
    return res.status(400).json({ error: 'user_id and voice_id required' });
  }

  try {
    // Deactivate all voices for this user
    await sbQuery('user_voices', `user_id=eq.${user_id}`, 'PATCH', {
      is_active: false,
    });

    // Activate the selected voice
    await sbQuery('user_voices', `id=eq.${voice_id}`, 'PATCH', {
      is_active: true,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Voice Set Active] Error:', error);
    return res.status(500).json({
      error: 'Failed to set active voice',
      message: error.message,
    });
  }
}
