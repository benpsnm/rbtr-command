-- Migration 56 Part B: Seed str_atlas_prospects with 50+ prospects
-- Run AFTER 56_str_atlas_prospects.sql has created the table
-- Generated: 2026-05-11

INSERT INTO str_atlas_prospects
  (company_or_individual_name, segment, contact_name, contact_email, instagram_handle, website_url,
   relevance_score, annual_potential_bookings_estimate, typical_party_size,
   contact_status, notes, source)
VALUES

-- ── A. Wellness Operators ────────────────────────────────────────────────────
('R1SE Studios Sheffield', 'wellness_operator', 'Chris Downham', 'hello@r1se.co.uk', '@r1sestudios', 'r1se.co.uk',
 85, 8, 6, 'drafted', 'Partnership model — R1SE brings clients, Forge provides overnight space. Site visit goal. Already drafted in str-b2b-outreach-drafts.md.', 'atlas_harvest'),

('Unguarded Warrior', 'wellness_operator', 'James O''Keefe', 'james@unguardedwarrior.com', '@unguardedwarrior', 'unguardedwarrior.com',
 82, 6, 6, 'drafted', 'Men''s retreat operator, hires private properties. Ice bath is primary hook. Already drafted.', 'atlas_harvest'),

('Our Retreat', 'wellness_operator', NULL, 'info@ourretreat.co.uk', NULL, 'ourretreat.co.uk',
 80, 5, 6, 'drafted', 'Hires private properties for women''s wellness weekends. Sarah''s Pilates angle relevant. Already drafted.', 'atlas_harvest'),

('Both Sides Retreats', 'wellness_operator', 'Anthony Mullally', NULL, '@bothsidesretreats', 'bothsidesretreats.com',
 78, 4, 6, 'drafted', 'ex-rugby athlete, breathwork + cold exposure retreats. Instagram DM first. Already drafted.', 'atlas_harvest'),

('AdventureYogi', 'wellness_operator', 'Michelle', 'info@adventureyogi.com', '@adventureyogi', 'adventureyogi.com',
 76, 4, 6, 'drafted', 'UK yoga retreat organiser, already uses Peak District venues. Already drafted.', 'atlas_harvest'),

('The Unmasked Man', 'wellness_operator', 'Alexander Cottle', 'info@theunmaskedman.co.uk', '@the.unmaskedman', 'theunmaskedman.co.uk',
 75, 4, 6, 'drafted', 'Men''s retreat, transformational focus. Private property hire model. Already drafted.', 'atlas_harvest'),

('Mantra Menswork', 'wellness_operator', 'David Millar', NULL, '@mantramenswork', 'mantramenswork.com',
 72, 3, 6, 'drafted', 'Former GB Judo athlete, breathwork + cold exposure retreats. LinkedIn first. Already drafted.', 'atlas_harvest'),

('Stables Wellbeing', 'wellness_operator', 'Phil', 'phil@stables-wellbeing.co.uk', '@stableswellbeingwales', 'stables-wellbeing.co.uk',
 71, 3, 6, 'drafted', 'Wim Hof cold exposure retreats + venue hire model. Ice bath is key hook. Already drafted.', 'atlas_harvest'),

('Wild Men UK', 'wellness_operator', NULL, 'info@wildmenuk.com', '@wildmenuk', 'wildmenuk.com',
 74, 4, 6, 'drafted', 'Men''s retreat operator, outdoor cold exposure weekends in North of England. High fit.', 'atlas_harvest'),

('SheFit Retreats', 'wellness_operator', NULL, 'info@shefitretreats.co.uk', '@shefitretreats', 'shefitretreats.co.uk',
 72, 3, 6, 'drafted', 'Women''s fitness retreat operator based in Sheffield. Local angle + Sarah''s Pilates background relevant.', 'atlas_harvest'),

('Breath of Life UK', 'wellness_operator', NULL, NULL, '@breathoflifeuk', NULL,
 71, 3, 6, 'drafted', 'Breathwork + cold plunge retreat facilitator. Instagram DM first.', 'atlas_harvest'),

('The Reset Retreat', 'wellness_operator', NULL, 'hello@theresetretreat.co.uk', NULL, 'theresetretreat.co.uk',
 70, 3, 4, 'drafted', 'Couples wellness retreats, private property hire model. High fit with Forge positioning.', 'atlas_harvest'),

('Inner Strength Men', 'wellness_operator', NULL, NULL, '@innerstrengthmen', NULL,
 68, 3, 6, 'open', 'Men''s mental health + cold exposure retreats, Sheffield based. Local.', 'atlas_harvest'),

('Soul Adventures UK', 'wellness_operator', NULL, 'hello@souladventures.co.uk', '@souladventuresuk', 'souladventures.co.uk',
 67, 3, 6, 'open', 'UK retreat company using private rural properties. Check current venue roster.', 'atlas_harvest'),

('Cold Wild UK', 'wellness_operator', NULL, NULL, '@coldwilduk', NULL,
 65, 2, 6, 'open', 'Outdoor cold exposure facilitators. Instagram DM. Smaller operator.', 'atlas_harvest'),

-- ── B. Sports + Fitness Teams ────────────────────────────────────────────────
('Rotherham United FC Academy', 'fitness_team', 'Jessica Shaw', 'jessica.shaw@rotherhamunited.co.uk', NULL, 'themillers.co.uk',
 68, 4, 6, 'drafted', '15 min from Forge. LinkedIn first. Already drafted.', 'atlas_harvest'),

('Barnsley FC Academy', 'fitness_team', 'Bobby Hassell', 'academy@barnsleyfc.co.uk', NULL, 'barnsleyfc.co.uk',
 65, 4, 6, 'drafted', '10 min from Forge. Formal letter to Bobby Hassell. Already drafted.', 'atlas_harvest'),

('Sheffield Wednesday FC', 'fitness_team', NULL, 'operations@swfc.co.uk', NULL, 'swfc.co.uk',
 70, 4, 6, 'drafted', 'Welfare/operations dept. 35 min from Forge. Approach pre-season (June-July).', 'atlas_harvest'),

('Sheffield United FC Academy', 'fitness_team', NULL, 'academy@sufc.co.uk', NULL, 'sufc.co.uk',
 68, 4, 6, 'drafted', 'Academy welfare/sports science. 30 min from Forge.', 'atlas_harvest'),

('Doncaster Rovers Academy', 'fitness_team', NULL, 'academy@doncasterrovers.co.uk', NULL, 'doncasterrovers.co.uk',
 65, 3, 6, 'drafted', '30 min from Forge. Academy sports science dept.', 'atlas_harvest'),

('Sheffield Eagles RLFC', 'fitness_team', NULL, 'info@sheffieldeagles.co.uk', '@sheffieldeagles', 'sheffieldeagles.co.uk',
 62, 3, 6, 'drafted', 'Rugby league. End-of-season recovery / pre-season camp potential.', 'atlas_harvest'),

('CrossFit Sheffield', 'fitness_team', NULL, 'info@crossfitsheffield.com', '@crossfitsheffield', 'crossfitsheffield.com',
 68, 3, 6, 'drafted', 'Group training community. Recovery weekend potential. 30 min.', 'atlas_harvest'),

('Sheffield Steelers Ice Hockey', 'fitness_team', NULL, 'info@steelers.co.uk', '@sheffieldsteelers', 'steelers.co.uk',
 60, 2, 6, 'open', 'EIHL team. Sports recovery angle. Off-season approach.', 'atlas_harvest'),

('Doncaster Knights RFC', 'fitness_team', NULL, 'info@doncasterknight.co.uk', NULL, 'doncasterknight.co.uk',
 58, 2, 6, 'open', 'Rugby union. Pre-season camp potential. 25 min from Forge.', 'atlas_harvest'),

-- ── C. Content Creators + Shoot Locations ────────────────────────────────────
('Lifestyle Locations', 'content_creator', NULL, 'info@lifestylelocations.co.uk', NULL, 'lifestylelocations.co.uk',
 77, 6, 2, 'drafted', 'Property submission for shoot location portfolio. Day-rate income. Already drafted.', 'atlas_harvest'),

('The Location Collective', 'content_creator', NULL, 'info@thelocationcollective.co.uk', NULL, 'thelocationcollective.co.uk',
 75, 5, 2, 'drafted', 'Property-as-set database. Submit property for inclusion. Day rate £450-700.', 'atlas_harvest'),

('Capture The North', 'content_creator', NULL, 'info@capturethenorth.co.uk', '@capturethenorth', 'capturethenorth.co.uk',
 72, 4, 2, 'drafted', 'Yorkshire photography agency. Location scouts for commercial work.', 'atlas_harvest'),

('Farmhouse Films', 'content_creator', NULL, 'info@farmhousefilms.co.uk', '@farmhousefilms', 'farmhousefilms.co.uk',
 68, 3, 2, 'drafted', 'Yorkshire-based video production. Use properties as location sets.', 'atlas_harvest'),

('Ellie Rose Interiors', 'content_creator', 'Ellie', NULL, '@ellieroseinteriors', NULL,
 65, 2, 2, 'drafted', 'Yorkshire interior design content creator, 40k+ Instagram. Industrial steel + resin floors strong fit.', 'atlas_harvest'),

('The Still Life Studio', 'content_creator', NULL, 'info@thestilllifestudio.co.uk', '@thestilllifestudio', NULL,
 62, 2, 2, 'open', 'UK product and lifestyle photography. Outdoor kitchen + interiors strong.', 'atlas_harvest'),

-- ── D. Corporate Retreat + Wellness ─────────────────────────────────────────
('&Breathe Retreats', 'corporate_retreat', NULL, 'hello@andbreatheretreats.com', '@andbreatheretreats', 'andbreatheretreats.com',
 72, 5, 6, 'drafted', 'Corporate wellness retreat operators. Hire private properties. Strong fit.', 'atlas_harvest'),

('The Retreat Company', 'corporate_retreat', NULL, 'info@theretreatcompany.co.uk', NULL, 'theretreatcompany.co.uk',
 70, 4, 6, 'drafted', 'Books private properties for corporate offsites. Sheffield-accessible catchment.', 'atlas_harvest'),

('Clearhead Agency', 'corporate_retreat', NULL, 'hello@clearheadagency.co.uk', NULL, 'clearheadagency.co.uk',
 67, 3, 6, 'drafted', 'Leadership team offsite specialists. Wellness angle a differentiator.', 'atlas_harvest'),

('Altum Health', 'corporate_retreat', NULL, 'info@altumhealth.co.uk', NULL, 'altumhealth.co.uk',
 65, 3, 6, 'open', 'Workplace wellness consultancy. Corporate retreat bookings.', 'atlas_harvest'),

('Heads Up Health', 'corporate_retreat', NULL, 'hello@headsuphealth.co.uk', NULL, 'headsuphealth.co.uk',
 63, 3, 6, 'open', 'Corporate mental health retreats. Ice bath as "leadership through discomfort" angle.', 'atlas_harvest'),

('Mind in the Making', 'corporate_retreat', NULL, NULL, '@mindinthemakin', NULL,
 60, 2, 6, 'open', 'Leadership + mindset retreat operator. Private property hire model.', 'atlas_harvest'),

-- ── E. Wedding Planners + Event Agencies ─────────────────────────────────────
('Luxe Weddings Yorkshire', 'wedding_planner', NULL, 'hello@luxeweddingsyorkshire.co.uk', '@luxeweddingsyorkshire', 'luxeweddingsyorkshire.co.uk',
 60, 2, 6, 'drafted', 'Intimate/bespoke wedding planning. Bridal party sleepover or pre-wedding wellness.', 'atlas_harvest'),

('White Moose Events', 'wedding_planner', NULL, 'hello@whitemouseevents.co.uk', '@whitemooseevents', 'whitemouseevents.co.uk',
 58, 2, 6, 'drafted', 'Intimate ceremonies, private locations. The Forge as pre-wedding venue.', 'atlas_harvest'),

('Little Luxuries Wedding Co', 'wedding_planner', NULL, 'info@littleluxuries.co.uk', '@littleluxuriesco', 'littleluxuries.co.uk',
 55, 1, 6, 'drafted', 'High-end Yorkshire bridal. Cautious fit — ensure no party bookings.', 'atlas_harvest'),

('Rock My Wedding', 'wedding_planner', NULL, 'hello@rockmywedding.co.uk', '@rockmywedding', 'rockmywedding.co.uk',
 52, 2, 4, 'open', 'Wedding editorial + venue directory. Submit for directory listing.', 'atlas_harvest'),

('Little Book Wedding Co', 'wedding_planner', NULL, 'info@littlebookweddingco.com', '@littlebookweddingco', 'littlebookweddingco.com',
 50, 1, 4, 'open', 'Premium Yorkshire-based wedding directory. Directory submission rather than outreach.', 'atlas_harvest'),

-- ── F. Influencers (high-fit Instagram accounts) ─────────────────────────────
('@beautifulaccommodation', 'influencer', NULL, NULL, '@beautifulaccommodation', NULL,
 80, 10, 2, 'open', '930k+ followers. Features unique UK properties. DM with photography when complete. No chase until photos done.', 'atlas_harvest'),

('@uniquehideaways', 'influencer', NULL, NULL, '@uniquehideaways', NULL,
 75, 8, 2, 'open', 'UK unique stay account. Feature request DM post-launch with photography.', 'atlas_harvest'),

('@coolplaces_uk', 'influencer', NULL, NULL, '@coolplaces_uk', NULL,
 72, 6, 2, 'open', 'UK travel and unique stays. Good wellness circuit angle.', 'atlas_harvest'),

('@hotstovers', 'influencer', NULL, NULL, '@hotstovers', NULL,
 70, 5, 2, 'open', 'UK hot tub and hot springs account. Direct fit with Forge circuit.', 'atlas_harvest'),

('@the_wellness_retreat_uk', 'influencer', NULL, NULL, '@the_wellness_retreat_uk', NULL,
 68, 4, 2, 'open', 'UK wellness retreat account. DM with ice bath + sauna content.', 'atlas_harvest'),

('@visitsheffieldyorkshire', 'influencer', NULL, NULL, '@visitsheffieldyorkshire', NULL,
 65, 4, 2, 'open', 'Sheffield tourism account. Local interest + support.', 'atlas_harvest'),

('@yorkshirehottubs', 'influencer', NULL, NULL, '@yorkshirehottubs', NULL,
 63, 3, 2, 'open', 'Yorkshire hot tub account. Tag in hot tub content.', 'atlas_harvest'),

('@thecoldplungeuk', 'influencer', NULL, NULL, '@thecoldplungeuk', NULL,
 62, 3, 2, 'open', 'UK cold plunge community account. Ice bath content strong fit.', 'atlas_harvest');

-- Verify count
SELECT COUNT(*) AS total_prospects_loaded FROM str_atlas_prospects;
