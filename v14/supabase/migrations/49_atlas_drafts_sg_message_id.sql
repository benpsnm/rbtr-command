-- Migration 49: add sg_message_id to psnm_atlas_drafts
-- Stores the X-Message-Id header returned by SendGrid on successful send.
-- Used to correlate Event Webhook callbacks (delivered/open/click/bounce)
-- back to the draft that triggered them.

ALTER TABLE psnm_atlas_drafts
  ADD COLUMN IF NOT EXISTS sg_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_psnm_atlas_drafts_sg_message_id
  ON psnm_atlas_drafts (sg_message_id)
  WHERE sg_message_id IS NOT NULL;

COMMENT ON COLUMN psnm_atlas_drafts.sg_message_id
  IS 'SendGrid X-Message-Id from the 202 response. Used to join Event Webhook callbacks.';
