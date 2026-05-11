-- Migration 54: STR (Short-Term Rental) tables
-- Created: 2026-05-11
-- Property: 4 Woodhead Mews, Blacker Hill — The Forge
-- Owner entity: Sarah Jane Jones / STR Ltd

-- ── STR Bookings ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS str_bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform          TEXT NOT NULL DEFAULT 'manual',    -- 'airbnb', 'booking_com', 'vrbo', 'direct', 'manual'
  external_id       TEXT,                              -- platform booking reference
  guest_name        TEXT,
  guest_email       TEXT,
  check_in          DATE NOT NULL,
  check_out         DATE NOT NULL,
  nights            INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  party_size        INTEGER,
  gross_revenue     NUMERIC(10,2),                     -- total charged to guest
  platform_fee      NUMERIC(10,2),                     -- platform commission (Airbnb 3%, Booking.com 15%)
  net_revenue       NUMERIC(10,2) GENERATED ALWAYS AS (
                      COALESCE(gross_revenue, 0) - COALESCE(platform_fee, 0)
                    ) STORED,
  cleaning_fee      NUMERIC(10,2) DEFAULT 90.00,
  status            TEXT DEFAULT 'confirmed',          -- 'enquiry', 'confirmed', 'checked_in', 'completed', 'cancelled'
  special_requests  TEXT,
  notes             TEXT,                              -- internal notes
  review_left       BOOLEAN DEFAULT FALSE,
  review_rating     NUMERIC(2,1),                      -- 1.0–5.0
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS str_bookings_check_in_idx ON str_bookings(check_in);
CREATE INDEX IF NOT EXISTS str_bookings_status_idx   ON str_bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS str_bookings_platform_id_idx
  ON str_bookings(platform, external_id)
  WHERE external_id IS NOT NULL;

-- ── STR B2B Prospects (ATLAS-style outreach for venue hire) ─────────────────

CREATE TABLE IF NOT EXISTS str_b2b_prospects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company              TEXT NOT NULL,
  category             TEXT,         -- 'wellness_retreat', 'sports_team', 'influencer_agency',
                                     --  'corporate_wellness', 'wedding_planner', 'yoga_retreat',
                                     --  'breathwork', 'pt_group', 'content_creator'
  city                 TEXT,
  website              TEXT,
  instagram_handle     TEXT,
  linkedin_url         TEXT,
  decision_maker_name  TEXT,
  decision_maker_role  TEXT,
  email                TEXT,
  phone                TEXT,
  quality_score        INTEGER DEFAULT 50,  -- 0-100, likelihood of booking
  status               TEXT DEFAULT 'not_contacted',  -- 'not_contacted', 'drafted', 'sent',
                                                      --  'replied', 'call_booked', 'booked', 'declined'
  approach             TEXT,  -- 'cold_email', 'instagram_dm', 'linkedin', 'phone', 'event'
  notes                TEXT,
  outreach_date        DATE,
  follow_up_date       DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS str_b2b_status_idx   ON str_b2b_prospects(status);
CREATE INDEX IF NOT EXISTS str_b2b_category_idx ON str_b2b_prospects(category);
CREATE INDEX IF NOT EXISTS str_b2b_score_idx    ON str_b2b_prospects(quality_score DESC);

-- ── STR Revenue Summary (monthly view) — maintained via triggers ─────────────

CREATE TABLE IF NOT EXISTS str_monthly_summary (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month          DATE NOT NULL UNIQUE,      -- first day of month e.g. 2026-07-01
  bookings_count INTEGER DEFAULT 0,
  nights_let     INTEGER DEFAULT 0,
  gross_revenue  NUMERIC(10,2) DEFAULT 0,
  net_revenue    NUMERIC(10,2) DEFAULT 0,
  avg_nightly    NUMERIC(8,2),
  occupancy_pct  NUMERIC(5,2),              -- percentage (0-100)
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
