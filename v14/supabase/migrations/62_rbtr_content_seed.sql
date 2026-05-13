-- ═══════════════════════════════════════════════════════════════════════════
-- 61 · RBTR Content Seed — 30 starter content pieces
-- Brand-voice content covering: brand intro (5), truck build (10),
-- sponsor pitch (5), family/legacy (5), wellness/Sarah J (5)
--
-- All content: status='approved', ready for scheduling review.
-- Apply AFTER migration 60 (rbtr_content_engine tables must exist).
-- Apply via: Supabase SQL editor → project mpxgyobotiqcawmqlhbf
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BRAND INTRO — 5 pieces ────────────────────────────────────────────────

-- 1. IG Long — The honest intro post
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'philosophy',
  'Who Is RBTR',
  $$Long caption: brand intro$$,
  $$Right. Let me be straight with you from the start.

I owe £200,000 to people who trusted me. That''s the starting point. Not something I''m trying to hide — it''s the reason this entire thing exists.

I''m Ben. 36. Fabricator. 20 years on the workshop floor in South Yorkshire. I''m building a 33-tonne Mercedes Arocs 6x6 expedition truck — solo — to drive my family across 45 countries over 45 months.

My partner Sarah. Our boys Hudson and Benson. Across Europe, through Turkey, into the Caucasus, along the Pamir Highway, down through East Africa, up to Cape Town, across to Southeast Asia, and eventually to Australia.

Every penny of content revenue from this channel goes back to the people I owe. Ben gets zero cash. We live on wages from the warehouse business, a bit of consulting, and the Airbnb. This truck, this channel, this journey — that''s all built on accountability.

The truck build starts May 2026. Departure July 2027. 60 weeks. 14 months. One man, one workshop.

If you want to watch something honest, something that shows what building something real actually looks like — you''re in the right place.

#rbtr #rockbottomtoroaming #expeditiontruck #arocs6x6 #truckbuild #overland #familyexpedition #southyorkshire #fabrication #accountability$$,
  ARRAY['#rbtr','#rockbottomtoroaming','#expeditiontruck','#arocs6x6','#truckbuild','#overland','#familyexpedition','#southyorkshire','#fabrication','#accountability'],
  'manual', 'brand intro seed', '2026-05-13', 'approved'
);

-- 2. YouTube Short — Why I''m building this truck
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, voiceover, thumbnail_brief, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'short', 'philosophy',
  'Why I''m Building a 33-Tonne Truck',
  $$YT Short voiceover$$,
  $$A South Yorkshire fabricator explains why he''s building a 33-tonne expedition truck to drive his family across 45 countries. The answer is more honest than you''d expect.$$,
  $$[Camera: Ben in workshop, hand on truck frame]

Most people ask why.

Why a 33-tonne truck. Why 45 countries. Why now.

Here''s the honest answer.

I owe £200,000 to people who trusted me with their money. That''s it. That''s the reason.

The truck isn''t a mid-life crisis. The expedition isn''t escapism. It''s repayment. Made visible. Filmed so nothing can be hidden.

My partner Sarah. Our lads Hudson and Benson. They''re coming too — because this is their story as much as mine.

Every penny of what this channel generates goes back to the people I owe.

I get zero from it. I''m fine with that.

[Beat]

60 weeks to build. 14 months. Then we go.

Watch if you want to see what building something real actually looks like.$$,
  $$Ben''s hand on the Arocs chassis — workshop, low angle, honest face$$,
  ARRAY['#truckbuild','#expeditiontruck','#arocs','#overland','#southyorkshire'],
  'manual', 'brand intro seed', '2026-05-13', 'approved'
);

-- 3. TikTok — The debt, the truck, the plan
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'tiktok', 'short', 'philosophy',
  'The Debt, The Truck, The Plan',
  $$TikTok script$$,
  $$I owe £200k. So I''m building a 33-tonne truck and driving my family across 45 countries. Every penny goes back. Here''s how. #rbtr #expeditiontruck #arocs #truckbuild #overland$$,
  $$[Start mid-action — grinding or measuring on the Arocs]

I owe two hundred thousand pounds to people who trusted me.

[Cut]

So I''m building a 33-tonne truck.

[Cut to specs on screen or drawing]

Mercedes Arocs. 6x6. 33 tonnes. Solo build.

[Cut to Ben speaking direct to camera]

Going to drive my partner and two boys across 45 countries.

Europe. Turkey. Central Asia. East Africa. Australia.

[Cut — back to workshop]

Every penny this channel makes goes back to the people I owe.

Nothing to me.

[Direct to camera, close]

60 weeks to build it. Then we go.$$,
  ARRAY['#rbtr','#expeditiontruck','#arocs','#truckbuild','#overland'],
  'manual', 'brand intro seed', '2026-05-13', 'approved'
);

-- 4. IG Carousel — RBTR by the numbers
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'carousel', 'philosophy',
  'RBTR by the Numbers',
  $$Carousel body: 10 slides, RBTR facts and figures$$,
  $$The numbers behind Rock Bottom to Roaming. Swipe through. → #rbtr #expeditiontruck #arocs6x6 #truckbuild #familyexpedition #overland #southyorkshire$$,
  ARRAY['#rbtr','#expeditiontruck','#arocs6x6','#truckbuild','#familyexpedition','#overland','#southyorkshire'],
  'manual', 'brand intro seed - carousel numbers', '2026-05-13', 'approved'
);

-- 5. Podcast — Episode 1 concept: Rock Bottom
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'podcast', 'episode', 'philosophy',
  'Ep 1: Rock Bottom (What That Actually Means)',
  $$Episode structure: open with Ben''s version of rock bottom — not the lowest moment but the moment the decision gets made. The choice to build something visible rather than disappear. Nate opens with "What does rock bottom actually feel like?" not "Tell us your story" — the specificity matters. Segments: (1) What happened — as honest as possible without naming people or companies. (2) The gap between rock bottom and action — what filled that time. (3) Why a truck, why 45 countries, why film it. (4) What the boys understand about all this. Close: where Ben is emotionally right now — not resolved, still in it, building anyway.$$,
  $$Episode 1 of Rock Bottom Conversations. Ben and Nate start at the beginning — what it actually feels like to owe £200,000 to people who trusted you, and why the answer was a 33-tonne truck.$$,
  ARRAY['#rbtr','#podcast','#rockbottom','#expedition','#accountability'],
  'manual', 'brand intro seed - podcast ep1', '2026-05-13', 'approved'
);


-- ── TRUCK BUILD JOURNEY — 10 pieces ──────────────────────────────────────

-- 6. IG Short — Build start day
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'build-progress',
  'Day One',
  $$Short caption — build start$$,
  $$Day one. Arocs is in the workshop. 60 weeks starts now.

#arocs #mercedesarocs #truckbuild #expeditiontruck #rbtr #overland #60weekbuild #southyorkshire$$,
  ARRAY['#arocs','#mercedesarocs','#truckbuild','#expeditiontruck','#rbtr','#overland','#60weekbuild','#southyorkshire'],
  'manual', 'truck build seed - day 1', '2026-05-13', 'approved'
);

-- 7. IG Reel — Frame inspection day
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, thumbnail_brief, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'reel', 'build-progress',
  'What You Actually Check When You Buy a 33-Tonne Truck',
  $$Reel voiceover — frame inspection$$,
  $$First proper inspection of the Arocs chassis. Here''s what 20 years of fabrication teaches you to look for before you start cutting anything.

#arocs #mercedesarocs #truckbuild #fabrication #expeditiontruck #rbtr #overland #chassis$$,
  $$[Reel starts: Ben crouching under the Arocs chassis, torch in hand]

Right. Before you cut anything on a truck like this, you inspect.

[Moving along chassis rail]

I''m looking for corrosion first. Any pitting in the steel here — that''s your future problem.

[Torch on bracket]

Mounting points. These need to be solid. We''re going to be hanging a lot of weight off this chassis by the time we''re done.

[Wide shot — full chassis visible]

This is a 33-tonne GVW truck. Built to work. But "built to work" and "built for the Pamir Highway" are different standards.

[Close — running finger along a weld]

This weld here — original factory. Good. That''s what I want to see.

[Direct to camera]

You spend the time at the start. You don''t fix problems on a mountain in Tajikistan.

Week 1. 59 to go.$$,
  $$Ben with torch under the Arocs chassis — low angle, dark workshop, focused expression$$,
  ARRAY['#arocs','#mercedesarocs','#truckbuild','#fabrication','#expeditiontruck','#rbtr','#overland','#chassis'],
  'manual', 'truck build seed - frame inspection', '2026-05-13', 'approved'
);

-- 8. YouTube Vlog — Week 1 build outline
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, thumbnail_brief, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'vlog', 'build-progress',
  'Week 1: The Arocs Is In The Workshop',
  $$Full vlog structure:

COLD OPEN (0:00–0:30):
Ben crawling under the chassis with a torch. No intro, no music, no title card. First words: "Right. This is where it starts." Camera pulls back to reveal the full truck. Cut to title.

SEGMENT 1 — The truck arrives (0:30–3:00):
How Ben sourced the Arocs. What he paid. Why this specific model. The logistics of getting a 33-tonne truck to a workshop in South Yorkshire. The first walk-around.

SEGMENT 2 — Frame inspection (3:00–7:00):
Full inspection methodology. What to look for. What he found. What needs attention before cutting starts. Educational — serves the overlanding community who might be doing similar builds.

SEGMENT 3 — The build plan (7:00–11:00):
60 weeks on a whiteboard. Ben walks through the phases — chassis, body, electrics, interior. The honest numbers: £83k no sponsors, £51k full sponsors. What that means for the timeline.

SEGMENT 4 — Week 1 reflection (11:00–13:00):
Direct camera. What this week felt like. The weight of starting something this big. What the boys said when they saw the truck.

OUTRO (13:00–14:00):
Next week''s plan. Subscribe prompt (honest, not performed: "If you want to watch this get built properly, stick around."). Link to expedition backstory.$$,
  $$Week 1 of the 60-week Arocs build. Chassis inspection, build plan walkthrough, and what it actually feels like to start something this big.$$,
  $$Ben standing next to the full Arocs chassis in the workshop — wide shot, arms folded, direct to camera$$,
  'manual', 'truck build seed - week 1 vlog', '2026-05-13', 'approved'
);

-- 9. TikTok — What I ordered this week
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'tiktok', 'short', 'build-progress',
  'What Goes Into a £83k Expedition Truck Build',
  $$TikTok script — weekly order$$,
  $$Week 1 order: 6 Michelin XZL tyres, Victron Quattro inverter, 400Ah LiFePO4 batteries. That''s the money shot. #arocs #truckbuild #expeditiontruck #overland #mercedesarocs$$,
  $$[Fast cut — items arriving at workshop or on order screen]

Week 1. Here''s what I ordered.

[Cut 1]

Six Michelin XZL tyres. 365/80 R20. These go on everything that matters off-road.

[Cut 2]

Victron Quattro inverter-charger. 24 volt, five kilowatt. This is the heart of the power system.

[Cut 3]

Fogstar 400 amp-hour lithium batteries. LiFePO4. Built to be cycled hard.

[Direct to camera]

Total so far this week: about eleven grand.

[Pause]

60 weeks to go. Let''s get it sorted.$$,
  ARRAY['#arocs','#truckbuild','#expeditiontruck','#overland','#mercedesarocs'],
  'manual', 'truck build seed - weekly order', '2026-05-13', 'approved'
);

-- 10. IG Medium — Michelin XZL tyre decision
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'build-progress',
  'Why Michelin XZL (The Tyre Decision)',
  $$Medium IG post$$,
  $$Six tyres. 365/80 R20. Michelin XZL.

This wasn''t the cheapest option. Wasn''t even close. But when you''re planning to drive a 33-tonne truck across the Pamir Highway, you stop making decisions based on what''s cheapest.

The XZL is a military-spec tyre. Run-flat capability. Designed for exactly the kind of surface we''re going to be asking it to handle. You can find them second-hand in almost every country we''re passing through — that matters more than people realise. Spare tyre support on a 6x6 expedition isn''t just about what''s on the truck. It''s about what you can source when you''re 600km from the nearest city.

I''ve spoken to people who''ve done this route. They all said the same thing about tyres: buy the ones that keep you moving, not the ones that save you money at home.

Week 1. One decision made right.

#arocs #michelin #xzl #truckbuild #expeditiontruck #overland #rbtr #tyres #6x6$$,
  ARRAY['#arocs','#michelin','#xzl','#truckbuild','#expeditiontruck','#overland','#rbtr','#tyres','#6x6'],
  'manual', 'truck build seed - tyre decision', '2026-05-13', 'approved'
);

-- 11. IG Long — Victron power system planning
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'build-progress',
  'Building a Power System That Won''t Let You Down',
  $$Long IG post — power system$$,
  $$Let me talk about power.

This is the bit that most people get wrong on expedition builds. They either overspec it so it''s complicated to fix, or they underspec it and run out of capacity in the first country.

Here''s what the Arocs is getting.

Fogstar 400Ah LiFePO4 batteries. 24 volt system. Lithium because the weight-to-capacity ratio is unbeatable, and because lithium tolerates being discharged and recharged more than lead-acid will ever do. On a build that''s going to spend months in hot climates, that matters.

Victron Quattro 24/5000 inverter-charger. This is the heart of everything. It manages charging from four sources — shore power, the alternator, solar, and the Webasto hydronic heater system. It talks to the batteries, it tells you exactly what''s happening, and it''s repairable in most countries we''ll be passing through. That last point — Victron support network — is why it won over everything else.

1,600W of bifacial solar. Panels on the roof, angled for year-round performance across latitudes from the UK to the equator.

The maths: 400Ah at 24V = 9.6kWh usable. Fridge running 24/7, laptop, lights, water pump, heating controls — comfortable 3-4 days of full autonomy on a single charge in low-sun conditions. In East Africa? The solar keeps up with consumption by midday.

I spent two months planning this system. Not because I''m precious about it, but because getting stranded without power is a different kind of problem than getting a flat tyre. You can change a tyre. You can''t improvise a Victron on a road in Tajikistan.

Plan it right first time. Then go.

#victron #lifepo4 #fogstar #solarpower #expeditiontruck #arocs #truckbuild #overland #offgrid #12v24v #rbtr #overlanding$$,
  ARRAY['#victron','#lifepo4','#fogstar','#solarpower','#expeditiontruck','#arocs','#truckbuild','#overland','#offgrid','#rbtr','#overlanding'],
  'manual', 'truck build seed - power system', '2026-05-13', 'approved'
);

-- 12. YouTube Short — Why 6x6?
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, voiceover, thumbnail_brief, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'short', 'build-progress',
  'Why 6x6? (The Honest Answer)',
  $$YT Short — 6x6 rationale$$,
  $$A 6x6 costs more, weighs more, and drinks more fuel. So why build one? Ben explains the actual reason.$$,
  $$[Ben in workshop, Arocs visible behind him]

People ask why 6x6.

[Beat]

Here''s the honest answer.

[Walking around the rear axle setup]

Two rear axles means more contact patches on the ground. On soft sand, on mud, on snow — the weight distributes differently. You''re less likely to dig in.

[Stopping, direct to camera]

But that''s the engineering answer.

The real answer?

[Pause]

We''re going to be on roads where if you get stuck, you might wait two days for help. Or you might wait a week. With two boys in the truck.

[Beat]

The 6x6 is insurance. Expensive insurance. But the kind you''re glad you paid for when you need it.

[Walking away, back to work]

Anything less felt like cutting corners on the wrong thing.$$,
  $$Six massive Michelin tyres on Arocs rear axles — workshop, strong side light$$,
  'manual', 'truck build seed - 6x6 rationale', '2026-05-13', 'approved'
);

-- 13. TikTok — Tools I can''t work without
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'tiktok', 'short', 'behind-the-scenes',
  'Tools That Actually Get Used on a Truck Build',
  $$TikTok — workshop tools$$,
  $$20 years of fabrication. Here''s what I actually reach for every day. #workshop #fabrication #welding #truckbuild #arocs$$,
  $$[Fast cuts — picking up each tool as named]

Right. Tools I actually use on a build like this.

Angle grinder. Always.

[Next cut]

MIG welder. Mig first, TIG for the precision stuff.

[Next cut]

Plasma cutter. Cuts the chassis brackets clean. Nothing else does it as fast.

[Next cut]

Tape measure. Obvious. Except the amount of times I''ve seen people bodge this bit.

[Next cut]

Digital angle gauge. Because "looks level" is not good enough on an expedition build.

[Direct to camera]

Everything else is optional. These five go with me everywhere.$$,
  ARRAY['#workshop','#fabrication','#welding','#truckbuild','#arocs'],
  'manual', 'truck build seed - workshop tools', '2026-05-13', 'approved'
);

-- 14. IG Carousel — Arocs spec walkthrough
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'carousel', 'build-progress',
  'The Arocs — Full Spec Breakdown',
  $$Carousel — Arocs full spec. Slides: 1. The truck (hero shot). 2. Engine: 12.8L straight-6, 578bhp. 3. Drivetrain: 6x6, all-wheel drive, low range. 4. Tyres: Michelin XZL 365/80 R20 x6. 5. Power: Victron Quattro 24/5000, 400Ah LiFePO4, 1600W solar. 6. Water: 200L tank, Berkey filtration. 7. Heating: Webasto Thermo Top Evo 5 + Eberspächer backup. 8. Comms: Starlink Mini + Garmin inReach x2. 9. Living: 7m slide-out, kitchen, beds, bathroom. 10. Weight: 33 tonne GVW, built to work.$$,
  $$The Arocs — everything on this truck, explained. Swipe for the full spec. →

#arocs #mercedesarocs #arocs6x6 #expeditiontruck #truckbuild #overlanding #overland #expedition #rbtr$$,
  ARRAY['#arocs','#mercedesarocs','#arocs6x6','#expeditiontruck','#truckbuild','#overlanding','#overland','#expedition','#rbtr'],
  'manual', 'truck build seed - arocs spec carousel', '2026-05-13', 'approved'
);

-- 15. YouTube Vlog — First weld on the Arocs
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, thumbnail_brief, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'vlog', 'build-progress',
  'The First Weld on the Arocs',
  $$Vlog structure:

COLD OPEN: Extreme close-up of weld arc. No introduction. Voice-over: "First weld. 60 weeks in. This is what it starts with."

SEGMENT 1 (2 min): What the weld is for — chassis reinforcement bracket for the rear living compartment mounting. Why this joint matters structurally.

SEGMENT 2 (4 min): Ben sets up and does the weld. Explained simply — prep, heat, technique, inspection. Educational for people watching who weld or want to weld.

SEGMENT 3 (4 min): What the moment felt like. The 20 years of fabrication that led to this. The weight of doing the first weld on something that has to last 45 months across 45 countries.

SEGMENT 4 (3 min): Week in review — what else happened, what''s next.

OUTRO: "Next week: cutting the chassis for the body mounting points. That''s the irreversible bit."$$,
  $$The moment the Arocs build really starts — the first structural weld. Ben walks through the technique and the stakes.$$,
  $$Extreme close-up of MIG weld arc on Arocs chassis — sparks, focus, gloved hands$$,
  'manual', 'truck build seed - first weld vlog', '2026-05-13', 'approved'
);


-- ── SPONSOR PITCH STORY — 5 pieces ───────────────────────────────────────

-- 16. IG Long — Why we''re seeking sponsors
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'sponsor-showcase',
  'Why Sponsors (The Honest Version)',
  $$Long IG post — sponsor pitch philosophy$$,
  $$This isn''t a sponsorship post. It''s a post about sponsorship.

Here''s why I''m being upfront about it.

The budget to build the Arocs without any commercial support is £83,000. That''s equipment, materials, insurance, the works. With full sponsor support — product partnerships, donated kit, equipment loans — that number comes down to around £51,000.

The difference is £32,000. Which, when you''re working with a debt to clear and two kids to feed, is not a small number.

So we''re approaching 27 companies. Not with cap-in-hand emails. With actual proposals. What we''re offering: genuine long-form content coverage over 60 weeks of build and 45 months of expedition. Real-world product testing in conditions most brands will never get footage from. Access to an audience that self-selects — people interested in overlanding, fabrication, and expedition travel. People who buy kit.

We don''t work with brands we wouldn''t use. We don''t say things we don''t mean. If a product fails on the Pamir Highway, that goes in the video too.

Every sponsor gets honesty. That''s the deal.

If you work for a brand that fits — or know someone who does — the link in bio goes to our sponsor pack.

#rbtr #expedition #sponsorship #expeditiontruck #arocs #overlanding #overland #truckbuild #contentcreator$$,
  ARRAY['#rbtr','#expedition','#sponsorship','#expeditiontruck','#arocs','#overlanding','#overland','#truckbuild','#contentcreator'],
  'manual', 'sponsor pitch seed - honest pitch', '2026-05-13', 'approved'
);

-- 17. YouTube Short — Sponsor approach philosophy
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, voiceover, thumbnail_brief, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'short', 'sponsor-showcase',
  'How We Approach Sponsors (Not Like This)',
  $$YT Short — sponsor philosophy$$,
  $$The honest version of how RBTR approaches brand partnerships — and what we''ll never agree to.$$,
  $$[Ben direct to camera — workshop background]

I want to talk about how we handle sponsors. Because I''ve seen how it''s normally done, and that''s not how this works.

[Cut — workshop B-roll]

We''re approaching 27 companies. Kit that goes on the truck. Stuff we''d buy ourselves if we had to.

[Back to camera]

Here''s what we won''t do.

We won''t say something works if it doesn''t. We won''t cut footage of a product failing. We won''t give a brand approval over what gets said.

[Beat]

What they get instead: 60 weeks of build coverage. 45 months of expedition footage. Real-world testing in conditions most brands will never see.

If the product is good, that comes through. If it''s not, that comes through too.

[Direct close]

That''s the deal. Some brands won''t like it. The ones that do are the ones worth working with.$$,
  $$Ben direct to camera — arms folded, honest expression — workshop background$$,
  'manual', 'sponsor pitch seed - yt short', '2026-05-13', 'approved'
);

-- 18. IG Story sequence — Sponsor intro
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'story', 'sponsor-showcase',
  'Sponsor Story Sequence',
  $$Story sequence — 6 frames:

Frame 1: "We''re talking to 27 brands about the build." [Text overlay on workshop shot]

Frame 2: "Not because we need the logos. Because the kit we want is built by people who know what they''re doing." [Text overlay — close-up of Victron unit or tyre]

Frame 3: "£32,000 is the difference between our build budget with sponsors and without." [Text overlay — simple graphic]

Frame 4: "Every piece of gear we partner on gets filmed being used. If it fails — that goes in too." [Text overlay — action shot]

Frame 5: "Brands that don''t want honest coverage don''t fit what we''re doing." [Text overlay — direct statement card]

Frame 6: "If you work with a brand that should be on the Arocs — DM us." [CTA card with link sticker]$$,
  $$Story sequence: 6 frames on how RBTR handles sponsorship.$$,
  'manual', 'sponsor pitch seed - story sequence', '2026-05-13', 'approved'
);

-- 19. TikTok — 27 companies, £31k value
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'tiktok', 'short', 'sponsor-showcase',
  '27 Companies. £31k of Kit. Here''s the Ask.',
  $$TikTok — sponsor numbers$$,
  $$27 brand pitches. £31k of kit if they all say yes. Here''s what we''re offering and why we''re being this transparent. #rbtr #expedition #truckbuild #arocs #overland$$,
  $$[Fast start — Ben with a list visible]

Right. We''re pitching 27 companies for the Arocs build.

[Cut to a list or graphic]

Total kit value if they all say yes: around thirty-one thousand pounds.

[Cut — direct to camera]

We won''t get all 27. But we don''t need all 27.

[Beat]

Here''s what the pitch looks like: 60 weeks of build content. 45 months of expedition footage. Your product, your kit, being used on roads that most brands will never see their stuff used on.

[Cut — workshop B-roll]

We don''t do fake testimonials. We don''t promise a reach we don''t have.

[Back to camera]

We promise honest footage. That''s it. And for the right brands — that''s worth more.$$,
  ARRAY['#rbtr','#expedition','#truckbuild','#arocs','#overland'],
  'manual', 'sponsor pitch seed - tiktok numbers', '2026-05-13', 'approved'
);

-- 20. IG Medium — What sponsors get in return
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'sponsor-showcase',
  'What a Sponsor Actually Gets',
  $$Medium IG post$$,
  $$Want to know exactly what a brand gets when they support the Arocs build?

60 weeks of build content. Your product shown being installed, used, and tested — real conditions, no studio.

45 months of expedition footage. 45 countries. The Pamir Highway. East Africa. Australia. Your kit in environments most brands never reach.

An audience that buys things. Not scroll-bys — people researching their own builds, their own expeditions. The people who actually pull the trigger.

Honest coverage. If it works, that comes through. If it doesn''t, that comes through too.

That last point is either a dealbreaker or exactly what you need. You''ll know which camp you''re in.

#rbtr #sponsor #expeditiontruck #arocs #overland #truckbuild #brandpartnership$$,
  ARRAY['#rbtr','#sponsor','#expeditiontruck','#arocs','#overland','#truckbuild','#brandpartnership'],
  'manual', 'sponsor pitch seed - what they get', '2026-05-13', 'approved'
);


-- ── FAMILY / JOURNEY / LEGACY — 5 pieces ─────────────────────────────────

-- 21. IG Long — Hudson''s expedition journal
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'family',
  'Hudson''s Expedition Journal',
  $$Long IG post — Hudson journal$$,
  $$Hudson is 7 years old. When we leave in July 2027, he''ll be just turned 7. When we get home — if we get home on schedule — he''ll be nearly 11.

We''ve started him writing an expedition journal. Not because I told him to. Because he asked.

He wanted to write down what the truck looks like now, before it becomes the thing he grows up in. So he has something to compare to.

His first entry: "Dad bought a big grey truck. It doesn''t have any rooms yet. I want to sleep in it when it''s finished."

That''s it. That''s the whole entry.

I''ve read it about six times.

There''s something about watching a 7-year-old process the fact that his life is going to look completely different in 14 months. He''s not scared. He''s curious. He asks what countries we''re going to. He asks about elephants. He asks if there''s wifi on the Pamir Highway.

[There isn''t. I didn''t tell him that yet.]

Hudson''s journal is going to document this whole thing from his perspective. Not mine. His. We''ll share entries along the way — the ones he''s happy to share.

This build is for the people I owe money to. And it''s for Hudson, and Benson. The whole thing.

#rbtr #familyexpedition #expedition #overland #truckbuild #kids #homeschool #arocs #southyorkshire$$,
  ARRAY['#rbtr','#familyexpedition','#expedition','#overland','#truckbuild','#kids','#homeschool','#arocs','#southyorkshire'],
  'manual', 'family seed - hudson journal', '2026-05-13', 'approved'
);

-- 22. IG Medium — Sarah''s role in the build
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'family',
  'What Sarah Does (The Part That Doesn''t Get Filmed)',
  $$Medium IG post — Sarah$$,
  $$This is a one-man build. That''s not quite right.

Sarah does the part I can''t do. She manages the house, the Airbnb, the boys'' school, the finances, and the thousand small decisions that keep a family functioning while one of them is in a workshop all day.

She''s also training as a Pilates instructor. She''ll teach on the road — that''s the plan. So while I''m building a truck, she''s building a qualification.

She doesn''t want a lot of attention on this channel. That''s her choice and I respect it. But she needs to be named, because this doesn''t work without her.

The boys have two parents who are both moving toward something. That matters.

#rbtr #family #expedition #overland #truckbuild #partners$$,
  ARRAY['#rbtr','#family','#expedition','#overland','#truckbuild','#partners'],
  'manual', 'family seed - sarah role', '2026-05-13', 'approved'
);

-- 23. TikTok — Homeschool on the Pamir Highway
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'tiktok', 'short', 'family',
  'Homeschool at 4,655 Metres',
  $$TikTok — homeschool$$,
  $$The boys will be homeschooled on the road. Here''s what that actually looks like. #homeschool #familyexpedition #overland #rbtr #expedition$$,
  $$[Start with a map or globe — Pamir Highway highlighted]

People ask about the boys'' education.

Here''s the plan.

[Cut — Ben with a notebook or curriculum material]

Sarah leads it. She''s trained for it. It''s structured — not just "look at stuff and call it learning."

[Cut — B-roll of landscape, kids in outdoor setting]

Maths in the truck. Language from the countries we''re in. Geography from actually being there.

[Direct to camera]

Hudson will be 7 when we leave. He''ll be nearly 11 when we''re done.

Benson will be 6. He''ll be nearly 10.

[Beat]

Name me a classroom that gives you that education.

[Small smile]

Exactly.$$,
  ARRAY['#homeschool','#familyexpedition','#overland','#rbtr','#expedition'],
  'manual', 'family seed - homeschool tiktok', '2026-05-13', 'approved'
);

-- 24. YouTube Short — What I''m teaching my boys
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, voiceover, thumbnail_brief, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'short', 'family',
  'What I''m Teaching My Boys by Building This Truck',
  $$YT Short — what the boys learn$$,
  $$A truck build is 60 weeks of working in public. Ben explains what that teaches his sons — before they even leave home.$$,
  $$[Ben in workshop — boys'' drawings or photos visible in background]

Hudson asked me last week why I check every weld.

[Beat]

I said: because if you don''t check it, you can''t trust it.

[Working on something as he talks]

He went quiet for a second. Then he said: "Like when you say check your homework before you hand it in?"

Yeah. Exactly like that.

[Direct to camera]

I don''t know if I''m a good teacher. I''m not qualified for it.

But building this truck in front of them for 60 weeks — that''s a lesson in itself.

Turning up when it''s hard. Checking the work. Starting again when something''s wrong.

[Back to working]

They''re watching all of it.

That matters more to me than I''ve got words for.$$,
  $$Ben in workshop — child''s drawing visible on wall in background$$,
  'manual', 'family seed - what boys learn', '2026-05-13', 'approved'
);

-- 25. IG Carousel — The route overview
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'carousel', 'route',
  'The Route — 45 Countries, 45 Months',
  $$Carousel — route overview. Slides: 1. World map with full route. 2. Europe leg: Rotherham → Turkey (ferry crossing). 3. Turkey → Caucasus: Georgia, Armenia. 4. Central Asia: Kazakhstan, Uzbekistan, Tajikistan — Pamir Highway at 4,655m. 5. India/Nepal: Everest Base Camp helicopter option. 6. East Africa: Ethiopia, Kenya (Masai Mara migration), Uganda (gorilla trekking), Tanzania. 7. Southern Africa: Zambia, Zimbabwe, Botswana, South Africa → Cape Town. 8. SE Asia: overland or shipping leg. 9. Australia: Burleigh Heads, Gold Coast — friends Connie and Jake waiting. 10. The timeline: depart July 2027, return approximately April 2031.$$,
  $$45 countries. 45 months. One truck. Swipe for the full route. →

#rbtr #expedition #overland #route #familyexpedition #arocs #worldtrip #overlanding$$,
  ARRAY['#rbtr','#expedition','#overland','#route','#familyexpedition','#arocs','#worldtrip','#overlanding'],
  'manual', 'family seed - route carousel', '2026-05-13', 'approved'
);


-- ── WELLNESS / FORGE / SARAH J — 5 pieces ────────────────────────────────

-- 26. IG Long — Sarah''s Pilates journey
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'wellness',
  'Sarah''s Training (Her Chapter)',
  $$Long IG post — Sarah Pilates$$,
  $$Sarah is training as a Pilates instructor. This is her chapter, not mine — so I''ll keep it short and let her own it.

Here''s what I know.

She started because she wanted something that was hers. Not related to the boys. Not related to the truck or the expedition. Something that exists whether we''re in Yorkshire or we''re parked on a beach in Mozambique.

The plan: qualify before we leave. Teach on the road.

She already has four years of serious training — not as a teacher, just because she loves it. The instructor training is the next step.

On a trip like ours, mental and physical resilience isn''t optional. It''s the difference between a family that makes it to Australia and a family that turns around in Turkey.

Sarah''s sorted that part. I''m less sorted. Working on it.

#rbtr #pilates #wellness #familyexpedition #expedition #overland #pilatesinstructor$$,
  ARRAY['#rbtr','#pilates','#wellness','#familyexpedition','#expedition','#overland','#pilatesinstructor'],
  'manual', 'wellness seed - sarah pilates', '2026-05-13', 'approved'
);

-- 27. IG Medium — Built Dad programme
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'wellness',
  'Built Dad — Week 1',
  $$Medium IG post — Built Dad$$,
  $$Started the Built Dad 8-week programme with Nate Cook. Day 1.

Here''s the context. I''m 36. I''ve been fabricating for 20 years — so I''m not unfit, but I''m workshop-fit. Which means my shoulders work, but the rest of me has been neglected.

We leave for 45 months in July 2027. Before that, I need to be able to lift, carry, fix, climb, and keep going. Not in a gym. On the side of a road in Central Asia.

This programme isn''t about aesthetics. It''s about the expedition. Being capable of handling what''s coming.

Week 1: functional strength. 4 sessions. Working around the build schedule, not instead of it.

Nate''s approach: no nonsense. Specific to what a working man with a full schedule actually needs. Works for me.

Will update weekly.

#builtdad #wellness #expedition #overlanding #rbtr #fitness #truckbuild$$,
  ARRAY['#builtdad','#wellness','#expedition','#overlanding','#rbtr','#fitness','#truckbuild'],
  'manual', 'wellness seed - built dad week 1', '2026-05-13', 'approved'
);

-- 28. TikTok — Family fitness on the road
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, voiceover, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'tiktok', 'short', 'wellness',
  'How a Family Stays Fit on the Road for 45 Months',
  $$TikTok — family fitness$$,
  $$Sarah teaches Pilates. I''m on Built Dad. The boys just run everywhere. Here''s the fitness plan for 45 months on the road. #fitness #familyexpedition #overland #rbtr #wellness$$,
  $$[Start — Ben doing a set of something, workshop or outdoor]

People ask about fitness on a 45-month overland trip.

Here''s what we''ve got.

[Cut]

Sarah teaches Pilates. She''ll teach it on the road too — proper sessions, not just stretching.

[Cut]

I''m on Built Dad with Nate Cook. 8 weeks to build the foundation before the build gets too full-on.

[Cut — outside, boys running]

The boys just run everywhere they go. They''re fine.

[Direct to camera]

Here''s the thing about 45 months in a truck. You don''t have the option of being unfit. There''s too much physical work involved — fixing things, hiking to things, carrying things.

You have to arrive ready.

So we''re getting ready now.$$,
  ARRAY['#fitness','#familyexpedition','#overland','#rbtr','#wellness'],
  'manual', 'wellness seed - family fitness tiktok', '2026-05-13', 'approved'
);

-- 29. IG Short — Sarah''s Forge concept
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, caption, hashtags, source_signal, source_summary, week_date, status) VALUES (
  'instagram', 'post', 'wellness',
  'The Forge',
  $$Short IG post — Forge$$,
  $$Sarah is launching Forge — a wellness space in Barnsley. Pilates studio, strength work, community.

Different brand, different chapter. Her thing, not ours.

But it matters to the expedition: it''s what she builds while I build the truck.

More from her when she''s ready to share it.

#forge #pilates #barnsley #wellness$$,
  ARRAY['#forge','#pilates','#barnsley','#wellness'],
  'manual', 'wellness seed - forge mention', '2026-05-13', 'approved'
);

-- 30. YouTube Short — Why we''re both getting fit before departure
INSERT INTO rbtr_content_drafts (platform, content_type, vibe, title, body, description, voiceover, thumbnail_brief, source_signal, source_summary, week_date, status) VALUES (
  'youtube', 'short', 'wellness',
  'Getting Fit for 45 Months on the Road',
  $$YT Short — departure fitness$$,
  $$14 months before departure, Ben and Sarah both start dedicated fitness programmes. Here''s why the preparation starts now.$$,
  $$[Ben in workshop, not exercising — hands on the truck]

Fourteen months until we leave.

[Beat]

Most people assume the fitness prep happens close to departure. A few months out, maybe.

[Walking around the truck]

Here''s why we''re starting now.

The Arocs build is 60 weeks. Full weeks. Physical work. And at the end of it, I need to be fit enough to drive 45 countries over 45 months.

You don''t build that kind of baseline in a month.

[Direct to camera]

Sarah''s been training seriously for years. She''s ahead.

I''m less sorted. Four years of workshop work doesn''t do what four years of structured training does.

[Beat]

So I''m on Built Dad with Nate. 8 weeks to start. Then we see.

[Back to the truck]

The truck gets the mornings. The fitness gets the evenings.

That''s the plan.$$,
  $$Ben in workshop, hand on Arocs chassis — morning light, honest expression$$,
  'manual', 'wellness seed - departure fitness yt', '2026-05-13', 'approved'
);
