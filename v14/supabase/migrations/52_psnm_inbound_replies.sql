-- Migration 52: psnm_inbound_replies
-- Stores inbound reply emails received via SendGrid Inbound Parse.
-- One row per inbound message. Matched to outbound drafts/prospects via
-- In-Reply-To / References headers and from_email lookup.
-- Status lifecycle: unread → triaged → replied | archived

CREATE TABLE IF NOT EXISTS psnm_inbound_replies (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender / routing
  from_email           TEXT        NOT NULL,
  from_name            TEXT,
  to_email             TEXT,

  -- Content
  subject              TEXT,
  body_text            TEXT,
  body_html            TEXT,

  -- Timestamps
  received_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Thread reconstruction headers
  message_id           TEXT,                        -- inbound email's own Message-ID
  in_reply_to          TEXT,                        -- points to our outbound Message-ID
  references_header    TEXT,                        -- full References chain

  -- Raw payload
  raw_headers          JSONB,
  raw_email            TEXT,                        -- full RFC822 source for forensic recovery

  -- Cross-references to PSNM data (matched post-insert)
  matched_draft_id     UUID REFERENCES psnm_atlas_drafts(id)      ON DELETE SET NULL,
  matched_prospect_id  UUID REFERENCES psnm_outreach_targets(id)  ON DELETE SET NULL,

  -- Triage
  status               TEXT        NOT NULL DEFAULT 'unread'
                         CHECK (status IN ('unread', 'triaged', 'replied', 'archived')),
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_inbound_from_email
  ON psnm_inbound_replies (from_email);

CREATE INDEX IF NOT EXISTS idx_inbound_received_at
  ON psnm_inbound_replies (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbound_status
  ON psnm_inbound_replies (status)
  WHERE status = 'unread';

CREATE INDEX IF NOT EXISTS idx_inbound_in_reply_to
  ON psnm_inbound_replies (in_reply_to)
  WHERE in_reply_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_matched_draft
  ON psnm_inbound_replies (matched_draft_id)
  WHERE matched_draft_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbound_matched_prospect
  ON psnm_inbound_replies (matched_prospect_id)
  WHERE matched_prospect_id IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Service role only. No anon policies — contains prospect reply data.

ALTER TABLE psnm_inbound_replies ENABLE ROW LEVEL SECURITY;

-- ── updated_at trigger ───────────────────────────────────────────────────────
-- Reuses _rbtr_set_updated_at() defined in migration 13.

DROP TRIGGER IF EXISTS trg_inbound_replies_updated_at ON psnm_inbound_replies;
CREATE TRIGGER trg_inbound_replies_updated_at
  BEFORE UPDATE ON psnm_inbound_replies
  FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Comment ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE psnm_inbound_replies
  IS 'Inbound reply emails from PSNM outreach prospects, received via SendGrid Inbound Parse. Matched to psnm_atlas_drafts via In-Reply-To header and to psnm_outreach_targets via from_email. Status lifecycle: unread → triaged → replied | archived.';
