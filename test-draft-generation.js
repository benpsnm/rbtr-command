#!/usr/bin/env node
'use strict';

// Manual E2E test for draft generation
// Usage: node test-draft-generation.js <company_name_or_lead_id>

// Load env vars from v14/.env.local
require('dotenv').config({ path: './v14/.env.local' });

const { runPipeline } = require('./v14/api/_intelligence_pipeline');

async function main() {
  const input = process.argv[2] || 'test-company';

  console.log(`\n=== Testing draft generation for: ${input} ===\n`);

  try {
    const result = await runPipeline(input);

    console.log('\n=== PIPELINE RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    // Check if draft was created
    const draftCount = result.draft_id ? 1 : 0;

    if (draftCount >= 1) {
      console.log(`\n✅ SUCCESS: Created ${draftCount} draft(s)`);
      console.log(`   Draft ID: ${result.draft_id}`);
      console.log(`   Status: ${result.final_status}`);
      process.exit(0);
    } else {
      console.log(`\n❌ FAIL: Expected >= 1 drafts, found ${draftCount}`);
      console.log(`   Final status: ${result.final_status}`);
      console.log(`   Error: ${result.error || 'Pipeline stopped before draft generation'}`);

      // Show which layer failed
      if (result.layers.enricher && !result.layers.enricher.ok) {
        console.log(`   Failed at: Enricher layer`);
      } else if (result.final_status === 'manual_research_required') {
        console.log(`   Failed at: Enricher (quality too low)`);
      } else if (result.layers.reasoner && !result.layers.reasoner.ok) {
        console.log(`   Failed at: Reasoner layer`);
      } else if (result.final_status === 'human_review_required') {
        console.log(`   Failed at: Reasoner (confidence too low) or Critic (too many failures)`);
      }

      process.exit(1);
    }

  } catch (err) {
    console.error('\n❌ EXCEPTION:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
