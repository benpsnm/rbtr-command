# RBTR Command Centre — Smoke Test

**Purpose:** run before AND after every module build. Catches the regressions before Ben does.

**How to run (fast):** open DevTools console on https://rbtr-jarvis.vercel.app, paste the contents of `scripts/smoke-test.js`. It navigates every section, logs console errors, and reports a pass/fail table. Takes ~60 seconds.

**How to run (manual):** go through each box below by hand. Slow, but catches visual regressions the automated test can't.

---

## Structural checks (run these first)

- [ ] Page loads, no `window.__jsErrors` entries
- [ ] Sidebar renders 12 group headers in correct order
- [ ] Every group expands on click; state persists in localStorage
- [ ] All 65 nav items have a matching `<section>` that becomes `active` when clicked
- [ ] Top-right countdown ticker updates every second
- [ ] Blue JARVIS/ROCKO orb pulses bottom-right; `Cmd+J` opens panel
- [ ] Voice settings UI opens from "voice" link in panel footer

---

## ASSISTANT · 7 items

- [ ] `today` Today — hero numbers render, mood log accepts input, Rotherham weather loads, House Jobs summary shows 104 total
- [ ] `goals` Goals & Wins — Today/Week/Month/Life/Wins tabs switch correctly
- [ ] `dojo` Learning Dojo — guitar + Turkish Day-1 cards render, streak counters visible, "Open lesson ↗" link is valid
- [ ] `bestself` Best-Self Protocol — morning ritual checkboxes toggle, evening reflection inputs work
- [ ] `signals` Live Signals — all 6 cards render (PSNM/Airbnb/eBay/Sponsors/Weather/News); weather card populates
- [ ] `registry` Tool Registry — 5 seeded tiles visible, "Add new tool" form accepts input
- [ ] `jarvischat` ROCKO Chat — full-page transcript + input render, mic button present, endpoint shows `/api/jarvis`

## COMMAND · 9 items

- [ ] `dashboard` Dashboard — overview metrics render
- [ ] `dailybrief` Daily Briefing — date + countdown populate
- [ ] `wins` Wins Tracker — wins list or empty state shows
- [ ] `countdown` Countdown — big departure number = 437 days on 20-Apr-2026
- [ ] `colab` Co-Lab Debt — target £200,000 shown
- [ ] `gates` The Three Gates — G1/G2/G3/G4 statuses (Open/Done)
- [ ] `moneymeeting` Money Meeting — renders without error
- [ ] `aminedecisions` Amine Framework — renders without error
- [ ] `contentoverride` Content Override — renders without error

## LIFE & WELLBEING · 5 items

- [ ] `routine` Daily Routine — renders without error
- [ ] `training` Training Plan — Built Dad programme visible
- [ ] `nutrition` Nutrition — plan / Olivia B notes render
- [ ] `relationship` Ben & Sarah — date-night log + notes render
- [ ] `mindset` Mindset & Mood — mood input accepts submissions

## LAUNCH · 3 items

- [ ] `firstvideo` First Video — script structure visible
- [ ] `channel` Channel Transition — YouTube rename plan visible
- [ ] `custemer-emails` Customer Emails — templates render

## EXPEDITION · 4 items

- [ ] `route` Route & Map — Leaflet map initialises with route points
- [ ] `build` Arocs Build — 60-week plan visible
- [ ] `gear` Camera Gear — gear list renders
- [ ] `skills` Skills Tracker — skills cards render

## BUSINESS · 10 items

- [ ] `finance` Cash Flow — tables render
- [ ] `budget` Budget Tracker — 6 BUDGET_CATS rows render (Truck Build, Camera Gear, House Reno, Reserve, Debt, Working Capital)
- [ ] `psnm` Pallet Storage — pallet calculator accepts input
- [ ] `eternal` Eternal Kustoms — renders without error
- [ ] `airbnb` AirBnB — renders without error
- [ ] `coffee` Coffee Brothers — status shows DONE (G2)
- [ ] `sponsors` Sponsors — 27-target pipeline visible
- [ ] `crm` Contacts CRM — contacts table renders
- [ ] `merch` Merch / Shop — renders without error
- [ ] `subscribers` Subscribers — renders without error

## CONTENT · 9 items

- [ ] `scheduler` Social Scheduler — renders, Zapier MCP routes accept calls
- [ ] `broll` B-Roll Extraction — renders
- [ ] `deploy` Go Live — renders
- [ ] `media` Media Vault — renders
- [ ] `social` Social Pages — renders
- [ ] `mediaplan` Media Plan — renders
- [ ] `podcast` Nate Podcasts — episode list visible
- [ ] `guests` Guest List — renders
- [ ] `editing` Editing Tools — renders

## EXPEDITION PREP · 6 items

- [ ] `predeparture` Pre-Departure Checklist — tabs switch
- [ ] `documents` Document Tracker — renders
- [ ] `visas` Visas & Documentation — country list renders
- [ ] `vaccines` Vaccinations — schedule renders
- [ ] `itinerary` Full Itinerary — all 100+ location rows render
- [ ] `livemap` Live Route Map — Leaflet map renders with truck marker

## PLANNING · 5 items

- [ ] `planner` Planner — daily/weekly/monthly/yearly tabs switch
- [ ] `calendar` Calendar — month grid renders, cycleDay works
- [ ] `house` **House Jobs** — 104 total · £18,580 remaining · 6 section tabs · WHO/STATUS filters · Top 5 list · Budget breakdown
- [ ] `tasks` Tasks — add task modal works
- [ ] `notes` Notes — add note modal works

## SARAH · 1 item

- [ ] `sarah` Sarah's Hub — 15-month timeline renders

## SETUP · 2 items

- [ ] `jobs` Job Roles — renders
- [ ] `settings` Settings — renders

## STR OPERATIONS · 10 items

- [ ] `str-s1` Listing Copy — renders
- [ ] `str-s2` Revenue Calculator — inputs accept values, output updates
- [ ] `str-s3` SOPs & Checklists — SOP tab nav works
- [ ] `str-s4` Social Generator — generate button calls /api/jarvis
- [ ] `str-s5` Review Management — renders
- [ ] `str-s6` Photography Guide — renders
- [ ] `str-s7` Costs & Valuation — renders
- [ ] `str-s8` Booking Calendar — month grid renders
- [ ] `str-s9` Suppliers — table renders, add-supplier row works
- [ ] `str-s10` Social Strategy — renders

---

## Data integrity (hard assertions)

- [ ] **Departure countdown** shows **437** days on 20 Apr 2026 (→ 1 Jul 2027)
- [ ] **Photoshoot countdown** shows **51** days (→ 10 Jun 2026)
- [ ] **Co-Lab Debt total** = £200,000
- [ ] **House Jobs total item count** = **104** · remaining spend £18,580–£29,830
- [ ] **Sarah's Hub** timeline = 15 months
- [ ] **Guitar curriculum** = 30 days · Day 1 topic = "Guitar posture + tuning"
- [ ] **Turkish curriculum** = 30 days · Day 1 greetings = "Merhaba"
- [ ] **BUDGET_CATS** total = £145,500 (45 + 12 + 28.5 + 30 + 20 + 10 k)

## API integrity

- [ ] `GET /api/weather` → 200, returns 7 route cities
- [ ] `POST /api/jarvis` → 200, `reply` contains "ROCKO" or "Ben"
- [ ] `POST /api/tts` → 200 with audio/mpeg if ELEVENLABS_API_KEY set, else 204
- [ ] `curriculum.js` served 200
- [ ] `house-jobs.js` served 200

## Data classification (audit)

Run in Supabase SQL editor: `SELECT classification, count(*) FROM jarvis_classification_overview GROUP BY 1;`

- [ ] No tables marked `UNCLASSIFIED`
- [ ] `AUTH` tables not readable via browser supabase-proxy (returns 403)
- [ ] `LEGAL_SENSITIVE` reads create a row in `jarvis_sensitive_access_log`
- [ ] Spot-check: ask ROCKO "How much of the Co-Lab debt is paid?" — he should give aggregated % only, never absolute pound figures
- [ ] **Evening reflection** form (`sec-bestself`) — picking a mood highlights the button, saving inserts a row into `evening_reflections`, status shows "✓ Synced"
- [ ] **Morning briefing** — clicking the 🌅 button on Today creates a row in `daily_briefs` (`delivery_status='generating'` → `'delivered'` once Rocko's reply lands, with `script_text`, `script_word_count`, `data_sources_used`)

## Browser compatibility

- [ ] Chrome/Edge: voice-in works (Web Speech API)
- [ ] Safari: falls back to text, no errors
- [ ] Mobile (375px): sidebar burger menu works, cards stack, orb visible
