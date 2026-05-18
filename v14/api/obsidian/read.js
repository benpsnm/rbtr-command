// ═══════════════════════════════════════════════════════════════════════════
// Obsidian Read Endpoint
// POST /api/obsidian/read
// Reads a document from RBTR-Brain Obsidian vault
// ═══════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path: relativePath } = req.body;

  if (!relativePath) {
    return res.status(400).json({ error: 'path required' });
  }

  try {
    // Sanitize path - must be within RBTR-Brain
    const basePath = path.join(os.homedir(), 'Documents/RBTR-Brain');
    const fullPath = path.join(basePath, relativePath);

    // Security check: ensure resolved path is still within RBTR-Brain
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve(basePath))) {
      return res.status(403).json({
        error: 'Path traversal not allowed',
        message: 'Path must be within RBTR-Brain directory',
      });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({
        error: 'File not found',
        path: relativePath,
      });
    }

    // Read file
    const content = fs.readFileSync(resolvedPath, 'utf-8');

    return res.status(200).json({
      path: relativePath,
      content,
      size: content.length,
    });

  } catch (error) {
    console.error('[Obsidian Read] Error:', error);
    return res.status(500).json({
      error: 'Failed to read file',
      message: error.message,
    });
  }
}
