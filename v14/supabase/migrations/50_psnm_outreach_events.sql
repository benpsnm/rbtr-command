-- Migration 50: psnm_outreach_events
-- Stores SendGrid Event Webhook callbacks (delivered, open, click, bounce, etc.)
-- One row per event. sg_event_id is the idempotency key — duplicate webhook
-- deliveries are silently ignored via ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS psnm_outreach_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SendGrid identifiers
  sg_event_id  TEXT UNIQUE NOT NULL,          -- idempotency key (sg_event_id from SG payload)
  sg_message_id TEXT,                         -- matches psnm_atlas_drafts.sg_message_id if set

  -- Cross-reference to our data
  draft_id     UUID REFERENCES psnm_atlas_drafts(id) ON DELETE SET NULL,
  lead_id      UUID REFERENCES psnm_outreach_targets(id) ON DELETE SET NULL,

  -- Event data
  event_type   TEXT NOT NULL,                 -- delivered | open | click | bounce | spamreport | unsubscribe | deferred | dropped
  email        TEXT,                          -- recipient address
  url          TEXT,                          -- clicked URL (click events only)
  useragent    TEXT,
  ip           TEXT,
  reason       TEXT,                          -- bounce/drop reason if present
  raw          JSONB,                         -- full event payload from SendGrid

  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_psnm_outreach_events_draft_id
  ON psnm_outreach_events (draft_id)
  WHERE draft_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_psnm_outreach_events_lead_id
  ON psnm_outreach_events (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_psnm_outreach_events_event_type
  ON psnm_outreach_events (event_type);

CREATE INDEX IF NOT EXISTS idx_psnm_outreach_events_occurred_at
  ON psnm_outreach_events (occurred_at DESC);

-- RLS: service role only (no public reads — contains recipient data)
ALTER TABLE psnm_outreach_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE psnm_outreach_events
  IS 'SendGrid Event Webhook log. One row per delivery event. sg_event_id is unique for idempotency.';
