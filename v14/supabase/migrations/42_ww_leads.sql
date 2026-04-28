-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 42 · psnm_ww_leads
-- WhichWarehouse inbound lead store.
-- Populated by POST /api/atlas?action=inbound_email (SendGrid Inbound Parse webhook).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS psnm_ww_leads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at      timestamptz DEFAULT now(),
  source           text DEFAULT 'whichwarehouse',
  company          text,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  pallet_count     int,
  location         text,
  goods_type       text,
  start_date       text,
  notes            text,
  raw_subject      text,
  raw_body         text,
  status           text DEFAULT 'new'
                     CHECK (status IN ('new','contacted','converted','lost')),
  response_draft   text,
  telegram_alerted boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE psnm_ww_leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'psnm_ww_leads' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON psnm_ww_leads
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'psnm_ww_leads' AND policyname = 'anon_select'
  ) THEN
    CREATE POLICY anon_select ON psnm_ww_leads
      FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'psnm_ww_leads' AND policyname = 'anon_update'
  ) THEN
    CREATE POLICY anon_update ON psnm_ww_leads
      FOR UPDATE TO anon USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS psnm_ww_leads_status_idx      ON psnm_ww_leads (status);
CREATE INDEX IF NOT EXISTS psnm_ww_leads_received_at_idx ON psnm_ww_leads (received_at DESC);
