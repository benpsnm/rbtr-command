-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 48 · Atlas v2.2 Intelligence Stack — Angle Layer
--
-- psnm_lead_angles — Reasoner outputs, one row per pipeline run per lead.
-- Multiple rows per lead allowed (historical audit trail).
-- Also adds angle_id FK column to psnm_atlas_drafts.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Lead angles ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS psnm_lead_angles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES psnm_outreach_targets(id) ON DELETE CASCADE,
  enrichment_id   UUID REFERENCES psnm_lead_enrichment(id),
  angle_brief     JSONB NOT NULL DEFAULT '{}',
  confidence      INTEGER CHECK (confidence BETWEEN 0 AND 100),
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_angles_lead_id    ON psnm_lead_angles(lead_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_angles_confidence ON psnm_lead_angles(confidence);

COMMENT ON TABLE psnm_lead_angles IS 'CLASSIFICATION: INTERNAL — v2.2 reasoner outputs, one per pipeline run';

ALTER TABLE psnm_lead_angles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "angles_service_role" ON psnm_lead_angles;
CREATE POLICY "angles_service_role" ON psnm_lead_angles FOR ALL TO public
  USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "angles_anon_read" ON psnm_lead_angles;
CREATE POLICY "angles_anon_read" ON psnm_lead_angles FOR SELECT USING (true);

-- ── 2. Add angle_id FK to psnm_atlas_drafts ─────────────────────────────────

ALTER TABLE psnm_atlas_drafts ADD COLUMN IF NOT EXISTS angle_id UUID REFERENCES psnm_lead_angles(id);

-- ── Audit ────────────────────────────────────────────────────────────────────
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES (
  'atlas_v2_2_angles_schema', NULL,
  jsonb_build_object(
    'migration', '48',
    'tables_added', 1,
    'columns_added_to_atlas_drafts', 1
  )
) ON CONFLICT DO NOTHING;

COMMIT;
