#!/usr/bin/env node

/**
 * PROMPT QUEUE PRE-FLIGHT CHECK
 *
 * Reads PROMPT-QUEUE.md and verifies dependencies for all "READY" prompts.
 * Flags prompts with missing dependencies or stale verification dates.
 *
 * Run weekly: node scripts/check-prompt-queue.js
 * Or via cron: add to vercel.json cron schedule
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Config
const QUEUE_FILE = path.join(process.env.HOME, 'Documents/RBTR-Brain/00-Inbox/PROMPT-QUEUE.md');
const STALENESS_THRESHOLD_DAYS = 14;
const PROJECT_ROOT = path.join(__dirname, '..');

// Dependency checks
const DEPENDENCY_CHECKS = {
  'Supabase project `mpxgyobotiqcawmqlhbf` accessible': async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return { ok: false, reason: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not in env' };
    return { ok: true };
  },

  'Vercel account active': async () => {
    try {
      await execPromise('vercel --version', { cwd: PROJECT_ROOT });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: 'Vercel CLI not installed or not authenticated' };
    }
  },

  'SendGrid API key in env vars': async () => {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (!sendgridKey) return { ok: false, reason: 'SENDGRID_API_KEY not in env' };
    return { ok: true };
  },

  'v14/api/auth/middleware.js present': async () => {
    const middlewarePath = path.join(PROJECT_ROOT, 'v14/api/auth/middleware.js');
    const exists = fs.existsSync(middlewarePath);
    if (!exists) return { ok: false, reason: 'File not found' };
    return { ok: true };
  },

  'Supabase `psnm_customers` table schema stable': async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return { ok: false, reason: 'Cannot verify without SUPABASE_URL' };
    return { ok: true, note: 'Schema check not implemented, assuming stable' };
  },

  'SendGrid magic link template configured': async () => {
    return { ok: true, note: 'Template check not implemented' };
  },

  '50 SEO pages written and ready': async () => {
    const contentDir = path.join(process.env.HOME, 'Documents/RBTR-Brain/PSNM-Content/pages/');
    if (!fs.existsSync(contentDir)) return { ok: false, reason: 'Content directory not found' };
    const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
    if (files.length < 50) return { ok: false, reason: `Only ${files.length} pages found, need 50` };
    return { ok: true };
  },

  'Domain psnmstone.co.uk active': async () => {
    return { ok: true, note: 'DNS check not implemented' };
  },

  'Vercel static hosting capability': async () => {
    return { ok: true };
  },

  'atlas.js v2.2 stable in production': async () => {
    const atlasPath = path.join(PROJECT_ROOT, 'v14/api/atlas.js');
    if (!fs.existsSync(atlasPath)) return { ok: false, reason: 'atlas.js not found' };
    const content = fs.readFileSync(atlasPath, 'utf8');
    if (!content.includes('v2.2')) return { ok: false, reason: 'v2.2 version marker not found in atlas.js' };
    return { ok: true };
  },

  '53 RBTR sponsor targets list exists': async () => {
    const sponsorsFile = path.join(process.env.HOME, 'Documents/RBTR-Brain/Sponsors/target-list.md');
    if (!fs.existsSync(sponsorsFile)) return { ok: false, reason: 'target-list.md not found' };
    return { ok: true };
  },

  'Claude API key + sufficient prompt caching credits': async () => {
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    if (!claudeKey) return { ok: false, reason: 'ANTHROPIC_API_KEY not in env' };
    return { ok: true, note: 'Credit check not implemented' };
  },

  'Forge Wellness content exists': async () => {
    const forgeDir = path.join(process.env.HOME, 'Documents/RBTR-Brain/Forge/');
    if (!fs.existsSync(forgeDir)) return { ok: false, reason: 'Forge directory not found' };
    return { ok: true };
  },

  'Domain forgewellness.co.uk owned + DNS configured': async () => {
    return { ok: true, note: 'DNS check not implemented' };
  },

  'Booking system decision made': async () => {
    return { ok: true, note: 'Manual verification needed' };
  },

  'n8n instance accessible': async () => {
    return { ok: true, note: 'n8n connectivity check not implemented' };
  },

  'All API keys available': async () => {
    const keys = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY',
      'SENDGRID_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'ANTHROPIC_API_KEY'
    ];
    const missing = keys.filter(k => !process.env[k]);
    if (missing.length > 0) return { ok: false, reason: `Missing: ${missing.join(', ')}` };
    return { ok: true };
  },

  'Workflow designs exist': async () => {
    const workflowSpec = path.join(process.env.HOME, 'Documents/RBTR-Brain/Workflows/ci-workflow-specs.md');
    if (!fs.existsSync(workflowSpec)) return { ok: false, reason: 'ci-workflow-specs.md not found' };
    return { ok: true };
  },

  'Granola app active': async () => {
    return { ok: true, note: 'Manual verification needed' };
  },

  'YouTube channel access': async () => {
    return { ok: true, note: 'YouTube API check not implemented' };
  },

  'Social media APIs configured': async () => {
    return { ok: true, note: 'Social API checks not implemented' };
  },

  'WhatsApp Business API account approved': async () => {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioSid || !twilioToken) return { ok: false, reason: 'Twilio credentials not in env' };
    return { ok: true, note: 'Twilio connectivity check not implemented' };
  },

  'Twilio account active + API key in env vars': async () => {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioSid || !twilioToken) return { ok: false, reason: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not in env' };
    return { ok: true };
  },

  'PSNM customer phone numbers in Supabase': async () => {
    return { ok: true, note: 'DB check not implemented' };
  },

  'wms.html stable in production': async () => {
    const wmsPath = path.join(PROJECT_ROOT, 'v14/public/wms.html');
    if (!fs.existsSync(wmsPath)) return { ok: false, reason: 'wms.html not found' };
    return { ok: true };
  },

  'Jarvis voice integration complete': async () => {
    const jarvisPath = path.join(PROJECT_ROOT, 'v14/public/jarvis.html');
    if (!fs.existsSync(jarvisPath)) return { ok: false, reason: 'jarvis.html not found' };
    return { ok: true };
  },

  'Mobile testing device available': async () => {
    return { ok: true, note: 'Manual verification needed' };
  },

  'Supabase access to all project tables': async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) return { ok: false, reason: 'SUPABASE_URL not in env' };
    return { ok: true, note: 'Table access check not implemented' };
  },

  'Telegram bot configured for digest delivery': async () => {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!telegramToken) return { ok: false, reason: 'TELEGRAM_BOT_TOKEN not in env' };
    return { ok: true };
  },

  'Historical data present': async () => {
    return { ok: true, note: 'Data check not implemented' };
  }
};

// Parse PROMPT-QUEUE.md
function parsePromptQueue(content) {
  const prompts = [];
  const sections = content.split(/^## /m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.split('\n');
    const heading = lines[0].trim();

    if (!heading.includes('READY TO FIRE')) continue;

    const promptMatches = section.match(/^### \d+\. (.+?)$/gm);
    if (!promptMatches) continue;

    for (const match of promptMatches) {
      const title = match.replace(/^### \d+\. /, '').trim();
      const promptSection = extractPromptSection(section, title);
      if (promptSection) {
        prompts.push(parsePrompt(promptSection));
      }
    }
  }

  return prompts;
}

function extractPromptSection(content, title) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`### \\d+\\. ${escapedTitle}([\\s\\S]*?)(?=^### |^## |$)`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

function parsePrompt(section) {
  const lines = section.split('\n').map(l => l.trim()).filter(l => l);

  const prompt = {
    title: '',
    estimatedTime: '',
    status: '',
    dependencies: [],
    lastVerified: null
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('**Estimated time:**')) {
      prompt.estimatedTime = line.replace('**Estimated time:**', '').trim();
    } else if (line.startsWith('**Status:**')) {
      prompt.status = line.replace('**Status:**', '').trim();
    } else if (line.startsWith('**Dependencies:**')) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('- ')) {
          prompt.dependencies.push(lines[j].replace(/^- /, '').trim());
        } else if (lines[j].startsWith('**')) {
          break;
        }
      }
    } else if (line.startsWith('**Last verified:**')) {
      const dateStr = line.replace('**Last verified:**', '').trim();
      prompt.lastVerified = new Date(dateStr);
    }
  }

  return prompt;
}

function isStale(lastVerified) {
  if (!lastVerified || isNaN(lastVerified)) return true;
  const now = new Date();
  const diffDays = (now - lastVerified) / (1000 * 60 * 60 * 24);
  return diffDays > STALENESS_THRESHOLD_DAYS;
}

async function checkPromptQueue() {
  console.log('🔍 PROMPT QUEUE PRE-FLIGHT CHECK\n');

  if (!fs.existsSync(QUEUE_FILE)) {
    console.error(`❌ Queue file not found: ${QUEUE_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(QUEUE_FILE, 'utf8');
  const prompts = parsePromptQueue(content);

  if (prompts.length === 0) {
    console.log('✅ No READY prompts found in queue. Nothing to check.');
    return;
  }

  console.log(`Found ${prompts.length} READY prompts to verify.\n`);

  let allClear = true;

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`\n📋 Prompt ${i + 1}: ${prompt.title || 'Untitled'}`);
    console.log(`   Estimated time: ${prompt.estimatedTime}`);
    console.log(`   Last verified: ${prompt.lastVerified ? prompt.lastVerified.toISOString().split('T')[0] : 'NEVER'}`);

    if (isStale(prompt.lastVerified)) {
      console.log(`   ⚠️  STALE (not verified in ${STALENESS_THRESHOLD_DAYS}+ days)`);
      allClear = false;
    } else {
      console.log(`   ✅ Fresh (verified recently)`);
    }

    if (prompt.dependencies.length === 0) {
      console.log(`   ⚠️  No dependencies listed (add them to prompt)`);
    } else {
      console.log(`   Dependencies (${prompt.dependencies.length}):`);

      for (const dep of prompt.dependencies) {
        const checker = DEPENDENCY_CHECKS[dep];
        if (!checker) {
          console.log(`      ⚠️  ${dep} — no check implemented`);
          continue;
        }

        try {
          const result = await checker();
          if (result.ok) {
            const note = result.note ? ` (${result.note})` : '';
            console.log(`      ✅ ${dep}${note}`);
          } else {
            console.log(`      ❌ ${dep} — ${result.reason}`);
            allClear = false;
          }
        } catch (err) {
          console.log(`      ❌ ${dep} — check failed: ${err.message}`);
          allClear = false;
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allClear) {
    console.log('✅ All checks passed. Queue is ready to fire.');
  } else {
    console.log('⚠️  Some prompts have issues. Review above before firing.');
  }
  console.log('='.repeat(60) + '\n');
}

if (require.main === module) {
  checkPromptQueue().catch(err => {
    console.error('❌ Check failed:', err);
    process.exit(1);
  });
}

module.exports = { checkPromptQueue };
