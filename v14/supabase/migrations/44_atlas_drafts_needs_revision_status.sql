-- Migration 44 — extend psnm_atlas_drafts.status CHECK to include 'needs_revision'
-- Reason: api/atlas.js:611 writes status='needs_revision' when validateDraft() fails,
--   but migration 40's CHECK constraint omits it, causing 23514 errors and
--   silently dropped draft bodies. Validator v2.1 (2026-04-29) catches more
--   regressions, so this gap surfaces more often.
-- Effect: drafts that fail validation persist for inspection in WMS instead of
--   being lost on insert.

ALTER TABLE psnm_atlas_drafts DROP CONSTRAINT psnm_atlas_drafts_status_check;
ALTER TABLE psnm_atlas_drafts ADD CONSTRAINT psnm_atlas_drafts_status_check
  CHECK (status IN ('pending_approval','approved','rejected','sent','failed','needs_revision'));
