-- Migration 55: Wellness tracking tables
-- Created: 2026-05-11
-- Scope: Ben's personal health protocol — daily check-in, compound log, bloods, supplements
-- NO dosing protocols stored here. Compounds log is a tracker only (Ben enters what he took).

-- ── Daily wellness check-in ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rbtr_wellness_daily (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                 DATE NOT NULL UNIQUE,
  weight_kg            NUMERIC(5,2),
  sleep_hours          NUMERIC(3,1),
  sleep_score          INTEGER,          -- Garmin (0-100)
  hrv                  INTEGER,          -- Garmin, milliseconds
  resting_hr           INTEGER,          -- Garmin, bpm
  recovery_score       INTEGER,          -- Garmin (0-100)
  mood                 INTEGER CHECK (mood BETWEEN 1 AND 10),
  libido               INTEGER CHECK (libido BETWEEN 1 AND 10),
  energy               INTEGER CHECK (energy BETWEEN 1 AND 10),
  training_done        BOOLEAN DEFAULT FALSE,
  training_type        TEXT,             -- 'Push','Pull','Legs','Cardio','Functional','Rest'
  training_duration_min INTEGER,
  protein_g            INTEGER,
  water_l              NUMERIC(3,1),
  alcohol_units        INTEGER DEFAULT 0,
  side_effects         TEXT,             -- free text, anything notable
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rbtr_wellness_daily_date_idx ON rbtr_wellness_daily(date DESC);

-- ── Compounds log (tracker only — Ben logs what he took, no prescriptions) ──

CREATE TABLE IF NOT EXISTS rbtr_wellness_compounds_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date           DATE NOT NULL,
  compound       TEXT NOT NULL,    -- 'Retatrutide','MOTC','BPC157','TB500','NAD+',
                                   -- 'SLU-PP-332','Tesamorelin','GHK-Cu','Test E','Other'
  amount_logged  TEXT,             -- Ben types what he took: "200mcg subQ delt L"
  timing         TEXT,             -- 'Morning','PWO','PM','EOD','E3D','Other'
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rbtr_wellness_compounds_date_idx ON rbtr_wellness_compounds_log(date DESC);
CREATE INDEX IF NOT EXISTS rbtr_wellness_compounds_name_idx ON rbtr_wellness_compounds_log(compound);

-- ── Bloods history ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rbtr_wellness_bloods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date             DATE NOT NULL,
  panel_type       TEXT,            -- 'Medichecks Advanced Well Man', 'NHS', 'Custom'
  results_pdf_path TEXT,            -- stored path to scanned/uploaded result
  key_markers      JSONB,           -- see reference: wellness-bloods-baseline-panel.md
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rbtr_wellness_bloods_date_idx ON rbtr_wellness_bloods(date DESC);

-- ── Supplement stack ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rbtr_wellness_supplements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  daily_dose       TEXT,
  timing           TEXT,
  monthly_cost_gbp NUMERIC(6,2),
  source           TEXT,            -- supplier URL or brand
  notes            TEXT,
  active           BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: initial supplement stack (Ben adjusts doses/sources to match actual purchases)
INSERT INTO rbtr_wellness_supplements (name, daily_dose, timing, monthly_cost_gbp, source, notes) VALUES
  ('Vitamin D3 5000IU + K2 MK-7 200mcg', '1 capsule', 'Morning with food', 8.00, 'BulkSupplements / NutriAdvanced', 'D3+K2 combo — critical on TRT to avoid arterial calcification from high D3 alone'),
  ('Magnesium Glycinate 400mg', '2 capsules', 'Evening before bed', 12.00, 'BulkSupplements / Bulk.com', 'Best absorbed form for sleep quality and heart rhythm'),
  ('Zinc Bisglycinate 25mg', '1 capsule', 'Evening with food', 8.00, 'Thorne / Vitals', 'Gym recovery, testosterone production support — take away from iron'),
  ('Vitamin B-Complex (methylated)', '1 capsule', 'Morning', 10.00, 'Thorne / NOW Foods', 'Methylfolate + methylB12 form — better utilisation, relevant for liver methylation on TRT'),
  ('Omega-3 High-EPA Fish Oil 3000mg', '3 capsules', 'With meals', 18.00, 'Bare Biology / Wiley''s Finest', 'Minimum 2g EPA/day — cardiovascular, inflammation, brain. Critical on TRT for lipids.'),
  ('Creatine Monohydrate 5g', '1 scoop', 'Any time', 6.00, 'Myprotein / Bulk.com', 'Evidence-base is overwhelming. 5g/day. No loading needed.'),
  ('Whey Protein Isolate 25g', '1 scoop post-training', 'PWO', 35.00, 'Myprotein Impact Whey Isolate', 'Hitting 180g protein/day target — particularly important on Retatrutide (appetite suppressed)'),
  ('Electrolyte Mix', '1 sachet on workshop/gym days', 'Intra/post-training', 14.00, 'Precision Hydration / LMNT', 'Workshop days = heavy sweat + low fluid consciousness. Non-negotiable.'),
  ('Collagen Peptides 10g', '1 scoop', 'Morning or PWO', 15.00, 'Bulk.com / Ancient + Brave', 'Joint support — tendons adapt slower than muscle on TRT. Especially relevant for heavy training.'),
  ('Ashwagandha KSM-66 600mg', '1 capsule', 'Evening', 10.00, 'NutriAdvanced / Solgar', 'Cortisol management — workshop stress, financial pressure, disrupted sleep. Verified KSM-66 only.'),
  ('N-Acetylcysteine (NAC) 600mg', '1 capsule', 'Morning', 8.00, 'Bulk.com / NOW Foods', 'Liver support and antioxidant. Particularly relevant on TRT and any oral compounds.'),
  ('TUDCA 250mg', '1 capsule', 'With meals', 22.00, 'Nootropics Depot / Pure Rawz', 'Bile acid liver protectant. Standard protocol for compound users. Higher evidence than UDCA alone.'),
  ('Berberine 500mg', '1 capsule with meals', '2x daily with food', 15.00, 'Thorne / Bulk.com', 'GDA / glucose disposal. Relevant for Retatrutide users managing insulin sensitivity. Metformin-like.')
ON CONFLICT DO NOTHING;
