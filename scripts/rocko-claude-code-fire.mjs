#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Rocko Claude Code Fire Watcher
// Watches rocko_v2_messages for claude_code_fire tool calls
// Opens Terminal.app and fires yolo prompts via AppleScript
// Usage: node scripts/rocko-claude-code-fire.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REPO_PATH = '/Users/bengreenwood/Desktop/rbtr-command/v14';
const STATE_FILE = '/tmp/rocko-claude-code-fire-state.json';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// ── Prompt library ───────────────────────────────────────────────────────────
const PROMPT_LIBRARY = {
  'morning-brief': 'Read ~/Documents/RBTR-Brain/00-Inbox/ for unread reports + check today's tasks',
  'git-status': 'Run git status and summarize current branch state',
  'deploy-check': 'Verify latest Vercel deployment status',
  'task-sync': 'Sync rbtr_tasks with current priorities',
  'cron-check': 'Check last 10 cron runs for failures',
  'build-progress': 'Read build progress docs and summarize completion %',
  'sponsor-pipeline': 'Fetch RBTR sponsor pipeline status',
  'forge-status': 'Check Forge bookings + subscription status',
  'money-check': 'Fetch latest money positions (PSNM/Personal/RBTR)'
};

// ── AppleScript Terminal launcher ────────────────────────────────────────────
async function fireClaudeCodePrompt(promptText, sessionId) {
  const escapedPrompt = promptText.replace(/'/g, "'\\''");

  const appleScript = `
tell application "Terminal"
  activate
  do script "cd ${REPO_PATH} && echo 'ROCKO FIRE: ${escapedPrompt.substring(0, 80)}...' && claude '${escapedPrompt}'" in window 1
end tell
  `.trim();

  try {
    await execAsync(`osascript -e '${appleScript}'`);
    console.log(`✓ Fired Claude Code prompt in Terminal (session: ${sessionId})`);
    return { status: 'fired', prompt: promptText };
  } catch (error) {
    console.error(`✗ Failed to fire prompt:`, error.message);
    return { status: 'error', error: error.message };
  }
}

// ── State persistence ────────────────────────────────────────────────────────
async function loadState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { last_checked_at: new Date().toISOString(), processed_ids: [] };
  }
}

async function saveState(state) {
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

// ── Main polling loop ────────────────────────────────────────────────────────
async function pollForFireCommands() {
  const state = await loadState();

  // Fetch recent tool calls for claude_code_fire
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rocko_v2_messages?` +
    `role=eq.tool&created_at=gte.${state.last_checked_at}&` +
    `order=created_at.asc&limit=50`,
    { headers: sbHeaders }
  );

  if (!response.ok) {
    console.error('Failed to poll Supabase:', response.statusText);
    return;
  }

  const messages = await response.json();

  for (const msg of messages) {
    if (state.processed_ids.includes(msg.id)) continue;

    try {
      const content = JSON.parse(msg.content);

      if (content.tool === 'claude_code_fire') {
        const { prompt_name, custom_prompt } = content.args || {};

        let promptText = custom_prompt;

        // Resolve named prompt
        if (prompt_name && PROMPT_LIBRARY[prompt_name]) {
          promptText = PROMPT_LIBRARY[prompt_name];
        }

        if (!promptText) {
          console.log(`⚠ Skipping fire command with no prompt (msg: ${msg.id})`);
          state.processed_ids.push(msg.id);
          continue;
        }

        console.log(`\n🔥 FIRE COMMAND DETECTED (${msg.session_id})`);
        console.log(`   Prompt: ${promptText.substring(0, 100)}...`);

        const result = await fireClaudeCodePrompt(promptText, msg.session_id);

        // Log result back to Supabase
        await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_messages`, {
          method: 'POST',
          headers: sbHeaders,
          body: JSON.stringify({
            session_id: msg.session_id,
            role: 'tool',
            content: JSON.stringify({
              tool: 'claude_code_fire',
              result
            }),
            created_at: new Date().toISOString()
          })
        });

        state.processed_ids.push(msg.id);
      }
    } catch (error) {
      console.error(`Error processing message ${msg.id}:`, error.message);
      state.processed_ids.push(msg.id); // Don't retry
    }
  }

  // Keep processed_ids list manageable
  if (state.processed_ids.length > 200) {
    state.processed_ids = state.processed_ids.slice(-100);
  }

  state.last_checked_at = new Date().toISOString();
  await saveState(state);
}

// ── Entry point ──────────────────────────────────────────────────────────────
console.log('Rocko Claude Code Fire Watcher — ACTIVE');
console.log(`Watching: rocko_v2_messages for claude_code_fire tool calls`);
console.log(`Repo: ${REPO_PATH}\n`);

// Poll every 10 seconds
setInterval(async () => {
  try {
    await pollForFireCommands();
  } catch (error) {
    console.error('Poll error:', error.message);
  }
}, 10000);

// Initial poll
pollForFireCommands();
