-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 068: Forge House Jobs Tracker
-- Created: 2026-05-14
-- Purpose: Track 58 outstanding jobs for 4 Woodhead Mews Barnsley Airbnb
-- ═══════════════════════════════════════════════════════════════════════════

-- ── House Jobs Table ────────────────────────────────────────────────────────
-- Tracks all jobs needed to get the Airbnb ready for launch (target: 7 June 2026)

CREATE TABLE IF NOT EXISTS house_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job identity
  title TEXT NOT NULL,
  description TEXT,
  section TEXT NOT NULL, -- blue | pink | attic | garage | compliance | launch

  -- Ownership
  who TEXT NOT NULL, -- ben | sarah | trade | money
  cost_low NUMERIC(10, 2), -- Estimated cost range (low)
  cost_high NUMERIC(10, 2), -- Estimated cost range (high)

  -- Status
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | done | blocked
  completed_at TIMESTAMP WITH TIME ZONE,
  blocked_reason TEXT,

  -- Notes
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_house_jobs_section ON house_jobs(section);
CREATE INDEX IF NOT EXISTS idx_house_jobs_status ON house_jobs(status);
CREATE INDEX IF NOT EXISTS idx_house_jobs_who ON house_jobs(who);
CREATE INDEX IF NOT EXISTS idx_house_jobs_completed ON house_jobs(completed_at) WHERE status = 'done';

-- ═══════════════════════════════════════════════════════════════════════════
-- Sample Data (58 placeholder jobs - replace with real data from markdown file)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO house_jobs (title, description, section, who, cost_low, cost_high, status) VALUES
-- Blue Bedroom
('Paint blue bedroom walls', 'Repaint walls in Farrow & Ball Hague Blue', 'blue', 'ben', 50, 100, 'not_started'),
('Install blue bedroom curtains', 'Measure and fit blackout curtains', 'blue', 'sarah', 80, 120, 'not_started'),
('Replace blue bedroom light fitting', 'Modern ceiling light - brass finish', 'blue', 'trade', 40, 80, 'not_started'),
('Fix blue bedroom radiator', 'Bleed radiator and check thermostatic valve', 'blue', 'trade', 30, 60, 'not_started'),
('Steam clean blue bedroom carpet', 'Professional carpet clean', 'blue', 'money', 60, 80, 'not_started'),
('Install blue bedroom bedside lamps', 'Matching pair with USB ports', 'blue', 'sarah', 50, 90, 'not_started'),
('Fix blue bedroom window lock', 'Replace broken window lock mechanism', 'blue', 'ben', 15, 25, 'not_started'),
('Hang blue bedroom artwork', '3 framed prints above bed', 'blue', 'sarah', 60, 100, 'not_started'),

-- Pink Bedroom
('Paint pink bedroom walls', 'Repaint in Farrow & Ball Setting Plaster', 'pink', 'ben', 50, 100, 'not_started'),
('Replace pink bedroom carpet', 'New carpet - neutral beige', 'pink', 'money', 200, 350, 'not_started'),
('Install pink bedroom wardrobes', 'IKEA PAX wardrobe system', 'pink', 'ben', 300, 450, 'not_started'),
('Fix pink bedroom door handle', 'Replace loose door handle', 'pink', 'ben', 10, 20, 'not_started'),
('Install pink bedroom mirror', 'Full-length mirror on wardrobe door', 'pink', 'sarah', 40, 70, 'not_started'),
('Replace pink bedroom radiator valve', 'New thermostatic radiator valve', 'pink', 'trade', 40, 70, 'not_started'),
('Install pink bedroom curtain pole', 'Brass curtain pole and rings', 'pink', 'ben', 30, 50, 'not_started'),
('Fix pink bedroom skirting boards', 'Fill gaps and repaint skirting', 'pink', 'ben', 20, 40, 'not_started'),

-- Attic
('Insulate attic floor', 'Top-up loft insulation to 270mm', 'attic', 'trade', 200, 400, 'not_started'),
('Fix attic hatch', 'Replace broken attic hatch latch', 'attic', 'ben', 15, 30, 'not_started'),
('Clear attic clutter', 'Remove old boxes and rubbish', 'attic', 'ben', 0, 0, 'not_started'),
('Install attic light', 'LED loft light with pull cord', 'attic', 'trade', 40, 80, 'not_started'),
('Pest-proof attic vents', 'Wire mesh over vent openings', 'attic', 'ben', 20, 40, 'not_started'),

-- Garage
('Clear garage completely', 'Remove all items and sort/skip', 'garage', 'ben', 0, 50, 'not_started'),
('Paint garage floor', 'Epoxy garage floor paint - grey', 'garage', 'ben', 80, 150, 'not_started'),
('Install garage shelving', 'Heavy-duty metal shelving units', 'garage', 'ben', 100, 200, 'not_started'),
('Fix garage door mechanism', 'Service and lubricate up-and-over door', 'garage', 'ben', 30, 60, 'not_started'),
('Install garage lighting', 'LED strip lights and power sockets', 'garage', 'trade', 80, 150, 'not_started'),
('Pest-proof garage', 'Fill gaps around door and vents', 'garage', 'ben', 20, 40, 'not_started'),

-- Compliance
('Gas safety certificate', 'Annual gas safety check and certificate', 'compliance', 'money', 80, 120, 'not_started'),
('Electrical safety certificate (EICR)', 'Required for rental properties', 'compliance', 'money', 150, 250, 'not_started'),
('EPC certificate', 'Energy Performance Certificate - must be C or above', 'compliance', 'money', 60, 100, 'not_started'),
('PAT testing all appliances', 'Portable Appliance Testing', 'compliance', 'money', 80, 120, 'not_started'),
('Smoke alarm installation', 'Mains-wired smoke alarms in hallway and landings', 'compliance', 'trade', 100, 180, 'not_started'),
('Carbon monoxide alarms', 'CO alarms in every bedroom', 'compliance', 'sarah', 50, 80, 'not_started'),
('Fire blanket and extinguisher', 'Kitchen fire safety equipment', 'compliance', 'sarah', 40, 60, 'not_started'),
('Register with Barnsley Council', 'Mandatory HMO/STR registration', 'compliance', 'sarah', 0, 0, 'not_started'),

-- Launch Prep
('Photography booking', 'Professional Airbnb photography', 'launch', 'money', 150, 250, 'not_started'),
('Create Airbnb listing', 'Write listing copy and upload photos', 'launch', 'sarah', 0, 0, 'not_started'),
('Set pricing strategy', 'Research local comps and set nightly rate', 'launch', 'sarah', 0, 0, 'not_started'),
('Purchase bed linen', '4 sets of linen per bedroom', 'launch', 'money', 200, 350, 'not_started'),
('Purchase towels', '6 bath towels, 6 hand towels per bathroom', 'launch', 'money', 100, 180, 'not_started'),
('Stock kitchen essentials', 'Cutlery, crockery, pans, utensils', 'launch', 'money', 150, 300, 'not_started'),
('Welcome pack prep', 'Tea, coffee, milk, biscuits for arrival', 'launch', 'sarah', 30, 50, 'not_started'),
('WiFi installation', 'Upgrade to business-grade WiFi', 'launch', 'money', 60, 100, 'not_started'),
('Smart lock installation', 'Keyless entry for self-check-in', 'launch', 'money', 120, 200, 'not_started'),
('House manual creation', 'Laminated welcome book with instructions', 'launch', 'sarah', 20, 40, 'not_started'),
('Deep clean before launch', 'Professional end-of-tenancy clean', 'launch', 'money', 150, 250, 'not_started'),
('Garden tidying', 'Mow lawn, trim hedges, weed beds', 'launch', 'ben', 0, 50, 'not_started'),
('Outdoor furniture', 'Small garden table and chairs set', 'launch', 'money', 100, 200, 'not_started'),
('Bin storage solution', 'Outdoor bin store or screen', 'launch', 'ben', 50, 100, 'not_started'),
('Parking signage', 'Clear parking instructions for guests', 'launch', 'sarah', 20, 40, 'not_started'),
('Emergency contact sheet', 'Laminated sheet with local emergency numbers', 'launch', 'sarah', 5, 10, 'not_started'),
('Insurance policy', 'Short-term rental insurance policy', 'launch', 'money', 300, 500, 'not_started'),
('Final walkthrough checklist', 'Complete pre-launch inspection checklist', 'launch', 'sarah', 0, 0, 'not_started');

-- ═══════════════════════════════════════════════════════════════════════════
-- END Migration 068
-- ═══════════════════════════════════════════════════════════════════════════
