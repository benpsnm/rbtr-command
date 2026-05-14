// ═══════════════════════════════════════════════════════════════════════════
// Git Status Endpoint
// POST /api/git/status
// Returns current git status of v14 codebase
// ═══════════════════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get git status
    const { stdout: statusOutput } = await execAsync('git -C /Users/bengreenwood/Desktop/rbtr-command/v14 status -s');
    const { stdout: branchOutput } = await execAsync('git -C /Users/bengreenwood/Desktop/rbtr-command/v14 rev-parse --abbrev-ref HEAD');

    // Parse status output
    const lines = statusOutput.split('\n').filter(Boolean);
    const modified = lines.filter(l => l.startsWith(' M') || l.startsWith('M ')).map(l => l.slice(3));
    const untracked = lines.filter(l => l.startsWith('??')).map(l => l.slice(3));
    const added = lines.filter(l => l.startsWith('A ')).map(l => l.slice(3));
    const deleted = lines.filter(l => l.startsWith(' D') || l.startsWith('D ')).map(l => l.slice(3));

    return res.status(200).json({
      branch: branchOutput.trim(),
      modified,
      untracked,
      added,
      deleted,
      total_changes: lines.length,
    });

  } catch (error) {
    console.error('[Git Status] Error:', error);
    return res.status(500).json({
      error: 'Failed to get git status',
      message: error.message,
    });
  }
}
