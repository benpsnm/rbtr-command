-- Migration 56: STR ATLAS prospect engine tables
-- Created: 2026-05-11
-- Entity: Sarah Jane Jones / STR Ltd — The Forge, Blacker Hill
-- Purpose: ATLAS-powered B2B outreach system for short-term rental venue hire

-- ── STR ATLAS Prospects ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS str_atlas_prospects (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_or_individual_name     TEXT NOT NULL,
  segment                        TEXT NOT NULL,
    -- 'wellness_operator' | 'fitness_team' | 'content_creator'
    -- | 'corporate_retreat' | 'wedding_planner' | 'event_agency' | 'influencer'
  contact_name                   TEXT,
  contact_email                  TEXT,
  contact_phone                  TEXT,
  linkedin_url                   TEXT,
  instagram_handle               TEXT,
  website_url                    TEXT,
  relevance_score                INTEGER DEFAULT 50 CHECK (relevance_score BETWEEN 0 AND 100),
  annual_potential_bookings_estimate INTEGER,   -- estimated nights/bookings per year
  typical_party_size             INTEGER,
  enrichment_status              TEXT DEFAULT 'raw',
    -- 'raw' | 'enriched' | 'verified'
  contact_status                 TEXT DEFAULT 'open',
    -- 'open' | 'drafted' | 'sent' | 'replied' | 'qualified' | 'converted' | 'nurture' | 'closed_lost'
  last_touch_at                  TIMESTAMPTZ,
  next_touch_due                 DATE,
  notes                          TEXT,
  source                         TEXT DEFAULT 'atlas_harvest',
    -- 'atlas_harvest' | 'referral' | 'inbound' | 'manual'
  created_at                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS str_atlas_prospects_segment_idx       ON str_atlas_prospects(segment);
CREATE INDEX IF NOT EXISTS str_atlas_prospects_contact_status_idx ON str_atlas_prospects(contact_status);
CREATE INDEX IF NOT EXISTS str_atlas_prospects_relevance_idx     ON str_atlas_prospects(relevance_score DESC);
CREATE INDEX IF NOT EXISTS str_atlas_prospects_next_touch_idx    ON str_atlas_prospects(next_touch_due);

-- ── STR ATLAS Drafts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS str_atlas_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id     UUID REFERENCES str_atlas_prospects(id) ON DELETE CASCADE,
  subject         TEXT,
  body            TEXT,
  channel         TEXT DEFAULT 'email',  -- 'email' | 'instagram_dm' | 'linkedin' | 'letter'
  touch_number    INTEGER DEFAULT 1,
  status          TEXT DEFAULT 'pending_review',
    -- 'pending_review' | 'approved' | 'sent' | 'superseded'
  sarah_approved  BOOLEAN DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS str_atlas_drafts_prospect_idx ON str_atlas_drafts(prospect_id);
CREATE INDEX IF NOT EXISTS str_atlas_drafts_status_idx   ON str_atlas_drafts(status);

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION str_atlas_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS str_atlas_prospects_updated_at ON str_atlas_prospects;
CREATE TRIGGER str_atlas_prospects_updated_at
  BEFORE UPDATE ON str_atlas_prospects
  FOR EACH ROW EXECUTE FUNCTION str_atlas_update_updated_at();

DROP TRIGGER IF EXISTS str_atlas_drafts_updated_at ON str_atlas_drafts;
CREATE TRIGGER str_atlas_drafts_updated_at
  BEFORE UPDATE ON str_atlas_drafts
  FOR EACH ROW EXECUTE FUNCTION str_atlas_update_updated_at();
