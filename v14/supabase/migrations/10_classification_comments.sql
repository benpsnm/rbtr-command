-- ═══════════════════════════════════════════════════════════════════════════
-- RBTR · Data classification labels
-- Idempotent. Safe to re-run. Paste into Supabase SQL editor.
-- Policy doc: /supabase/CLASSIFICATION-POLICY.md
--
-- Tiers:
--   PUBLIC           — fine to share (content, social, sponsors)
--   INTERNAL         — Ben's personal tracking
--   FAMILY           — Sarah / Hudson / Benson data
--   FINANCIAL        — banking / transactions / bills
--   LEGAL_SENSITIVE  — Co-Lab debt, JMW claim, liquidation — never expose
--   AUTH             — API keys / tokens / secrets — service-role only
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────── Apply-if-exists helper ─────────
-- V13 + V14 tables may or may not be present on any given Supabase project.
-- This function lets us safely add COMMENT ON TABLE without failing the batch
-- if a table isn't there yet.
CREATE OR REPLACE FUNCTION _rbtr_comment_if_exists(tbl TEXT, cmt TEXT)
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname=tbl AND c.relkind='r') THEN
    EXECUTE format('COMMENT ON TABLE public.%I IS %L', tbl, cmt);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ───────── V13 tables (from 01_tables.sql) — apply only if present ─────────
SELECT _rbtr_comment_if_exists('rbtr_api_keys',      'CLASSIFICATION: AUTH — API keys for ebay/truelayer/etc. Service-role only.');
SELECT _rbtr_comment_if_exists('ebay_listings',      'CLASSIFICATION: PUBLIC — eBay items for sale (already public on eBay).');
SELECT _rbtr_comment_if_exists('ebay_sales',         'CLASSIFICATION: FINANCIAL — actual sale prices + buyer info.');
SELECT _rbtr_comment_if_exists('bank_accounts',      'CLASSIFICATION: FINANCIAL — account numbers + balances (Ben + PSNM).');
SELECT _rbtr_comment_if_exists('bank_transactions',  'CLASSIFICATION: FINANCIAL — per-transaction detail. Never paraphrase to content.');
SELECT _rbtr_comment_if_exists('bills',              'CLASSIFICATION: FINANCIAL — recurring outgoings. Ben-only.');
SELECT _rbtr_comment_if_exists('bill_payments',      'CLASSIFICATION: FINANCIAL — bill payment history.');
SELECT _rbtr_comment_if_exists('notifications',      'CLASSIFICATION: INTERNAL — app-level notifications to Ben.');
SELECT _rbtr_comment_if_exists('colab_payments',     'CLASSIFICATION: LEGAL_SENSITIVE — Co-Lab debt repayments. Never expose named creditors anywhere outside Command Centre.');
SELECT _rbtr_comment_if_exists('income_log',         'CLASSIFICATION: FINANCIAL — income by source (PSNM/EK/Airbnb). Aggregate only for public.');

-- ───────── V13 Apple Health — apply only if present ─────────
SELECT _rbtr_comment_if_exists('health_workouts',    'CLASSIFICATION: INTERNAL — Ben''s workouts. Private by default.');
SELECT _rbtr_comment_if_exists('health_daily',       'CLASSIFICATION: INTERNAL — Ben''s daily health metrics.');

-- ───────── V13 Equity / Trading — apply only if present ─────────
SELECT _rbtr_comment_if_exists('equity_release',     'CLASSIFICATION: FINANCIAL — equity release / mortgage data. Ben + Sarah.');
SELECT _rbtr_comment_if_exists('investment_accounts','CLASSIFICATION: FINANCIAL — brokerage + ISA balances.');
SELECT _rbtr_comment_if_exists('trading_log',        'CLASSIFICATION: FINANCIAL — realised trades.');
SELECT _rbtr_comment_if_exists('trading_watchlist',  'CLASSIFICATION: INTERNAL — stocks being watched.');
SELECT _rbtr_comment_if_exists('investment_policy',  'CLASSIFICATION: INTERNAL — Ben''s investment thesis / rules.');

-- ───────── V14 JARVIS / ROCKO tables ─────────
COMMENT ON TABLE jarvis_goals              IS 'CLASSIFICATION: INTERNAL — Ben''s tiered goals.';
COMMENT ON TABLE jarvis_accomplishments    IS 'CLASSIFICATION: PUBLIC — Wins. Already posted to YouTube/social as they happen.';
COMMENT ON TABLE jarvis_reflections        IS 'CLASSIFICATION: INTERNAL — morning/evening journal entries.';
COMMENT ON TABLE jarvis_learning_streaks   IS 'CLASSIFICATION: INTERNAL — per-subject streak counters.';
COMMENT ON TABLE jarvis_learning_sessions  IS 'CLASSIFICATION: INTERNAL — per-session practice log.';
COMMENT ON TABLE jarvis_tool_registry      IS 'CLASSIFICATION: PUBLIC — list of tools Ben has built.';
COMMENT ON TABLE jarvis_signals            IS 'CLASSIFICATION: INTERNAL — live feed items (leads, bookings, alerts). Lead detail is PII — treat as INTERNAL even though business-adjacent.';
COMMENT ON TABLE jarvis_conversations      IS 'CLASSIFICATION: INTERNAL — Rocko chat history. Contains Ben''s thoughts. Never expose in outbound content.';
COMMENT ON TABLE jarvis_builtdad           IS 'CLASSIFICATION: INTERNAL — Built Dad programme day counter.';

-- ───────── Optional future tables — pre-classify so migrations don't drift ─────────
-- (create these only if/when needed; the COMMENT is safe-as-intent)

-- House jobs sync — if we later persist house-jobs.js state server-side
-- COMMENT ON TABLE house_jobs          IS 'CLASSIFICATION: FAMILY — Barnsley property (in Sarah''s name). Keep private.';

-- Sarah's Hub — if ever persisted server-side
-- COMMENT ON TABLE sarah_goals         IS 'CLASSIFICATION: FAMILY — Sarah''s personal goals. Never expose without her consent.';

-- Sponsors pipeline — if promoted from localStorage to Supabase
-- COMMENT ON TABLE sponsor_targets     IS 'CLASSIFICATION: PUBLIC — 27 target sponsors. Outbound-friendly.';

-- ───────── Audit log for LEGAL_SENSITIVE access ─────────
CREATE TABLE IF NOT EXISTS jarvis_sensitive_access_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  classification text not null,
  accessed_by text,
  accessed_at timestamptz not null default now(),
  request_ip  text,
  user_agent  text,
  operation   text,
  row_count   int
);
COMMENT ON TABLE jarvis_sensitive_access_log IS 'CLASSIFICATION: INTERNAL — audit trail of all LEGAL_SENSITIVE table reads.';

CREATE INDEX IF NOT EXISTS idx_jarvis_sens_log_time ON jarvis_sensitive_access_log(accessed_at DESC);
ALTER TABLE jarvis_sensitive_access_log ENABLE ROW LEVEL SECURITY;

-- ───────── Helper view: classification overview ─────────
CREATE OR REPLACE VIEW jarvis_classification_overview AS
SELECT
  c.relname            AS table_name,
  obj_description(c.oid, 'pg_class') AS full_comment,
  CASE
    WHEN obj_description(c.oid, 'pg_class') LIKE '%CLASSIFICATION: AUTH%'             THEN 'AUTH'
    WHEN obj_description(c.oid, 'pg_class') LIKE '%CLASSIFICATION: LEGAL_SENSITIVE%' THEN 'LEGAL_SENSITIVE'
    WHEN obj_description(c.oid, 'pg_class') LIKE '%CLASSIFICATION: FINANCIAL%'       THEN 'FINANCIAL'
    WHEN obj_description(c.oid, 'pg_class') LIKE '%CLASSIFICATION: FAMILY%'          THEN 'FAMILY'
    WHEN obj_description(c.oid, 'pg_class') LIKE '%CLASSIFICATION: INTERNAL%'        THEN 'INTERNAL'
    WHEN obj_description(c.oid, 'pg_class') LIKE '%CLASSIFICATION: PUBLIC%'          THEN 'PUBLIC'
    ELSE 'UNCLASSIFIED'
  END AS classification
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
ORDER BY classification, table_name;

COMMENT ON VIEW jarvis_classification_overview IS 'CLASSIFICATION: INTERNAL — audit view listing every table with its classification tier.';

-- After running, verify with:
--   SELECT * FROM jarvis_classification_overview;
-- Any table showing `UNCLASSIFIED` needs a COMMENT ON TABLE added above.
