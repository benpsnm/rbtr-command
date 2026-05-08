-- Migration 53: Standalone WMS tables
-- Created: 8 May 2026 by autonomous build session
-- Purpose: Persist psnm-wms.vercel.app data in Supabase instead of localStorage.
-- All access via service role only (no anon policies).

BEGIN;

-- ── Helper: reuse _rbtr_set_updated_at() from migration 13 ──────────────────

-- ── 1. psnm_pallets ──────────────────────────────────────────────────────────
-- One row per pallet. id preserved from localStorage nextId counter on migration.
-- out=true means the pallet has left the warehouse but record is kept for history.

CREATE TABLE IF NOT EXISTS psnm_pallets (
  id            INTEGER       PRIMARY KEY,
  customer      TEXT          NOT NULL,
  ref           TEXT,
  description   TEXT          NOT NULL,
  weight_kg     TEXT,
  size          TEXT          DEFAULT 'standard',
  notes         TEXT,
  date_in       DATE          NOT NULL,
  time_in       TEXT,
  location      TEXT          NOT NULL,
  stype         TEXT          NOT NULL
                  CHECK (stype IN ('racked','floor','aislefloor')),
  weekly_rate   NUMERIC(6,2)  NOT NULL DEFAULT 6.50,
  out           BOOLEAN       NOT NULL DEFAULT false,
  out_date      DATE,
  out_time      TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_pallets_customer
  ON psnm_pallets (customer);
CREATE INDEX IF NOT EXISTS idx_psnm_pallets_out
  ON psnm_pallets (out);
CREATE INDEX IF NOT EXISTS idx_psnm_pallets_location
  ON psnm_pallets (location) WHERE out = false;

ALTER TABLE psnm_pallets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE psnm_pallets
  IS 'CLASSIFICATION: INTERNAL — Standalone WMS pallet inventory. One row per pallet. id matches the localStorage nextId sequence. Occupancy maps (cells/floor/aisleFloor) are derived from location + out columns.';

-- ── 2. psnm_customers ────────────────────────────────────────────────────────
-- Keyed by company name (matches localStorage S.customers object key).
-- rate stored as text to match localStorage shape exactly.

CREATE TABLE IF NOT EXISTS psnm_customers (
  name          TEXT          PRIMARY KEY,
  contact       TEXT,
  phone         TEXT,
  email         TEXT,
  rate          TEXT          DEFAULT '6.50',
  deal          TEXT          DEFAULT 'none'
                  CHECK (deal IN ('none','starter','lockin','scaleup')),
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_customers_email
  ON psnm_customers (email) WHERE email IS NOT NULL AND email != '';

ALTER TABLE psnm_customers ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_psnm_customers_updated_at ON psnm_customers;
CREATE TRIGGER trg_psnm_customers_updated_at
  BEFORE UPDATE ON psnm_customers
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE psnm_customers
  IS 'CLASSIFICATION: INTERNAL — Standalone WMS customer registry. Keyed by company name. Rate stored as text string matching localStorage format.';

-- ── 3. psnm_movements ────────────────────────────────────────────────────────
-- Append-only movement log. No UPDATE or DELETE in normal operation.

CREATE TABLE IF NOT EXISTS psnm_movements (
  id            BIGSERIAL     PRIMARY KEY,
  type          TEXT          NOT NULL
                  CHECK (type IN ('IN','OUT','MOVE','ADJUST')),
  date          DATE          NOT NULL,
  time          TEXT          NOT NULL,
  customer      TEXT          NOT NULL,
  ref           TEXT,
  pallets       INTEGER       NOT NULL DEFAULT 1,
  location      TEXT,
  rate          NUMERIC(6,2),
  handling      NUMERIC(8,2)  DEFAULT 0,
  description   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psnm_movements_date
  ON psnm_movements (date DESC);
CREATE INDEX IF NOT EXISTS idx_psnm_movements_customer
  ON psnm_movements (customer);
CREATE INDEX IF NOT EXISTS idx_psnm_movements_type
  ON psnm_movements (type);

ALTER TABLE psnm_movements ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE psnm_movements
  IS 'CLASSIFICATION: INTERNAL — Standalone WMS movement log. Append-only. IN/OUT/MOVE/ADJUST types. Mirrors S.movements localStorage array.';

-- ── 4. psnm_bookings ─────────────────────────────────────────────────────────
-- Active confirmed bookings. Mirrors psnm_v14_bk localStorage key.

CREATE TABLE IF NOT EXISTS psnm_bookings (
  id            TEXT          PRIMARY KEY,
  company       TEXT          NOT NULL,
  contact       TEXT          NOT NULL,
  email         TEXT,
  phone         TEXT,
  pallets       TEXT,
  type          TEXT,
  rate          TEXT,
  start_date    TEXT,
  goods         TEXT,
  notes         TEXT,
  status        TEXT          NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','cancelled','completed')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE psnm_bookings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE psnm_bookings
  IS 'CLASSIFICATION: INTERNAL — Confirmed pallet storage bookings. Mirrors psnm_v14_bk localStorage key. id format: "BK" + timestamp.';

-- ── 5. psnm_enquiries ────────────────────────────────────────────────────────
-- Pre-booking enquiries. Mirrors psnm_v14_eq localStorage key.

CREATE TABLE IF NOT EXISTS psnm_enquiries (
  id            TEXT          PRIMARY KEY,
  company       TEXT          NOT NULL,
  contact       TEXT          NOT NULL,
  email         TEXT,
  phone         TEXT,
  pallets       TEXT,
  type          TEXT,
  rate          TEXT,
  start_date    TEXT,
  goods         TEXT,
  notes         TEXT,
  status        TEXT          NOT NULL DEFAULT 'enquiry'
                  CHECK (status IN ('enquiry','converted','closed')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE psnm_enquiries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE psnm_enquiries
  IS 'CLASSIFICATION: INTERNAL — Pre-booking storage enquiries. Mirrors psnm_v14_eq localStorage key. id format: "EQ" + timestamp.';

-- ── 6. psnm_crm_status ───────────────────────────────────────────────────────
-- Override status for CRM leads. Master lead list is hardcoded in index.html JS.
-- Only non-default statuses are stored here (mirrors psnm_crm4_status localStorage).

CREATE TABLE IF NOT EXISTS psnm_crm_status (
  lead_id       TEXT          PRIMARY KEY,
  status        TEXT          NOT NULL
                  CHECK (status IN ('new','hot','opened','contacted','cold')),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE psnm_crm_status ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE psnm_crm_status
  IS 'CLASSIFICATION: INTERNAL — CRM lead status overrides. Master lead list (208 entries) is hardcoded in psnm-wms index.html. Only overrides stored. Mirrors psnm_crm4_status localStorage key.';

COMMIT;
