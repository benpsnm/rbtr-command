'use strict';
/**
 * Voice Memo Processor
 * Transcribes a voice memo and files it into the RBTR-Brain Obsidian vault.
 * Usage: node voice-memo-process.js <audio_file_path>
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Anthropic = require('@anthropic-ai/sdk');

const OBSIDIAN_INBOX = process.env.OBSIDIAN_INBOX || `${process.env.HOME}/Documents/RBTR-Brain/00-Inbox`;
const TRANSCRIBE_SCRIPT = process.env.TRANSCRIBE_SCRIPT || path.join(__dirname, 'transcribe.py');

// Auto-tagger system prompt — cached via prompt caching
const TAGGER_SYSTEM_PROMPT = `You are an intelligent tagging and organisation assistant for Ben Greenwood's personal second brain vault.

Ben Greenwood's context:
- Solo operator based in Rotherham, UK
- Businesses: PSNM (Pallet Storage Near Me warehouse, Hellaby), Eternal-Kustoms (consulting), AirBnB (4 Woodhead Mews, Barnsley), Coffee-Brothers (deal negotiation)
- Expedition project: RBTR (Rock Bottom to Roaming) — building an Arocs 6x6 expedition truck, target launch 1 Jul 2027
- Family: partner Sarah Jones, sons Hudson and Benson, dog Peanut
- Mentor: Nate Cook
- Tech stack: Make.com, Supabase, Netlify, Node.js, Claude API

Categories (pick ONE primary):
- PSNM — warehouse operations, pallets, customers, revenue, systems
- RBTR — truck build, expedition planning, sponsors, route, content, YouTube
- AirBnB — Barnsley property, bookings, maintenance, revenue
- Eternal-Kustoms — consulting for Sam Moore, custom vehicle work
- Coffee-Brothers — deal negotiation (~£80k package)
- Personal — health, habits, faith, worldview, personal goals
- Family — Sarah, Hudson, Benson, family activities

Obsidian note cross-link candidates:
[[02-Areas/PSNM]] [[01-Projects/RBTR-Truck-Build]] [[02-Areas/AirBnB-Woodhead]]
[[02-Areas/Eternal-Kustoms]] [[01-Projects/Coffee-Brothers-Deal]] [[02-Areas/Family]]
[[02-Areas/Finances]] [[02-Areas/Health-Habits]] [[01-Projects/Camera-Kit]]
[[01-Projects/T6.1-Sale]] [[50-Workshop-Log/]] [[03-Resources/People/Nate-Cook]]

IMPORTANT: Never reference JMW-Legal, Jo Riley, Simon Aylett, or any legal matter in output.
Use UK English throughout.

Given a voice memo transcript, respond with a JSON object (no markdown, just raw JSON):
{
  "project": "PSNM|RBTR|AirBnB|Eternal-Kustoms|Coffee-Brothers|Personal|Family",
  "tags": ["tag1", "tag2", "tag3"],
  "title": "Concise title for this memo (max 8 words)",
  "summary": "One sentence summary of what was said",
  "action_items": ["action 1", "action 2"],
  "cross_links": ["[[Note/Path]]", "[[Note/Path2]]"],
  "workshop_note": true|false
}`;

function transcribe(audioPath) {
  const cmd = `python3 "${TRANSCRIBE_SCRIPT}" "${audioPath}"`;
  try {
    const output = execSync(cmd, { encoding: 'utf8', timeout: 300000 });
    return output.trim();
  } catch (err) {
    throw new Error(`Transcription failed: ${err.stderr || err.message}`);
  }
}

function getAudioDuration(audioPath) {
  try {
    const stat = fs.statSync(audioPath);
    // Rough estimate: 1 byte ≈ 0.008ms for 128kbps, return HH:MM:SS
    const sizeKB = stat.size / 1024;
    const estimatedSeconds = Math.round(sizeKB / 16); // ~16KB/s for typical voice
    const h = Math.floor(estimatedSeconds / 3600);
    const m = Math.floor((estimatedSeconds % 3600) / 60);
    const s = estimatedSeconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  } catch {
    return '00:00:00';
  }
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatDateTime(d) {
  return d.toISOString().slice(0, 10) + 'T' + d.toTimeString().slice(0, 8);
}

function friendlyDate(d) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function tagTranscriptFallback(transcript) {
  // Basic keyword-based categorisation when no API key is available
  const lower = transcript.toLowerCase();
  let project = 'Personal';
  if (lower.match(/psnm|pallet|warehouse|customer|storage/)) project = 'PSNM';
  else if (lower.match(/rbtr|truck|build|arocs|expedition|sponsor|route|youtube/)) project = 'RBTR';
  else if (lower.match(/airbnb|woodhead|barnsley|booking|property/)) project = 'AirBnB';
  else if (lower.match(/kustoms|eternal|sam moore|consulting/)) project = 'Eternal-Kustoms';
  else if (lower.match(/coffee|brothers|deal|£80k/)) project = 'Coffee-Brothers';
  else if (lower.match(/sarah|hudson|benson|family|kids|boys/)) project = 'Family';

  return {
    project,
    tags: ['needs-review'],
    title: 'Voice memo — untagged',
    summary: '⚠️ Auto-tagging skipped — add ANTHROPIC_API_KEY to scripts/.env to enable',
    action_items: [],
    cross_links: [],
    workshop_note: false
  };
}

async function tagTranscript(client, transcript) {
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: TAGGER_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: `Transcript:\n\n${transcript}`
      }
    ]
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON from response if wrapped in text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse tagger response: ${raw}`);
  }
}

function buildNote(transcript, meta, audioPath, now) {
  const filename = `voice-memo-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const crossLinks = (meta.cross_links || []).join('\n- ');
  const actionItems = (meta.action_items || []).map(a => `- [ ] ${a}`).join('\n');
  const tags = (meta.tags || []).join(', ');
  const duration = getAudioDuration(audioPath);

  const frontmatter = `---
date: ${formatDate(now)}
created: ${formatDateTime(now)}
source: voice-memo
project: ${meta.project || 'Personal'}
tags: [${tags}]
duration: ${duration}
audio: ${path.basename(audioPath)}
---`;

  const body = `# ${meta.title || 'Voice memo'} — ${friendlyDate(now)}

> ${meta.summary || ''}

## Transcript

${transcript}

## Action items

${actionItems || '- None identified'}

## Cross-links

${crossLinks ? `- ${crossLinks}` : '- None suggested'}
`;

  return { filename, content: `${frontmatter}\n\n${body}` };
}

async function processAudio(audioPath) {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const now = new Date();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log(`[1/3] Transcribing ${path.basename(audioPath)}...`);
  const transcript = transcribe(audioPath);

  if (!transcript || transcript.length < 5) {
    throw new Error('Transcription returned empty or too-short result');
  }
  console.log(`      ✓ ${transcript.length} chars transcribed`);

  console.log('[2/3] Tagging with Claude...');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let meta;
  if (!apiKey) {
    console.log('      ⚠️  No ANTHROPIC_API_KEY — using keyword fallback. Add key to scripts/.env for full tagging.');
    meta = await tagTranscriptFallback(transcript);
  } else {
    meta = await tagTranscript(client, transcript);
  }
  console.log(`      ✓ Project: ${meta.project} | Tags: ${(meta.tags || []).join(', ')}`);

  console.log('[3/3] Writing to Obsidian inbox...');
  const { filename, content } = buildNote(transcript, meta, audioPath, now);

  if (!fs.existsSync(OBSIDIAN_INBOX)) {
    fs.mkdirSync(OBSIDIAN_INBOX, { recursive: true });
  }

  const outPath = path.join(OBSIDIAN_INBOX, `${filename}.md`);
  fs.writeFileSync(outPath, content, 'utf8');
  console.log(`      ✓ Saved: ${outPath}`);

  return { outPath, meta, transcript };
}

// Run if called directly
if (require.main === module) {
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.error('Usage: node voice-memo-process.js <audio_file_path>');
    process.exit(1);
  }

  processAudio(audioPath)
    .then(({ outPath, meta }) => {
      console.log('\nDone.');
      console.log(`Project: ${meta.project}`);
      console.log(`Note: ${outPath}`);
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { processAudio };
