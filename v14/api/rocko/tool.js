// ═══════════════════════════════════════════════════════════════════════════
// Rocko Tool Execution Endpoint
// POST /api/rocko/tool
// Executes a single Rocko tool call server-side
// ═══════════════════════════════════════════════════════════════════════════

import { executeTool } from '../../lib/rocko-tools.js';

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tool_name, input } = req.body;

  if (!tool_name) {
    return res.status(400).json({ error: 'tool_name required' });
  }

  try {
    const result = await executeTool(tool_name, input || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error('[Rocko Tool Error]', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
