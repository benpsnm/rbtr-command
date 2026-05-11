#!/usr/bin/env node
// Run migration 55 (wellness tables) via Supabase Management API
// Requires: SUPABASE_ACCESS_TOKEN env var (Supabase personal access token)
// Get it from: https://supabase.com/dashboard/account/tokens
// Usage: SUPABASE_ACCESS_TOKEN=your_token node run-migration-55.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'mpxgyobotiqcawmqlhbf';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN not set.');
  console.error('Get your personal access token from: https://supabase.com/dashboard/account/tokens');
  console.error('Then run: SUPABASE_ACCESS_TOKEN=your_token node run-migration-55.js');
  process.exit(1);
}

const sql = readFileSync(
  join(__dirname, '../supabase/migrations/55_wellness_tables.sql'),
  'utf8'
);

async function run() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const body = await res.text();

  if (res.ok) {
    console.log('Migration 55 applied successfully.');
    console.log(body);
  } else {
    console.error(`Migration failed (${res.status}):`, body);
    process.exit(1);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
