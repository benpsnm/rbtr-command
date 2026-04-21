-- ===========================================================================
-- RBTR · Sponsor pipeline tables
-- Idempotent. ASCII-safe.
-- ===========================================================================

-- 1. Sponsor targets — the pipeline of brands Ben is chasing.
CREATE TABLE IF NOT EXISTS sponsor_targets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name        TEXT NOT NULL UNIQUE,
  tier              INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  category          TEXT NOT NULL,
  ask_summary       TEXT NOT NULL,
  ask_value_gbp     NUMERIC NOT NULL,
  website           TEXT,
  logo_url          TEXT,
  hq_country        TEXT,
  approach_month    TEXT,
  status            TEXT NOT NULL DEFAULT 'not_contacted',
  priority_score    INTEGER DEFAULT 50,
  touch_mode        TEXT DEFAULT 'approve',
  last_contact_at   TIMESTAMPTZ,
  next_action_at    TIMESTAMPTZ,
  next_action       TEXT,
  deal_type         TEXT,
  deal_value_gbp    NUMERIC,
  deal_signed_at    TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_targets_status        ON sponsor_targets(status);
CREATE INDEX IF NOT EXISTS idx_sponsor_targets_next_action   ON sponsor_targets(next_action_at);
CREATE INDEX IF NOT EXISTS idx_sponsor_targets_tier_priority ON sponsor_targets(tier, priority_score DESC);

-- 2. Sponsor contacts — humans inside each brand
CREATE TABLE IF NOT EXISTS sponsor_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id      UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  contact_name    TEXT NOT NULL,
  contact_role    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  contact_linkedin TEXT,
  is_primary      BOOLEAN DEFAULT FALSE,
  source          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_sponsor ON sponsor_contacts(sponsor_id);

-- 3. Intelligence reports — Claude-generated research per sponsor
CREATE TABLE IF NOT EXISTS sponsor_intelligence_reports (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id                  UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  company_summary             TEXT,
  recent_marketing_campaigns  JSONB,
  current_ambassadors         JSONB,
  competitor_sponsorships     JSONB,
  recent_product_launches     JSONB,
  sponsor_hooks               JSONB,
  risk_flags                  JSONB,
  confidence_score            INTEGER,
  last_refreshed_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_intel_sponsor ON sponsor_intelligence_reports(sponsor_id, last_refreshed_at DESC);

-- Auto-update updated_at on sponsor_targets
CREATE OR REPLACE FUNCTION _rbtr_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sponsor_targets_updated_at ON sponsor_targets;
CREATE TRIGGER trg_sponsor_targets_updated_at
BEFORE UPDATE ON sponsor_targets
FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Classification tags ────────────────────────────────────────────────────
COMMENT ON TABLE sponsor_targets               IS 'CLASSIFICATION: PUBLIC';
COMMENT ON TABLE sponsor_contacts              IS 'CLASSIFICATION: INTERNAL';
COMMENT ON TABLE sponsor_intelligence_reports  IS 'CLASSIFICATION: INTERNAL';

-- ── RLS on (service_role bypasses) ─────────────────────────────────────────
ALTER TABLE sponsor_targets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_contacts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_intelligence_reports  ENABLE ROW LEVEL SECURITY;

-- ── Seed Ben's 27 known sponsor targets from the RBTR plan ─────────────────
-- Tier 1: critical truck systems (highest ask value, most strategic)
-- Tier 2: gear / kit suppliers
-- Tier 3: lifestyle / supporting brands
-- Source: Ben's sponsor outreach plan (~£31,800 total target value)
INSERT INTO sponsor_targets (brand_name, tier, category, ask_summary, ask_value_gbp, website, hq_country, approach_month, priority_score, notes) VALUES
  ('Mercedes-Benz Trucks',        1, 'Truck',       'Arocs build hero partner: branded coverage of build + 45-month expedition', 5000, 'https://www.mercedes-benz-trucks.com',  'Germany',     '2026-05', 95,  'Already own the truck — hero brand. Approach via UK PR + dealer relationship.'),
  ('Victron Energy',              1, 'Power',       'Quattro 24/5000 inverter + supporting kit donated for build coverage',     2500, 'https://www.victronenergy.com',          'Netherlands', '2026-05', 90,  'Best of breed inverter. Already specced.'),
  ('Fogstar',                     1, 'Battery',     '400Ah LiFePO4 battery pack',                                                1800, 'https://www.fogstar.co.uk',              'UK',          '2026-05', 88,  'UK lithium specialist. Spec confirmed.'),
  ('Michelin',                    1, 'Tyres',       '6× XZL 365/80 R20 tyres for Arocs',                                         3600, 'https://www.michelin.co.uk',             'France',      '2026-06', 92,  'Critical safety + brand value. Hero photo asset.'),
  ('Webasto',                     1, 'Heating',     'Thermo Top Evo 5 diesel heater + supporting kit',                            900, 'https://www.webasto.com',                'Germany',     '2026-06', 80,  'Primary heater. Eberspächer secondary.'),
  ('Eberspächer',                 2, 'Heating',     'Backup heater unit',                                                         600, 'https://www.eberspaecher.com',           'Germany',     '2026-07', 65,  'Redundancy heater. Lower priority than Webasto.'),
  ('Isotherm',                    2, 'Fridge',      'DC fridge unit',                                                             700, 'https://www.indelwebastomarine.com',     'Italy',       '2026-07', 70,  'Truck fridge.'),
  ('Engel',                       2, 'Fridge',      'Portable fridge / freezer',                                                  500, 'https://www.engel-australia.com.au',     'Japan',       '2026-07', 65,  'Secondary fridge / freezer.'),
  ('Berkey',                      2, 'Water',       'Water filtration unit + replacement filters',                                400, 'https://www.berkeyfilters.com',          'USA',          '2026-08', 60,  'Family water security.'),
  ('Garmin',                      1, 'Comms',       '2× inReach Mini 2 + subscription support',                                  1200, 'https://www.garmin.com',                 'USA',          '2026-08', 85,  'Safety-critical satellite comms.'),
  ('Starlink',                    1, 'Comms',       'Starlink Mini hardware + roaming subscription',                              700, 'https://www.starlink.com',               'USA',          '2026-08', 87,  'Internet on the move. Safety + content workflow.'),
  ('Warn',                        1, 'Recovery',    'Zeon 10-S winch + accessories',                                             1500, 'https://www.warn.com',                   'USA',          '2026-09', 78,  'Winch for self-recovery.'),
  ('GoPro',                       2, 'Camera',      '3× Hero 13 Black + accessories',                                            1500, 'https://gopro.com',                      'USA',          '2026-06', 75,  'Action + onboard cameras.'),
  ('DJI',                         2, 'Camera',      'Drone (Mavic 3 Pro) + Osmo Pocket',                                         3500, 'https://www.dji.com',                    'China',       '2026-06', 80,  'Aerial + handheld cinematic.'),
  ('Sony',                        1, 'Camera',      'FX30 + lenses (already own FX30 — request glass + audio)',                  3500, 'https://www.sony.com',                   'Japan',       '2026-07', 82,  'Primary cinema camera body owned. Pitch for lenses.'),
  ('Sandisk',                     2, 'Storage',     '4TB SSD + CFexpress cards x4',                                              700, 'https://www.sandisk.com',                'USA',          '2026-07', 60,  'Bulletproof media for the journey.'),
  ('LaCie',                       2, 'Storage',     '20TB Rugged drive x2',                                                      600, 'https://www.lacie.com',                  'France',      '2026-07', 60,  'Backup of all footage in transit.'),
  ('Renogy',                      2, 'Solar',       '1,600W bifacial solar panels',                                              900, 'https://uk.renogy.com',                  'USA',          '2026-08', 70,  'Solar array on truck roof.'),
  ('Patagonia',                   3, 'Apparel',     'Family kit (Sarah, Hudson, Benson) for cold + wet legs',                    600, 'https://www.patagonia.com',              'USA',          '2026-09', 55,  'Brand fit + values aligned.'),
  ('Helly Hansen',                3, 'Apparel',     'Family wet-weather kit',                                                    400, 'https://www.hellyhansen.com',            'Norway',       '2026-09', 50,  'Backup apparel partner.'),
  ('Hilleberg',                   3, 'Tents',       'Side-tent for setting up camp',                                             900, 'https://www.hilleberg.com',              'Sweden',       '2026-09', 50,  'Premium expedition tent.'),
  ('Maxxis',                      3, 'Tyres',       'Spare tyre + wheel partner',                                                400, 'https://www.maxxis.co.uk',               'Taiwan',       '2026-10', 45,  'Backup tyre relationship if Michelin doesn''t land.'),
  ('Snow Peak',                   3, 'Cooking',     'Cooking system for camp meals',                                             300, 'https://www.snowpeak.com',               'Japan',       '2026-10', 45,  'Family cooking on the road.'),
  ('Trangia',                     3, 'Cooking',     'Stoves + cookware for backup',                                              200, 'https://www.trangia.se',                 'Sweden',       '2026-10', 40,  'Cheap, bulletproof backup.'),
  ('Land Rover Owner Magazine',   3, 'Media',       'Editorial coverage trade — interview series',                                 0, 'https://www.lro.com',                    'UK',          '2026-11', 55,  'Not a sponsor — a media partner. PR amplifier.'),
  ('Overland Journal',            3, 'Media',       'Long-form feature on the family expedition',                                  0, 'https://overlandjournal.com',            'USA',          '2026-11', 60,  'High-prestige overland publication.'),
  ('YouTube Channel Memberships', 3, 'Audience',    'Pre-launch enrolment of founder members',                                      0, 'https://www.youtube.com',                'USA',          '2026-12', 50,  'Audience-funded, not brand. Tracked here for completeness.')
ON CONFLICT (brand_name) DO NOTHING;

-- Sanity:
--   SELECT brand_name, tier, ask_value_gbp, status FROM sponsor_targets ORDER BY tier, priority_score DESC;
--   SELECT tier, COUNT(*), SUM(ask_value_gbp) FROM sponsor_targets GROUP BY tier ORDER BY tier;
