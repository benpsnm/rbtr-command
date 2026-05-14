// ═══════════════════════════════════════════════════════════════════════════
// Obsidian Write Endpoint
// POST /api/obsidian/write
// Writes a new note to RBTR-Brain/00-Inbox/
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename, content } = req.body;

  if (!filename || !content) {
    return res.status(400).json({ error: 'filename and content required' });
  }

  try {
    // Sanitize filename - remove any path traversal attempts
    const safeFilename = path.basename(filename);

    // Add timestamp prefix if not already present
    const timestamp = new Date().toISOString().split('T')[0] + '-' +
                      new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');
    const finalFilename = safeFilename.startsWith('20') ? safeFilename : `${timestamp}-${safeFilename}`;

    // Ensure .md extension
    const filenameWithExt = finalFilename.endsWith('.md') ? finalFilename : `${finalFilename}.md`;

    // Write to 00-Inbox only
    const basePath = path.join(os.homedir(), 'Documents/RBTR-Brain/00-Inbox');
    const fullPath = path.join(basePath, filenameWithExt);

    // Ensure directory exists
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    // Write file
    fs.writeFileSync(fullPath, content, 'utf-8');

    return res.status(200).json({
      success: true,
      path: `00-Inbox/${filenameWithExt}`,
      full_path: fullPath,
      size: content.length,
    });

  } catch (error) {
    console.error('[Obsidian Write] Error:', error);
    return res.status(500).json({
      error: 'Failed to write file',
      message: error.message,
    });
  }
}
