// ═══════════════════════════════════════════════════════════════════════════
// Voice List
// GET /api/voice/list?user_id=ben
// Returns all voices for a user
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('Supabase error');
  return await response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    const voices = await sbQuery('user_voices', `user_id=eq.${user_id}&order=created_at.desc&select=*`);
    return res.status(200).json(voices);
  } catch (error) {
    console.error('[Voice List] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch voices' });
  }
}
