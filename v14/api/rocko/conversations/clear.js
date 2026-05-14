// ═══════════════════════════════════════════════════════════════════════════
// Rocko Conversations Clear
// POST /api/rocko/conversations/clear
// Deletes all conversation history
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '', method = 'DELETE') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const response = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) throw new Error('Supabase error');
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Delete all conversations (no filter = delete all)
    await sbQuery('rocko_conversations', 'id=neq.00000000-0000-0000-0000-000000000000');

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('[Conversations Clear] Error:', error);
    return res.status(500).json({
      error: 'Failed to clear conversations',
      message: error.message,
    });
  }
}
