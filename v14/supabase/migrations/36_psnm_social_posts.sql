-- Migration 36: PSNM social posts pipeline
-- Table for scheduling, tracking, and cross-posting social content

CREATE TABLE IF NOT EXISTS psnm_social_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for timestamptz NOT NULL,
  platform      text NOT NULL CHECK (platform IN ('linkedin','instagram','facebook','all')),
  content       text NOT NULL,
  hashtags      text,
  image_url     text,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted','failed','skipped')),
  posted_at     timestamptz,
  post_url      text,
  error_detail  text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psnm_social_posts_scheduled ON psnm_social_posts (scheduled_for, status);
CREATE INDEX IF NOT EXISTS psnm_social_posts_status    ON psnm_social_posts (status);

-- Enable RLS (reads allowed for authenticated portal users; writes via service_role only)
ALTER TABLE psnm_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portal read" ON psnm_social_posts FOR SELECT USING (true);
CREATE POLICY "service write" ON psnm_social_posts FOR ALL USING (auth.role() = 'service_role');

-- ── Seed: first 12 posts ──────────────────────────────────────────────────────
-- Mon/Wed/Fri 09:00 BST (08:00 UTC) starting 28 Apr 2026
-- Platform: linkedin primary; cross-post to instagram + facebook via social-poster

INSERT INTO psnm_social_posts (scheduled_for, platform, content, hashtags, status) VALUES

-- Week 1 (Apr 28 – May 1)
('2026-04-28T08:00:00Z', 'all',
'If you're running out of warehouse space, you don't need a new building. You need a flexible storage partner.

We run a 1,602-pallet racked facility at Hellaby Industrial Estate in Rotherham — 24/7 access, forklift handling included, no long-term tie-ins.

From 5 pallets upward. Weekly or monthly billing. Start this week.

📞 07506 255033 | 🌐 palletstoragenearme.co.uk',
'#PalletStorage #Rotherham #SouthYorkshire #Logistics #Warehousing #SmallBusiness',
'scheduled'),

('2026-04-30T08:00:00Z', 'all',
'Most of our customers come to us when their warehouse is full and they need overflow storage sorted fast.

We can usually onboard within 48 hours. No complicated contracts. No minimum lock-in beyond 4 weeks.

If you've got pallets stacking up and nowhere to put them — give us a call.

📦 Pallet Storage Near Me · Hellaby, Rotherham S66 8HR
📞 07506 255033',
'#OverflowStorage #PalletStorage #Rotherham #Warehousing #Logistics',
'scheduled'),

('2026-05-01T08:00:00Z', 'all',
'Forklift handling included in every storage quote.

We unload your deliveries, put them in your bay, and log every movement. You get a clear record of what came in and went out.

No hidden extras. No surprises on the invoice.

📞 07506 255033 | palletstoragenearme.co.uk',
'#PalletStorage #Forklift #Warehousing #Rotherham #SouthYorkshire',
'scheduled'),

-- Week 2 (May 4 – May 8)
('2026-05-04T08:00:00Z', 'all',
'We're based at Hellaby Industrial Estate, Rotherham — about 10 minutes from J1 of the M18 and 15 minutes from the M1/M62 interchange.

If you're moving goods across Yorkshire, the Humber, or the East Midlands, we're in a useful spot.

1,602 pallet spaces. Available now.

📞 07506 255033',
'#PalletStorage #Hellaby #Rotherham #Yorkshire #Logistics #M18',
'scheduled'),

('2026-05-06T08:00:00Z', 'all',
'What does a pallet storage contract actually look like?

Ours is straightforward:
✅ Weekly price per pallet based on quantity
✅ 4-week minimum, then rolling weekly
✅ 30-day notice after minimum term
✅ Goods-in and goods-out handling charged per movement
✅ Onboarding fee waived for 50+ pallets

No surprises. No legal maze.

Ask for a quote: 07506 255033',
'#PalletStorage #StorageContract #Warehousing #Rotherham #SouthYorkshire',
'scheduled'),

('2026-05-08T08:00:00Z', 'all',
'Small businesses often assume pallet storage is only for big distribution operations.

It isn't.

We store from 5 pallets upward. If you've got 10 pallets of stock that are living in your van, your garage, or your MD's house — we can fix that.

Proper racked storage. 24/7 access for your drivers. Insured site.

📞 07506 255033',
'#SmallBusiness #PalletStorage #StockStorage #Rotherham #Yorkshire',
'scheduled'),

-- Week 3 (May 11 – May 15)
('2026-05-11T08:00:00Z', 'all',
'We often get asked: can we come and see the facility first?

Yes. Always. Book a site visit — 30 minutes, no sales pitch, just look around.

Hellaby Industrial Estate, Rotherham S66 8HR.

📞 07506 255033 to arrange.',
'#PalletStorage #SiteVisit #Warehousing #Rotherham #SouthYorkshire',
'scheduled'),

('2026-05-13T08:00:00Z', 'all',
'Racked storage vs floor storage — what's the difference for your goods?

🏗 Racked: each pallet has its own bay, accessible by forklift without moving others. Faster goods-in/out. Better for high-turnover stock.

📦 Floor: pallets stacked in rows. Cheaper per pallet. Better for slow-moving or bulk stock.

We offer both. Quote is based on your actual requirements.

📞 07506 255033',
'#PalletStorage #RackedStorage #Warehousing #Logistics #Rotherham',
'scheduled'),

('2026-05-15T08:00:00Z', 'all',
'Pricing transparency matters.

We don't give vague "call for a quote" answers. Our rates are:

• 1–49 pallets: £3.95/pallet/week
• 50–149 pallets: £3.45/pallet/week
• 150+ pallets: £2.95/pallet/week

Handling: £3.50 per movement in or out.

Get an instant online quote: palletstoragenearme.co.uk/quote',
'#PalletStorage #Pricing #Warehousing #Rotherham #SouthYorkshire',
'scheduled'),

-- Week 4 (May 18 – May 22)
('2026-05-18T08:00:00Z', 'all',
'If you use a 3PL and your volumes have grown, you might be paying for more than you need.

A direct storage arrangement — where you pay per pallet per week, not per pick or per case — can be significantly cheaper for stable inventory.

Worth a comparison: 07506 255033',
'#PalletStorage #3PL #Warehousing #CostReduction #Logistics #SouthYorkshire',
'scheduled'),

('2026-05-20T08:00:00Z', 'all',
'Seasonal overflow happens to most businesses.

Christmas stock, summer promotion inventory, end-of-line clearance — whatever the reason, if you need temporary space for 4 weeks to 6 months, we can accommodate you.

No commitment beyond your agreed term.

📞 07506 255033 | Hellaby, Rotherham S66 8HR',
'#SeasonalStorage #PalletStorage #OverflowStorage #Rotherham #Yorkshire',
'scheduled'),

('2026-05-22T08:00:00Z', 'all',
'We're not a national 3PL. We're one site, run by one person, focused on getting South Yorkshire businesses sorted with pallet storage.

That means you can reach us directly, get decisions fast, and not get lost in a call centre.

If you've had frustrating experiences with larger storage operators, we're the alternative.

📞 07506 255033',
'#PalletStorage #LocalBusiness #SouthYorkshire #Rotherham #SME #Warehousing',
'scheduled');
