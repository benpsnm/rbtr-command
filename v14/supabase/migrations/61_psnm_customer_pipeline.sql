-- Migration 61: PSNM Customer Onboarding Pipeline
-- Created: 13 May 2026 by autonomous build session
-- Purpose: Full customer pipeline — quotes, agreements, insurance, bookings, portal users.
-- All tables: RLS enabled, service_role_all policy, no anon access.
-- Bankruptcy-aware: every customer record has bankruptcy_aware_notes field.

BEGIN;

-- ── 1. psnm_customers ────────────────────────────────────────────────────────
-- Master customer record. One row per business. Drives all downstream tables.

CREATE TABLE IF NOT EXISTS psnm_customers (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name             TEXT          NOT NULL,
  contact_name              TEXT,
  email                     TEXT,
  phone                     TEXT,
  billing_address           TEXT,
  delivery_address          TEXT,
  company_reg               TEXT,
  vat_number                TEXT,
  source                    TEXT          DEFAULT 'direct'
                              CHECK (source IN ('direct','whichwarehouse','atlas_outreach','quote_form','referral','other')),
  ww_ref                    TEXT,          -- WhichWarehouse enquiry reference (WW-XXXXX)
  status                    TEXT          NOT NULL DEFAULT 'lead'
                              CHECK (status IN ('lead','quote_sent','agreement_signed','insurance_verified','live','dormant','terminated')),
  onboarding_started_at     TIMESTAMPTZ   DEFAULT now(),
  quote_sent_at             TIMESTAMPTZ,
  agreement_signed_at       TIMESTAMPTZ,
  insurance_verified_at     TIMESTAMPTZ,
  became_live_at            TIMESTAMPTZ,
  terminated_at             TIMESTAMPTZ,
  volume_pallets_forecast   INTEGER,       -- prospect's stated volume
  volume_pallets_actual     INTEGER,       -- actual pallets currently stored (derived from WMS, updated weekly)
  goods_description         TEXT,          -- what they store — used for goods acceptance check
  goods_accepted            BOOLEAN,       -- null = pending, true = accepted, false = rejected
  account_manager           TEXT          DEFAULT 'Ben Greenwood',
  portal_user_id            UUID,          -- FK to psnm_customer_portal_users.id
  bankruptcy_aware_notes    TEXT,          -- populated if filing occurs; routing / disclosure instructions
  internal_notes            TEXT,          -- Ben's notes — never shown to customer
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_customers_status
  ON psnm_customers (status);
CREATE INDEX IF NOT EXISTS idx_psnm_customers_email
  ON psnm_customers (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_psnm_customers_ww_ref
  ON psnm_customers (ww_ref) WHERE ww_ref IS NOT NULL;

ALTER TABLE psnm_customers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_customers_updated_at ON psnm_customers;
CREATE TRIGGER trg_psnm_customers_updated_at
  BEFORE UPDATE ON psnm_customers
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_customers
  IS 'CLASSIFICATION: INTERNAL — PSNM customer pipeline master record. One row per business. status column drives the onboarding stage. bankruptcy_aware_notes is populated only if Ben files — contains routing/disclosure instructions for that customer.';

-- ── 2. psnm_quotes ───────────────────────────────────────────────────────────
-- One quote per customer interaction. Multiple quotes may exist per customer
-- (e.g. if they come back for a revised quote).

CREATE TABLE IF NOT EXISTS psnm_quotes (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID          NOT NULL REFERENCES psnm_customers(id) ON DELETE CASCADE,
  quote_number              TEXT          NOT NULL UNIQUE, -- format: PSN-Q-YYYYMMDD-NNN
  quote_date                DATE          NOT NULL DEFAULT CURRENT_DATE,
  valid_until               DATE          NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),

  -- Volume + rates (locked at quote date)
  pallet_count              INTEGER       NOT NULL,
  duration_weeks            INTEGER       NOT NULL DEFAULT 12,
  rate_tier                 TEXT          NOT NULL
                              CHECK (rate_tier IN ('small','mid','bulk')),
  storage_rate_pw           NUMERIC(6,2)  NOT NULL,  -- £ per pallet per week at quote date
  storage_total             NUMERIC(10,2),
  receipt_rate              NUMERIC(6,2)  DEFAULT 3.50,
  receipt_total             NUMERIC(10,2),
  despatch_rate             NUMERIC(6,2)  DEFAULT 3.50,
  despatch_total            NUMERIC(10,2),
  devan_rate_20ft           NUMERIC(8,2)  DEFAULT 200.00,
  devan_rate_40ft           NUMERIC(8,2)  DEFAULT 350.00,
  onboarding_fee            NUMERIC(8,2)  DEFAULT 50.00,  -- 0 if waived
  weekly_storage_cost       NUMERIC(8,2),
  monthly_storage_cost      NUMERIC(8,2),
  subtotal                  NUMERIC(10,2),
  vat_amount                NUMERIC(10,2),
  total_inc_vat             NUMERIC(10,2),
  deposit_required          NUMERIC(8,2),

  special_conditions        TEXT,          -- any bespoke deal terms
  internal_notes            TEXT,

  status                    TEXT          NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','sent','accepted','rejected','expired','superseded')),
  sent_at                   TIMESTAMPTZ,
  accepted_at               TIMESTAMPTZ,
  rejected_at               TIMESTAMPTZ,
  sg_message_id             TEXT,          -- SendGrid message ID for tracking

  -- Document storage
  doc_html_path             TEXT,          -- relative path in Supabase storage: quotes/{id}.html
  pdf_url                   TEXT,          -- if PDF generated externally

  -- Bankruptcy context
  bankruptcy_filing_date_context TEXT      DEFAULT 'pre_filing'
                              CHECK (bankruptcy_filing_date_context IN ('pre_filing','post_filing_successor','post_discharge')),

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_quotes_customer_id
  ON psnm_quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_psnm_quotes_status
  ON psnm_quotes (status);

ALTER TABLE psnm_quotes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_quotes_updated_at ON psnm_quotes;
CREATE TRIGGER trg_psnm_quotes_updated_at
  BEFORE UPDATE ON psnm_quotes
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_quotes
  IS 'CLASSIFICATION: INTERNAL — PSNM formal storage quotes. Rates locked at quote_date. Multiple quotes may exist per customer. bankruptcy_filing_date_context separates pre/post-filing receivables for trustee clarity.';

-- ── 3. psnm_agreements ───────────────────────────────────────────────────────
-- Customer storage agreement. One active agreement per customer at any time.

CREATE TABLE IF NOT EXISTS psnm_agreements (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID          NOT NULL REFERENCES psnm_customers(id) ON DELETE CASCADE,
  quote_id                  UUID          REFERENCES psnm_quotes(id),
  agreement_number          TEXT          NOT NULL UNIQUE, -- format: PSN-A-YYYYMMDD-NNN
  agreement_date            DATE          NOT NULL DEFAULT CURRENT_DATE,

  -- T&Cs version reference
  tc_version                TEXT          NOT NULL DEFAULT 'v1.0-april-2026',
  tc_hash                   TEXT,          -- SHA256 of T&Cs text at signing time (audit trail)

  -- Dates
  effective_from            DATE,
  effective_to              DATE,          -- null = rolling/indefinite
  minimum_term_weeks        INTEGER       NOT NULL DEFAULT 4,
  notice_period_days        INTEGER       NOT NULL DEFAULT 30,

  -- Signature tracking
  sent_at                   TIMESTAMPTZ,
  signed_date               DATE,
  signed_by_name            TEXT,
  signed_by_email           TEXT,
  customer_signature_ref    TEXT,          -- path to signed PDF in storage: agreements/{id}_signed.pdf
  ben_signed_at             TIMESTAMPTZ,
  ben_signature_ref         TEXT,

  -- Documents
  doc_html_path             TEXT,          -- agreements/{id}.html in Supabase storage
  pdf_url                   TEXT,

  status                    TEXT          NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','sent','signed','active','terminated','superseded')),

  sg_message_id             TEXT,
  internal_notes            TEXT,

  -- Novation tracking (for bankruptcy successor transition)
  novated_to_entity         TEXT,          -- if novated, name of successor entity
  novation_date             DATE,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_agreements_customer_id
  ON psnm_agreements (customer_id);
CREATE INDEX IF NOT EXISTS idx_psnm_agreements_status
  ON psnm_agreements (status);

ALTER TABLE psnm_agreements ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_agreements_updated_at ON psnm_agreements;
CREATE TRIGGER trg_psnm_agreements_updated_at
  BEFORE UPDATE ON psnm_agreements
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_agreements
  IS 'CLASSIFICATION: INTERNAL — PSNM customer storage agreements. tc_hash provides audit trail of T&C version at signing. novated_to_entity populated if bankruptcy successor takes over the agreement.';

-- ── 4. psnm_insurance_records ────────────────────────────────────────────────
-- Customer insurance certificates. One active record per customer.
-- Renewed annually; history preserved.

CREATE TABLE IF NOT EXISTS psnm_insurance_records (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID          NOT NULL REFERENCES psnm_customers(id) ON DELETE CASCADE,

  -- Certificate details (extracted by Claude vision or entered manually)
  insurance_provider        TEXT,
  policy_number             TEXT,
  cover_type                TEXT,          -- 'public_liability' | 'goods_in_storage' | 'combined' | 'other'
  cover_amount              NUMERIC(12,2), -- in GBP
  cover_starts              DATE,
  cover_ends                DATE,
  named_insured             TEXT,          -- must match customer business_name

  -- Raw storage reference
  certificate_storage_path  TEXT,          -- storage: insurance/{customer_id}/{id}.pdf
  certificate_pdf_url       TEXT,

  -- Extraction metadata
  extraction_method         TEXT          DEFAULT 'manual'
                              CHECK (extraction_method IN ('manual','claude_vision','ocr')),
  extraction_raw            JSONB,         -- full Claude vision response for audit

  -- Verification
  verified_by_ben           BOOLEAN       NOT NULL DEFAULT false,
  verified_at               TIMESTAMPTZ,
  verification_notes        TEXT,
  verification_gaps         TEXT[],        -- e.g. ['cover_amount_too_low', 'policy_expired']
  is_compliant              BOOLEAN,       -- null = pending, true = all checks pass, false = gaps found

  -- Renewal tracking
  next_renewal_check_at     DATE,          -- 30 days before cover_ends
  renewal_reminder_sent     BOOLEAN       DEFAULT false,

  is_active                 BOOLEAN       NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_insurance_customer_id
  ON psnm_insurance_records (customer_id);
CREATE INDEX IF NOT EXISTS idx_psnm_insurance_renewal
  ON psnm_insurance_records (next_renewal_check_at) WHERE is_active = true;

ALTER TABLE psnm_insurance_records ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_insurance_updated_at ON psnm_insurance_records;
CREATE TRIGGER trg_psnm_insurance_updated_at
  BEFORE UPDATE ON psnm_insurance_records
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_insurance_records
  IS 'CLASSIFICATION: INTERNAL — Customer insurance certificates. Extracted by Claude vision or entered manually. verification_gaps array contains specific compliance failures. next_renewal_check_at = cover_ends - 30 days.';

-- ── 5. psnm_bookings (pipeline) ──────────────────────────────────────────────
-- Customer-initiated delivery/collection bookings. Separate from psnm_wms_bookings
-- (which is the WMS-level booking system). This is the pipeline/onboarding layer.

CREATE TABLE IF NOT EXISTS psnm_pipeline_bookings (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID          NOT NULL REFERENCES psnm_customers(id) ON DELETE CASCADE,
  booking_ref               TEXT          NOT NULL UNIQUE, -- format: PSN-BK-YYYYMMDD-NNN
  booking_type              TEXT          NOT NULL
                              CHECK (booking_type IN ('inbound','outbound','devan_20ft','devan_40ft','collection','special')),

  -- Scheduling
  requested_date            DATE,
  requested_time_slot       TEXT,          -- 'morning' (08-12) | 'afternoon' (12-17) | 'specific'
  requested_time_specific   TEXT,
  confirmed_date            DATE,
  confirmed_time            TEXT,

  -- Volume
  pallet_count              INTEGER,
  pallet_description        TEXT,

  -- Logistics
  vehicle_reg               TEXT,
  driver_name               TEXT,
  driver_phone              TEXT,
  haulier_name              TEXT,

  -- Checklist (JSON object — each key is a checklist item, value is bool)
  pre_arrival_checklist     JSONB         DEFAULT '{}'::JSONB,

  -- Status
  status                    TEXT          NOT NULL DEFAULT 'requested'
                              CHECK (status IN ('requested','confirmed','en_route','arrived','unloading','completed','cancelled')),
  arrived_at                TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,

  -- Links
  wms_pallet_ids            INTEGER[],    -- psnm_wms_pallets.id records created on arrival

  notes                     TEXT,
  internal_notes            TEXT,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_pipeline_bookings_customer_id
  ON psnm_pipeline_bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_psnm_pipeline_bookings_status
  ON psnm_pipeline_bookings (status);
CREATE INDEX IF NOT EXISTS idx_psnm_pipeline_bookings_date
  ON psnm_pipeline_bookings (confirmed_date) WHERE status NOT IN ('completed','cancelled');

ALTER TABLE psnm_pipeline_bookings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_pipeline_bookings_updated_at ON psnm_pipeline_bookings;
CREATE TRIGGER trg_psnm_pipeline_bookings_updated_at
  BEFORE UPDATE ON psnm_pipeline_bookings
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_pipeline_bookings
  IS 'CLASSIFICATION: INTERNAL — Customer-initiated delivery and collection bookings. pre_arrival_checklist is JSON. wms_pallet_ids links to psnm_wms_pallets records created on completion. Distinct from psnm_wms_bookings (legacy WMS layer).';

-- ── 6. psnm_customer_portal_users ────────────────────────────────────────────
-- Magic-link portal auth. No passwords stored. One record per customer email.

CREATE TABLE IF NOT EXISTS psnm_customer_portal_users (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id               UUID          NOT NULL REFERENCES psnm_customers(id) ON DELETE CASCADE,
  email                     TEXT          NOT NULL UNIQUE,
  role                      TEXT          NOT NULL DEFAULT 'admin'
                              CHECK (role IN ('admin','viewer')),

  -- Magic link state
  login_token               TEXT,          -- bcrypt not needed; this is a random 32-byte hex token
  login_token_expires       TIMESTAMPTZ,   -- 15 minutes from issue
  last_login                TIMESTAMPTZ,
  login_count               INTEGER       NOT NULL DEFAULT 0,

  -- Session JWT (we don't store it; customer gets a cookie)
  is_active                 BOOLEAN       NOT NULL DEFAULT true,

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_portal_users_customer_id
  ON psnm_customer_portal_users (customer_id);
CREATE INDEX IF NOT EXISTS idx_psnm_portal_users_email
  ON psnm_customer_portal_users (email);
CREATE INDEX IF NOT EXISTS idx_psnm_portal_users_token
  ON psnm_customer_portal_users (login_token) WHERE login_token IS NOT NULL;

ALTER TABLE psnm_customer_portal_users ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_portal_users_updated_at ON psnm_customer_portal_users;
CREATE TRIGGER trg_psnm_portal_users_updated_at
  BEFORE UPDATE ON psnm_customer_portal_users
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_customer_portal_users
  IS 'CLASSIFICATION: INTERNAL — Customer portal magic-link auth. No passwords. login_token is 32-byte hex, expires in 15 minutes. Session is JWT cookie (portal_session) issued server-side on valid token claim.';

-- ── 7. psnm_rate_card ────────────────────────────────────────────────────────
-- Canonical PSNM rate card. Ben updates rates here; all quote generation reads from here.
-- Replaces hard-coded defaults in _quote_calc.js.

CREATE TABLE IF NOT EXISTS psnm_rate_card (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  version                   TEXT          NOT NULL UNIQUE,  -- e.g. 'v1.0-may-2026'
  effective_from            DATE          NOT NULL,
  is_current                BOOLEAN       NOT NULL DEFAULT true,
  notes                     TEXT,

  -- Storage tiers (stored as JSONB for flexibility)
  storage_tiers             JSONB         NOT NULL,
  -- Expected format:
  -- [{"range_min":1,"range_max":49,"rate_per_pallet_week":3.95,"label":"Small (1–49 pallets)"},
  --  {"range_min":50,"range_max":149,"rate_per_pallet_week":3.45,"label":"Mid (50–149 pallets)"},
  --  {"range_min":150,"range_max":null,"rate_per_pallet_week":2.95,"label":"Bulk (150+ pallets)"}]

  -- Handling rates
  handling_in_rate          NUMERIC(6,2)  NOT NULL DEFAULT 3.50,
  handling_out_rate         NUMERIC(6,2)  NOT NULL DEFAULT 3.50,
  onboarding_fee            NUMERIC(8,2)  NOT NULL DEFAULT 50.00,
  onboarding_waiver_min_pallets INTEGER   NOT NULL DEFAULT 50,

  -- Container devanning
  devan_20ft_rate           NUMERIC(8,2)  NOT NULL DEFAULT 200.00,
  devan_40ft_rate           NUMERIC(8,2)  NOT NULL DEFAULT 350.00,

  -- Container hire
  container_hire_monthly    NUMERIC(8,2)  NOT NULL DEFAULT 80.00,

  -- Quote parameters
  quote_valid_days          INTEGER       NOT NULL DEFAULT 14,
  deposit_percent           NUMERIC(4,2)  NOT NULL DEFAULT 10.00,
  deposit_minimum           NUMERIC(8,2)  NOT NULL DEFAULT 50.00,

  -- Payment terms
  payment_terms_days        INTEGER       NOT NULL DEFAULT 7,
  late_payment_notice_days  INTEGER       NOT NULL DEFAULT 14,

  -- Insurance minimums (GBP)
  insurance_min_pl          NUMERIC(12,2) NOT NULL DEFAULT 5000000.00,  -- £5M public liability
  insurance_min_goods       NUMERIC(12,2) NOT NULL DEFAULT 25000.00,    -- £25k or declared value

  created_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE psnm_rate_card ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_rate_card_updated_at ON psnm_rate_card;
CREATE TRIGGER trg_psnm_rate_card_updated_at
  BEFORE UPDATE ON psnm_rate_card
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_rate_card
  IS 'CLASSIFICATION: INTERNAL — Canonical PSNM rate card. Only one row should have is_current=true. Quote generation reads the current row. Ben updates rates here without code changes.';

-- ── RLS policies (service_role only for all pipeline tables) ─────────────────

DO $$ BEGIN
  -- psnm_customers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_customers' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- psnm_quotes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_quotes' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_quotes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- psnm_agreements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_agreements' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_agreements FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- psnm_insurance_records
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_insurance_records' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_insurance_records FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- psnm_pipeline_bookings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_pipeline_bookings' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_pipeline_bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- psnm_customer_portal_users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_customer_portal_users' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_customer_portal_users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- psnm_rate_card
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='psnm_rate_card' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON psnm_rate_card FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── 8. Seed: Current rate card ────────────────────────────────────────────────

INSERT INTO psnm_rate_card (
  version, effective_from, is_current, notes,
  storage_tiers,
  handling_in_rate, handling_out_rate,
  onboarding_fee, onboarding_waiver_min_pallets,
  devan_20ft_rate, devan_40ft_rate, container_hire_monthly,
  quote_valid_days, deposit_percent, deposit_minimum,
  payment_terms_days, late_payment_notice_days,
  insurance_min_pl, insurance_min_goods
) VALUES (
  'v1.0-may-2026',
  '2026-05-01',
  true,
  'Initial rate card. Rates confirmed from WW enquiry responses 12 May 2026. Solicitor review of T&Cs due May 2026.',
  '[
    {"range_min":1,"range_max":49,"rate_per_pallet_week":3.95,"label":"Small (1–49 pallets)"},
    {"range_min":50,"range_max":149,"rate_per_pallet_week":3.45,"label":"Mid (50–149 pallets)"},
    {"range_min":150,"range_max":null,"rate_per_pallet_week":2.95,"label":"Bulk (150+ pallets)"}
  ]'::JSONB,
  3.50, 3.50,
  50.00, 50,
  200.00, 350.00, 80.00,
  14, 10.00, 50.00,
  7, 14,
  5000000.00, 25000.00
) ON CONFLICT (version) DO NOTHING;

-- ── 9. Seed: Three live WW enquiry customers ──────────────────────────────────
-- WW-11827: flat-pack furniture (~£4k/mo potential) — quote sent, awaiting September decision
-- WW-11828: bamboo boards (~£1.5-2k one-off) — quote sent, awaiting August decision
-- WW-11829: home improvement supplies (~£500/mo potential) — quote sent, pending Monday decision

INSERT INTO psnm_customers (
  business_name, contact_name, email, phone,
  source, ww_ref, status,
  volume_pallets_forecast, goods_description,
  goods_accepted,
  internal_notes, onboarding_started_at
) VALUES
(
  'WW-11827 Flat-Pack Furniture Co.',
  NULL, NULL, NULL,
  'whichwarehouse', 'WW-11827', 'quote_sent',
  100,
  'Flat-pack furniture — ambient. Standard europallets. WW enquiry 12 May 2026.',
  true,
  'Potential ~£4k/mo ongoing. Customer decision expected September 2026. Quote sent 12 May. Follow up late August.',
  '2026-05-12 00:00:00+00'
),
(
  'WW-11828 Bamboo Boards Supplier',
  NULL, NULL, NULL,
  'whichwarehouse', 'WW-11828', 'quote_sent',
  40,
  'Bamboo boards / sheet material — ambient. One-off or short-term storage requirement.',
  true,
  'One-off enquiry ~£1.5-2k. Customer decision expected August 2026. Quote sent 12 May.',
  '2026-05-12 00:00:00+00'
),
(
  'WW-11829 Home Improvement Supplies',
  NULL, NULL, NULL,
  'whichwarehouse', 'WW-11829', 'quote_sent',
  15,
  'Home improvement supplies — ambient. Need to verify no aerosols/solvents (hazmat check pending).',
  NULL,
  'Ongoing ~£500/mo. Decision expected this week (by Mon 18 May). Ben to confirm goods type before proceeding.',
  '2026-05-12 00:00:00+00'
)
ON CONFLICT DO NOTHING;

COMMIT;
