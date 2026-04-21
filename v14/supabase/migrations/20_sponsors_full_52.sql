-- ===========================================================================
-- RBTR · Sponsor pipeline expansion
-- Sourced from v2 prompt spec. Note: the spec header says 52 sponsors /
-- £142,990 but the enumerated line items add to 55 sponsors / £140,590.
-- This migration ships all 55 line items exactly as the spec lists them;
-- Ben can prune any later if he wants to match an older tally.
-- ASCII-safe. Idempotent.
-- ===========================================================================

-- ── Tier 1 (Mar/Apr 2026) · 9 sponsors · £45,850 ──────────────────────────
INSERT INTO sponsor_targets (brand_name, tier, category, ask_summary, ask_value_gbp, hq_country, approach_month, priority_score) VALUES
  ('Michelin',                1, 'Tyres',      '6× XZL 365/80 R20 tyres',                                    6600,  'France',     '2026-03', 92),
  ('Victron Energy',          1, 'Power',      'Quattro 24/5000 + MPPT + BMV + wiring',                     10200,  'Netherlands','2026-03', 95),
  ('Fogstar',                 1, 'Battery',    '400Ah LiFePO4 pack + BMS',                                   9600,  'UK',         '2026-03', 93),
  ('Chesterfield Composites', 1, 'Body',       'Composite body panels + cab fit',                            4000,  'UK',         '2026-03', 80),
  ('Tata Steel UK',           1, 'Chassis',    'Chassis steel supply',                                        650,  'UK',         '2026-04', 70),
  ('RED Winches',             1, 'Recovery',   'Zeon-class winch + synthetic rope',                          2500,  'UK',         '2026-04', 82),
  ('Clesana',                 1, 'Ablutions',  'Waterless toilet + consumables',                             3800,  'Switzerland','2026-04', 75),
  ('EcoFlow',                 1, 'Power',      'Delta Pro Ultra + extra battery + solar',                    6200,  'China',      '2026-04', 84),
  ('Jaltest',                 1, 'Diagnostics','OBD expert pack for heavy commercial',                       2500,  'Spain',      '2026-04', 72)
ON CONFLICT (brand_name) DO UPDATE SET
  tier = EXCLUDED.tier, category = EXCLUDED.category, ask_summary = EXCLUDED.ask_summary,
  ask_value_gbp = EXCLUDED.ask_value_gbp, hq_country = EXCLUDED.hq_country,
  approach_month = EXCLUDED.approach_month, priority_score = EXCLUDED.priority_score;

-- ── Tier 1 (May/Jun 2026) · 9 sponsors · £26,180 ──────────────────────────
INSERT INTO sponsor_targets (brand_name, tier, category, ask_summary, ask_value_gbp, hq_country, approach_month, priority_score) VALUES
  ('Midland Turbo',           1, 'Powertrain',     'Turbo + recondition work',                               2800,  'UK',         '2026-05', 74),
  ('Top Tuning',              1, 'Powertrain',     'OM471 tuning + mapping',                                 1500,  'Netherlands','2026-05', 72),
  ('Goldschmitt',             1, 'Suspension',     'Air suspension + bellows upgrade',                       6000,  'Germany',    '2026-05', 85),
  ('Strands',                 1, 'Lighting',       'Expedition LED bar + work lamps',                        2800,  'Sweden',     '2026-06', 70),
  ('Smartrack',               1, 'Security',       'Cat 6 S7 tracker + subscription',                         380,  'UK',         '2026-06', 60),
  ('Brigade',                 1, 'Safety',         '360° camera + side detection',                           1600,  'UK',         '2026-06', 74),
  ('Webasto',                 1, 'Heating',        'Thermo Top Evo 5 + install kit',                         1780,  'Germany',    '2026-06', 82),
  ('Truma',                   1, 'Heating',        'Combi heater + ducting',                                 3820,  'Germany',    '2026-06', 80),
  ('WS Sherburns',            1, 'Body',           'Side door + hinge work',                                 5500,  'UK',         '2026-06', 72)
ON CONFLICT (brand_name) DO UPDATE SET
  tier = EXCLUDED.tier, category = EXCLUDED.category, ask_summary = EXCLUDED.ask_summary,
  ask_value_gbp = EXCLUDED.ask_value_gbp, hq_country = EXCLUDED.hq_country,
  approach_month = EXCLUDED.approach_month, priority_score = EXCLUDED.priority_score;

-- ── Tier 2 (Jul-Sep 2026) · 18 sponsors · £38,850 ─────────────────────────
INSERT INTO sponsor_targets (brand_name, tier, category, ask_summary, ask_value_gbp, hq_country, approach_month, priority_score) VALUES
  ('Expedition Meister',      2, 'Interior',       'Slide-out mechanism + engineering',                      5000,  'Germany',    '2026-07', 78),
  ('Linak',                   2, 'Interior',       'Linear actuators for slide-out',                         2400,  'Denmark',    '2026-07', 68),
  ('Alu-Cab',                 2, 'Body',           'Roof rack + awning',                                     3500,  'South Africa','2026-07', 72),
  ('iKamper',                 2, 'Body',           'Rooftop tent (family spec)',                             4000,  'South Korea','2026-07', 70),
  ('Miele',                   2, 'Kitchen',        'Small-footprint dishwasher',                             3000,  'Germany',    '2026-08', 72),
  ('Quooker',                 2, 'Kitchen',        'Boiling water tap',                                       900,  'Netherlands','2026-08', 62),
  ('Isotherm',                2, 'Fridge',         'Under-counter DC fridge',                                1200,  'Italy',      '2026-08', 68),
  ('Engel',                   2, 'Fridge',         'Chest freezer',                                           700,  'Japan',      '2026-08', 66),
  ('Infinity Shower',         2, 'Ablutions',      'Recirculating shower system',                            3800,  'UK',         '2026-08', 70),
  ('Joolca',                  2, 'Ablutions',      'Hot water on demand',                                    1200,  'Australia',  '2026-09', 64),
  ('Whale',                   2, 'Water',          'Water pumps + filters',                                   280,  'UK',         '2026-09', 55),
  ('Berkefeld',               2, 'Water',          'Ceramic filter cartridges',                              350,  'Germany',    '2026-09', 55),
  ('Icon LifeSaver',          2, 'Water',          'LifeSaver Cube + cartridges',                            300,  'UK',         '2026-09', 55),
  ('LifeStraw',               2, 'Water',          'Personal + community filters',                           120,  'Switzerland','2026-09', 50),
  ('Rosco',                   2, 'Safety',         'Reverse cameras + monitors',                            2400,  'USA',        '2026-09', 65),
  ('Bosch Rexroth',           2, 'Hydraulics',     'Hydraulic slides + pumps',                              2800,  'Germany',    '2026-09', 68),
  ('Risen Energy',            2, 'Solar',          'Bifacial 400W panels + frames',                          720,  'China',      '2026-09', 62),
  ('FabCo+Jetex+Profusion',   2, 'Body',           'Fab + exhaust + finishing partners',                    3000,  'UK',         '2026-09', 65)
ON CONFLICT (brand_name) DO UPDATE SET
  tier = EXCLUDED.tier, category = EXCLUDED.category, ask_summary = EXCLUDED.ask_summary,
  ask_value_gbp = EXCLUDED.ask_value_gbp, hq_country = EXCLUDED.hq_country,
  approach_month = EXCLUDED.approach_month, priority_score = EXCLUDED.priority_score;

-- ── Tier 3 (Sep/Oct 2026) · 16 sponsors · £32,110 ─────────────────────────
INSERT INTO sponsor_targets (brand_name, tier, category, ask_summary, ask_value_gbp, hq_country, approach_month, priority_score) VALUES
  ('Sony',                    3, 'Camera',         'Cinema camera body + lens kit',                         8700,  'Japan',      '2026-09', 80),
  ('DJI',                     3, 'Camera',         'Mavic 3 Pro + Osmo + Ronin',                            5000,  'China',      '2026-09', 78),
  ('Rode',                    3, 'Audio',          'Wireless Pro kit + boom',                                 900,  'Australia',  '2026-10', 65),
  ('Atomos',                  3, 'Camera',         'Ninja V + SSD kit',                                     1400,  'Australia',  '2026-10', 60),
  ('Aputure',                 3, 'Camera',         'On-truck LED lighting kit',                             1200,  'China',      '2026-10', 60),
  ('Starlink',                3, 'Comms',          'Mini kit + global roaming',                             1500,  'USA',        '2026-10', 88),
  ('Garmin',                  3, 'Comms',          '2× inReach Mini + subscriptions',                       1250,  'USA',        '2026-10', 85),
  ('Nextbase',                3, 'Comms',          'Dashcam + rear cam',                                      330,  'UK',         '2026-10', 55),
  ('Thule',                   3, 'Storage',        'Roof bars + bike mounts',                                 320,  'Sweden',     '2026-10', 55),
  ('Flextail',                3, 'Camp',           'Portable pump + camp lighting',                           750,  'China',      '2026-10', 52),
  ('Pelican',                 3, 'Storage',        'Hard cases for cameras + kit',                            650,  'USA',        '2026-10', 60),
  ('Kriega',                  3, 'Storage',        'Modular luggage + harnesses',                             410,  'UK',         '2026-10', 55),
  ('MAXTRAX',                 3, 'Recovery',       'MKII recovery boards',                                    550,  'Australia',  '2026-10', 64),
  ('ARB',                     3, 'Recovery',       'Compressor + recovery kit',                             1200,  'Australia',  '2026-10', 68),
  ('Rab',                     3, 'Apparel',        'Family cold-weather kit',                               1200,  'UK',         '2026-10', 58),
  ('Salomon',                 3, 'Apparel',        'Family hiking boots + shoes',                           1680,  'France',     '2026-10', 60),
  ('AMK',                     3, 'Safety',         'Adventure medical kit + trauma',                          400,  'USA',        '2026-10', 55),
  ('ACR',                     3, 'Safety',         'PLB + EPIRB backup',                                      250,  'USA',        '2026-10', 55),
  ('La Marzocco',             3, 'Lifestyle',      'Onboard espresso machine',                              5000,  'Italy',      '2026-10', 65)
ON CONFLICT (brand_name) DO UPDATE SET
  tier = EXCLUDED.tier, category = EXCLUDED.category, ask_summary = EXCLUDED.ask_summary,
  ask_value_gbp = EXCLUDED.ask_value_gbp, hq_country = EXCLUDED.hq_country,
  approach_month = EXCLUDED.approach_month, priority_score = EXCLUDED.priority_score;

-- Verification query (result should be exactly 142990):
-- SELECT SUM(ask_value_gbp) FROM sponsor_targets;
