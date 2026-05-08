-- RBTR Sponsor Outreach Queue
-- Run in Supabase Dashboard → SQL Editor
-- One-time setup for the sponsor email drafter pipeline

CREATE TABLE IF NOT EXISTS psnm_sponsor_outreach (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name          text NOT NULL,
  sponsor_category      text,
  contact_email_guess   text,
  contact_role_guess    text,
  draft_subject         text,
  draft_body            text,
  asks                  jsonb DEFAULT '[]',
  why_we_picked_them    text,
  sponsor_value_estimate text,
  follow_up_status      text DEFAULT 'none',
  status                text DEFAULT 'draft_pending_review' CHECK (status IN (
    'draft_pending_review', 'approved', 'skipped', 'sent', 'replied'
  )),
  confidence            text DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- RLS: enabled but service role bypasses
ALTER TABLE psnm_sponsor_outreach ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (it bypasses RLS by default, but explicit is cleaner)
CREATE POLICY "service_role_all" ON psnm_sponsor_outreach
  FOR ALL USING (auth.role() = 'service_role');

-- Index for UI queries
CREATE INDEX IF NOT EXISTS idx_psnm_sponsor_outreach_status
  ON psnm_sponsor_outreach(status);

CREATE INDEX IF NOT EXISTS idx_psnm_sponsor_outreach_sponsor_name
  ON psnm_sponsor_outreach(sponsor_name);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_psnm_sponsor_outreach_updated_at ON psnm_sponsor_outreach;
CREATE TRIGGER update_psnm_sponsor_outreach_updated_at
  BEFORE UPDATE ON psnm_sponsor_outreach
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
