-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 46 · WMS Extensions Phase 1 — foundation schema
-- feat/wms-extensions branch · 2026-05-04
--
-- New tables:
--   crm_prospects           — PSNM warehouse sales leads (CRM module)
--   crm_interactions        — touch history per prospect
--   pricing_quotes          — public website lead capture (separate from psnm_quotes)
--   triage_enquiries        — WW inbound triage with verdict + audit
--   triage_audit_log        — immutable audit trail for triage actions
--   ops_tasks               — daily ops checklist items
--   ops_daily_metrics       — daily call/email/linkedin/quote counts
--   cashflow_state          — single-row live cashflow state
--   cashflow_snapshots      — nightly historical snapshots
--   ek_estimates            — detailed EK body-shop estimates
--   email_sends             — cold email queue + send history
--
-- Deviations from brief:
--   · No user_id FK / no auth.uid() RLS — follows existing service_role pattern
--   · sponsors/sponsor_interactions SKIPPED — sponsor_targets/sponsor_contacts
--     already exist (mig 13/20/22); Phase 8 extends those tables
--   · triage_enquiries links to psnm_ww_leads (nullable) rather than standing alone
--
-- Safe to re-run (all CREATE IF NOT EXISTS / DO $$ BEGIN ... END $$).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE crm_prospect_status AS ENUM (
    'new','contacted','replied','quoted','followup','won','lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_prospect_priority AS ENUM ('hot','warm','cold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_prospect_source AS ENUM (
    'leadinfo','whichwarehouse','referral','cold','inbound','website','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crm_interaction_type AS ENUM (
    'call','email_out','email_in','linkedin','meeting','visit','note'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE triage_verdict AS ENUM ('respond','call_first','decline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ops_task_priority AS ENUM ('high','medium','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ops_task_category AS ENUM (
    'check','ww','atlas','calls','follow_up','social','ops','crm','review',
    'plan','finance','leads','system','content','compliance','custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE email_send_type AS ENUM ('initial','follow_up_1','follow_up_2','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE email_send_status AS ENUM ('queued','sending','sent','failed','bounced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CRM: prospects ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_prospects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company          text NOT NULL,
  contact          text,
  title            text,
  phone            text,
  email            text,
  postcode         text,
  source           crm_prospect_source NOT NULL DEFAULT 'other',
  status           crm_prospect_status NOT NULL DEFAULT 'new',
  priority         crm_prospect_priority NOT NULL DEFAULT 'warm',
  pallet_volume    integer,
  next_action      text,
  next_action_date date,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_prospects_status_idx    ON crm_prospects(status);
CREATE INDEX IF NOT EXISTS crm_prospects_priority_idx  ON crm_prospects(priority);
CREATE INDEX IF NOT EXISTS crm_prospects_next_date_idx ON crm_prospects(next_action_date);

-- Full-text search on company, contact, postcode, notes
CREATE INDEX IF NOT EXISTS crm_prospects_search_idx ON crm_prospects USING GIN (
  to_tsvector('english',
    coalesce(company,'') || ' ' ||
    coalesce(contact,'') || ' ' ||
    coalesce(postcode,'') || ' ' ||
    coalesce(notes,'')
  )
);

ALTER TABLE crm_prospects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='crm_prospects' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON crm_prospects FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── CRM: interactions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_interactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  uuid NOT NULL REFERENCES crm_prospects(id) ON DELETE CASCADE,
  type         crm_interaction_type NOT NULL,
  summary      text NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_interactions_prospect_idx ON crm_interactions(prospect_id);

ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='crm_interactions' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON crm_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Pricing: public lead capture ──────────────────────────────────────────
-- Distinct from psnm_quotes (internal CRM-linked). This table receives
-- anonymous submissions from the public quote calculator widget.

CREATE TABLE IF NOT EXISTS pricing_quotes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name      text,
  lead_company   text,
  lead_email     text,
  lead_phone     text,
  pallet_count   integer NOT NULL,
  duration_weeks integer NOT NULL,
  movements      integer DEFAULT 0,
  rate_per_pallet decimal(6,2) NOT NULL,
  total_quoted   decimal(10,2) NOT NULL,
  notes          text,
  source         text DEFAULT 'website',
  status         text DEFAULT 'new',   -- 'new','contacted','converted','lost'
  prospect_id    uuid REFERENCES crm_prospects(id) ON DELETE SET NULL,
  ip_address     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pricing_quotes_email_idx  ON pricing_quotes(lead_email);
CREATE INDEX IF NOT EXISTS pricing_quotes_status_idx ON pricing_quotes(status);

ALTER TABLE pricing_quotes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='pricing_quotes' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON pricing_quotes FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── WW Triage: enquiries + audit log ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS triage_enquiries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ww_lead_id       uuid REFERENCES psnm_ww_leads(id) ON DELETE SET NULL,
  ww_reference     text,
  company_name     text,
  raw_text         text,
  pallets          integer,
  region           text,
  service_type     text,
  flags            text[],
  verdict          triage_verdict NOT NULL,
  reasons          text[],
  response_drafted text,
  response_sent    boolean DEFAULT false,
  response_sent_at timestamptz,
  prospect_id      uuid REFERENCES crm_prospects(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS triage_enquiries_verdict_idx   ON triage_enquiries(verdict);
CREATE INDEX IF NOT EXISTS triage_enquiries_sent_idx      ON triage_enquiries(response_sent);
CREATE INDEX IF NOT EXISTS triage_enquiries_ww_lead_idx   ON triage_enquiries(ww_lead_id);

ALTER TABLE triage_enquiries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='triage_enquiries' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON triage_enquiries FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Immutable audit log — every analyse, edit, and send action recorded.
CREATE TABLE IF NOT EXISTS triage_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_id       uuid REFERENCES triage_enquiries(id) ON DELETE CASCADE,
  action          text NOT NULL,  -- 'analysed','edited','sent','declined','claims_verified'
  actor           text DEFAULT 'ben',
  before_snapshot jsonb,          -- state before the action
  after_snapshot  jsonb,          -- state after the action
  notes           text,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS triage_audit_triage_idx ON triage_audit_log(triage_id);

ALTER TABLE triage_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='triage_audit_log' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON triage_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Ops: daily tasks + metrics ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ops_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_date  date NOT NULL,
  text       text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  priority   ops_task_priority NOT NULL DEFAULT 'medium',
  category   ops_task_category NOT NULL DEFAULT 'custom',
  position   integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_tasks_date_idx ON ops_tasks(task_date);
CREATE INDEX IF NOT EXISTS ops_tasks_done_idx ON ops_tasks(task_date, done);

ALTER TABLE ops_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='ops_tasks' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON ops_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ops_daily_metrics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date     date NOT NULL UNIQUE,
  calls           integer DEFAULT 0,
  emails          integer DEFAULT 0,
  linkedin        integer DEFAULT 0,
  quotes          integer DEFAULT 0,
  meetings        integer DEFAULT 0,
  pallets_stored  integer DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_metrics_date_idx ON ops_daily_metrics(metric_date);

ALTER TABLE ops_daily_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='ops_daily_metrics' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON ops_daily_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Cashflow: live state + snapshots ─────────────────────────────────────
-- Single-row live state; nightly cron snapshots into cashflow_snapshots.

CREATE TABLE IF NOT EXISTS cashflow_state (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rent                decimal(10,2) DEFAULT 0,
  other_costs         decimal(10,2) DEFAULT 0,
  utilities           decimal(10,2) DEFAULT 0,
  pallets_stored      integer DEFAULT 0,
  rate_per_pallet     decimal(6,2) DEFAULT 3.95,
  ek_income           decimal(10,2) DEFAULT 0,
  bnb_income          decimal(10,2) DEFAULT 0,
  other_income        decimal(10,2) DEFAULT 0,
  cash_reserves       decimal(12,2) DEFAULT 0,
  personal_expenses   decimal(10,2) DEFAULT 0,
  break_even_target   integer DEFAULT 827,
  rbtr_target         decimal(12,2) DEFAULT 142990,
  rbtr_saved          decimal(12,2) DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cashflow_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cashflow_state' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON cashflow_state FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed the single cashflow_state row if not already present.
INSERT INTO cashflow_state (rent, other_costs, pallets_stored, rate_per_pallet, break_even_target, rbtr_target)
VALUES (8333, 0, 0, 3.95, 827, 142990)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cashflow_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   date NOT NULL UNIQUE,
  monthly_burn    decimal(10,2),
  monthly_income  decimal(10,2),
  monthly_net     decimal(10,2),
  cash_reserves   decimal(12,2),
  pallets_stored  integer,
  days_runway     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cashflow_snapshots_date_idx ON cashflow_snapshots(snapshot_date);

ALTER TABLE cashflow_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cashflow_snapshots' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON cashflow_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── EK: estimates ─────────────────────────────────────────────────────────
-- Richer than eternal_estimates (migration 32) which is minimal.
-- Does NOT replace eternal_estimates — separate table for detailed quote workflow.

CREATE TABLE IF NOT EXISTS ek_estimates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_number   text NOT NULL UNIQUE,         -- e.g. EK-2026-0001
  customer_name     text,
  customer_phone    text,
  customer_email    text,
  customer_address  text,
  vehicle_year      text,
  vehicle_make      text,
  vehicle_reg       text,
  vehicle_colour    text,
  scope             text,
  materials         jsonb DEFAULT '[]'::jsonb,    -- [{desc, qty, rate}]
  labour            jsonb DEFAULT '[]'::jsonb,    -- [{desc, hours, rate}]
  sublet            jsonb DEFAULT '[]'::jsonb,    -- [{desc, cost, markup_pct}]
  complexity_pct    decimal(5,2) DEFAULT 0,
  discount_pct      decimal(5,2) DEFAULT 0,
  vat_pct           decimal(5,2) DEFAULT 20,
  deposit           decimal(10,2) DEFAULT 0,
  timescale         text,
  notes             text,
  authorised_by     text,
  authorised_date   date,
  status            text DEFAULT 'draft'
                      CHECK (status IN ('draft','sent','accepted','rejected','completed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ek_estimates_number_idx ON ek_estimates(estimate_number);
CREATE INDEX IF NOT EXISTS ek_estimates_status_idx ON ek_estimates(status);

ALTER TABLE ek_estimates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='ek_estimates' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON ek_estimates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── Email: send queue + history ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sends (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id        uuid REFERENCES crm_prospects(id) ON DELETE SET NULL,
  recipient_email    text NOT NULL,
  recipient_name     text,
  recipient_company  text,
  subject            text NOT NULL,
  body               text NOT NULL,
  type               email_send_type NOT NULL DEFAULT 'initial',
  status             email_send_status NOT NULL DEFAULT 'queued',
  scheduled_for      timestamptz,
  sent_at            timestamptz,
  message_id         text,
  error_message      text,
  follow_up_due_date date,
  follow_up_sent     boolean DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_sends_status_idx     ON email_sends(status);
CREATE INDEX IF NOT EXISTS email_sends_scheduled_idx  ON email_sends(scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS email_sends_followup_idx   ON email_sends(follow_up_due_date) WHERE follow_up_sent = false;
CREATE INDEX IF NOT EXISTS email_sends_prospect_idx   ON email_sends(prospect_id);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='email_sends' AND policyname='service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON email_sends FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
