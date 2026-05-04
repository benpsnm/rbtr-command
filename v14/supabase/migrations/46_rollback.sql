-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK for Migration 46 · WMS Extensions Phase 1
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHEN TO USE
--   Run this if migration 46 needs to be completely reverted — e.g. a Phase 1
--   schema error is found after apply, or Phase 1 is being abandoned.
--
-- HOW TO USE
--   Paste this entire file into the Supabase SQL Editor and run it.
--   It is idempotent: safe to run multiple times (all drops use IF EXISTS).
--
-- WHAT THIS DOES
--   · Drops all 11 tables created in 46_wms_extensions_phase1.sql, in
--     reverse dependency order (FK children before their parents)
--   · RLS policies are dropped automatically with their tables (Postgres
--     convention), but the intent is documented inline for clarity
--   · Drops all 9 enum types created in migration 46
--
-- WHAT THIS DOES NOT DO
--   · Does NOT touch tables from earlier migrations (crm_prospects is the
--     parent of several tables below — we drop the children only, then the
--     parent; psnm_ww_leads, psnm_quotes, sponsor_targets etc. are untouched)
--   · Does NOT drop the cashflow_state seed row separately — it goes with
--     the table
--
-- AFTER RUNNING
--   Remove or archive 46_wms_extensions_phase1.sql from the migrations
--   directory so a future re-run of the forward migration starts clean.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Step 1: FK children — tables that reference other tables in this migration

-- triage_audit_log → triage_enquiries (ON DELETE CASCADE)
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS triage_audit_log CASCADE;

-- email_sends → crm_prospects (ON DELETE SET NULL)
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS email_sends CASCADE;

-- crm_interactions → crm_prospects (ON DELETE CASCADE)
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS crm_interactions CASCADE;

-- pricing_quotes → crm_prospects (ON DELETE SET NULL)
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS pricing_quotes CASCADE;

-- triage_enquiries → psnm_ww_leads (external, ON DELETE SET NULL)
--                  → crm_prospects  (ON DELETE SET NULL)
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS triage_enquiries CASCADE;

-- ── Step 2: parent tables (no intra-migration dependants remaining)

-- crm_prospects — parent for interactions, email_sends, pricing_quotes, triage_enquiries
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS crm_prospects CASCADE;

-- ops_tasks — standalone
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS ops_tasks CASCADE;

-- ops_daily_metrics — standalone
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS ops_daily_metrics CASCADE;

-- cashflow_snapshots — standalone
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS cashflow_snapshots CASCADE;

-- cashflow_state — standalone (seed row goes with the table)
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS cashflow_state CASCADE;

-- ek_estimates — standalone
-- policy: service_role_all (dropped with table)
DROP TABLE IF EXISTS ek_estimates CASCADE;

-- ── Step 3: Enum types (must be dropped after all tables that use them)

DROP TYPE IF EXISTS crm_prospect_status CASCADE;
DROP TYPE IF EXISTS crm_prospect_priority CASCADE;
DROP TYPE IF EXISTS crm_prospect_source CASCADE;
DROP TYPE IF EXISTS crm_interaction_type CASCADE;
DROP TYPE IF EXISTS triage_verdict CASCADE;
DROP TYPE IF EXISTS ops_task_priority CASCADE;
DROP TYPE IF EXISTS ops_task_category CASCADE;
DROP TYPE IF EXISTS email_send_type CASCADE;
DROP TYPE IF EXISTS email_send_status CASCADE;

COMMIT;
