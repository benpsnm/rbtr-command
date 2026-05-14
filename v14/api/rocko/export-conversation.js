// ═══════════════════════════════════════════════════════════════════════════
// Rocko Export Conversation
// POST /api/rocko/export-conversation
// Exports conversation to Obsidian markdown file
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import os from 'os';

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    // Fetch conversation messages
    const messages = await sbQuery('rocko_conversations', `session_id=eq.${session_id}&order=created_at.asc&select=*`);

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Generate markdown
    const firstMessage = messages[0];
    const date = new Date(firstMessage.created_at);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().slice(0, 5).replace(':', ''); // HHmm
    const sessionShort = session_id.substring(0, 8);

    const filename = `${dateStr}-${timeStr}-rocko-${sessionShort}.md`;
    const filepath = path.join(os.homedir(), 'Documents/RBTR-Brain/02-Conversations', filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const markdown = `# Rocko Conversation — ${date.toLocaleString()}

**Session ID:** \`${session_id}\`
**Messages:** ${messages.length}
**Exported:** ${new Date().toLocaleString()}

---

${messages.map((m, i) => {
  let md = '';
  if (m.user_input) {
    md += `## You\n\n${m.user_input}\n\n`;
  }
  if (m.rocko_response) {
    md += `## Rocko\n\n${m.rocko_response}\n\n`;
    if (m.tools_called && m.tools_called.length > 0) {
      md += `**Tools used:** ${m.tools_called.join(', ')}\n\n`;
    }
  }
  md += `*${new Date(m.created_at).toLocaleTimeString()}*\n\n---\n\n`;
  return md;
}).join('')}

*Exported from JARVIS*
`;

    // Write file
    fs.writeFileSync(filepath, markdown, 'utf-8');

    return res.status(200).json({
      success: true,
      filename: `02-Conversations/${filename}`,
      path: filepath,
    });

  } catch (error) {
    console.error('[Export Conversation] Error:', error);
    return res.status(500).json({
      error: 'Export failed',
      message: error.message,
    });
  }
}
