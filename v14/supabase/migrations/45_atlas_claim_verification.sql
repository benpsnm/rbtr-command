-- Migration 45: Atlas Claim-Source Verification Layer
-- Adds fact registry tables, updates draft status constraint, seeds verified facts.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS psnm_atlas_fact_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_type      text NOT NULL,           -- 'drive_time' | 'facility' | 'offer_terms'
  claim_key       text NOT NULL,           -- e.g. 'manchester', 'capacity', 'mid_rate'
  claim_value     text NOT NULL,           -- canonical human-readable value
  source          text NOT NULL,           -- 'verified_static' | 'maps_api' | 'site_survey' | 'manual'
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by     text NOT NULL DEFAULT 'ben_greenwood',
  UNIQUE (claim_type, claim_key)
);

CREATE TABLE IF NOT EXISTS psnm_atlas_prospect_facts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id  uuid NOT NULL REFERENCES psnm_outreach_targets(id) ON DELETE CASCADE,
  fact_type    text NOT NULL,
  fact_value   text NOT NULL,
  source       text NOT NULL,
  confidence   text NOT NULL DEFAULT 'high' CHECK (confidence IN ('high','medium','low')),
  source_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospect_id, fact_type)
);

-- ── Status constraint update ──────────────────────────────────────────────────

ALTER TABLE psnm_atlas_drafts DROP CONSTRAINT IF EXISTS psnm_atlas_drafts_status_check;
ALTER TABLE psnm_atlas_drafts ADD CONSTRAINT psnm_atlas_drafts_status_check
  CHECK (status IN (
    'pending_approval',
    'approved',
    'rejected',
    'sent',
    'failed',
    'needs_revision',
    'needs_source',
    'enrichment_required'
  ));

-- ── Seed: drive times (origin: Hellaby S66 8HR, verified 2026-04-29) ─────────

INSERT INTO psnm_atlas_fact_sources (claim_type, claim_key, claim_value, source, verified_by) VALUES
  ('drive_time', 'glasgow',    '4h 30min / 272 miles',  'verified_static', 'ben_greenwood'),
  ('drive_time', 'london',     '3h 15min / 170 miles',  'verified_static', 'ben_greenwood'),
  ('drive_time', 'felixstowe', '3h 30min / 190 miles',  'verified_static', 'ben_greenwood'),
  ('drive_time', 'manchester', '1h 15min / 60 miles',   'verified_static', 'ben_greenwood'),
  ('drive_time', 'birmingham', '1h 45min / 95 miles',   'verified_static', 'ben_greenwood'),
  ('drive_time', 'leeds',      '45min / 35 miles',      'verified_static', 'ben_greenwood'),
  ('drive_time', 'sheffield',  '25min / 12 miles',      'verified_static', 'ben_greenwood')
ON CONFLICT (claim_type, claim_key) DO NOTHING;

-- ── Seed: facility facts ──────────────────────────────────────────────────────

INSERT INTO psnm_atlas_fact_sources (claim_type, claim_key, claim_value, source, verified_by) VALUES
  ('facility', 'capacity',        '1,602 pallet spaces',             'site_survey',    'ben_greenwood'),
  ('facility', 'spec',            'ambient only',                    'site_survey',    'ben_greenwood'),
  ('facility', 'postcode',        'S66 8HR',                         'site_survey',    'ben_greenwood'),
  ('facility', 'motorway_access', 'M18/M1',                          'site_survey',    'ben_greenwood'),
  ('facility', 'no_hazardous',    'no hazardous goods accepted',      'site_survey',    'ben_greenwood'),
  ('facility', 'no_chilled',      'no chilled or frozen accepted',    'site_survey',    'ben_greenwood')
ON CONFLICT (claim_type, claim_key) DO NOTHING;

-- ── Seed: offer terms ─────────────────────────────────────────────────────────

INSERT INTO psnm_atlas_fact_sources (claim_type, claim_key, claim_value, source, verified_by) VALUES
  ('offer_terms', 'rate_peak',    '£3.95/pallet/week',   'manual', 'ben_greenwood'),
  ('offer_terms', 'rate_mid',     '£3.45/pallet/week',   'manual', 'ben_greenwood'),
  ('offer_terms', 'rate_off',     '£2.95/pallet/week',   'manual', 'ben_greenwood'),
  ('offer_terms', 'commitment',   '12-week minimum',     'manual', 'ben_greenwood'),
  ('offer_terms', 'notice',       '30-day notice',       'manual', 'ben_greenwood'),
  ('offer_terms', 'trial',        '1-week trial option', 'manual', 'ben_greenwood')
ON CONFLICT (claim_type, claim_key) DO NOTHING;
