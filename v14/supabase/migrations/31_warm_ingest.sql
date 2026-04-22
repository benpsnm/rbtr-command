-- ─────────────────────────────────────────────────────────────────────────
-- 31_warm_ingest.sql — Phase 2.7 warm-lead ingestion
-- ─────────────────────────────────────────────────────────────────────────
-- Adds: psnm_quotes table + temperature/engagement columns on psnm_enquiries
-- + opened/clicked/replied_at/enquiry_id on psnm_outreach_touches.
-- Purpose: make every warm lead Ben has ever interacted with visible in
-- Atlas, ranked above cold, with engagement history surfaced.
-- Classification: INTERNAL. RLS: service_role only.
-- Additive only. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- ── New table: psnm_quotes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS psnm_quotes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id            UUID REFERENCES psnm_enquiries(id) ON DELETE SET NULL,
  company               TEXT NOT NULL,
  contact_name          TEXT,
  contact_email         TEXT,
  quote_date            DATE NOT NULL,
  pallets_quoted        INTEGER,
  duration_months       INTEGER,
  monthly_rate_gbp      NUMERIC,
  total_quote_gbp       NUMERIC,
  first_month_free      BOOLEAN DEFAULT TRUE,
  status                TEXT DEFAULT 'sent' CHECK (status IN
                          ('sent','opened','replied','accepted','rejected','expired')),
  sent_via              TEXT CHECK (sent_via IN
                          ('email','whichwarehouse','phone','in_person','whatsapp')),
  pdf_url               TEXT,
  notes                 TEXT,
  expires_at            DATE,
  opened_count          INTEGER DEFAULT 0,
  last_opened_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE psnm_quotes IS 'CLASSIFICATION: INTERNAL — quotes sent to prospects';

CREATE INDEX IF NOT EXISTS idx_psnm_quotes_enquiry   ON psnm_quotes(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_psnm_quotes_status    ON psnm_quotes(status);
CREATE INDEX IF NOT EXISTS idx_psnm_quotes_date      ON psnm_quotes(quote_date DESC);

ALTER TABLE psnm_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_only_psnm_quotes ON psnm_quotes;
CREATE POLICY service_role_only_psnm_quotes ON psnm_quotes
  FOR ALL USING (auth.role() = 'service_role');

-- updated_at trigger (reuses _rbtr_set_updated_at from migration 15)
DROP TRIGGER IF EXISTS trg_psnm_quotes_updated_at ON psnm_quotes;
CREATE TRIGGER trg_psnm_quotes_updated_at
  BEFORE UPDATE ON psnm_quotes
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Extend psnm_enquiries with temperature + engagement fields ────────────
ALTER TABLE psnm_enquiries
  ADD COLUMN IF NOT EXISTS lead_source        TEXT,
  ADD COLUMN IF NOT EXISTS lead_source_ref    TEXT,
  ADD COLUMN IF NOT EXISTS first_contact_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contact_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement_score   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replied            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quote_sent         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quote_amount_gbp   NUMERIC,
  ADD COLUMN IF NOT EXISTS temperature        TEXT
    CHECK (temperature IN ('hot','warm','cold','dead'))
    DEFAULT 'warm';

-- ── Extend psnm_outreach_touches for engagement scoring ───────────────────
ALTER TABLE psnm_outreach_touches
  ADD COLUMN IF NOT EXISTS opened_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replied_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enquiry_id     UUID REFERENCES psnm_enquiries(id) ON DELETE SET NULL;

-- ── Indexes for fast ranked queries ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_psnm_enquiries_temperature_score
  ON psnm_enquiries(temperature, engagement_score DESC);

CREATE INDEX IF NOT EXISTS idx_psnm_enquiries_lead_source
  ON psnm_enquiries(lead_source) WHERE lead_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_psnm_touches_enquiry
  ON psnm_outreach_touches(enquiry_id, touched_at DESC) WHERE enquiry_id IS NOT NULL;

-- ── Verification ──────────────────────────────────────────────────────────
-- After pasting this migration in Supabase SQL editor, run:
--   SELECT count(*) FROM psnm_quotes;                           -- expect 0
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='psnm_enquiries'
--     AND column_name IN ('temperature','engagement_score','lead_source');
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='psnm_outreach_touches'
--     AND column_name IN ('opened_count','clicked_count','replied_at','enquiry_id');
-- All three SELECTs must return rows.
