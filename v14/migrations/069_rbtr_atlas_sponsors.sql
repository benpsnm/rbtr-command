-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 069: RBTR Atlas v3 Sponsor Outreach Engine
-- Created: 2026-05-14
-- Purpose: Replicate PSNM Atlas v3 for RBTR sponsor outreach (53 targets)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── RBTR Sponsor Prospects ──────────────────────────────────────────────────
-- Parallel to psnm_outreach_targets but for RBTR expedition sponsors

CREATE TABLE IF NOT EXISTS rbtr_atlas_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company identity
  company_name TEXT NOT NULL,
  website TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,

  -- Sponsor details
  tier TEXT NOT NULL, -- tier-1 | tier-2 | tier-3
  product_category TEXT, -- e.g. "Roof Tent", "Water System", "Solar", "Comms"
  ask_amount_gbp NUMERIC(10, 2), -- What we're asking for
  value_estimate_gbp NUMERIC(10, 2), -- Estimated value of sponsorship

  -- Status
  status TEXT NOT NULL DEFAULT 'target', -- target | drafted | approved | dispatched | replied | negotiating | signed | declined
  hot_flag BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_prospects_status ON rbtr_atlas_prospects(status);
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_prospects_tier ON rbtr_atlas_prospects(tier);
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_prospects_hot ON rbtr_atlas_prospects(hot_flag) WHERE hot_flag = true;

-- ── RBTR Atlas Drafts ────────────────────────────────────────────────────────
-- AI-generated outreach email drafts

CREATE TABLE IF NOT EXISTS rbtr_atlas_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES rbtr_atlas_prospects(id) ON DELETE CASCADE,

  -- Draft content
  subject_line TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,

  -- Draft metadata
  draft_variant TEXT, -- tier-1-formal | tier-2-friendly | tier-3-direct
  ai_model TEXT DEFAULT 'claude-sonnet-4-6',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending_approval', -- pending_approval | approved | rejected | sent
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_drafts_prospect ON rbtr_atlas_drafts(prospect_id);
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_drafts_status ON rbtr_atlas_drafts(status);

-- ── RBTR Atlas Dispatched ────────────────────────────────────────────────────
-- Record of sent emails

CREATE TABLE IF NOT EXISTS rbtr_atlas_dispatched (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES rbtr_atlas_prospects(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES rbtr_atlas_drafts(id) ON DELETE SET NULL,

  -- Email details
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- SendGrid
  sendgrid_message_id TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_dispatched_prospect ON rbtr_atlas_dispatched(prospect_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_dispatched_sendgrid ON rbtr_atlas_dispatched(sendgrid_message_id);

-- ── RBTR Atlas Replies ───────────────────────────────────────────────────────
-- Inbound replies from prospects

CREATE TABLE IF NOT EXISTS rbtr_atlas_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES rbtr_atlas_prospects(id) ON DELETE CASCADE,

  -- Reply details
  from_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Classification
  intent TEXT, -- interested | not-now | declined | question | out-of-office
  ai_classification_confidence NUMERIC(3, 2), -- 0.00 to 1.00

  -- Metadata
  raw_email_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_replies_prospect ON rbtr_atlas_replies(prospect_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_rbtr_atlas_replies_intent ON rbtr_atlas_replies(intent);

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed Data: 53 RBTR Sponsor Targets
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO rbtr_atlas_prospects (company_name, website, tier, product_category, ask_amount_gbp, value_estimate_gbp) VALUES
-- TIER 1: Premium overland brands (high-value, formal approach)
('Alu-Cab', 'https://alu-cab.com', 'tier-1', 'Roof Tent / Canopy', 8000, 10000),
('iKamper', 'https://ikamper.com', 'tier-1', 'Roof Tent', 6000, 8000),
('Joolca', 'https://joolca.com.au', 'tier-1', 'Hot Water System', 1500, 2000),
('Goldschmitt', 'https://goldschmitt.de', 'tier-1', 'Suspension / Steps', 3000, 4000),
('Webasto', 'https://webasto.com', 'tier-1', 'Heating System', 2500, 3500),
('Truma', 'https://truma.com', 'tier-1', 'Heating / Combi Boiler', 2000, 3000),
('RED Winches', 'https://redwinches.com', 'tier-1', 'Recovery Winch', 2000, 2500),
('Brigade Electronics', 'https://brigade-electronics.com', 'tier-1', 'Reversing Cameras / Safety', 1500, 2000),
('Smartrack', 'https://smartrack.co.uk', 'tier-1', 'GPS Tracking', 800, 1200),
('Rosco', 'https://rosco.com', 'tier-1', 'Mirrors / Vision Systems', 600, 1000),
('Strands Lighting', 'https://strands.se', 'tier-1', 'LED Lighting', 1000, 1500),
('Quooker', 'https://quooker.co.uk', 'tier-1', 'Boiling Water Tap', 1200, 1500),
('Miele', 'https://miele.co.uk', 'tier-1', 'Washing Machine', 1000, 1200),
('Sika', 'https://sika.com', 'tier-1', 'Adhesives / Sealants', 500, 800),
('Top Tuning', 'https://toptuning.co.uk', 'tier-1', 'Truck Tuning', 1500, 2000),
('Midland Turbo', 'https://midlandturbo.co.uk', 'tier-1', 'Turbocharger', 2000, 2500),

-- TIER 2: Mid-tier expedition / outdoor brands (friendly approach)
('Front Runner', 'https://frontrunneroutfitters.com', 'tier-2', 'Roof Rack / Storage', 2000, 3000),
('Maxtrax', 'https://maxtrax.com', 'tier-2', 'Recovery Boards', 300, 500),
('ARB', 'https://arb.com.au', 'tier-2', 'Air Compressor / Fridge', 2000, 3000),
('Dometic', 'https://dometic.com', 'tier-2', 'Fridge / Awning', 2500, 3500),
('Goal Zero', 'https://goalzero.com', 'tier-2', 'Solar Panels / Power', 1500, 2000),
('Renogy', 'https://renogy.com', 'tier-2', 'Solar System', 1000, 1500),
('Victron Energy', 'https://victronenergy.com', 'tier-2', 'Inverter / Battery Management', 1500, 2000),
('Garmin', 'https://garmin.com', 'tier-2', 'GPS / Navigation', 800, 1200),
('Starlink', 'https://starlink.com', 'tier-2', 'Satellite Internet', 1000, 1500),
('Iridium', 'https://iridium.com', 'tier-2', 'Satellite Phone', 800, 1200),
('BioLite', 'https://bioliteenergy.com', 'tier-2', 'Camping Stove / Power', 400, 600),
('MSR', 'https://msrgear.com', 'tier-2', 'Water Filter / Cookware', 300, 500),
('LifeStraw', 'https://lifestraw.com', 'tier-2', 'Water Filtration', 200, 400),
('Osprey', 'https://osprey.com', 'tier-2', 'Backpacks / Luggage', 400, 600),
('Patagonia', 'https://patagonia.com', 'tier-2', 'Clothing', 800, 1200),
('The North Face', 'https://thenorthface.com', 'tier-2', 'Clothing / Sleeping Bags', 800, 1200),
('Katadyn', 'https://katadyn.com', 'tier-2', 'Water Purification', 300, 500),

-- TIER 3: Smaller/local UK brands (direct, personal approach)
('Trakka Systems', 'https://trakka.com', 'tier-3', 'Solar System', 1500, 2000),
('ComfortDrive Suspension', 'https://comfortdrive.co.uk', 'tier-3', 'Air Suspension', 2000, 2500),
('TJM UK', 'https://tjm.co.uk', 'tier-3', 'Bull Bar / Protection', 1000, 1500),
('Brownchurch', 'https://brownchurch.co.uk', 'tier-3', 'Upholstery / Seating', 3000, 4000),
('VB Air Suspension', 'https://vbairsuspension.com', 'tier-3', 'Air Suspension', 2000, 2500),
('Redarc Electronics', 'https://redarc.com.au', 'tier-3', 'Dual Battery / Inverter', 800, 1200),
('CTEK', 'https://ctek.com', 'tier-3', 'Battery Charger', 200, 400),
('Engel', 'https://engel.com.au', 'tier-3', 'Fridge / Freezer', 800, 1200),
('National Luna', 'https://nationalluna.com', 'tier-3', 'Dual Battery / Fridge', 1000, 1500),
('Pelican Products', 'https://pelican.com', 'tier-3', 'Protective Cases', 400, 600),
('Zarges', 'https://zarges.com', 'tier-3', 'Aluminium Boxes', 600, 800),
('Whale Water Systems', 'https://whalepumps.com', 'tier-3', 'Water Pumps', 300, 500),
('Fiamma', 'https://fiamma.com', 'tier-3', 'Awning / Bike Rack', 600, 1000),
('Thule', 'https://thule.com', 'tier-3', 'Roof Box / Bike Rack', 600, 1000),
('EcoFlow', 'https://ecoflow.com', 'tier-3', 'Portable Power Station', 1000, 1500),
('Bluetti', 'https://bluettipower.com', 'tier-3', 'Power Station', 1000, 1500),
('Jackery', 'https://jackery.com', 'tier-3', 'Solar Generator', 800, 1200);

-- ═══════════════════════════════════════════════════════════════════════════
-- END Migration 069
-- ═══════════════════════════════════════════════════════════════════════════
