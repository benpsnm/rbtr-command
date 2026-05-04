-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 47 · CRM soft-delete column
-- feat/wms-extensions · 2026-05-04
--
-- Adds deleted_at to crm_prospects so DELETE routes set a timestamp rather
-- than removing the row (GDPR erasure handled by the /purge endpoint).
-- A partial index on active rows keeps list queries fast.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE crm_prospects
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Partial index covering the common case (active prospects only)
CREATE INDEX IF NOT EXISTS crm_prospects_active_idx
  ON crm_prospects (created_at DESC)
  WHERE deleted_at IS NULL;

COMMIT;
