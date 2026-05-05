-- Migration 51: add 'superseded' to psnm_atlas_drafts status constraint
-- Required by the dispatch deduplication guard added in atlas.js dispatchApproved().
-- When two drafts for the same prospect are both approved in the same batch,
-- the later-approved draft is auto-marked 'superseded' rather than dispatched.
-- (See 29 April incident: old pipeline dispatched 2 drafts per prospect in 6 seconds.)
--
-- Current constraint (from migration 47): pending_approval | pending_critic |
--   approved | rejected | sent | failed | needs_revision | needs_source | enrichment_required
-- This migration adds: superseded

ALTER TABLE psnm_atlas_drafts DROP CONSTRAINT IF EXISTS psnm_atlas_drafts_status_check;
ALTER TABLE psnm_atlas_drafts ADD CONSTRAINT psnm_atlas_drafts_status_check
  CHECK (status IN (
    'pending_approval',
    'pending_critic',
    'approved',
    'rejected',
    'sent',
    'failed',
    'needs_revision',
    'needs_source',
    'enrichment_required',
    'superseded'
  ));

COMMENT ON COLUMN psnm_atlas_drafts.status
  IS 'Draft lifecycle: pending_critic → pending_approval → approved → sent | rejected | failed | needs_revision | superseded (auto-skipped duplicate prospect in same batch dispatch)';
