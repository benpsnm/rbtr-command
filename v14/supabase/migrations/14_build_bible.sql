-- ===========================================================================
-- RBTR · Build Bible
-- The single authoritative breakdown of the Arocs 6x6 build: section-by-section
-- spec, progress updates, and attachments (invoices, warranties, photos).
--
-- Classification model:
--   build_bible_sections      CLASSIFICATION: SPONSOR_VISIBLE
--     (sponsors + partners may see what we're building + current status)
--   build_progress_updates    CLASSIFICATION: SPONSOR_VISIBLE
--     (journal of milestones; fine for pitch decks and recaps)
--   build_bible_attachments   CLASSIFICATION: INTERNAL
--     (invoices, warranties, private receipts — Ben only)
-- ===========================================================================

-- 1. The sections of the build (think chapters of the build bible)
CREATE TABLE IF NOT EXISTS build_bible_sections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_number    INTEGER NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  subtitle          TEXT,
  category          TEXT NOT NULL,
  -- e.g. chassis, powertrain, electrical, water, heating, body, interior,
  -- comms, recovery, safety, storage, kitchen, ablutions, external, paint
  status            TEXT NOT NULL DEFAULT 'planned',
  -- planned | speccing | sourcing | in_progress | installed | tested | complete | on_hold
  target_complete   DATE,
  started_at        DATE,
  completed_at      DATE,
  summary           TEXT,
  spec_details      JSONB,
  budget_low_gbp    NUMERIC,
  budget_high_gbp   NUMERIC,
  actual_spend_gbp  NUMERIC,
  sponsor_hook      TEXT,
  -- one-sentence pitch: why this section is a gift for the right sponsor
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bbs_status    ON build_bible_sections(status);
CREATE INDEX IF NOT EXISTS idx_bbs_category  ON build_bible_sections(category);
CREATE INDEX IF NOT EXISTS idx_bbs_target    ON build_bible_sections(target_complete);

-- 2. Journal of progress per section
CREATE TABLE IF NOT EXISTS build_progress_updates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID REFERENCES build_bible_sections(id) ON DELETE CASCADE,
  update_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  headline     TEXT NOT NULL,
  body         TEXT,
  hours_worked NUMERIC,
  photos_taken INTEGER,
  blockers     TEXT,
  next_step    TEXT,
  mood         INTEGER CHECK (mood BETWEEN 1 AND 5),
  -- 1 = grinding, 5 = cracking on
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bpu_section ON build_progress_updates(section_id, update_date DESC);
CREATE INDEX IF NOT EXISTS idx_bpu_date    ON build_progress_updates(update_date DESC);

-- 3. Attachments — docs and receipts attached to a section (INTERNAL only)
CREATE TABLE IF NOT EXISTS build_bible_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   UUID REFERENCES build_bible_sections(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL,
  -- invoice | warranty | receipt | manual | photo | schematic | other
  title        TEXT NOT NULL,
  file_url     TEXT,
  -- points to Supabase Storage bucket `build-bible` (private)
  storage_path TEXT,
  supplier     TEXT,
  amount_gbp   NUMERIC,
  issued_date  DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bba_section ON build_bible_attachments(section_id, kind);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_bbs_updated_at ON build_bible_sections;
CREATE TRIGGER trg_bbs_updated_at
BEFORE UPDATE ON build_bible_sections
FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Classification tags ────────────────────────────────────────────────────
COMMENT ON TABLE build_bible_sections       IS 'CLASSIFICATION: SPONSOR_VISIBLE — sponsors may see current build status + spec';
COMMENT ON TABLE build_progress_updates     IS 'CLASSIFICATION: SPONSOR_VISIBLE — milestone journal, safe for pitch decks + recaps';
COMMENT ON TABLE build_bible_attachments    IS 'CLASSIFICATION: INTERNAL — invoices, warranties, private documents; Ben only';

-- ── RLS on (service_role bypasses) ─────────────────────────────────────────
ALTER TABLE build_bible_sections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_progress_updates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_bible_attachments  ENABLE ROW LEVEL SECURITY;

-- ── Seed the 15 core build sections (from Ben's RBTR build plan) ──────────
INSERT INTO build_bible_sections (section_number, title, subtitle, category, status, target_complete, summary, budget_low_gbp, budget_high_gbp, sponsor_hook) VALUES
  (1,  'Chassis + Roll Cage',            'Arocs 3258 6x6 foundation prep',              'chassis',     'planned', '2026-06-30', 'Strip, clean, inspect, and reinforce the stock Arocs chassis for overland duty. Add rock sliders, integrated roll hoops, and sub-frame mounts.', 2500,  5500,  'Chassis specialist sponsorship visible in every undercarriage shot across 45 countries.'),
  (2,  'Powertrain + Drivetrain',        'OM471 engine + 6x6 drive',                    'powertrain',  'planned', '2026-08-31', 'Service intervals, differential locks, PTO feasibility, low-range behaviour. Pre-expedition shakedown.', 800,   2000,  'Lubricant/filter brand gets engine-bay heroism across the full run.'),
  (3,  'Fuel System',                    'Long-range tank + polishing',                 'powertrain',  'planned', '2026-07-31', 'Bolt-on secondary tank, filtration/polishing rig for bad fuel in remote regions.', 1800,  3500,  'Fuel system brand named when we survive suspect diesel in Central Asia.'),
  (4,  'Electrical — 24V Starter',       'Chassis side, charging, lights',              'electrical',  'planned', '2026-07-15', 'Stock 24V review, second alternator, battery isolation, LED lighting upgrade.', 900,   1800,  'Alternator/isolator brand keeps the truck starting in every climate.'),
  (5,  'Electrical — 24V House',         'Victron Quattro 24/5000 + Fogstar 400Ah LFP', 'electrical',  'speccing', '2026-09-30', '24V house system feeding inverter, chargers, solar MPPT, BMS telemetry.', 4500,  7500,  'Victron hero partner: 45 months of real-world off-grid performance data.'),
  (6,  'Solar Array',                    '1,600W bifacial rooftop',                     'electrical',  'planned', '2026-09-30', 'Bifacial panels mounted on the electronic slide-out roof; MPPT controllers; shade analysis.', 1500,  2800,  'Solar brand visible on every rooftop drone shot and camp scene.'),
  (7,  'Heating + Climate',              'Webasto Thermo Top Evo 5 + Eberspächer backup','heating',     'planned', '2026-10-31', 'Diesel-fired heating with redundancy; ducting into living space + under-chassis anti-freeze loop.', 1200,  2200,  'Heating brand lives through -20 to +40 climate logs.'),
  (8,  'Water — Storage + Delivery',     'Potable + grey tanks, pump, Berkey filter',   'water',       'planned', '2026-10-15', '300L potable, 150L grey, Shurflo pump, UV + Berkey filter for drinking, insulated lines.', 900,   1800,  'Water filtration brand protects a family of 4 for 45 months.'),
  (9,  'Interior Build + Slide-Out',     'Electronic slide-out for 7m living space',    'interior',    'planned', '2027-01-31', 'Slide-out mechanism, insulation (Arma-Flex + PIR), ply walls, soft furnishings.', 6000,  12000, 'Fit-out brand owns the 7m living-space reveal content.'),
  (10, 'Kitchen',                        'Induction + dual fridge + sink',              'interior',    'planned', '2026-12-15', 'Induction hob, Isotherm under-counter + Engel chest freezer, deep sink, Corian top.', 2500,  4500,  'Kitchen brand cooks real family meals in 45 countries.'),
  (11, 'Ablutions',                      'Wet-room shower + composting toilet',         'interior',    'planned', '2027-02-15', 'Fully wet cell with thermostatic shower, Separett compost toilet, under-floor heat.', 1800,  3500,  'Plumbing/shower brand survives the full expedition.'),
  (12, 'Comms + Navigation',             'Starlink Mini, 2x Garmin inReach, CB',        'comms',       'planned', '2026-11-30', 'Mobile satellite internet, emergency comms, overland route tooling, CB for local contact.', 1500,  2800,  'Comms bundle keeps the family connected and safe — sponsor visible on-screen daily.'),
  (13, 'Recovery + Tyres',               'Warn Zeon 10-S winch, Michelin XZL ×6',       'recovery',    'planned', '2027-03-15', 'Front winch, hi-lift, MAXTRAX, full tyre rotation strategy, pressure regulation.', 4500,  7500,  'Recovery + tyre brand visible every time the truck gets itself unstuck on camera.'),
  (14, 'External Storage + Mounts',      'Spare wheel, jerry cans, recovery mounts',    'body',        'planned', '2027-03-31', 'Weight-balanced external lockers, aluminium boxes, jerry rack, awning mount.', 1200,  2500,  'Mounting/locker brand present in every exterior walkaround.'),
  (15, 'Paint + Branding',               'Matte expedition livery + sponsor decals',    'body',        'planned', '2027-05-31', 'Full respray, matte protective finish, sponsor decal layout, numberplates, reflective panels.', 3500,  6500,  'Paint/wrap brand owns the hero brand reveal across 45 countries.')
ON CONFLICT (section_number) DO NOTHING;

-- Sanity:
--   SELECT section_number, title, status, (budget_low_gbp + budget_high_gbp)/2 AS mid_budget FROM build_bible_sections ORDER BY section_number;
--   SELECT category, COUNT(*), SUM((budget_low_gbp + budget_high_gbp)/2) AS mid_total FROM build_bible_sections GROUP BY category ORDER BY mid_total DESC;
