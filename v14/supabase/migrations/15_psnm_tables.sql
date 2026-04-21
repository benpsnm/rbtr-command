-- ===========================================================================
-- RBTR · PSNM (Pallet Storage Near Me) operational tables
-- Warehouse ops: enquiries, customers, daily occupancy, invoicing, outreach.
-- ASCII-safe. Idempotent.
--
-- Classification:
--   psnm_enquiries            INTERNAL          (inbound prospect PII)
--   psnm_customers            INTERNAL          (paying customers)
--   psnm_occupancy_snapshots  INTERNAL          (daily pallet counts)
--   psnm_invoices             LEGAL_SENSITIVE   (customer financial detail)
--   psnm_outreach_targets     INTERNAL          (cold-outreach prospect list)
--   psnm_outreach_touches     INTERNAL          (outreach activity log)
-- ===========================================================================

-- 1. Enquiries — inbound leads (website form, phone, WhatsApp, email)
CREATE TABLE IF NOT EXISTS psnm_enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company         TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  source          TEXT,
  -- web_form | phone | whatsapp | email | referral | walk_in | other
  pallets         INTEGER,
  start_date      DATE,
  duration_weeks  INTEGER,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'new',
  -- new | contacted | quoted | urgent | won | lost | on_hold | complete
  priority_score  INTEGER DEFAULT 50,
  followup_date   DATE,
  assigned_to     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psnm_enq_status   ON psnm_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_psnm_enq_followup ON psnm_enquiries(followup_date) WHERE followup_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_psnm_enq_created  ON psnm_enquiries(created_at DESC);

-- 2. Customers — converted enquiries that are paying
CREATE TABLE IF NOT EXISTS psnm_customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id       UUID REFERENCES psnm_enquiries(id) ON DELETE SET NULL,
  company          TEXT NOT NULL,
  contact_name     TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  billing_address  TEXT,
  pallets_live     INTEGER DEFAULT 0,
  rate_gbp_week    NUMERIC,
  contract_start   DATE,
  contract_end     DATE,
  status           TEXT NOT NULL DEFAULT 'active',
  -- active | churned | paused | delinquent
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psnm_cust_status ON psnm_customers(status);

-- 3. Daily occupancy — one row per day with current pallet count
CREATE TABLE IF NOT EXISTS psnm_occupancy_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE NOT NULL UNIQUE,
  pallets       INTEGER NOT NULL,
  customer_count INTEGER,
  revenue_mtd_gbp NUMERIC,
  notes         TEXT,
  captured_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psnm_occ_date ON psnm_occupancy_snapshots(date DESC);

-- 4. Invoices — LEGAL_SENSITIVE (contains customer financial detail)
CREATE TABLE IF NOT EXISTS psnm_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES psnm_customers(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL UNIQUE,
  issued_date     DATE NOT NULL,
  due_date        DATE NOT NULL,
  period_start    DATE,
  period_end      DATE,
  pallets         INTEGER,
  rate_gbp_week   NUMERIC,
  weeks_billed    NUMERIC,
  subtotal_gbp    NUMERIC NOT NULL,
  vat_gbp         NUMERIC,
  total_gbp       NUMERIC NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  -- draft | sent | viewed | paid | overdue | cancelled
  paid_date       DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psnm_inv_status ON psnm_invoices(status);
CREATE INDEX IF NOT EXISTS idx_psnm_inv_due    ON psnm_invoices(due_date) WHERE status IN ('sent','viewed','overdue');

-- 5. Outreach targets — the 200+ cold-outreach prospect list
CREATE TABLE IF NOT EXISTS psnm_outreach_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company         TEXT NOT NULL,
  city            TEXT,
  postcode        TEXT,
  industry        TEXT,
  website         TEXT,
  email           TEXT,
  phone           TEXT,
  notes           TEXT,
  priority_score  INTEGER DEFAULT 50,
  status          TEXT NOT NULL DEFAULT 'not_contacted',
  -- not_contacted | queued | contacted | engaged | converted | declined | do_not_contact
  last_touched_at TIMESTAMPTZ,
  next_touch_at   TIMESTAMPTZ,
  converted_enquiry_id UUID REFERENCES psnm_enquiries(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company, postcode)
);
CREATE INDEX IF NOT EXISTS idx_psnm_out_status     ON psnm_outreach_targets(status);
CREATE INDEX IF NOT EXISTS idx_psnm_out_next_touch ON psnm_outreach_targets(next_touch_at) WHERE next_touch_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_psnm_out_industry   ON psnm_outreach_targets(industry);

-- 6. Outreach touches — every contact attempt against a target
CREATE TABLE IF NOT EXISTS psnm_outreach_touches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id   UUID REFERENCES psnm_outreach_targets(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,
  -- email | phone | whatsapp | linkedin | postal | in_person
  direction   TEXT NOT NULL DEFAULT 'outbound',
  -- outbound | inbound
  touched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  template    TEXT,
  subject     TEXT,
  body_excerpt TEXT,
  outcome     TEXT,
  -- sent | delivered | opened | replied | bounced | scheduled | no_answer | voicemail
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psnm_touch_target ON psnm_outreach_touches(target_id, touched_at DESC);
CREATE INDEX IF NOT EXISTS idx_psnm_touch_date   ON psnm_outreach_touches(touched_at DESC);

-- Auto-update updated_at on mutable tables
DROP TRIGGER IF EXISTS trg_psnm_enq_updated_at   ON psnm_enquiries;
DROP TRIGGER IF EXISTS trg_psnm_cust_updated_at  ON psnm_customers;
DROP TRIGGER IF EXISTS trg_psnm_out_updated_at   ON psnm_outreach_targets;

CREATE TRIGGER trg_psnm_enq_updated_at   BEFORE UPDATE ON psnm_enquiries         FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();
CREATE TRIGGER trg_psnm_cust_updated_at  BEFORE UPDATE ON psnm_customers         FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();
CREATE TRIGGER trg_psnm_out_updated_at   BEFORE UPDATE ON psnm_outreach_targets  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Classification tags ────────────────────────────────────────────────────
COMMENT ON TABLE psnm_enquiries            IS 'CLASSIFICATION: INTERNAL — inbound prospect PII';
COMMENT ON TABLE psnm_customers            IS 'CLASSIFICATION: INTERNAL — paying customers + billing detail';
COMMENT ON TABLE psnm_occupancy_snapshots  IS 'CLASSIFICATION: INTERNAL — daily pallet counts';
COMMENT ON TABLE psnm_invoices             IS 'CLASSIFICATION: LEGAL_SENSITIVE — customer financial detail; never quote in outbound';
COMMENT ON TABLE psnm_outreach_targets     IS 'CLASSIFICATION: INTERNAL — cold-outreach prospect list with PII';
COMMENT ON TABLE psnm_outreach_touches     IS 'CLASSIFICATION: INTERNAL — every contact attempt logged';

-- ── RLS on (service_role bypasses; browser never touches these directly) ───
ALTER TABLE psnm_enquiries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_occupancy_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_invoices             ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_outreach_targets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_outreach_touches     ENABLE ROW LEVEL SECURITY;

-- Seed a zero-pallet starting snapshot for today so the briefing has SOMETHING
INSERT INTO psnm_occupancy_snapshots (date, pallets, customer_count, revenue_mtd_gbp, notes)
VALUES (CURRENT_DATE, 0, 0, 0, 'Initial snapshot — warehouse not yet trading')
ON CONFLICT (date) DO NOTHING;

-- Sanity:
--   SELECT count(*) FROM psnm_outreach_targets;
--   SELECT status, count(*) FROM psnm_enquiries GROUP BY status;
--   SELECT * FROM psnm_occupancy_snapshots ORDER BY date DESC LIMIT 5;
