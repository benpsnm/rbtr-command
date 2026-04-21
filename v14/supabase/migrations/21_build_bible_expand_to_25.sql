-- ===========================================================================
-- RBTR · Build Bible expansion 15 → 25 sections
-- Adds 10 sections that typical Arocs 6×6 overland builds include but weren't
-- in the original seed. Idempotent (ON CONFLICT DO NOTHING by section_number).
-- ===========================================================================

INSERT INTO build_bible_sections (section_number, title, subtitle, category, status, target_complete, summary, budget_low_gbp, budget_high_gbp, sponsor_hook) VALUES
  (16, 'Air Supply + Compressors',     '24V on-board air + tyre inflation',           'hydraulics','planned','2026-10-31', 'Onboard compressor, air tank, tyre inflation rig, horn + air-locker feeds. Critical for off-road pressure adjustment.', 600,  1500, 'ARB or similar wins every bush inflation scene across the expedition.'),
  (17, 'Underbody Storage + Drawers',  'Slide-out drawers + tool storage',            'storage',   'planned','2026-11-30', 'Custom underbody drawer system, tool storage, recovery gear lockers.', 1500, 3500, 'Drawer / storage brand visible in every "tool reveal" scene.'),
  (18, 'Internal Lighting',            '24V LED ambient + task + emergency',          'electrical','planned','2026-10-31', 'Warm-white ambient LEDs for living space, task lights for kitchen/workshop, red-mode for night vision.', 500,  1200, 'Lighting brand wins every interior scene we film.'),
  (19, 'Bed + Sleeping Layout',        'Sarah+Ben double + boys bunks',               'interior',  'planned','2027-02-15', 'Foldaway double for parents, stacked bunks for Hudson + Benson, storage under all.', 1500, 3000, 'Mattress / bedding brand is where the family actually sleeps for 45 months.'),
  (20, 'Insulation + Ventilation',     'Arma-Flex + PIR + MaxxFan',                   'body',      'planned','2026-11-15', 'Full wall + ceiling insulation (10 cm PIR core, Arma-Flex against condensation), roof vent + forced-air for hot climates.', 1200, 2800, 'Insulation brand survives -20 to +40 real-world climate data.'),
  (21, 'Door + Window Seals',          'Gasket upgrade for dust + water',             'body',      'planned','2026-11-30', 'All door, window, and body seals reviewed and upgraded for expedition dust + monsoon rain.', 400,  900,  'Seal brand proves itself in the Pamir + East Africa.'),
  (22, 'Fire Suppression + Alarms',    'Engine bay + living space',                   'safety',    'planned','2026-12-15', 'Automatic fire suppression for engine bay, smoke + CO alarms in living space, fire blanket + extinguisher at exits.', 400,  900,  'Fire safety brand wears the badge on a family-of-four truck.'),
  (23, 'First Aid + Medical Kit',      'Expedition-grade medical cache',              'safety',    'planned','2027-01-31', 'Trauma + wound + infection kits, family medications supply, remote-medicine sat-phone protocol.', 300,  800,  'Medical kit brand is present on 45-country family expedition.'),
  (24, 'Cab Upgrades',                 'Seat covers, floor mat, cab audio',           'interior',  'planned','2026-10-15', 'Heavy-duty seat covers, rubber floor mats, audio head unit + speakers upgrade, screen mount.', 500,  1200, 'Cab-interior brand visible in every driving vlog.'),
  (25, 'Wheels + Hubs',                'Beadlock review + hub service',               'recovery',  'planned','2027-04-15', 'Beadlock wheels decision, hub service, bearing pre-expedition refresh, spare wheel rigging.', 1500, 3500, 'Wheel / hub brand supports the expedition on all six tyres.')
ON CONFLICT (section_number) DO NOTHING;

-- Sanity:
--   SELECT COUNT(*) AS total FROM build_bible_sections;  -- expect 25
--   SELECT category, COUNT(*) FROM build_bible_sections GROUP BY category ORDER BY 2 DESC;
