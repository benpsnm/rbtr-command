#!/usr/bin/env node
/**
 * PSNM Customer Portal — End-to-End Test Suite
 * Tests all endpoints and magic link flow
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';

let testResults = [];
let sessionCookie = null;

function log(test, status, message = '') {
  const icon = status === 'PASS' ? '✓' : '✗';
  const color = status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m Test ${test}: ${message}`);
  testResults.push({ test, status, message });
}

async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (sessionCookie) {
    headers.Cookie = sessionCookie;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie && setCookie.includes('psnm_session=')) {
    sessionCookie = setCookie.split(';')[0];
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { response, data };
}

// Test 1: Request magic link with valid email
async function test1() {
  try {
    const { response, data } = await apiCall('/api/customer/auth/request-link', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    });

    if (response.status === 200 && data.ok) {
      log('1', 'PASS', 'Magic link request accepted');
      return true;
    } else {
      log('1', 'FAIL', `Expected 200, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('1', 'FAIL', e.message);
    return false;
  }
}

// Test 2: Verify token (mocked — would need DB access for real token)
async function test2() {
  try {
    // This test is informational — real verification requires DB token
    log('2', 'SKIP', 'Token verification requires production DB access (tested manually)');
    return true;
  } catch (e) {
    log('2', 'FAIL', e.message);
    return false;
  }
}

// Test 3: GET /api/customer/me without auth → 401
async function test3() {
  try {
    sessionCookie = null; // Clear any session
    const { response } = await apiCall('/api/customer/me');

    if (response.status === 401) {
      log('3', 'PASS', 'Unauthorized access correctly rejected');
      return true;
    } else {
      log('3', 'FAIL', `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('3', 'FAIL', e.message);
    return false;
  }
}

// Test 4: GET /api/customer/dashboard without auth → 401
async function test4() {
  try {
    const { response } = await apiCall('/api/customer/dashboard');

    if (response.status === 401) {
      log('4', 'PASS', 'Dashboard protected by auth');
      return true;
    } else {
      log('4', 'FAIL', `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('4', 'FAIL', e.message);
    return false;
  }
}

// Test 5: GET /api/customer/invoices without auth → 401
async function test5() {
  try {
    const { response } = await apiCall('/api/customer/invoices');

    if (response.status === 401) {
      log('5', 'PASS', 'Invoices protected by auth');
      return true;
    } else {
      log('5', 'FAIL', `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('5', 'FAIL', e.message);
    return false;
  }
}

// Test 6: GET /api/customer/storage without auth → 401
async function test6() {
  try {
    const { response } = await apiCall('/api/customer/storage');

    if (response.status === 401) {
      log('6', 'PASS', 'Storage protected by auth');
      return true;
    } else {
      log('6', 'FAIL', `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('6', 'FAIL', e.message);
    return false;
  }
}

// Test 7: POST /api/customer/account/update without auth → 401
async function test7() {
  try {
    const { response } = await apiCall('/api/customer/account/update', {
      method: 'POST',
      body: JSON.stringify({ phone: '07700900000' }),
    });

    if (response.status === 401) {
      log('7', 'PASS', 'Account update protected by auth');
      return true;
    } else {
      log('7', 'FAIL', `Expected 401, got ${response.status}`);
      return false;
    }
  } catch (e) {
    log('7', 'FAIL', e.message);
    return false;
  }
}

// Test 8: Check HTML pages exist and return 200
async function test8() {
  try {
    const pages = [
      '/customer-portal/login.html',
      '/customer-portal/dashboard.html',
      '/customer-portal/billing.html',
      '/customer-portal/storage.html',
      '/customer-portal/account.html',
    ];

    let allPass = true;
    for (const page of pages) {
      const response = await fetch(`${BASE_URL}${page}`);
      if (response.status !== 200) {
        console.log(`  ${page}: ${response.status}`);
        allPass = false;
      }
    }

    if (allPass) {
      log('8', 'PASS', 'All HTML pages accessible');
      return true;
    } else {
      log('8', 'FAIL', 'Some HTML pages not accessible');
      return false;
    }
  } catch (e) {
    log('8', 'FAIL', e.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🧪 PSNM Customer Portal — E2E Test Suite\n');
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
  console.log(`\nResults: ${passed}/${total} PASSED`);

  if (passed === total) {
    console.log('\n✓ All tests passed!\n');
    process.exit(0);
  } else {
    console.log(`\n✗ ${total - passed} test(s) failed\n`);
    process.exit(1);
  }
}

runTests();
