-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 28 · Phase 2.5 partial overnight (WS-C + WS-D fills)
--
-- Adds:
--   ek_cash_log              — Eternal Kustoms retainer/hours ledger (LEGAL_SENSITIVE)
--   house_jobs               — verify / extend (if missing) the local house jobs state
--   nate_checkins            — Nate Cook mentor check-in log (INTERNAL)
--   bills                    — personal + entity bills for "due this week" (INTERNAL)
--   daily_briefs columns     — voice_id_used, voice_name_resolved
--   jarvis_settings          — nate_checkin_interval_days, misc singletons
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── ek_cash_log · LEGAL_SENSITIVE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ek_cash_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  balance_gbp NUMERIC NOT NULL,
  source TEXT CHECK (source IN ('manual','bank_feed','retainer','hourly')),
  note TEXT
);
COMMENT ON TABLE ek_cash_log IS 'CLASSIFICATION: LEGAL_SENSITIVE';

-- ── house_jobs (if not present already — keeps browser localStorage in sync) ─
CREATE TABLE IF NOT EXISTS house_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key TEXT UNIQUE,
  category TEXT,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','blocked')),
  effort_est TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE house_jobs IS 'CLASSIFICATION: INTERNAL';

-- ── nate_checkins ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nate_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE nate_checkins IS 'CLASSIFICATION: INTERNAL';

-- ── bills (personal + entity bills — due this week aggregation) ────────────
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT CHECK (entity IN ('personal','psnm','rbtr','ek')),
  name TEXT NOT NULL,
  amount_gbp NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  recurring TEXT CHECK (recurring IN ('monthly','weekly','quarterly','annual','one_off')),
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE bills IS 'CLASSIFICATION: INTERNAL';
CREATE INDEX IF NOT EXISTS idx_bills_due ON bills (due_date, paid);

-- ── daily_briefs · voice tracking columns ──────────────────────────────────
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS voice_id_used TEXT;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS voice_name_resolved TEXT;

-- ── jarvis_settings · singleton-style key/value for user preferences ───────
CREATE TABLE IF NOT EXISTS jarvis_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE jarvis_settings IS 'CLASSIFICATION: INTERNAL';

INSERT INTO jarvis_settings (setting_key, setting_value)
VALUES ('nate_checkin_interval_days', '7'::jsonb),
       ('psnm_break_even_pallets', '827'::jsonb),
       ('psnm_may_rent_due_date', '"2026-05-08"'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- ── RLS ────────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['ek_cash_log','house_jobs','nate_checkins','bills','jarvis_settings']) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_service_role', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO public USING (auth.role() = ''service_role'')', t || '_service_role', t);
  END LOOP;
END $$;

-- ── Audit ──────────────────────────────────────────────────────────────────
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES ('cc_partial_overnight_schema', NULL,
        jsonb_build_object('migration','28','tables_added', 5, 'columns_added', 2));

COMMIT;

-- Verification
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename IN ('ek_cash_log','house_jobs','nate_checkins','bills','jarvis_settings')
ORDER BY tablename;

SET LOCAL ROLE anon;
SELECT 'ek_cash_log' AS tbl, COUNT(*) AS anon_visible FROM ek_cash_log UNION ALL
SELECT 'house_jobs', COUNT(*) FROM house_jobs UNION ALL
SELECT 'nate_checkins', COUNT(*) FROM nate_checkins UNION ALL
SELECT 'bills', COUNT(*) FROM bills UNION ALL
SELECT 'jarvis_settings', COUNT(*) FROM jarvis_settings;
RESET ROLE;
