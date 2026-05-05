-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 47 · Atlas v2.2 Intelligence Stack — Enrichment Layer
--
-- 1. psnm_lead_enrichment  — Companies House + web + news cache per lead
-- 2. psnm_atlas_drafts     — add v2.2 tracking columns
-- 3. Status constraint     — add 'pending_critic' to atlas_drafts
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Lead enrichment cache ────────────────────────────────────────────────
-- One row per lead (UNIQUE lead_id). Re-enrichment overwrites existing row.
-- Cache TTLs enforced at application layer (_enricher.js):
--   Companies House: 30 days   Website scrape: 14 days   News: 7 days

CREATE TABLE IF NOT EXISTS psnm_lead_enrichment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID UNIQUE NOT NULL REFERENCES psnm_outreach_targets(id) ON DELETE CASCADE,
  company_number  TEXT,
  enrichment_data JSONB NOT NULL DEFAULT '{}',
  quality_score   INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  retrieved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_enrichment_lead_id    ON psnm_lead_enrichment(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_retrieved  ON psnm_lead_enrichment(retrieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_quality    ON psnm_lead_enrichment(quality_score);

COMMENT ON TABLE psnm_lead_enrichment IS 'CLASSIFICATION: INTERNAL — v2.2 enrichment cache, one row per lead';

ALTER TABLE psnm_lead_enrichment ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "enrichment_service_role" ON psnm_lead_enrichment;
CREATE POLICY "enrichment_service_role" ON psnm_lead_enrichment FOR ALL TO public
  USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "enrichment_anon_read" ON psnm_lead_enrichment;
CREATE POLICY "enrichment_anon_read" ON psnm_lead_enrichment FOR SELECT USING (true);

-- ── 2. psnm_atlas_drafts — v2.2 tracking columns ───────────────────────────

ALTER TABLE psnm_atlas_drafts ADD COLUMN IF NOT EXISTS source           TEXT;
ALTER TABLE psnm_atlas_drafts ADD COLUMN IF NOT EXISTS enrichment_id    UUID REFERENCES psnm_lead_enrichment(id);
ALTER TABLE psnm_atlas_drafts ADD COLUMN IF NOT EXISTS critic_iterations INTEGER DEFAULT 0;
ALTER TABLE psnm_atlas_drafts ADD COLUMN IF NOT EXISTS critic_log       JSONB DEFAULT '[]'::jsonb;

-- ── 3. Status constraint — add 'pending_critic' ─────────────────────────────
-- Migration 45 already widened this constraint. Drop and recreate with
-- 'pending_critic' added.

ALTER TABLE psnm_atlas_drafts DROP CONSTRAINT IF EXISTS psnm_atlas_drafts_status_check;
ALTER TABLE psnm_atlas_drafts ADD CONSTRAINT psnm_atlas_drafts_status_check
  CHECK (status IN (
    'pending_approval',
    'pending_critic',
    'approved',
    'rejected',
    'sent',
    'failed',
    'needs_revision',
    'needs_source',
    'enrichment_required'
  ));

-- ── Audit ────────────────────────────────────────────────────────────────────
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES (
  'atlas_v2_2_enrichment_schema', NULL,
  jsonb_build_object(
    'migration', '47',
    'tables_added', 1,
    'columns_added_to_atlas_drafts', 4,
    'status_added', 'pending_critic'
  )
) ON CONFLICT DO NOTHING;

COMMIT;
