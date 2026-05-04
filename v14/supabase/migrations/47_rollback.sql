-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK for Migration 47 · CRM soft-delete column
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WHEN TO USE
--   Run only if migration 47 must be reverted entirely. This drops the
--   deleted_at column and its partial index. Any soft-deleted prospects
--   will have deleted_at removed — they will reappear as active rows.
--   Confirm this is acceptable before running.
--
-- HOW TO USE
--   Paste into the Supabase SQL Editor and run. Idempotent (IF EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DROP INDEX IF EXISTS crm_prospects_active_idx;
ALTER TABLE crm_prospects DROP COLUMN IF EXISTS deleted_at;

COMMIT;
