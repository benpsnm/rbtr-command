// ═══════════════════════════════════════════════════════════════════════════
// Rocko Conversation Get
// GET /api/rocko/conversations/get?session_id=xxx
// Returns all messages for a session
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) throw new Error('Supabase error');
  return await response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    const messages = await sbQuery('rocko_conversations', `session_id=eq.${session_id}&order=created_at.asc&select=*`);
    return res.status(200).json(messages);

  } catch (error) {
    console.error('[Conversation Get] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversation',
      message: error.message,
    });
  }
}
