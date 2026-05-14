-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 066: PSNM SEO Content Management
-- Created: 2026-05-14
-- Purpose: Store and manage 52 pre-written SEO articles for palletstoragenearme.co.uk
-- ═══════════════════════════════════════════════════════════════════════════

-- ── SEO Content Table ───────────────────────────────────────────────────────
-- Stores individual SEO articles with all metadata needed for WordPress publish

CREATE TABLE IF NOT EXISTS psnm_seo_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content identity
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_md TEXT NOT NULL, -- Full markdown body

  -- SEO metadata (from YAML frontmatter)
  meta_description TEXT,
  target_keyword TEXT,
  secondary_keywords TEXT[], -- Array of secondary keywords
  schema_type TEXT, -- e.g. "LocalBusiness+Service+FAQPage"
  word_count_target INT,

  -- Publishing
  status TEXT NOT NULL DEFAULT 'draft', -- draft | scheduled | published
  publish_priority INT DEFAULT 99, -- 1 = publish first, 99 = low priority
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- WordPress integration
  wordpress_post_id INT, -- WordPress page ID after publishing
  wordpress_url TEXT, -- Full URL on live site

  -- Metadata
  tier TEXT, -- tier-a-local | tier-b-national | tier-c-buyer-questions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_psnm_seo_content_status ON psnm_seo_content(status);
CREATE INDEX IF NOT EXISTS idx_psnm_seo_content_scheduled ON psnm_seo_content(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_psnm_seo_content_priority ON psnm_seo_content(publish_priority, status);
CREATE INDEX IF NOT EXISTS idx_psnm_seo_content_slug ON psnm_seo_content(slug);
CREATE INDEX IF NOT EXISTS idx_psnm_seo_content_tier ON psnm_seo_content(tier);

-- ── Publish Log Table ────────────────────────────────────────────────────────
-- Audit trail for all publishing actions

CREATE TABLE IF NOT EXISTS psnm_seo_publish_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES psnm_seo_content(id) ON DELETE CASCADE,

  -- Action details
  action TEXT NOT NULL, -- publish | unpublish | update | schedule
  triggered_by TEXT NOT NULL, -- manual | cron | api
  outcome TEXT NOT NULL, -- success | failed | skipped

  -- Result details
  wordpress_response JSONB, -- Full WordPress API response
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_psnm_seo_publish_log_content ON psnm_seo_publish_log(content_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psnm_seo_publish_log_outcome ON psnm_seo_publish_log(outcome, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- END Migration 066
-- ═══════════════════════════════════════════════════════════════════════════
