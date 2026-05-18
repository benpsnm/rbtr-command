// ═══════════════════════════════════════════════════════════════════════════
// Rocko Conversations List
// GET /api/rocko/conversations/list?q=search
// Returns conversation sessions grouped by session_id
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(sql) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/get_conversation_sessions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    // If RPC doesn't exist, fall back to direct query
    const fallbackUrl = `${SUPABASE_URL}/rest/v1/rocko_conversations?order=created_at.desc&limit=30&select=session_id,user_input,created_at,tools_called`;
    const fallbackResponse = await fetch(fallbackUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!fallbackResponse.ok) throw new Error('Failed to fetch conversations');

    const rows = await fallbackResponse.json();

    // Group by session_id
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.session_id]) {
        grouped[row.session_id] = {
          session_id: row.session_id,
          created_at: row.created_at,
          message_count: 0,
          first_message: '',
          tools_used: 0,
        };
      }

      grouped[row.session_id].message_count++;
      if (!grouped[row.session_id].first_message && row.user_input) {
        grouped[row.session_id].first_message = row.user_input;
      }
      if (row.tools_called && row.tools_called.length > 0) {
        grouped[row.session_id].tools_used += row.tools_called.length;
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return await response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let sessions = await sbQuery();

    // Filter by search term if provided
    const { q } = req.query;
    if (q) {
      const term = q.toLowerCase();
      sessions = sessions.filter(s =>
        (s.first_message && s.first_message.toLowerCase().includes(term)) ||
        (s.session_id && s.session_id.toLowerCase().includes(term))
      );
    }

    return res.status(200).json(sessions);

  } catch (error) {
    console.error('[Conversations List] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message,
    });
  }
}
