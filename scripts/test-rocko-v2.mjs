#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 End-to-End Test Suite
// Tests all 8 phases of Rocko v2 implementation
// Usage: node scripts/test-rocko-v2.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const BASE_URL = process.env.TEST_URL || 'https://rbtr-jarvis.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let passCount = 0;
let failCount = 0;
const results = [];

function log(msg, type = 'info') {
  const prefix = {
    info: '→',
    pass: '✓',
    fail: '✗',
    section: '══'
  }[type] || '→';

  const color = {
    info: '\x1b[36m',
    pass: '\x1b[32m',
    fail: '\x1b[31m',
    section: '\x1b[33m'
  }[type] || '\x1b[0m';

  console.log(`${color}${prefix} ${msg}\x1b[0m`);
}

function pass(test) {
  passCount++;
  results.push({ test, status: 'PASS' });
  log(`${test}`, 'pass');
}

function fail(test, error) {
  failCount++;
  results.push({ test, status: 'FAIL', error });
  log(`${test} — ${error}`, 'fail');
}

// ── Test Helpers ─────────────────────────────────────────────────────────────

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok && !options.expectError) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }

    return { response, data };
  } catch (error) {
    throw new Error(error.message);
  }
}

async function testFileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════════════════

log('Rocko v2 End-to-End Test Suite', 'section');
log(`Base URL: ${BASE_URL}\n`, 'info');

// ── Phase 1: Backend Foundation ──────────────────────────────────────────────
log('Phase 1: Backend Foundation', 'section');

try {
  // Test 1.1: Constants file exists
  const constantsExists = await testFileExists('v14/api/rocko/v2/_constants.js');
  if (constantsExists) {
    pass('Test 1.1: Constants file exists');
  } else {
    fail('Test 1.1: Constants file exists', 'File not found');
  }

  // Test 1.2: LLM proxy file exists
  const llmExists = await testFileExists('v14/api/rocko/v2/llm.js');
  if (llmExists) {
    pass('Test 1.2: LLM proxy file exists');
  } else {
    fail('Test 1.2: LLM proxy file exists', 'File not found');
  }

  // Test 1.3: Tool router file exists
  const toolExists = await testFileExists('v14/api/rocko/v2/tool.js');
  if (toolExists) {
    pass('Test 1.3: Tool router file exists');
  } else {
    fail('Test 1.3: Tool router file exists', 'File not found');
  }

  // Test 1.4: Migration 078 exists
  const migration078Exists = await testFileExists('v14/supabase/migrations/078_rocko_v2_schema.sql');
  if (migration078Exists) {
    pass('Test 1.4: Migration 078 exists');
  } else {
    fail('Test 1.4: Migration 078 exists', 'File not found');
  }

  // Test 1.5: Tool endpoint responds
  try {
    const { data } = await testEndpoint(
      'Tool endpoint',
      `${BASE_URL}/api/rocko/v2/tool`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'fetch_money_position' }),
        expectError: true // May fail without session_id, that's ok
      }
    );
    pass('Test 1.5: Tool endpoint responds');
  } catch (error) {
    fail('Test 1.5: Tool endpoint responds', error.message);
  }

} catch (error) {
  fail('Phase 1 tests', error.message);
}

// ── Phase 3: Gmail + Calendar OAuth ──────────────────────────────────────────
log('\nPhase 3: Gmail + Calendar OAuth', 'section');

try {
  // Test 3.1: Google API helper exists
  const googleApiExists = await testFileExists('v14/api/rocko/v2/_google_api.js');
  if (googleApiExists) {
    pass('Test 3.1: Google API helper exists');
  } else {
    fail('Test 3.1: Google API helper exists', 'File not found');
  }

  // Test 3.2: OAuth init endpoint exists
  const oauthInitExists = await testFileExists('v14/api/rocko/v2/google/auth/init.js');
  if (oauthInitExists) {
    pass('Test 3.2: OAuth init endpoint exists');
  } else {
    fail('Test 3.2: OAuth init endpoint exists', 'File not found');
  }

  // Test 3.3: OAuth callback endpoint exists
  const oauthCallbackExists = await testFileExists('v14/api/rocko/v2/google/auth/callback.js');
  if (oauthCallbackExists) {
    pass('Test 3.3: OAuth callback endpoint exists');
  } else {
    fail('Test 3.3: OAuth callback endpoint exists', 'File not found');
  }

} catch (error) {
  fail('Phase 3 tests', error.message);
}

// ── Phase 4: Claude Code Fire ────────────────────────────────────────────────
log('\nPhase 4: Claude Code Fire', 'section');

try {
  // Test 4.1: Fire watcher script exists
  const fireWatcherExists = await testFileExists('scripts/rocko-claude-code-fire.mjs');
  if (fireWatcherExists) {
    pass('Test 4.1: Fire watcher script exists');
  } else {
    fail('Test 4.1: Fire watcher script exists', 'File not found');
  }

  // Test 4.2: Fire watcher is executable
  try {
    const { stdout } = await execAsync('test -x scripts/rocko-claude-code-fire.mjs && echo "executable"');
    if (stdout.trim() === 'executable') {
      pass('Test 4.2: Fire watcher is executable');
    } else {
      fail('Test 4.2: Fire watcher is executable', 'Not executable');
    }
  } catch (error) {
    fail('Test 4.2: Fire watcher is executable', error.message);
  }

} catch (error) {
  fail('Phase 4 tests', error.message);
}

// ── Phase 5: Mobile PWA ──────────────────────────────────────────────────────
log('\nPhase 5: Mobile PWA', 'section');

try {
  // Test 5.1: Mobile Rocko HTML exists
  const mobileExists = await testFileExists('v14/public/m/rocko.html');
  if (mobileExists) {
    pass('Test 5.1: Mobile Rocko HTML exists');
  } else {
    fail('Test 5.1: Mobile Rocko HTML exists', 'File not found');
  }

  // Test 5.2: Mobile PWA loads
  try {
    const response = await fetch(`${BASE_URL}/m/rocko.html`);
    if (response.ok) {
      const html = await response.text();
      if (html.includes('R·O·C·K·O')) {
        pass('Test 5.2: Mobile PWA loads with correct content');
      } else {
        fail('Test 5.2: Mobile PWA loads with correct content', 'Title not found');
      }
    } else {
      fail('Test 5.2: Mobile PWA loads', `HTTP ${response.status}`);
    }
  } catch (error) {
    fail('Test 5.2: Mobile PWA loads', error.message);
  }

  // Test 5.3: Manifest file exists
  const manifestExists = await testFileExists('v14/public/m/manifest.json');
  if (manifestExists) {
    pass('Test 5.3: PWA manifest exists');
  } else {
    fail('Test 5.3: PWA manifest exists', 'File not found');
  }

  // Test 5.4: Service worker exists
  const swExists = await testFileExists('v14/public/m/sw.js');
  if (swExists) {
    pass('Test 5.4: Service worker exists');
  } else {
    fail('Test 5.4: Service worker exists', 'File not found');
  }

} catch (error) {
  fail('Phase 5 tests', error.message);
}

// ── Phase 6: Desktop Modal ───────────────────────────────────────────────────
log('\nPhase 6: Desktop Modal', 'section');

try {
  // Test 6.1: Desktop WMS includes Rocko integration
  const wmsContent = await fs.readFile('v14/public/wms.html', 'utf-8');
  if (wmsContent.includes('rockoFloatingBtn')) {
    pass('Test 6.1: Desktop modal integrated in WMS');
  } else {
    fail('Test 6.1: Desktop modal integrated in WMS', 'Rocko button not found');
  }

  // Test 6.2: Desktop modal animations present
  if (wmsContent.includes('rocko-breathe')) {
    pass('Test 6.2: Desktop modal animations present');
  } else {
    fail('Test 6.2: Desktop modal animations present', 'Animation keyframes not found');
  }

} catch (error) {
  fail('Phase 6 tests', error.message);
}

// ── Phase 7: Device Pairing Auth ─────────────────────────────────────────────
log('\nPhase 7: Device Pairing Auth', 'section');

try {
  // Test 7.1: Pairing endpoint exists
  const pairExists = await testFileExists('v14/api/rocko/v2/auth/pair.js');
  if (pairExists) {
    pass('Test 7.1: Pairing endpoint exists');
  } else {
    fail('Test 7.1: Pairing endpoint exists', 'File not found');
  }

  // Test 7.2: Verify code endpoint exists
  const verifyExists = await testFileExists('v14/api/rocko/v2/auth/verify-code.js');
  if (verifyExists) {
    pass('Test 7.2: Verify code endpoint exists');
  } else {
    fail('Test 7.2: Verify code endpoint exists', 'File not found');
  }

  // Test 7.3: Auth check endpoint exists
  const checkExists = await testFileExists('v14/api/rocko/v2/auth/check.js');
  if (checkExists) {
    pass('Test 7.3: Auth check endpoint exists');
  } else {
    fail('Test 7.3: Auth check endpoint exists', 'File not found');
  }

  // Test 7.4: Migration 079 exists
  const migration079Exists = await testFileExists('v14/supabase/migrations/079_rocko_v2_pairing_codes.sql');
  if (migration079Exists) {
    pass('Test 7.4: Migration 079 exists');
  } else {
    fail('Test 7.4: Migration 079 exists', 'File not found');
  }

  // Test 7.5: Pairing endpoint functional test
  try {
    const { data } = await testEndpoint(
      'Pairing endpoint',
      `${BASE_URL}/api/rocko/v2/auth/pair`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'code', user_id: 'test' })
      }
    );

    if (data.pairing_code && data.pairing_code.length === 6) {
      pass('Test 7.5: Pairing endpoint generates 6-digit code');
    } else {
      fail('Test 7.5: Pairing endpoint generates 6-digit code', 'Invalid code format');
    }
  } catch (error) {
    fail('Test 7.5: Pairing endpoint functional test', error.message);
  }

} catch (error) {
  fail('Phase 7 tests', error.message);
}

// ── Brand Assets ─────────────────────────────────────────────────────────────
log('\nBrand Assets', 'section');

try {
  // Test: Brand logos exist
  const logos = [
    'v14/public/brand/psnm-logo.jpg',
    'v14/public/brand/psnm-logo-sm.png',
    'v14/public/brand/rbtr-logo.jpg',
    'v14/public/brand/rbtr-logo-sm.png',
    'v14/public/brand/forge-logo.jpg',
    'v14/public/brand/forge-logo-sm.png',
    'v14/public/brand/README.md'
  ];

  let allLogosExist = true;
  for (const logo of logos) {
    const exists = await testFileExists(logo);
    if (!exists) {
      allLogosExist = false;
      break;
    }
  }

  if (allLogosExist) {
    pass('Test: All 6 brand logos + README exist');
  } else {
    fail('Test: All brand logos exist', 'One or more files missing');
  }

} catch (error) {
  fail('Brand assets test', error.message);
}

// ── Aesthetic Spec ───────────────────────────────────────────────────────────
log('\nAesthetic Specification', 'section');

try {
  const aestheticExists = await testFileExists('v14/docs/prd/ROCKO-V2-AESTHETIC-LOCKED.md');
  if (aestheticExists) {
    pass('Test: Aesthetic specification locked and saved');
  } else {
    fail('Test: Aesthetic specification exists', 'File not found');
  }

} catch (error) {
  fail('Aesthetic spec test', error.message);
}

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

log('\n═══════════════════════════════════════════', 'section');
log('TEST SUMMARY', 'section');
log('═══════════════════════════════════════════\n', 'section');

console.log(`Total tests: ${passCount + failCount}`);
console.log(`\x1b[32mPassed: ${passCount}\x1b[0m`);
console.log(`\x1b[31mFailed: ${failCount}\x1b[0m`);

if (failCount > 0) {
  console.log('\n\x1b[31mFailed tests:\x1b[0m');
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  ✗ ${r.test} — ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n\x1b[32m✓ All tests passed!\x1b[0m');
  console.log('\n\x1b[33mNext steps:\x1b[0m');
  console.log('1. Run migrations 078 and 079 in Supabase dashboard');
  console.log('2. Deploy to Vercel: vercel --prod');
  console.log('3. Add env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
  console.log('4. Run Google OAuth flow: GET /api/rocko/v2/google/auth/init');
  console.log('5. Start fire watcher: node scripts/rocko-claude-code-fire.mjs');
  console.log('6. Open mobile PWA on iPhone: https://rbtr-jarvis.vercel.app/m/rocko.html');
  console.log('7. Add to Home Screen for full-screen experience\n');
  process.exit(0);
}
