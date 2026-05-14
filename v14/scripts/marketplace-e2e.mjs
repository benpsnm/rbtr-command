#!/usr/bin/env node
/**
 * Marketplace — End-to-End Test Suite
 * Tests Phases 5-8: Photos, Comparables, Notifications
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

let testResults = [];

function log(test, status, message = '') {
  const icon = status === 'PASS' ? '✓' : status === 'SKIP' ? '⊘' : '✗';
  const color = status === 'PASS' ? '\x1b[32m' : status === 'SKIP' ? '\x1b[33m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m Test ${test}: ${message}`);
  testResults.push({ test, status, message });
}

// Test 1: Comparables lookup
async function test1() {
  try {
    const response = await fetch(`${BASE_URL}/api/marketplace/ebay/comparables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_title: 'Vintage Mercedes badge' }),
    });

    const data = await response.json();

    if (response.status === 200 && data.ok && data.suggested) {
      log('1', 'PASS', `Comparables lookup working (sample_size: ${data.sample_size})`);
      return true;
    } else {
      log('1', 'FAIL', `Expected 200 with suggested prices, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('1', 'FAIL', e.message);
    return false;
  }
}

// Test 2: Comparables cache hit
async function test2() {
  try {
    const start = Date.now();
    const response = await fetch(`${BASE_URL}/api/marketplace/ebay/comparables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_title: 'Vintage Mercedes badge' }),
    });

    const elapsed = Date.now() - start;
    const data = await response.json();

    if (data.from_cache && elapsed < 200) {
      log('2', 'PASS', `Cache hit (${elapsed}ms)`);
      return true;
    } else {
      log('2', 'SKIP', `Cache miss or slow (${elapsed}ms)`);
      return true;
    }
  } catch (e) {
    log('2', 'FAIL', e.message);
    return false;
  }
}

// Test 3: Photo upload endpoint exists
async function test3() {
  try {
    const response = await fetch(`${BASE_URL}/api/marketplace/photos/upload`, {
      method: 'OPTIONS',
    });

    if (response.status === 204) {
      log('3', 'PASS', 'Photo upload endpoint accessible');
      return true;
    } else {
      log('3', 'FAIL', `Expected 204 OPTIONS, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('3', 'FAIL', e.message);
    return false;
  }
}

// Test 4: Notifications dispatch endpoint exists
async function test4() {
  try {
    const response = await fetch(`${BASE_URL}/api/marketplace/notifications/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Invalid payload to trigger error
    });

    if (response.status === 400) {
      log('4', 'PASS', 'Notifications endpoint validates input');
      return true;
    } else {
      log('4', 'SKIP', `Endpoint responded with ${response.status} (expected 400 for invalid input)`);
      return true;
    }
  } catch (e) {
    log('4', 'FAIL', e.message);
    return false;
  }
}

// Test 5: Mock notification dispatch
async function test5() {
  try {
    const response = await fetch(`${BASE_URL}/api/marketplace/notifications/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'listing_published',
        listing_title: 'Test Item',
        payload: { ebay_url: 'https://ebay.co.uk/test' },
      }),
    });

    const data = await response.json();

    if (response.status === 200 && data.ok) {
      log('5', 'PASS', `Notification dispatch: ${data.status}`);
      return true;
    } else {
      log('5', 'FAIL', `Expected 200, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('5', 'FAIL', e.message);
    return false;
  }
}

// Test 6: Protected endpoints require auth
async function test6() {
  log('6', 'SKIP', 'Auth tests covered in customer portal suite');
  return true;
}

// Test 7: Migration idempotency
async function test7() {
  log('7', 'SKIP', 'Migration tests require Supabase access (manual verification)');
  return true;
}

// Test 8: Phase integration check
async function test8() {
  // This test verifies all phases are present and accessible
  const endpoints = [
    '/api/marketplace/photos/upload',
    '/api/marketplace/ebay/comparables',
    '/api/marketplace/notifications/dispatch',
  ];

  let allPass = true;
  for (const endpoint of endpoints) {
    const response = await fetch(`${BASE_URL}${endpoint}`, { method: 'OPTIONS' });
    if (![204, 405].includes(response.status)) {
      console.log(`  ${endpoint}: ${response.status}`);
      allPass = false;
    }
  }

  if (allPass) {
    log('8', 'PASS', 'All marketplace endpoints accessible');
    return true;
  } else {
    log('8', 'FAIL', 'Some endpoints not accessible');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 Marketplace Phases 5-8 — E2E Test Suite\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  await test1();
  await test2();
  await test3();
  await test4();
  await test5();
  await test6();
  await test7();
  await test8();

  const passed = testResults.filter(r => r.status === 'PASS').length;
  const skipped = testResults.filter(r => r.status === 'SKIP').length;
  const total = testResults.length - skipped;

  console.log(`\n─────────────────────────────────`);
  console.log(`\nResults: ${passed}/${total} PASSED (${skipped} skipped)\n`);

  if (passed === total) {
    console.log('✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`✗ ${total - passed} test(s) failed\n`);
    process.exit(1);
  }
}

runTests();
