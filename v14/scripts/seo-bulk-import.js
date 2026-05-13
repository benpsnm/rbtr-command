#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// PSNM SEO Content Bulk Import
// Parses 52 markdown files from ~/Documents/RBTR-Brain/00-Inbox/psnm-content/
// and inserts them into psnm_seo_content table
// ═══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(require('os').homedir(), 'Documents/RBTR-Brain/00-Inbox/psnm-content');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE required');
  process.exit(1);
}

// ── Parse YAML frontmatter ───────────────────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const [, yaml, body] = match;
  const frontmatter = {};

  // Simple YAML parser (good enough for this structure)
  yaml.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Handle arrays (secondary_keywords)
    if (line.trim().endsWith(':') && !value) {
      frontmatter[key] = [];
    } else if (line.startsWith('  - ')) {
      const lastKey = Object.keys(frontmatter).pop();
      if (Array.isArray(frontmatter[lastKey])) {
        frontmatter[lastKey].push(line.trim().slice(2).replace(/^["']|["']$/g, ''));
      }
    } else {
      frontmatter[key] = value;
    }
  });

  return { frontmatter, body: body.trim() };
}

// ── Get tier from file path ──────────────────────────────────────────────────
function getTier(filePath) {
  if (filePath.includes('tier-a-local')) return 'tier-a-local';
  if (filePath.includes('tier-b-national')) return 'tier-b-national';
  if (filePath.includes('tier-c-buyer-questions')) return 'tier-c-buyer-questions';
  return 'uncategorized';
}

// ── Insert to Supabase ───────────────────────────────────────────────────────
async function insertContent(article) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/psnm_seo_content`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(article)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase insert failed: ${response.status} ${error}`);
  }

  return response.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 PSNM SEO Content Bulk Import\n');

  // Find all markdown files
  const tiers = ['tier-a-local', 'tier-b-national', 'tier-c-buyer-questions'];
  const files = [];

  for (const tier of tiers) {
    const tierDir = path.join(CONTENT_DIR, tier);
    if (!fs.existsSync(tierDir)) {
      console.warn(`⚠️  ${tier} directory not found, skipping`);
      continue;
    }

    const tierFiles = fs.readdirSync(tierDir)
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(tierDir, f));

    files.push(...tierFiles);
  }

  console.log(`📄 Found ${files.length} markdown files\n`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const tier = getTier(file);

      // Build article object
      const article = {
        title: frontmatter.title,
        slug: frontmatter.slug,
        content_md: body,
        meta_description: frontmatter.meta_description,
        target_keyword: frontmatter.target_keyword,
        secondary_keywords: frontmatter.secondary_keywords || [],
        schema_type: frontmatter.schema_type,
        word_count_target: parseInt(frontmatter.word_count_target) || null,
        publish_priority: parseInt(frontmatter.publish_priority) || 99,
        tier,
        status: 'draft'
      };

      // Insert
      await insertContent(article);
      console.log(`✅ ${article.slug}`);
      inserted++;

    } catch (err) {
      console.error(`❌ ${path.basename(file)}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Inserted: ${inserted}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
