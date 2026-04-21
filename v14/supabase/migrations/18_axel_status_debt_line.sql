-- ===========================================================================
-- RBTR · Axel Brothers winding-up status + Debt Line consultation
--
-- Two LEGAL_SENSITIVE tables that sit alongside (not replace) the lighter
-- pathway trackers in migration 16:
--   - axel_brothers_pathway  (migration 16) tracks negotiation stage
--   - axel_brothers_status   (this migration) tracks the actual winding-up
--                            mechanism and Ben's personal exposure
--   - apa_status             (migration 16) tracks APA signing
--   - debt_line_consultation (this migration) tracks the pre-rebrand
--                            Debt Line solicitor consultation specifically
--
-- ASCII-safe. Idempotent.
-- ===========================================================================

-- 1. Axel Brothers winding-up / insolvency status
CREATE TABLE IF NOT EXISTS axel_brothers_status (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winding_up_type                   TEXT,
  -- MVL (members' voluntary liquidation) | CVL (creditors' voluntary liquidation)
  -- | striking_off | TBC | administration
  winding_up_started                DATE,
  creditor_status_confirmed         BOOLEAN DEFAULT FALSE,
  creditor_status_notes             TEXT,
  ben_personal_exposure             TEXT,
  insolvency_practitioner_consulted BOOLEAN DEFAULT FALSE,
  ip_consultation_date              DATE,
  ip_name                           TEXT,
  apa_dependency_notes              TEXT,
  last_reviewed_at                  TIMESTAMPTZ DEFAULT NOW(),
  created_at                        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Debt Line pre-rebrand consultation (must happen BEFORE any public RBTR content)
CREATE TABLE IF NOT EXISTS debt_line_consultation (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_booked     BOOLEAN DEFAULT FALSE,
  consultation_date       DATE,
  consultant_name         TEXT,
  consultant_firm         TEXT,
  consultation_cost_gbp   NUMERIC,
  outcomes_notes          TEXT,
  follow_up_required      BOOLEAN DEFAULT FALSE,
  follow_up_date          DATE,
  pre_rebrand_status      TEXT,
  -- not_started | advice_sought | advice_received | clear_to_proceed | blocked
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Seed singleton rows so the briefing has a deterministic target to read
INSERT INTO axel_brothers_status DEFAULT VALUES
  ON CONFLICT DO NOTHING;
INSERT INTO debt_line_consultation DEFAULT VALUES
  ON CONFLICT DO NOTHING;

-- Classification tags
COMMENT ON TABLE axel_brothers_status    IS 'CLASSIFICATION: LEGAL_SENSITIVE — winding-up mechanism + Ben''s personal exposure; never quote outside Co-Lab Debt section';
COMMENT ON TABLE debt_line_consultation  IS 'CLASSIFICATION: LEGAL_SENSITIVE — pre-rebrand legal clearance; must happen BEFORE any public RBTR content';

-- RLS on (service_role bypasses)
ALTER TABLE axel_brothers_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_line_consultation  ENABLE ROW LEVEL SECURITY;

-- Sanity:
--   SELECT winding_up_type, creditor_status_confirmed, ip_name FROM axel_brothers_status;
--   SELECT consultation_booked, pre_rebrand_status, consultation_date FROM debt_line_consultation;
