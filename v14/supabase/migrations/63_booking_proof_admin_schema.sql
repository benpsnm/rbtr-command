-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 63: Booking Proof Admin Schema
-- Created: 2026-05-13
-- Purpose: Sarah J's AirBnB damage-detection SaaS admin/founder dashboard tables
-- Scope: Admin-only tables for JARVIS cockpit. Customer-facing app TBD (separate codebase).
--
-- Product: Booking Proof
-- - AI-powered turnover proof for AirBnB hosts
-- - Cleaner takes baseline photos via mobile magic link (no app install)
-- - After each turnover, AI compares to baseline, flags damage
-- - Generates AirCover-ready claim PDFs
-- - Stripe billing: £90 founding member one-off, £14/month standard
-- - iCal sync (AirBnB, VRBO, Booking.com)
--
-- IMPORTANT: All tables owned by Sarah J. Ben advises only. Bankruptcy-aware.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── bp_customers ─────────────────────────────────────────────────────────────
-- Master customer record (AirBnB hosts using Booking Proof)

CREATE TABLE IF NOT EXISTS bp_customers (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT          NOT NULL UNIQUE,
  full_name             TEXT,
  phone                 TEXT,
  company_name          TEXT,
  business_address      TEXT,
  vat_number            TEXT,

  -- Subscription
  stripe_customer_id    TEXT          UNIQUE,
  subscription_status   TEXT          DEFAULT 'trial'
                          CHECK (subscription_status IN ('trial','active','past_due','canceled','founding_member')),
  subscription_tier     TEXT          DEFAULT 'standard'
                          CHECK (subscription_tier IN ('founding_member','standard')),
  mrr_gbp               NUMERIC(8,2)  DEFAULT 0,
  trial_started_at      TIMESTAMPTZ,
  trial_ends_at         TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  subscription_canceled_at TIMESTAMPTZ,
  founding_member       BOOLEAN       DEFAULT FALSE,
  founding_member_paid_at TIMESTAMPTZ,

  -- Account
  onboarded_at          TIMESTAMPTZ,
  last_login            TIMESTAMPTZ,
  is_active             BOOLEAN       DEFAULT TRUE,
  churn_reason          TEXT,

  -- Metrics
  property_count        INTEGER       DEFAULT 0,
  total_turnovers       INTEGER       DEFAULT 0,
  total_claims          INTEGER       DEFAULT 0,
  claims_approved       INTEGER       DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_customers_email ON bp_customers(email);
CREATE INDEX IF NOT EXISTS idx_bp_customers_status ON bp_customers(subscription_status);
CREATE INDEX IF NOT EXISTS idx_bp_customers_stripe ON bp_customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE bp_customers ENABLE ROW LEVEL SECURITY;

-- ── bp_properties ────────────────────────────────────────────────────────────
-- Customer properties (each AirBnB/VRBO listing)

CREATE TABLE IF NOT EXISTS bp_properties (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID          NOT NULL REFERENCES bp_customers(id) ON DELETE CASCADE,
  property_name         TEXT          NOT NULL,
  platform              TEXT          NOT NULL
                          CHECK (platform IN ('airbnb','vrbo','booking_com','direct','other')),
  external_id           TEXT,         -- AirBnB listing ID, VRBO property ID, etc
  ical_url              TEXT,         -- iCal sync URL for this property

  -- Address
  address_line1         TEXT,
  city                  TEXT,
  postcode              TEXT,
  country               TEXT          DEFAULT 'GB',

  -- Property details
  property_type         TEXT,         -- 'apartment','house','studio','cottage','barn'
  bedrooms              INTEGER,
  bathrooms             INTEGER,

  -- Baseline status
  baseline_complete     BOOLEAN       DEFAULT FALSE,
  baseline_created_at   TIMESTAMPTZ,
  baseline_photo_count  INTEGER       DEFAULT 0,

  -- Activity
  last_turnover_at      TIMESTAMPTZ,
  total_turnovers       INTEGER       DEFAULT 0,
  total_damages_flagged INTEGER       DEFAULT 0,

  is_active             BOOLEAN       DEFAULT TRUE,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_properties_customer_id ON bp_properties(customer_id);
CREATE INDEX IF NOT EXISTS idx_bp_properties_platform ON bp_properties(platform);
CREATE INDEX IF NOT EXISTS idx_bp_properties_baseline ON bp_properties(baseline_complete);

ALTER TABLE bp_properties ENABLE ROW LEVEL SECURITY;

-- ── bp_baselines ─────────────────────────────────────────────────────────────
-- Baseline photo sets (cleaner takes these on first setup)

CREATE TABLE IF NOT EXISTS bp_baselines (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID          NOT NULL REFERENCES bp_properties(id) ON DELETE CASCADE,
  cleaner_name          TEXT,
  cleaner_email         TEXT,
  cleaner_phone         TEXT,

  -- Photo storage (JSON array of Supabase storage paths)
  photos                JSONB         DEFAULT '[]'::JSONB,
  photo_count           INTEGER       DEFAULT 0,
  storage_bucket        TEXT          DEFAULT 'booking-proof-baselines',

  -- Metadata
  captured_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  device_info           TEXT,
  gps_location          TEXT,

  -- AI analysis (Claude vision generates room inventory on baseline capture)
  ai_inventory          JSONB,        -- { "kitchen": ["4x plates", "2x mugs"], "bedroom": [...] }
  ai_notes              TEXT,

  is_current            BOOLEAN       DEFAULT TRUE,
  superseded_at         TIMESTAMPTZ,
  superseded_by_id      UUID,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_baselines_property_id ON bp_baselines(property_id);
CREATE INDEX IF NOT EXISTS idx_bp_baselines_current ON bp_baselines(property_id, is_current) WHERE is_current = TRUE;

ALTER TABLE bp_baselines ENABLE ROW LEVEL SECURITY;

-- ── bp_turnovers ─────────────────────────────────────────────────────────────
-- Each guest turnover (cleaner takes photos after checkout, AI compares to baseline)

CREATE TABLE IF NOT EXISTS bp_turnovers (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id           UUID          NOT NULL REFERENCES bp_properties(id) ON DELETE CASCADE,
  baseline_id           UUID          REFERENCES bp_baselines(id),

  -- Booking details
  checkout_date         DATE          NOT NULL,
  guest_name            TEXT,
  booking_platform      TEXT,
  booking_ref           TEXT,

  -- Turnover capture
  cleaner_name          TEXT,
  cleaner_email         TEXT,
  photos                JSONB         DEFAULT '[]'::JSONB,
  photo_count           INTEGER       DEFAULT 0,
  captured_at           TIMESTAMPTZ,

  -- AI comparison
  ai_comparison_status  TEXT          DEFAULT 'pending'
                          CHECK (ai_comparison_status IN ('pending','processing','complete','failed')),
  ai_comparison_run_at  TIMESTAMPTZ,
  ai_comparison_result  JSONB,        -- Claude vision diff: { "damages": [...], "missing_items": [...] }
  damages_flagged       INTEGER       DEFAULT 0,
  damages_severity      TEXT,         -- 'none','minor','moderate','major'

  -- Host review
  host_reviewed         BOOLEAN       DEFAULT FALSE,
  host_reviewed_at      TIMESTAMPTZ,
  host_approved_claims  INTEGER       DEFAULT 0,
  host_dismissed_flags  INTEGER       DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_turnovers_property_id ON bp_turnovers(property_id);
CREATE INDEX IF NOT EXISTS idx_bp_turnovers_checkout ON bp_turnovers(checkout_date DESC);
CREATE INDEX IF NOT EXISTS idx_bp_turnovers_status ON bp_turnovers(ai_comparison_status);
CREATE INDEX IF NOT EXISTS idx_bp_turnovers_severity ON bp_turnovers(damages_severity) WHERE damages_severity IS NOT NULL;

ALTER TABLE bp_turnovers ENABLE ROW LEVEL SECURITY;

-- ── bp_damages ───────────────────────────────────────────────────────────────
-- Individual damages flagged by AI (one row per damage item)

CREATE TABLE IF NOT EXISTS bp_damages (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  turnover_id           UUID          NOT NULL REFERENCES bp_turnovers(id) ON DELETE CASCADE,
  property_id           UUID          NOT NULL REFERENCES bp_properties(id) ON DELETE CASCADE,

  -- Damage details
  room                  TEXT,
  item                  TEXT          NOT NULL,
  damage_type           TEXT,         -- 'broken','stained','missing','scratched','torn','other'
  severity              TEXT          DEFAULT 'moderate'
                          CHECK (severity IN ('minor','moderate','major')),
  description           TEXT,

  -- Evidence
  photo_baseline_path   TEXT,         -- Supabase storage path to baseline photo showing item intact
  photo_turnover_path   TEXT,         -- Supabase storage path to turnover photo showing damage
  ai_confidence         NUMERIC(4,2), -- 0.00-1.00

  -- Host action
  host_status           TEXT          DEFAULT 'pending'
                          CHECK (host_status IN ('pending','approved','dismissed')),
  host_reviewed_at      TIMESTAMPTZ,
  host_notes            TEXT,

  -- Claim
  claim_id              UUID,         -- FK to bp_claims.id (if host approved + submitted claim)
  estimated_cost_gbp    NUMERIC(8,2),

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_damages_turnover_id ON bp_damages(turnover_id);
CREATE INDEX IF NOT EXISTS idx_bp_damages_property_id ON bp_damages(property_id);
CREATE INDEX IF NOT EXISTS idx_bp_damages_status ON bp_damages(host_status);

ALTER TABLE bp_damages ENABLE ROW LEVEL SECURITY;

-- ── bp_claims ────────────────────────────────────────────────────────────────
-- Damage claims submitted to AirBnB AirCover / VRBO damage protection

CREATE TABLE IF NOT EXISTS bp_claims (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  turnover_id           UUID          NOT NULL REFERENCES bp_turnovers(id) ON DELETE CASCADE,
  property_id           UUID          NOT NULL REFERENCES bp_properties(id) ON DELETE CASCADE,
  customer_id           UUID          NOT NULL REFERENCES bp_customers(id) ON DELETE CASCADE,

  -- Claim details
  platform              TEXT          NOT NULL,  -- 'airbnb','vrbo','booking_com'
  claim_reference       TEXT,                    -- AirBnB claim ID, VRBO case number
  claim_amount_gbp      NUMERIC(10,2) NOT NULL,
  claim_description     TEXT,

  -- Evidence bundle (Booking Proof generates this)
  pdf_url               TEXT,                    -- Supabase storage: AirCover-ready claim PDF
  evidence_photos       JSONB         DEFAULT '[]'::JSONB,

  -- Status
  claim_status          TEXT          DEFAULT 'draft'
                          CHECK (claim_status IN ('draft','submitted','under_review','approved','rejected','paid')),
  submitted_at          TIMESTAMPTZ,
  platform_response     TEXT,
  approved_amount_gbp   NUMERIC(10,2),
  paid_at               TIMESTAMPTZ,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_claims_turnover_id ON bp_claims(turnover_id);
CREATE INDEX IF NOT EXISTS idx_bp_claims_customer_id ON bp_claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_bp_claims_status ON bp_claims(claim_status);

ALTER TABLE bp_claims ENABLE ROW LEVEL SECURITY;

-- ── bp_support_tickets ───────────────────────────────────────────────────────
-- Customer support queue

CREATE TABLE IF NOT EXISTS bp_support_tickets (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID          NOT NULL REFERENCES bp_customers(id) ON DELETE CASCADE,
  subject               TEXT          NOT NULL,
  description           TEXT,
  priority              TEXT          DEFAULT 'normal'
                          CHECK (priority IN ('low','normal','high','urgent')),
  status                TEXT          DEFAULT 'open'
                          CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),

  -- Assignment (Sarah + team)
  assigned_to           TEXT,         -- 'Sarah','Ben','Unassigned'
  first_response_at     TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,

  -- Metrics
  response_time_hours   NUMERIC(8,2), -- calculated: first_response_at - created_at
  resolution_time_hours NUMERIC(8,2), -- calculated: resolved_at - created_at

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_support_customer_id ON bp_support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_bp_support_status ON bp_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_bp_support_priority ON bp_support_tickets(priority);

ALTER TABLE bp_support_tickets ENABLE ROW LEVEL SECURITY;

-- ── bp_waitlist ──────────────────────────────────────────────────────────────
-- Pre-launch waitlist signups (marketing funnel)

CREATE TABLE IF NOT EXISTS bp_waitlist (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT          NOT NULL UNIQUE,
  full_name             TEXT,
  phone                 TEXT,
  property_count        INTEGER,
  platform              TEXT,         -- 'airbnb','vrbo','booking_com','multiple'
  heard_from            TEXT,         -- 'instagram','facebook','google','referral','other'
  referral_code         TEXT,
  notes                 TEXT,

  -- Status
  status                TEXT          DEFAULT 'pending'
                          CHECK (status IN ('pending','invited','converted','declined')),
  invited_at            TIMESTAMPTZ,
  converted_at          TIMESTAMPTZ,
  converted_to_customer_id UUID,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_waitlist_email ON bp_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_bp_waitlist_status ON bp_waitlist(status);

ALTER TABLE bp_waitlist ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies (service_role only) ─────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_customers' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_properties' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_properties FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_baselines' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_baselines FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_turnovers' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_turnovers FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_damages' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_damages FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_claims' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_claims FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_support_tickets' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bp_waitlist' AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON bp_waitlist FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE bp_customers IS 'OWNER: Sarah J. Booking Proof customers (AirBnB hosts). Admin-only table for JARVIS cockpit.';
COMMENT ON TABLE bp_properties IS 'OWNER: Sarah J. Customer properties (AirBnB/VRBO listings).';
COMMENT ON TABLE bp_baselines IS 'OWNER: Sarah J. Baseline photo sets captured by cleaner on first setup.';
COMMENT ON TABLE bp_turnovers IS 'OWNER: Sarah J. Guest turnover evidence + AI comparison results.';
COMMENT ON TABLE bp_damages IS 'OWNER: Sarah J. Individual damages flagged by AI, pending host review.';
COMMENT ON TABLE bp_claims IS 'OWNER: Sarah J. AirCover damage claims submitted to platforms.';
COMMENT ON TABLE bp_support_tickets IS 'OWNER: Sarah J. Customer support queue for Booking Proof.';
COMMENT ON TABLE bp_waitlist IS 'OWNER: Sarah J. Pre-launch waitlist signups (marketing funnel).';

COMMIT;
