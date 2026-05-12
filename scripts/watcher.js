'use strict';
/**
 * Voice Memo Watcher
 * Watches VOICE_MEMO_INBOX for new .m4a or .mp3 files and processes them.
 * Runs as a persistent Node.js process (managed by launchd).
 */
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { processAudio } = require('./voice-memo-process');

const INBOX = process.env.VOICE_MEMO_INBOX || `${process.env.HOME}/Documents/VoiceMemos-Workshop`;
const PROCESSED_DIR = path.join(INBOX, '.processed');
const LOG_FILE = `${process.env.HOME}/Library/Logs/voice-memos.log`;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

function isAlreadyProcessed(filePath) {
  const marker = path.join(PROCESSED_DIR, path.basename(filePath) + '.done');
  return fs.existsSync(marker);
}

function markProcessed(filePath) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  const marker = path.join(PROCESSED_DIR, path.basename(filePath) + '.done');
  fs.writeFileSync(marker, new Date().toISOString());
}

async function handleNewFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.m4a', '.mp3', '.wav', '.caf'].includes(ext)) return;

  if (isAlreadyProcessed(filePath)) {
    log(`Skipping already-processed: ${path.basename(filePath)}`);
    return;
  }

  // Wait briefly to ensure file is fully written
  await new Promise(resolve => setTimeout(resolve, 2000));

  log(`Processing: ${path.basename(filePath)}`);
  try {
    const result = await processAudio(filePath);
    markProcessed(filePath);
    log(`Done: ${result.meta.project} → ${path.basename(result.outPath)}`);
  } catch (err) {
    log(`ERROR processing ${path.basename(filePath)}: ${err.message}`);
  }
}

if (!fs.existsSync(INBOX)) {
  fs.mkdirSync(INBOX, { recursive: true });
}

log(`Voice memo watcher started. Watching: ${INBOX}`);

const watcher = chokidar.watch(INBOX, {
  persistent: true,
  ignoreInitial: false,
  ignored: [/(^|[/\\])\../, `${INBOX}/.processed/**`],
  awaitWriteFinish: { stabilityThreshold: 3000, pollInterval: 500 }
});

watcher
  .on('add', filePath => handleNewFile(filePath))
  .on('error', err => log(`Watcher error: ${err.message}`));

// Keep alive
process.on('SIGTERM', () => {
  log('Watcher stopping (SIGTERM)');
  watcher.close().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  log('Watcher stopping (SIGINT)');
  watcher.close().then(() => process.exit(0));
});
