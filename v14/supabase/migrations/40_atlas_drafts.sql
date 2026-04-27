-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 40 · psnm_atlas_drafts
-- Framework-generated email drafts, human-in-loop approval queue.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS psnm_atlas_drafts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id          UUID REFERENCES psnm_outreach_targets(id) ON DELETE CASCADE,
  touch_number         INTEGER DEFAULT 1,
  subject              TEXT NOT NULL,
  body                 TEXT NOT NULL,
  framework_annotations JSONB DEFAULT '[]',
  confidence_score     INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  status               TEXT NOT NULL DEFAULT 'pending_approval'
                         CHECK (status IN ('pending_approval','approved','rejected','sent','failed')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  approved_at          TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  approved_by          TEXT,
  send_result          JSONB
);

CREATE INDEX IF NOT EXISTS idx_atlas_drafts_status ON psnm_atlas_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_atlas_drafts_prospect ON psnm_atlas_drafts (prospect_id, touch_number);

ALTER TABLE psnm_atlas_drafts ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "atlas_drafts_service_role" ON psnm_atlas_drafts;
CREATE POLICY "atlas_drafts_service_role"
  ON psnm_atlas_drafts FOR ALL TO public
  USING (auth.role() = 'service_role');

-- Anon SELECT (WMS reads drafts)
DROP POLICY IF EXISTS "atlas_drafts_anon_read" ON psnm_atlas_drafts;
CREATE POLICY "atlas_drafts_anon_read"
  ON psnm_atlas_drafts FOR SELECT USING (true);

-- Anon UPDATE (WMS approve/reject/edit)
DROP POLICY IF EXISTS "atlas_drafts_anon_update" ON psnm_atlas_drafts;
CREATE POLICY "atlas_drafts_anon_update"
  ON psnm_atlas_drafts FOR UPDATE USING (true);

COMMIT;
