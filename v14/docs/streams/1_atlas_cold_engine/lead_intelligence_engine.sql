-- =============================================================================
-- PSNM Lead Intelligence Engine
-- Adds intelligence_brief JSONB column to psnm_outreach_targets
-- Seeds 20 example intelligence briefs for the highest-priority leads
-- DO NOT EXECUTE directly — run via Supabase migration pipeline
-- =============================================================================

-- Step 1: Add the column
ALTER TABLE psnm_outreach_targets
  ADD COLUMN IF NOT EXISTS intelligence_brief JSONB DEFAULT NULL;

COMMENT ON COLUMN psnm_outreach_targets.intelligence_brief IS
  'Structured cold-call intelligence brief — storage drivers, decision-maker info, pallet potential, best call time, gatekeeper strategy';

-- Step 2: Add a GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_psnm_out_intel_gin
  ON psnm_outreach_targets USING GIN (intelligence_brief)
  WHERE intelligence_brief IS NOT NULL;

-- Step 3: Seed 20 intelligence briefs for highest-priority leads
-- Priority ranking: Rotherham postcode first, then Sheffield, then Barnsley/Doncaster,
-- weighted by storage-volume industry and company size.

-- ─── 1. 4S Distribution — Rotherham S60 1DJ ───────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD or Operations Director",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer", "overflow_from_own_site"],
  "primary_storage_driver": "Local distribution company likely using their own yard and overflowing into nearby facilities. Will understand per-pallet pricing immediately.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 30,
  "pallet_estimate_high": 80,
  "weekly_revenue_estimate_gbp": 330,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Ops people in early before loading starts",
  "gatekeeper_type": "direct_line_likely",
  "gatekeeper_strategy": "Ask for MD or ops manager by role if no name. Peer-to-peer opener C.",
  "opener_variant": "C",
  "opener_customisation": "Same industry — they know per-pallet pricing. Lead with flexibility and location.",
  "first_objection_likely": "We have our own warehouse",
  "priority_score": 82,
  "priority_rationale": "Rotherham-based storage/distribution company. Same industry — will understand the offer immediately. 5 min from site. High likelihood of overflow need."
}'::jsonb
WHERE company = '4S Distribution' AND postcode = 'S60 1DJ';

-- ─── 2. Newburgh Engineering — Rotherham S66 8HS ──────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD or Factory Manager",
  "storage_drivers": ["raw_materials_inbound_buffer", "finished_goods_pre_distribution", "machinery_staging"],
  "primary_storage_driver": "Precision engineering — hold stock of billets, tooling, finished machined components. Likely to overflow when a big order comes in.",
  "news_hook": "Check Companies House for any recent filed accounts showing turnover growth",
  "mutual_connections": ["S66 industrial estate neighbours — worth asking at site"],
  "pallet_tier": "T2",
  "pallet_estimate_low": 20,
  "pallet_estimate_high": 60,
  "weekly_revenue_estimate_gbp": 240,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Factory managers accessible after morning shift start",
  "gatekeeper_type": "reception",
  "gatekeeper_strategy": "Ask for the factory manager or MD directly. Mention we are literally next door (S66 8HR vs S66 8HS). That alone opens the door.",
  "opener_variant": "C",
  "opener_customisation": "We are literally on the same industrial estate. Use that. \"You might have driven past us.\"",
  "first_objection_likely": "We manage in-house",
  "priority_score": 90,
  "priority_rationale": "Same postcode S66 8HS as PSNM (S66 8HR). Neighbour. Easiest possible conversation opener. Worth a door knock if phone fails."
}'::jsonb
WHERE company = 'Newburgh Engineering' AND postcode = 'S66 8HS';

-- ─── 3. Autogreen — Rotherham S66 8HS ────────────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Mid",
  "decision_maker_title": "Operations Director or Warehouse Manager",
  "storage_drivers": ["finished_goods_pre_distribution", "seasonal_stock_overflow", "import_container_overflow"],
  "primary_storage_driver": "Tyre distribution — bulky, low-value-density product that takes up enormous floor space. Seasonal peaks (winter tyres Q3/Q4). Very likely to overflow.",
  "news_hook": "Check if they are expanding distribution network — tyre sector is growing with EV market",
  "mutual_connections": [],
  "pallet_tier": "T1",
  "pallet_estimate_low": 80,
  "pallet_estimate_high": 200,
  "weekly_revenue_estimate_gbp": 840,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Distribution ops start early",
  "gatekeeper_type": "direct_to_ops",
  "gatekeeper_strategy": "Same postcode approach. Ops director or warehouse manager. Tyre people understand bulk storage costs immediately.",
  "opener_variant": "C",
  "opener_customisation": "Same estate. Tyres are big and bulky — they will have overflow. Lead with volume: we have 700 pallets available.",
  "first_objection_likely": "We have existing supplier",
  "priority_score": 92,
  "priority_rationale": "Same postcode S66 8HS. Tyre distribution = very high pallet volumes. Seasonal overflow almost certain. Potential T1 customer (100+ pallets). Top priority."
}'::jsonb
WHERE company = 'Autogreen' AND postcode = 'S66 8HS';

-- ─── 4. Sharp's Bedrooms — Rotherham S66 8XH ─────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Operations Director, Supply Chain Manager",
  "storage_drivers": ["finished_goods_pre_distribution", "seasonal_stock_overflow", "promotional_project_stock"],
  "primary_storage_driver": "Flatpack furniture manufacturer with national distribution. Large SKU count, bulk-produced seasonal promotions. Almost certainly has overflow needs during catalogue changes and promotional periods.",
  "news_hook": "Sharps is owned by Nobia (Swedish group) — check for any UK restructuring news",
  "mutual_connections": [],
  "pallet_tier": "T1",
  "pallet_estimate_low": 50,
  "pallet_estimate_high": 200,
  "weekly_revenue_estimate_gbp": 750,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Operations team accessible after morning briefing",
  "gatekeeper_type": "PA_or_reception",
  "gatekeeper_strategy": "Ask for Supply Chain or Operations specifically. Large company — may need to go through procurement eventually but get a name first.",
  "opener_variant": "C",
  "opener_customisation": "Furniture is bulky, low density — they burn floor space. Lead with the proximity (S66 8XH vs S66 8HR — essentially same area).",
  "first_objection_likely": "Contracted with existing provider",
  "priority_score": 85,
  "priority_rationale": "Rotherham S66 — same postcode area. Large national furniture brand. High pallet volume. Seasonal overflow near-certain. Big ticket if they use us even for overflow."
}'::jsonb
WHERE company = 'Sharp''s Bedrooms' AND postcode = 'S66 8XH';

-- ─── 5. AESSEAL plc — Rotherham S60 1DX ──────────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Supply Chain Director, Procurement Manager",
  "storage_drivers": ["raw_materials_inbound_buffer", "finished_goods_pre_distribution", "machinery_staging"],
  "primary_storage_driver": "Global mechanical seals manufacturer. Rotherham HQ. High-precision components, international supply chain — will buffer inbound materials and hold export-ready stock.",
  "news_hook": "AESSEAL is privately owned by Chris Rea family — often in local press. Check for expansion or new facility news.",
  "mutual_connections": ["Rotherham Chamber of Commerce"],
  "pallet_tier": "T2",
  "pallet_estimate_low": 40,
  "pallet_estimate_high": 100,
  "weekly_revenue_estimate_gbp": 420,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Corporate company — go through switchboard. Get procurement or supply chain by name.",
  "gatekeeper_type": "reception_corporate",
  "gatekeeper_strategy": "Professional approach. Name-drop local connection if possible. Ask for supply chain or procurement manager by role.",
  "opener_variant": "D",
  "opener_customisation": "Large Rotherham company — they understand local supply chain value. FD angle or supply chain angle both work.",
  "first_objection_likely": "Preferred supplier list",
  "priority_score": 78,
  "priority_rationale": "Rotherham HQ, large global manufacturer. Solid pallet volumes. Go through proper channels — worth the effort."
}'::jsonb
WHERE company = 'AESSEAL plc' AND postcode = 'S60 1DX';

-- ─── 6. Pricecheck Pharmaceuticals — Rotherham S63 7QY ────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Mid",
  "decision_maker_title": "Warehouse Manager, Logistics Director",
  "storage_drivers": ["finished_goods_pre_distribution", "import_container_overflow", "returns_holding"],
  "primary_storage_driver": "FMCG pharmaceutical wholesale — high turnover, fast-moving stock, complex inbound flows. Will overflow at peak promotional periods.",
  "news_hook": "Pricecheck appears in trade press regularly — check for contract wins or distribution expansion",
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 30,
  "pallet_estimate_high": 80,
  "weekly_revenue_estimate_gbp": 330,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Warehouse ops in early",
  "gatekeeper_type": "direct_to_warehouse",
  "gatekeeper_strategy": "Warehouse manager is the right target. FMCG wholesale — they move fast, they make decisions fast.",
  "opener_variant": "C",
  "opener_customisation": "Rotherham company. Peer tone — they know logistics. Ask about overflow at peak periods directly.",
  "first_objection_likely": "We manage in-house / existing supplier",
  "priority_score": 80,
  "priority_rationale": "Rotherham FMCG pharma wholesaler. Close, right industry, likely overflow need. Mid-tier opportunity."
}'::jsonb
WHERE company = 'Pricecheck Pharmaceuticals' AND postcode = 'S63 7QY';

-- ─── 7. Newell & Wright Transport — Sheffield S9 1XH ─────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Mid",
  "decision_maker_title": "Traffic Manager, Operations Director",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer"],
  "primary_storage_driver": "Haulier — will have staging needs, customer goods in transit, overflow when drops are delayed. Classic use-case for a local storage point off M18.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 20,
  "pallet_estimate_high": 60,
  "weekly_revenue_estimate_gbp": 240,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Traffic managers in very early — 7am–9am best window. Try early.",
  "gatekeeper_type": "direct_or_traffic_office",
  "gatekeeper_strategy": "Traffic office is usually open lines. Ask for traffic manager or ops director. Email on file: traffic@nwtransport.com — warm up with email first.",
  "opener_variant": "E",
  "opener_customisation": "Haulier opener. M18 location. Staging point angle. They move goods — we hold them.",
  "first_objection_likely": "We stage at our own yard",
  "priority_score": 76,
  "priority_rationale": "Sheffield haulier with email on file. Staging point use-case clear. Quick conversation likely. Email warm-up before call."
}'::jsonb
WHERE company = 'Newell & Wright Transport' AND postcode = 'S9 1XH';

-- ─── 8. Yorkshire Logistics Group — Sheffield S4 7QA ─────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD or Director",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer"],
  "primary_storage_driver": "Road haulier. Same staging logic as N&W. Sheffield-based so M18 is their natural route.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 15,
  "pallet_estimate_high": 50,
  "weekly_revenue_estimate_gbp": 195,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Try 8am for traffic team",
  "gatekeeper_type": "small_operator_direct",
  "gatekeeper_strategy": "Small outfit — likely straight to MD. Peer conversation.",
  "opener_variant": "E",
  "opener_customisation": "Sheffield haulier — M18 staging. Direct and quick.",
  "first_objection_likely": "We use our own yard",
  "priority_score": 70,
  "priority_rationale": "Sheffield logistics. Small operator — quick decision if interested. Worth 5 minutes."
}'::jsonb
WHERE company = 'Yorkshire Logistics Group' AND postcode = 'S4 7QA';

-- ─── 9. Bowker Transport — Doncaster DN3 3FE ─────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Mid",
  "decision_maker_title": "Operations Director, Traffic Manager",
  "storage_drivers": ["finished_goods_pre_distribution", "import_container_overflow"],
  "primary_storage_driver": "FMCG haulier — Bowker is a well-established name. Regional operator with solid volumes. M18 corridor is their natural territory.",
  "news_hook": "Check Bowker Group news — known regional operator, may have expansion activity",
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 30,
  "pallet_estimate_high": 80,
  "weekly_revenue_estimate_gbp": 330,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Email on file: enquiries@bowkergroup.co.uk — worth a warm email first",
  "gatekeeper_type": "traffic_office",
  "gatekeeper_strategy": "Email first (address on file), then follow-up call. Ask for operations or traffic.",
  "opener_variant": "F",
  "opener_customisation": "Follow up on email. FMCG haulage staging. M18 location pitch.",
  "first_objection_likely": "We have existing arrangements",
  "priority_score": 74,
  "priority_rationale": "Established Doncaster FMCG haulier. Email available. Solid mid-tier opportunity. Stage with email then call."
}'::jsonb
WHERE company = 'Bowker Transport' AND postcode = 'DN3 3FE';

-- ─── 10. GW Engineering — Barnsley S70 3JG ───────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD (Graeme — email on file)",
  "storage_drivers": ["raw_materials_inbound_buffer", "finished_goods_pre_distribution", "machinery_staging"],
  "primary_storage_driver": "Metal fabrication. Hold steel, fabricated components, tooling. Likely seasonal project work causing overflow.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 15,
  "pallet_estimate_high": 40,
  "weekly_revenue_estimate_gbp": 165,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Email: graeme@gw-engineering.co.uk — go direct to MD. Small company, quick decision.",
  "gatekeeper_type": "direct_to_MD",
  "gatekeeper_strategy": "Email Graeme directly then follow-up call. Reference email in opener F.",
  "opener_variant": "F",
  "opener_customisation": "Email Graeme first. Metal fab context — they know about space and materials storage.",
  "first_objection_likely": "We manage in-house",
  "priority_score": 72,
  "priority_rationale": "Direct email to MD. Small but quick decision. Barnsley — 15 min from site. Worth the quick call."
}'::jsonb
WHERE company = 'GW Engineering' AND postcode = 'S70 3JG';

-- ─── 11. Cranswick Country Foods — Barnsley S70 1RZ ──────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Supply Chain Manager, Logistics Director",
  "storage_drivers": ["finished_goods_pre_distribution", "seasonal_stock_overflow", "raw_materials_inbound_buffer"],
  "primary_storage_driver": "Major food manufacturer. PLC. Very high pallet volumes — chilled and ambient. Barnsley site specifically — check if ambient lines overflow.",
  "news_hook": "Cranswick is FTSE-listed. Check recent investor releases for capacity announcements.",
  "mutual_connections": ["South Yorkshire Food & Drink network"],
  "pallet_tier": "T1",
  "pallet_estimate_low": 100,
  "pallet_estimate_high": 300,
  "weekly_revenue_estimate_gbp": 1200,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Large company — go through switchboard to supply chain. May take 2–3 attempts to land the right person.",
  "gatekeeper_type": "reception_corporate",
  "gatekeeper_strategy": "Ask for supply chain or logistics manager by role. Be specific — Barnsley site specifically. Ambient storage angle (not chilled — we don't do chilled).",
  "opener_variant": "C",
  "opener_customisation": "Large food manufacturer. Ambient overflow is the pitch — be clear we are ambient only, but that is often exactly what they overflow on.",
  "first_objection_likely": "We have contracted arrangements",
  "priority_score": 88,
  "priority_rationale": "FTSE food manufacturer 15 min from site. Enormous potential volume. Long game — may need 3+ touches — but worth it. T1 if it lands."
}'::jsonb
WHERE company = 'Cranswick Country Foods' AND postcode = 'S70 1RZ';

-- ─── 12. Premier Quality Foods — Kinsley WF9 5JB ─────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD or Operations",
  "storage_drivers": ["finished_goods_pre_distribution", "import_container_overflow"],
  "primary_storage_driver": "Food wholesale and distribution. High SKU, fast-moving. Overflow likely at promotional periods.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 20,
  "pallet_estimate_high": 60,
  "weekly_revenue_estimate_gbp": 240,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Small operator — try direct number",
  "gatekeeper_type": "small_operator_direct",
  "gatekeeper_strategy": "Small food wholesale company. MD will answer. Quick decision culture.",
  "opener_variant": "A",
  "opener_customisation": "Busy MD opener. Fast and direct. M18 is their route — distance is manageable.",
  "first_objection_likely": "A bit far from us",
  "priority_score": 68,
  "priority_rationale": "Small food wholesaler ~20 min from site. Lower priority than closer leads but quick decision if interested."
}'::jsonb
WHERE company = 'Premier Quality Foods' AND postcode = 'WF9 5JB';

-- ─── 13. Howarth Wholesale — Doncaster DN5 8TU ───────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Mid",
  "decision_maker_title": "Warehouse Manager, Operations Director",
  "storage_drivers": ["finished_goods_pre_distribution", "seasonal_stock_overflow"],
  "primary_storage_driver": "Food and drink wholesale — classic overflow candidate. Doncaster-based, M18 corridor.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 25,
  "pallet_estimate_high": 70,
  "weekly_revenue_estimate_gbp": 285,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Wholesale ops in early",
  "gatekeeper_type": "reception_or_direct",
  "gatekeeper_strategy": "Ask for warehouse manager or ops. Food wholesale — peer tone.",
  "opener_variant": "C",
  "opener_customisation": "Food wholesale. Overflow at peak periods. M18 close.",
  "first_objection_likely": "We have enough space",
  "priority_score": 69,
  "priority_rationale": "Doncaster food wholesaler. Solid mid-tier opportunity. M18 position makes us genuinely convenient."
}'::jsonb
WHERE company = 'Howarth Wholesale' AND postcode = 'DN5 8TU';

-- ─── 14. AF Blakemore & Son — Doncaster DN3 1HH ──────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "DC Manager, Supply Chain Director",
  "storage_drivers": ["finished_goods_pre_distribution", "seasonal_stock_overflow", "promotional_project_stock"],
  "primary_storage_driver": "Spar wholesale distributor — enormous volumes, complex logistics, regular promotional stock surges. Major regional DC.",
  "news_hook": "AF Blakemore is one of the UK largest Spar distributors — check for any DC capacity news",
  "mutual_connections": [],
  "pallet_tier": "T1",
  "pallet_estimate_low": 80,
  "pallet_estimate_high": 250,
  "weekly_revenue_estimate_gbp": 1050,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Large operation — DC manager or supply chain director. Go through main switchboard.",
  "gatekeeper_type": "reception_corporate",
  "gatekeeper_strategy": "Professional. Ask for DC manager at the Doncaster depot specifically. Large company — may need persistence.",
  "opener_variant": "C",
  "opener_customisation": "Very high volume. Promotional stock build-up. M18 positioning — Doncaster to Rotherham is 15 min.",
  "first_objection_likely": "We have contracted overflow suppliers",
  "priority_score": 85,
  "priority_rationale": "Large Spar distributor out of Doncaster. T1 volume if they engage. Long game but worth it."
}'::jsonb
WHERE company = 'AF Blakemore & Son' AND postcode = 'DN3 1HH';

-- ─── 15. Bestway Wholesale Sheffield — Sheffield S9 1XA ──────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Depot Manager, Operations",
  "storage_drivers": ["finished_goods_pre_distribution", "seasonal_stock_overflow"],
  "primary_storage_driver": "Cash & carry — very high pallet volumes, fast-moving ambient goods. C&C warehouses run close to capacity by design.",
  "news_hook": "Bestway is expanding beyond cash & carry into delivered wholesale — check for Sheffield depot news",
  "mutual_connections": [],
  "pallet_tier": "T1",
  "pallet_estimate_low": 80,
  "pallet_estimate_high": 200,
  "weekly_revenue_estimate_gbp": 840,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Depot ops in early — try 8am",
  "gatekeeper_type": "depot_direct",
  "gatekeeper_strategy": "Go to the Sheffield depot directly. Depot manager is the decision maker for overflow. Don't go to national HQ.",
  "opener_variant": "C",
  "opener_customisation": "Cash & carry context — high ambient volumes. Sheffield S9 to S66 is 10 min. Close enough for daily runs.",
  "first_objection_likely": "We have our own racking and we fill it",
  "priority_score": 83,
  "priority_rationale": "Sheffield C&C — high ambient volume, will overflow at peak. 10 min from site. T1 potential."
}'::jsonb
WHERE company = 'Bestway Wholesale Sheffield' AND postcode = 'S9 1XA';

-- ─── 16. R McDowell Transport — Sheffield S9 4WU ─────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD or Traffic Manager",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer"],
  "primary_storage_driver": "Road haulage and warehousing — already doing warehousing so understand the model. May be looking for overflow partner or to sub out overflow rather than expand.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 20,
  "pallet_estimate_high": 60,
  "weekly_revenue_estimate_gbp": 240,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Sheffield haulier. Try early.",
  "gatekeeper_type": "small_operator_direct",
  "gatekeeper_strategy": "Small operator — direct to MD. Warehousing context means they already get the offer.",
  "opener_variant": "E",
  "opener_customisation": "Already do warehousing so know the model. Pitch as overflow partner, not competitor.",
  "first_objection_likely": "We do our own storage",
  "priority_score": 71,
  "priority_rationale": "Sheffield haulier already in storage — potential partner referral or overflow. 10 min from site."
}'::jsonb
WHERE company = 'R McDowell Transport' AND postcode = 'S9 4WU';

-- ─── 17. Stanton Logistics — Stanton DE7 4QP ─────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Small",
  "decision_maker_title": "MD or Operations",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer"],
  "primary_storage_driver": "Warehousing and logistics operator. Could be partner or could use overflow space during peak periods.",
  "news_hook": null,
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 20,
  "pallet_estimate_high": 50,
  "weekly_revenue_estimate_gbp": 210,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Derbyshire border — further out but logistics operator worth calling",
  "gatekeeper_type": "small_operator_direct",
  "gatekeeper_strategy": "Small logistics operator — MD directly. Peer conversation.",
  "opener_variant": "E",
  "opener_customisation": "Logistics peer. Overflow or partnership angle.",
  "first_objection_likely": "We have our own site",
  "priority_score": 65,
  "priority_rationale": "Derbyshire border logistics. Further out — lower priority but peer-to-peer quick call."
}'::jsonb
WHERE company = 'Stanton Logistics' AND postcode = 'DE7 4QP';

-- ─── 18. Speedy Hire — Rotherham S60 1DG ─────────────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Depot Manager",
  "storage_drivers": ["machinery_staging", "seasonal_stock_overflow", "returns_holding"],
  "primary_storage_driver": "Plant hire — equipment depot. When kit comes back off hire and they are at capacity they need temporary holding. Also holds consumables and accessories on pallets.",
  "news_hook": "Speedy Hire doing growth push — check for Rotherham depot expansion news",
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 20,
  "pallet_estimate_high": 60,
  "weekly_revenue_estimate_gbp": 240,
  "best_call_window": "morning_8_to_10",
  "best_call_notes": "Depot manager in early. Call Rotherham depot directly.",
  "gatekeeper_type": "depot_direct",
  "gatekeeper_strategy": "Rotherham depot direct. Depot manager makes local decisions. Equipment holding angle.",
  "opener_variant": "A",
  "opener_customisation": "Equipment holding. Rotherham to Rotherham. Short hop. Consumables on pallets angle.",
  "first_objection_likely": "We have our own yard",
  "priority_score": 73,
  "priority_rationale": "Rotherham plant hire depot. Returns-holding and accessories storage use case. Quick conversation."
}'::jsonb
WHERE company = 'Speedy Hire' AND postcode = 'S60 1DG';

-- ─── 19. Kepak Convenience Foods — Worksop S80 2RJ ──────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Supply Chain Manager, DC Manager",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer", "seasonal_stock_overflow"],
  "primary_storage_driver": "Convenience food manufacturer. High-volume ambient and chilled. M1/M18 corridor — Worksop to Rotherham is 20 min. Ambient overflow is the angle.",
  "news_hook": "Kepak is Irish-owned — check for UK expansion or new product lines needing distribution",
  "mutual_connections": [],
  "pallet_tier": "T1",
  "pallet_estimate_low": 60,
  "pallet_estimate_high": 150,
  "weekly_revenue_estimate_gbp": 630,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Large food manufacturer — go through switchboard to supply chain",
  "gatekeeper_type": "reception_corporate",
  "gatekeeper_strategy": "Ask for supply chain or DC manager. Clarify ambient storage specifically — food site will have chilled and frozen too.",
  "opener_variant": "C",
  "opener_customisation": "Food manufacturer — ambient overflow specifically. M18 route. 20 min from site.",
  "first_objection_likely": "We use contracted 3PL",
  "priority_score": 77,
  "priority_rationale": "Large food manufacturer 20 min from site. High ambient pallet volumes. Good T1 prospect if ambient overflow is a pain point."
}'::jsonb
WHERE company = 'Kepak Convenience Foods' AND postcode = 'S80 2RJ';

-- ─── 20. Wincanton Logistics — Worksop S80 2BT ───────────────────────────
UPDATE psnm_outreach_targets SET intelligence_brief = '{
  "size_estimate": "Large",
  "decision_maker_title": "Site Manager, Business Development (for sub-contract)",
  "storage_drivers": ["finished_goods_pre_distribution", "raw_materials_inbound_buffer"],
  "primary_storage_driver": "Major 3PL. Will not use us for their own overflow — but could sub-contract overflow from their clients to us. Partnership angle rather than direct customer.",
  "news_hook": "Wincanton was acquired by GXO in 2024 — rebrand/restructure ongoing. Check local Worksop site status.",
  "mutual_connections": [],
  "pallet_tier": "T2",
  "pallet_estimate_low": 30,
  "pallet_estimate_high": 100,
  "weekly_revenue_estimate_gbp": 390,
  "best_call_window": "mid_morning_10_to_12",
  "best_call_notes": "Go to Worksop site manager. Business development angle — we can take their client overflow.",
  "gatekeeper_type": "site_manager",
  "gatekeeper_strategy": "Do not cold call national sales. Go local site. Sub-contractor angle — we help them say yes to clients when they are full.",
  "opener_variant": "E",
  "opener_customisation": "3PL partnership pitch. When their clients overflow, we take the pallets. They look good. We get paid.",
  "first_objection_likely": "We have our own overflow arrangements",
  "priority_score": 74,
  "priority_rationale": "Major 3PL 20 min away. Partnership/sub-contractor angle. If they sub-contract even 50 pallets of client overflow, that is £300/wk."
}'::jsonb
WHERE company = 'Wincanton Logistics (Worksop)' AND postcode = 'S80 2BT';

-- =============================================================================
-- Verification queries (run after applying migration)
-- =============================================================================

-- Check how many briefs were seeded:
-- SELECT COUNT(*) FROM psnm_outreach_targets WHERE intelligence_brief IS NOT NULL;

-- View top 20 by priority score in brief:
-- SELECT company, postcode, (intelligence_brief->>'priority_score')::int AS score
-- FROM psnm_outreach_targets
-- WHERE intelligence_brief IS NOT NULL
-- ORDER BY score DESC;

-- View pallet potential T1 leads:
-- SELECT company, city, intelligence_brief->>'pallet_tier' AS tier,
--        intelligence_brief->>'weekly_revenue_estimate_gbp' AS weekly_rev
-- FROM psnm_outreach_targets
-- WHERE intelligence_brief IS NOT NULL
--   AND intelligence_brief->>'pallet_tier' = 'T1'
-- ORDER BY (intelligence_brief->>'weekly_revenue_estimate_gbp')::int DESC;
