# RBTR COMMAND CENTRE — PHASE 1.6 COMPLETE
## MASTER BUILD PROMPT — THURSDAY 23 APRIL 2026, 22:00
### This is the ONLY document to paste. Six chunks. Sequential. Do not skip.

---

# PREAMBLE — READ FIRST, DO NOT SKIP

You are Claude Code. You are resuming work on Ben Greenwood's RBTR Command Centre — the operational hub for a five-entity life (PSNM pallet storage, RBTR expedition brand, Eternal Kustoms consultancy, House AirBnB, personal finances) built toward a 1 July 2027 expedition departure.

**The current state is verified healthy:**
- Production URL: `https://rbtr-jarvis.vercel.app`
- Current tag: `v3.4-portal-interiors-complete`
- Current HEAD: `8b93519`
- Project path: `/Users/bengreenwood/Desktop/rbtr-command/`
- Seven portals scaffolded: Ben, PSNM, RBTR, Eternal, House, Sarah, Financials
- PSNM 11/17 sections inline + Financials 12/12 inline (done properly)
- Ben 2/26, RBTR 2/33, House 5/10, Sarah 4/11, Eternal 4/7 (scaffolded with iframes to legacy at `/`)
- Legacy 72-section HTML preserved at `/` as reference only
- Supabase: 17 migrations applied, project `rbtr-command`
- Auth working: Ben (8 portals), Sarah (3 portals: Sarah, House, Financials)
- API endpoints live: `/api/supabase-proxy`, `/api/jarvis`, `/api/extract-leads`, `/api/morning-brief`

**What you are building tonight:**
The complete Phase 1.6 — finish every portal inline, build the full Atlas priority engine, ship a proper Contacts CRM, seed SOPs across four portals, wire push notifications, fix weather, and deploy as `v3.5-system-complete`.

You have approximately 16 hours of work ahead (roughly 10pm Thursday to 2pm Friday). You will be running on **Sonnet 4.6**, not Opus, because Ben's Opus weekly limit is exhausted. Sonnet is sufficient for this work — the architecture is decided, the patterns are established, this is execution.

---

# RULES OF ENGAGEMENT — NON-NEGOTIABLE

1. **Work on branch `phase-1-6-complete`** — branched off `main` which is currently at `v3.4-portal-interiors-complete`. Never commit to main directly.

2. **Model:** first thing you do is `/model` → select `claude-sonnet-4-6`. Opus weekly limit hit; do not fight it.

3. **Accept Edits mode** must stay on throughout the session. Ben confirmed it's on at session start. If it turns off, re-enable with Shift+Tab.

4. **Six chunks.** Pasted sequentially by Ben. After completing each chunk, respond with exactly `READY FOR NEXT CHUNK` on its own line (plus any critical blockers on the line before). Do not proceed until Ben pastes the next chunk. This gives Ben the chance to stop if he sees drift.

5. **Zero iframes** in any portal by end of session. Every section that a portal claims to show must be inlined as real, live, data-bound UI inside that portal's HTML. The legacy `/` is reference material and must stop being the runtime source.

6. **Preserve what works.** PSNM's 11 inline sections and Financials' 12 inline sections are already proper — do not rewrite them unless a section listed below explicitly modifies them.

7. **Design system compliance.** Use the established CSS variables from `/css/design-system.css` (or whichever path the existing system lives at). Never invent new colours, fonts, or spacing values. If unsure, view an existing working section first.

8. **Data integrity.** Every new feature that persists data must use Supabase through `/api/supabase-proxy`. Never call Supabase directly from the client. Never commit API keys. All migrations go in `/supabase/migrations/` numbered sequentially from 31 upward.

9. **Mobile first.** Ben uses this from his iPhone in the warehouse at least 60% of the time. Every new section must be tested at 375px viewport before being considered complete. Bottom nav bar must always reach.

10. **Voice and tone.** Copy anywhere in the UI follows Ben's voice: direct, British, no corporate jargon, no "leverage" or "synergy", honest about stakes. If a label could appear in a LinkedIn influencer post, rewrite it.

11. **Commit cadence.** Commit at the end of each workstream (A, B, C, D, E) with a clear message. Do not squash. Ben may need to roll back to a mid-session state if something goes wrong.

12. **Do not push to GitHub.** Ben hasn't finalised his PAT setup — commits stay local. Push happens manually after Ben reviews Friday morning.

13. **Escalate blockers immediately.** If a chunk's instruction is ambiguous, if a dependency is missing, if a migration fails — stop, write the blocker in plain English, wait. Do not guess on Ben's business logic.

14. **The PSNM survival gate takes priority.** Ben has 14 days to May rent with £0 PSNM cash and £6 personal. If Workstream B (Atlas) is running over, cut Workstream D (SOPs) before cutting Atlas. Priority order: A > B > E > C > D.

15. **At the very end, before tagging:** run a smoke test. Visit production URL, log in as Ben, click through every portal, click every top-level section. Zero console errors. Zero broken iframes. Zero loading spinners stuck. Only then tag `v3.5-system-complete`.

---

# CHUNK 1 — SETUP AND BRANCH (paste this now)

Your first actions, in order:

1. Navigate to project:
```
cd /Users/bengreenwood/Desktop/rbtr-command/
```

2. Verify current state:
```
git status
git log --oneline -5
git describe --tags
```
Confirm HEAD is at or near `8b93519` and tag `v3.4-portal-interiors-complete` is present. If not, STOP and tell Ben.

3. Switch model to Sonnet:
```
/model
```
Select `claude-sonnet-4-6`.

4. Create the working branch:
```
git checkout main
git pull --ff-only
git checkout -b phase-1-6-complete
```

5. Verify Supabase connection by reading `.env.local` and confirming `NEXT_PUBLIC_SUPABASE_URL` points to project `rbtr-command`.

6. List the current migrations:
```
ls -la supabase/migrations/
```
Confirm the highest number is 31 (the psnm_quotes migration). You will add 32, 33, 34, 35 in later chunks.

7. Read the following files so you have them in working context:
   - `/pages/index.html` or wherever the legacy 72-section file lives — reference only
   - `/pages/psnm.html` — the gold-standard inline pattern
   - `/pages/financials.html` — the other gold-standard
   - `/css/design-system.css`
   - `/js/supabase-proxy.js` or equivalent client wrapper
   - `/pages/ben.html`, `/rbtr.html`, `/eternal.html`, `/house.html`, `/sarah.html` — the scaffolded portals you are about to finish

8. Confirm the 6-chunk plan:
   - CHUNK 2 (Workstream A, ~5h): Inline every remaining section into Ben, RBTR, Eternal, House, Sarah portals. Zero iframes when done.
   - CHUNK 3 (Workstream B, ~4h): Atlas priority engine + tiered target system + email templates library + touch sequencing + performance dashboard inside PSNM portal.
   - CHUNK 4 (Workstreams C + D, ~5h): Contacts CRM (migration 33) across PSNM/Ben/House/Eternal + SOPs library (migration 34) across PSNM/House/Eternal/Ben with seeded content.
   - CHUNK 5 (Workstream E, ~2h): Morning brief verification + 5 push notification types via Telegram + in-portal notification drawer (migration 35) + weather endpoint fix + evening debrief.
   - CHUNK 6 (Workstream F, ~30min): Deploy preview → smoke tests on production URL → merge to main locally → tag `v3.5-system-complete`.

Reply with `READY FOR NEXT CHUNK` when setup is complete, or a blocker description if anything is off.

---
# CHUNK 2 — WORKSTREAM A: FINISH EVERY PORTAL INLINE (paste when Chunk 1 returns READY)

## GOAL

Every portal renders its sections inline from this portal's own HTML + data. Zero iframes anywhere. Legacy `/` becomes reference-only, no longer runtime-critical.

## RULES FOR THIS WORKSTREAM

- **Never copy/paste raw innerHTML from legacy.** Read the legacy section to understand intent, then build a clean inline version using the design system.
- **Preserve data contracts.** If a legacy section reads/writes a Supabase table, the inlined version uses the same table (unless this document says to migrate).
- **Consolidation is mandatory where listed.** Don't inline 11 content sections into RBTR if the plan says "consolidate to 4". Use tabs.
- **Kill the deadwood.** Sections marked DELETE below do not get inlined anywhere. Remove from any nav.

## GLOBAL REORGANISATIONS (do these first, once, across all portals)

### Sections to DELETE entirely
- `sec-signals` — redundant, every portal has its own live signals strip now
- `sec-deploy` — meta-documentation, not daily-use. Move contents to `/docs/DEPLOYMENT.md` in the repo, remove from portal nav
- `sec-wins` — duplicates the Wins Wall tab inside `sec-goals`
- `sec-resurrection` — empty shell (1KB, 0 buttons). Legacy cruft. Delete.
- `sec-legalstructure` — empty (0KB). Delete.

### Sections to RENAME
- `sec-custemer-emails` → `sec-audience-emails` (typo fix + clarify it's for RBTR audience, not PSNM customers)
- `sec-aminedecisions` → `sec-delegation-framework` (Amine is gone; repurpose the framework for future team members, add a one-line banner: "Historical reference — repurpose when hiring next team member")

### Sections to MERGE
- `sec-route` + `sec-route-full` + `sec-livemap` → one section with three tabs: `Overview / Shipping / Live Map`. Keep `sec-itinerary` and `sec-visas` and `sec-vaccines` as siblings (they're genuinely different data).
- `sec-firstvideo` + `sec-channel` + `sec-mediaplan` → `sec-content-strategy` with tabs: `Strategy / First Video / Channel Plan`
- `sec-scheduler` + `sec-resurrection` content + `sec-contentoverride` → `sec-content-publishing` with tabs: `Scheduler / Account Resurrection / Perfectionism Override`. (Resurrection content survives here even though `sec-resurrection` empty shell is deleted)
- `sec-media` + `sec-broll` + `sec-editing` → `sec-content-production` with tabs: `Media Vault / B-Roll Extraction / Editing Tools`
- `sec-audience` + `sec-guests` + `sec-subscribers` → `sec-community` with tabs: `Audience / Guests / Subscribers`
- `sec-routine` + `sec-training` + `sec-nutrition` + `sec-sleep` + `sec-dojo` + `sec-bestself` → `sec-wellness` with tabs: `Routine / Training / Nutrition / Sleep / Dojo / Best Self`

---

## BEN PORTAL — FULL INLINE BUILD

Ben has 8 portals in his sidebar (Ben, PSNM, RBTR, Eternal, House, Sarah, Financials, Settings). The Ben portal is his personal command. Sections below are what should be in the Ben portal sidebar:

### Ben Portal — Sidebar Groups

**Group: Dashboard**
- `sec-today` — Today's Brief (already in legacy at 10KB, 26 buttons, 6 inputs — inline it properly with: days to departure counter, days to photoshoot counter, Built Dad Day X of 56, weather (fix broken endpoint in Chunk 5), Top 3 Focus editable, Daily Habits checklist, Mood 1-10 slider, Energy 1-10 slider, Sleep hours input)
- `sec-goals` — Tiered tracker with tabs `Today / Week / Month / Life / RBTR / Wins Wall`. Persist to Supabase `ben_goals` table (create migration if not exists).
- `sec-dailybrief` — Proper debrief view showing Today + Yesterday + Weekly rollup

**Group: Wellness (merged)**
- `sec-wellness` — tabs: Routine / Training / Nutrition / Sleep / Dojo / Best Self. Each tab pulls from what legacy had.

**Group: Work**
- `sec-tasks` — Bare in legacy. Make it genuinely better than iPhone Reminders:
  - Tasks auto-created from Atlas decisions (Chunk 3 wires this)
  - Tasks auto-created from ROCKO conversations (Chunk 5)
  - Filter by portal (PSNM tasks, House tasks, etc)
  - Today / This Week / Someday views
  - One-tap add from any portal's quick-add button
- `sec-notes` — Voice-recorded notes (records to Supabase storage, transcribes when OpenAI key added). For now: text notes with tags. Searchable.
- `sec-calendar` — Google Calendar embed + event creator (uses existing Google Calendar MCP if available)
- `sec-planner` — Week-view planner showing: Ben's tasks, Sarah's plans, kids' events, key deadlines across all entities. Read-only aggregator.

**Group: Growth**
- `sec-mindset` — "When it gets hard — read this" content
- `sec-relationship` — Conversation topics for the hard moments. Add: date-nights logged (simple log), last-tough-conversation-date, next scheduled check-in
- `sec-registry` — Tool registry (already 3KB inline, keep)

**Group: Legal & Debt** (NEW GROUP — this is Ben's personal legal exposure)
- `sec-colab` — Co-Lab debt tracker (moved FROM wherever it currently sits). Shows:
  - JMW letter status and date
  - Last communication in/out
  - Next action + date
  - Key documents (links to storage)
  - Aylett claim amount, current position
  - Running total paid to creditors
- `sec-dro-progress` — NEW. DRO/StepChange status tracker:
  - Application stage (not-started / in-progress / submitted / approved / denied)
  - Debt Line consultation dates and notes
  - Total debts in scope
  - Next action + date
- `sec-nate-log` — NEW. Mentor conversations log:
  - Date, topic, key insights, actions agreed
  - Next conversation scheduled
  - Running list of Nate's "big calls" (advice that proved right)

**Group: Family** (NEW GROUP)
- `sec-sons` — NEW. Hudson (born 15 Sep) + Benson (born 6 Jul) tracker:
  - Current ages shown live (years, months)
  - School/nursery name + contact
  - GP + dentist + vaccines with dates
  - Milestones log (first steps, first word, first school day)
  - Photo upload grid (Supabase storage)
  - School term dates, upcoming events
- `sec-peanut` — NEW. Dog tracker (critical because dog is coming on expedition):
  - Breed, DOB, weight history
  - Vet contact
  - Vaccines log with next-due dates
  - Pet passport status (critical for 1 July 2027 departure)
  - Insurance
  - Food brand/schedule
  - Walk routine
- `sec-family-health` — NEW. Family health aggregator:
  - Sarah's Pilates qualification progress
  - Ben's mood/energy 30-day trend (pulled from sec-today logs)
  - Sons' upcoming appointments
  - Peanut's upcoming appointments

**Group: Content (personal)**
- `sec-skills` — Skills tracker (already 4KB, keep)
- `sec-voicestudio` — Voice library (keep, 4KB)
- `sec-jarvischat` — ROCKO chat interface (keep, works)

**Sections removed from Ben portal:**
- `sec-signals` (DELETE globally)
- `sec-wins` (DELETE globally)
- `sec-deploy` (moved to repo /docs)

### Ben Portal Data Contracts

New Supabase tables required (put in migration `32_ben_portal_tables.sql`):
```
ben_goals (tier text, content text, due_date date, status text, completed_at timestamptz)
ben_mood_log (date date unique, mood int, energy int, sleep_hours numeric, notes text)
ben_notes (id uuid, content text, tags text[], created_at timestamptz, updated_at timestamptz)
ben_nate_conversations (id, date, topic, insights text, actions_agreed text, next_scheduled date)
ben_colab_events (id, date, event_type, description, document_url text, amount numeric)
ben_dro_status (id, stage text, consultation_date date, notes text, updated_at)
ben_tasks (id, title, portal text, priority int, due_date date, status text, source text, created_at)
family_sons (id, name text, dob date, school text, gp_contact text, milestones jsonb)
family_sons_events (id, son_id, event_type, date, notes, next_due_date)
family_peanut (key text primary key, value jsonb)  -- single-row config table
family_peanut_events (id, event_type, date, notes, next_due_date)
```

---

## RBTR PORTAL — FULL INLINE BUILD

RBTR is the expedition brand. Sections below go in the RBTR portal sidebar:

### RBTR Portal — Sidebar Groups

**Group: Mission Control**
- `sec-countdown` — Keep. Milestones.
- `sec-gates` — The Three Gates (Van / Coffee Brothers bike / T6.1 sale). Keep 9KB inline version, verify data persists.
- `sec-predeparture` — 97-item checklist. Keep. Ensure it persists to Supabase (migration if needed).

**Group: Route**
- `sec-route` — MERGED section with tabs Overview / Shipping / Live Map (see global reorg above). Keep all 7 phases data. Pulls from `rbtr_route_phases` table — if it doesn't exist create it as part of migration 32.
- `sec-itinerary` — 45-country itinerary with book-via, daily costs. Keep 21KB inline.
- `sec-visas` — Family visa per country. Keep 17KB inline.
- `sec-vaccines` — Vaccine tracker. Keep 10KB inline.
- `sec-documents` — Passports, carnet, insurance, vaccines (with expiry dates and alerting). Keep.

**Group: Build**
- `sec-build` — Truck build spec + sponsor contact timing. Already 15KB. Expand with:
  - Build progress tracker (new subsection) — parts ordered/received, tasks complete, spend vs budget
  - Truck weeks-to-departure counter prominent
  - Build gallery (photo upload grid)
- `sec-build-log` — NEW. Daily build log:
  - Date, hours worked, tasks done, parts fitted, issues hit, photos
  - Running cost total
  - Running hours total

**Group: Atlas (sponsor acquisition — shared with the main Atlas in PSNM? No — this is the RBTR sponsor side)**
- `sec-sponsors` — Sponsor pipeline (52 targets, £142,990). Expand heavily in Chunk 3 workstream B with the priority engine. For now in Chunk 2, just inline a clean table view.
- `sec-proposals` — Proposal builder. Inline, keep functional. Chunk 3 enhances with the 7-section SB7 generator.
- `sec-sponsor-intel` — NEW. Sponsor intelligence engine output viewer. One card per sponsor showing the intelligence report (empty until populated). Chunk 3 wires generation.
- `sec-audience-proof` — NEW. Audience Proof Dashboard (Layer 5 of ATLAS v2). Shows YouTube/Instagram/TikTok/LinkedIn/Email stats. For now: manual entry fields, Chunk 3 adds API wiring stubs. Export to PDF button.

**Group: Guy Martin Pathway** (dedicated per ATLAS v2 Layer 8)
- `sec-guy-martin` — NEW. 5-stage pathway tracker:
  - Stage 1 (DON'T — May-Jul 2026): countdown to Stage 2 eligibility, audience milestone check (>70,000 combined)
  - Stage 2 (LETTER — Aug 2026): letter drafting workspace with checklist
  - Stage 3 (FOLLOW-UP): 4-week countdown lockout
  - Stage 4 (DECISION): response logger
  - Stage 5 (LEGAL STRUCTURING): Debt Line review checklist, revenue-share running total
  - New migration `32_rbtr_atlas_tables.sql` includes `rbtr_guy_martin_pathway` table

**Group: Content Strategy (merged)**
- `sec-content-strategy` — tabs: Strategy / First Video / Channel Plan (merged `sec-firstvideo` + `sec-channel` + `sec-mediaplan`)
- `sec-content-publishing` — tabs: Scheduler / Account Resurrection / Perfectionism Override (merged `sec-scheduler` + resurrection content + `sec-contentoverride`)
- `sec-content-production` — tabs: Media Vault / B-Roll Extraction / Editing Tools (merged `sec-media` + `sec-broll` + `sec-editing`)
- `sec-podcast` — Keep as standalone (8KB, episode scripts)

**Group: Gear**
- `sec-gear` — Camera gear and kit. Keep 5KB.

**Group: Commercial**
- `sec-merch` — Merch planning. Keep.
- `sec-audience-emails` — RENAMED from `sec-custemer-emails`. Email templates for audience/subscribers.

**Group: Community**
- `sec-community` — tabs: Audience / Guests / Subscribers (merged)
- `sec-social` — Social channels quick access. Keep.

**Sections removed from RBTR portal:**
- `sec-signals`, `sec-wins`, `sec-deploy`, `sec-resurrection` (empty shell), `sec-legalstructure` (empty)

### RBTR Portal Data Contracts

Migration `32_rbtr_atlas_tables.sql` creates all the ATLAS v2 tables from the strategy doc. Specifically:
```
rbtr_sponsors (52 rows pre-populated, see ATLAS v2 strategy doc Appendix A for full list)
rbtr_sponsor_touches
rbtr_sponsor_intelligence
rbtr_audience_snapshots
rbtr_content (v2 schema with pillar, jab_or_hook, sb7_role, goal_scores)
rbtr_sponsor_proposals
rbtr_weekly_reports
rbtr_guy_martin_pathway (single row, current_stage=1)
rbtr_account_resurrection (two rows — instagram and youtube)
rbtr_legal_checkpoints (pre-populated — but SIMPLIFIED per the Axel Brothers → Sarah APA: only the content insurance checkpoint remains active; the other four are marked 'completed' with reason 'Asset Purchase Agreement chain: Co-Lab → Booth & Co liquidator → Axel Brothers Customs Ltd → Sarah Jane Jones')
rbtr_build_log
rbtr_route_phases
```

---

## ETERNAL KUSTOMS PORTAL — FULL INLINE BUILD

Ben is external consultant, £1,000/mo fixed + £40/hr. Sam Moore leads.

### Eternal Portal — Sidebar Groups

**Group: Dashboard**
- `sec-eternal-dashboard` — NEW. Summary: current month hours logged, current month invoice position, outstanding estimates, shareholders' agreement repayment progress (£2,500/mo × 20 months from July 2026), upcoming Sam meetings.

**Group: Consultancy**
- `sec-eternal` — Consultancy tasks. Keep 4KB inline, expand with:
- `sec-eternal-hours` — NEW. Hours tracker:
  - Daily hour log (date, hours, task description, client)
  - Auto-total current month
  - Running total since retainer start
  - Export to CSV button for invoicing
- `sec-eternal-estimates` — NEW. Estimate authorisation log:
  - Customer name, job description, estimate amount, date authorised, authorised by (Ben), signed-by-customer date
  - Status: draft / authorised / sent / signed / declined
- `sec-eternal-invoices` — NEW. Monthly invoices to Sam:
  - Auto-generate monthly from hours logged
  - Sent date, paid date
  - Running total YTD

**Group: Project**
- `sec-coffee` — Coffee Brothers bike build spec. Keep 6KB.
- `sec-eternal-builds` — NEW. Seven American truck programme tracker. One card per build with status, customer, key milestones.

**Group: Structure**
- `sec-eternal-shareholders` — NEW. Shareholders' agreement tracker:
  - Terry + Tracey transitional shares → Sam Shaw + Michael Whitaker on repayment completion
  - £2,500/mo × 20 months from July 2026 (Month 4)
  - Running total paid, remaining, next payment date
  - Confirmation date when shares formally transfer

**Sections removed:**
- Legacy `sec-eternal` plus the new ones. No iframes.

### Eternal Portal Data Contracts

Migration `32_eternal_tables.sql`:
```
eternal_hours_log (id, date, hours numeric, task text, client text, billable boolean)
eternal_estimates (id, customer, job, amount, authorised_at, signed_at, status)
eternal_invoices (id, period_start, period_end, hours_total, amount_total, sent_at, paid_at)
eternal_builds (id, name, customer, status, started_at, completed_at, notes)
eternal_shareholder_payments (id, month_number, payment_date, amount, paid boolean)
```

---

## HOUSE PORTAL — FULL INLINE BUILD

4 Woodhead Mews, Blacker Hill, Barnsley. Owned by Sarah. 104 jobs. Target AirBnB launch.

### House Portal — Sidebar Groups

**Group: Dashboard**
- `sec-house-dashboard` — NEW. Summary showing: jobs complete/remaining, spend to date vs £18,580-£29,830 budget, days to launch target, current occupancy % (post-launch), revenue MTD (post-launch), next guest arrival

**Group: Reno**
- `sec-house` — 104-job tracker (already 95KB — THIS IS THE BIG ONE). Inline, not iframe. Preserve all filter tabs (Blue/Pink/Attic/Garage/Compliance/Launch/Who/Status). Data persists to `house_jobs` table.
- `sec-house-suppliers` — NEW. Supplier/trade directory:
  - Name, trade, phone, email, day rate, last used date
  - Which jobs assigned to them (foreign key to house_jobs)
  - Rating / notes
- `sec-house-costs` — NEW. Cost tracker per category:
  - Spend by category (Blue/Pink/Attic/Garage/Compliance/Launch)
  - Spend by supplier
  - Budget vs actual graph
  - Receipts uploader (Supabase storage)

**Group: Launch**
- `sec-airbnb-certs` — Before you photograph & list (17KB). Keep inline.
- `sec-airbnb` — Launch checklist, amenities, projected numbers. Keep 7KB, expand with:
- `sec-airbnb-listing` — NEW. Full listing copy (title, short description, long description, house rules, amenities checklist). Copy/paste ready for AirBnB / Booking.com / direct.
- `sec-airbnb-photos` — NEW. Photography shot list (50 target shots for STR marketing). Checklist with "shot ✓" state.

**Group: Operations (post-launch — scaffold now, live later)**
- `sec-airbnb-bookings` — NEW. Booking calendar aggregator. For now: manual entry. Later: iCal sync from AirBnB/Booking.com.
- `sec-airbnb-revenue` — NEW. Revenue projection vs actuals. Target £2,310/mo at 70% occupancy, peaks £300+ NYE.
- `sec-airbnb-pricing` — NEW. Dynamic pricing framework:
  - Base rate £110/night
  - Weekend multiplier (Fri/Sat +30%)
  - Peak dates (NYE, bank holidays, Sheffield events +50%)
  - Last-minute discount rules
  - Minimum stay rules per period
- `sec-airbnb-messages` — NEW. Guest messaging templates:
  - Booking confirmation
  - Pre-arrival (3 days before)
  - Arrival day
  - During-stay check-in
  - Post-stay thanks + review request
  - Problem-solving templates (hot tub broken / wifi down / neighbour noise)
- `sec-airbnb-sops` — SCAFFOLD here but populate in Chunk 4. Link to main SOPs library.
- `sec-airbnb-inventory` — NEW. Consumables tracker:
  - Tea bags, coffee, toilet roll, kitchen roll, dishwasher tabs, laundry detergent
  - Current stock level, reorder level, last restocked

**Group: Compliance**
- `sec-airbnb-compliance` — NEW merged view of: gas safety cert, EICR, fire risk assessment, PAT testing, carbon monoxide detectors, fire alarms, legionella assessment. Each with expiry date + document upload + reminder.

**Sections removed from House portal:**
- `sec-signals`, `sec-wins`, `sec-deploy`

### House Portal Data Contracts

Migration `32_house_tables.sql`:
```
house_jobs (id, title, category, who text, status, estimated_cost, actual_cost, completed_at)
house_suppliers (id, name, trade, phone, email, day_rate, rating, notes)
house_job_supplier_assignments (job_id, supplier_id, assigned_at)
house_costs (id, category, supplier_id, amount, date, receipt_url)
house_bookings (id, guest_name, arrive_date, depart_date, nights, total_paid, platform, notes)
house_inventory (id, item, stock_level, reorder_level, last_restocked)
house_compliance (id, cert_type, issue_date, expiry_date, document_url)
house_message_templates (id, stage, subject, body, variables jsonb)
```

---

## SARAH PORTAL — FULL INLINE BUILD

Sarah's dedicated experience. She has access to: Sarah (this), House, Financials.

### Sarah Portal — Sidebar Groups

**Group: Dashboard**
- `sec-sarah-today` — NEW. Sarah's daily brief (mirror of sec-today but Sarah-focused):
  - Today's date, Pilates study progress, content scheduled, House tasks assigned, kids' events today
  - Mood/energy sliders
  - Her Top 3 Focus

**Group: Wellness (Pilates)**
- `sec-sarah-pilates` — NEW. Level 3 APPI 16-week course tracker:
  - Module 1 of 16 (adjust to current)
  - Each module: study hours, practice hours, assignment status
  - Next exam/submission date
  - Tutor notes
- `sec-sarah-wellness` — NEW. Personal wellness:
  - Fitness log (yoga, running, strength)
  - Nutrition notes
  - Sleep log (mirror of Ben's format)

**Group: Content**
- `sec-sarah-channel` — NEW. Her parallel wellness channel:
  - Content calendar
  - Upload schedule
  - Analytics summary
  - Ideas backlog
- `sec-sarah-posts` — NEW. Her drafts / published posts across IG/YT.

**Group: Shared (mirror of family-relevant Ben content)**
- `sec-sons` — SAME table as Ben's — Sarah edits here too
- `sec-peanut` — SAME
- `sec-family-health` — SAME

**Group: House**
- Link to House portal (her dashboard showing House tasks assigned to her)

**Group: Goals**
- `sec-sarah-goals` — NEW. Her own tiered goals (mirror of Ben's `sec-goals` pattern):
  - Today / Week / Month / Life / RBTR (family goals)
- `sec-sarah-relationship` — NEW. From Sarah's side: date nights, hard conversations log, connection practices

### Sarah Portal Data Contracts

Migration `32_sarah_tables.sql`:
```
sarah_today_log (date, mood int, energy int, sleep_hours numeric, notes text)
sarah_pilates_progress (module int, study_hours numeric, practice_hours numeric, assignment_status text, notes text)
sarah_wellness_log (date, activity, duration_mins, notes)
sarah_content_calendar (id, date, platform, content_type, title, status)
sarah_goals (tier, content, status, due_date)
```

---

## POST-WORKSTREAM-A CHECKLIST

Before commit:
- [ ] Zero iframes in any portal (grep confirms)
- [ ] All deleted sections removed from nav, old HTML removed
- [ ] All renamed sections: old names redirect to new or simply removed
- [ ] All merged sections render with tabs working
- [ ] Every portal's sidebar matches the group structure above
- [ ] Design system tokens used throughout, no inline styles
- [ ] Mobile 375px tested on at least 5 sections across different portals
- [ ] Migrations 32 (all the new tables) applied to Supabase without error
- [ ] No console errors visiting any portal logged in as Ben
- [ ] Auth: Sarah still only sees Sarah, House, Financials

Commit message:
```
Workstream A: All portals inline. Zero iframes. Legacy / reference-only.
- Deleted: sec-signals, sec-wins, sec-deploy, sec-resurrection, sec-legalstructure
- Renamed: sec-custemer-emails → sec-audience-emails; sec-aminedecisions → sec-delegation-framework
- Merged: route (3→1 tabbed), content-strategy (3→1), content-publishing (3→1), content-production (3→1), community (3→1), wellness (6→1 tabbed)
- New sections across 5 portals: see MASTER_PROMPT.md
- Migrations 32_ben/rbtr/eternal/house/sarah_tables.sql applied
```

Reply `READY FOR NEXT CHUNK` when Workstream A is complete and committed.

---
# CHUNK 3 — WORKSTREAM B: ATLAS PRIORITY ENGINE (paste when Chunk 2 returns READY)

## GOAL

PSNM portal's Atlas section becomes a living survival engine that tells Ben exactly who to call, in what order, with what script. This is the highest-leverage feature in the entire system because PSNM has 14 days to May rent with £0.

## SPECIFIC DELIVERABLES

### 1. Atlas Priority Engine

Inside `sec-atlas`, build the priority engine.

**Input signals (read from existing tables):**
- `psnm_enquiries` — every enquiry row
- `psnm_quotes` — every quote sent, opens, clicks (if Mailgun wired)
- `psnm_customers` — active paying customers (for upsell detection)
- `psnm_outreach_targets` — 205 cold rows
- `psnm_warm_leads` — the Hot/Warm/Cold taxonomy from migration 31

**Output: a daily call queue.**

Every morning at 6am (and on-demand via refresh button), the engine produces a ranked list of 15-25 calls/actions for today:

**Priority formula:**
```
score = 0
if status == 'quote_opened_no_reply': score += 40
if status == 'hot' and last_contact > 3 days: score += 35
if status == 'warm' and last_contact > 5 days: score += 25
if status == 'cold' and from_whichwarehouse: score += 15
if pallets_count > 100: score *= 1.5  # bigger fish priority
if replied_within_7days: score += 50  # strike while hot
if voicemail_left_last_attempt: score += 30  # follow-up discipline
if never_contacted and tier_1_target: score += 20
```

**Output format per item:**
- Lead name + company
- Phone (click-to-call on mobile, tel: link)
- Status and temperature colour
- Last contact date + what happened
- Recommended action: "Call", "Email", "Site visit follow-up", "Voicemail + email"
- Recommended script (link to scripts library)
- "Log outcome" button → opens quick-log modal

**UI:**
- Top of PSNM portal, before anything else
- First 5 items fully expanded with all details
- Rest collapsed, tap to expand
- "Done" swipe / button marks item complete and removes from today's queue
- Queue persists across sessions

### 2. Tiered Target System

Inside `sec-atlas` or as sibling `sec-atlas-tiers`:

**Three tiers based on pallet potential:**
- **T1: >500 pallets** — priority outreach, CEO/MD direct approach, quarterly review cadence
- **T2: 100-500 pallets** — monthly touch cadence, quote within 48hr of enquiry
- **T3: <100 pallets** — standard outreach, auto-quote from website

Every lead gets a tier assigned on creation (manual or auto from brief). Priority engine uses tier as a multiplier.

### 3. Email Templates Library

Migration `32_psnm_templates.sql`:
```sql
CREATE TABLE psnm_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text, -- 'cold', 'follow_up', 'quote', 'welcome', 'renewal'
  subject text not null,
  body text not null,
  variables jsonb, -- ['{{first_name}}', '{{company}}', '{{pallets}}', '{{quote_amount}}', '{{sender_name}}']
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE psnm_call_scripts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text, -- 'cold_first', 'warm_followup', 'voicemail_1', 'voicemail_2', 'incoming_enquiry', 'site_visit_followup'
  script_body text not null,
  objection_handlers jsonb, -- array of {objection, response}
  created_at timestamptz default now()
);
```

**Seed with these 5 email templates (verbatim):**

**Template 1: Cold Outreach First**
```
Subject: Pallet storage in Rotherham — {{company}}
Hi {{first_name}},

Ben here from Pallet Storage Near Me, Hellaby Industrial Estate in Rotherham. We run a 700-pallet warehouse and I noticed {{company}} might have storage needs based on {{reason_for_contact}}.

We're £6/pallet/week all-in, 24/7 access for customers, secure, and we don't tie you to long contracts.

If storage is ever a problem for you, worth a quick 5-min chat — I can tell you what we charge and what we don't, and you can decide if it's worth a site visit.

Happy for you to call me direct on 07506 255033 or reply here.

Ben
{{sender_name}} | Pallet Storage Near Me
palletstoragenearme.co.uk
```

**Template 2: Quote Follow-Up**
```
Subject: Your quote — {{company}}
{{first_name}},

Quick follow-up on the quote I sent for {{pallets}} pallets at £{{quote_amount}}/week.

Two questions:
1. Any changes needed to the quote?
2. What's your timeline if the numbers work?

If it's useful, happy to book you in for a 15-min site visit this week — seeing the facility usually answers the remaining questions.

07506 255033 whenever works for you.

Ben
```

**Template 3: Site Visit Invite**
```
Subject: Site visit — Hellaby, Rotherham
{{first_name}},

Good to speak earlier. As agreed, come and see the facility — always easier to commit once you've walked it.

Address: Unit 3C Denaby Way, Hellaby Industrial Estate, Rotherham S66 8HR
When: {{proposed_date}} at {{proposed_time}}
Duration: 20 mins max

Text me on 07506 255033 when you're 10 mins out and I'll meet you at the gate.

Ben
```

**Template 4: New Customer Welcome**
```
Subject: Welcome to PSNM — first steps
{{first_name}},

Great to have {{company}} on board. Here's what happens this week:

1. Your pallets arrive at: Unit 3C Denaby Way, Rotherham S66 8HR
2. 24/7 access code: {{access_code}}
3. Your account manager: Ben on 07506 255033
4. First invoice: {{invoice_date}} — 30-day terms
5. Your pallet locations will be emailed after receipt

Anything unclear or urgent — call me directly.

Ben
```

**Template 5: Renewal Reminder**
```
Subject: {{company}} renewal — quick chat?
{{first_name}},

Your current storage agreement renews {{renewal_date}} ({{days}} days).

Pallet rates are rising across the industry next quarter. I'd rather lock your rate in early than see it drift. Happy to run the numbers — 5 mins on the phone usually covers it.

07506 255033 — or reply with a time that works.

Ben
```

**Seed 6 call scripts (use my earlier session work):**

1. `Cold Outreach First Call` — hook, one question, book time
2. `Warm Followup After Quote` — specific quote reference, close or counter
3. `Voicemail 1st Attempt` — under 20 seconds
4. `Voicemail 2nd Attempt` — different angle, not same message
5. `Incoming Enquiry Discovery` — qualification before quoting
6. `Site Visit Followup` — close or clear next step

Each script written in plain British English, northern tone, no jargon. Each includes 3-5 objection handlers.

### 4. Touch Sequencing

Each warm lead gets a touch sequence automatically scheduled:

**Warm lead sequence (when lead becomes "warm"):**
- T+0: Initial call or email
- T+3 days: Follow-up if no response
- T+7 days: Second follow-up
- T+14 days: Value-add touch (not a pitch — an industry insight, a relevant local news item)
- T+30 days: Quarterly check-in

**Cold lead sequence (from outreach_targets):**
- T+0: Cold email
- T+5 days: LinkedIn connect
- T+10 days: Second email
- T+21 days: Phone call
- T+45 days: Move to permanent nurture or archive

Store in new table:
```sql
CREATE TABLE psnm_touch_schedule (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references psnm_warm_leads(id) or psnm_outreach_targets(id),
  lead_type text,
  touch_number int,
  scheduled_for timestamptz,
  status text, -- 'pending', 'completed', 'skipped'
  outcome text,
  completed_at timestamptz
);
```

Priority engine pulls from this table when computing today's queue.

### 5. Performance Dashboard

Inside `sec-atlas-performance`:
- Calls made today / this week / this month
- Quotes sent / opened / replied / won
- Site visits booked / completed / converted
- Average time from enquiry to first contact
- Average time from first contact to signed
- Pallet-count committed (growing bar graph)
- Revenue committed (£)
- Break-even position (currently X / 827)
- Conversion funnel: cold → warm → hot → quote → customer

### 6. Quote PDF Generator (MISSING FROM ORIGINAL BUILD)

Inside `sec-psnm` or `sec-atlas`:
- "Generate Quote" button on any enquiry/warm-lead card
- Form: pallets, duration (weeks/months), rate per pallet per week, special terms
- Generates a branded PSNM PDF (black/gold design system, Ben's logo, full T&Cs)
- Auto-saves to `psnm_quotes` table
- Emails via Mailgun (stub if Mailgun key not yet provided — log to console)
- Track sent/opened/clicked via Mailgun webhook (stub for now)

### 7. Site Visit Booking Flow (MISSING FROM ORIGINAL)

Inside `sec-psnm`:
- "Book Site Visit" button on any warm/hot lead
- Simple form: preferred date, preferred time, duration
- Auto-creates Google Calendar event (uses Google Calendar MCP)
- Auto-creates Telegram reminder for 24hr before and 1hr before
- Sends confirmation email to lead via template

### 8. Live Pallet Occupancy Logger (MISSING FROM ORIGINAL)

Inside `sec-psnm-dashboard` or new `sec-psnm-occupancy`:
- One giant "Log Occupancy" button
- Opens modal with: pallets-count input, date (defaults today), notes
- Saves to `psnm_occupancy_snapshots` (existing table)
- Updates the dashboard number live
- Ben does this once a day in the warehouse

### POST-WORKSTREAM-B CHECKLIST

- [ ] Priority engine produces today's queue on portal load
- [ ] Today's queue ranks correctly per scoring formula
- [ ] Tiered target system applied to every lead
- [ ] 5 email templates seeded in database and visible in UI
- [ ] 6 call scripts seeded and accessible
- [ ] Touch sequences scheduling correctly
- [ ] Performance dashboard showing real numbers from existing data
- [ ] Quote PDF generator produces a readable PDF
- [ ] Site visit booking creates Google Calendar event (if MCP available)
- [ ] Live pallet occupancy logger persists correctly

Commit message:
```
Workstream B: Atlas priority engine live, templates library seeded, touch sequencing, performance dashboard, quote PDF, site visit flow, pallet logger.
```

Reply `READY FOR NEXT CHUNK`.

---

# CHUNK 4 — WORKSTREAMS C + D: CRM + SOPs (paste when Chunk 3 returns READY)

## WORKSTREAM C: CONTACTS CRM

Migration `33_contacts_crm.sql`:
```sql
CREATE TABLE contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  display_name text generated always as (first_name || ' ' || last_name) stored,
  company text,
  title text,
  emails text[] default '{}',
  phones text[] default '{}',
  linkedin_url text,
  address text,
  notes text,
  tags text[] default '{}',
  entities text[] default '{}',  -- ['psnm', 'house', 'eternal', 'rbtr', 'personal', 'family']
  relationship_type text, -- 'customer', 'prospect', 'supplier', 'trade', 'mentor', 'friend', 'family', 'medical', 'vet', 'school', 'legal', 'accountant', 'advisor'
  last_contact_at timestamptz,
  next_contact_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX contacts_search_idx ON contacts USING GIN (
  to_tsvector('english', coalesce(display_name,'') || ' ' || coalesce(company,'') || ' ' || coalesce(title,'') || ' ' || coalesce(notes,''))
);

CREATE TABLE contact_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  interaction_type text, -- 'call', 'email', 'meeting', 'text', 'whatsapp', 'note'
  direction text, -- 'in', 'out'
  subject text,
  summary text,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);
```

### CRM UI (in each relevant portal)

**PSNM portal:** shows contacts where `'psnm' = ANY(entities)`. Card view + table view. Quick actions: call (tel: link), email (mailto:), "Log Interaction".

**House portal:** shows suppliers/trades where `'house' = ANY(entities)`. Same UI pattern.

**Eternal portal:** shows Sam Moore, Beth Moore, Sam Shaw, Michael Whitaker, plus Eternal customers. Pre-populated as part of migration.

**Ben portal:** shows personal — Nate, Dale, oldest sister Sarah, plus all sons-related contacts (GP, dentist, school) and Peanut-related (vet).

**Seed contacts** in migration to pre-populate known people:
- Nate (mentor) — entities: ['personal'], relationship_type: 'mentor'
- Sam Moore — entities: ['eternal'], relationship_type: 'partner'
- Beth Moore — entities: ['eternal'], relationship_type: 'partner'
- Sam Shaw — entities: ['eternal'], relationship_type: 'partner'
- Michael Whitaker — entities: ['eternal'], relationship_type: 'partner'
- Dale — entities: ['personal'], relationship_type: 'friend'
- Sister Sarah — entities: ['family'], relationship_type: 'family'

### Global contact search

Top bar search in any portal: "Search contacts..." — hits full-text index, returns cross-entity results.

---

## WORKSTREAM D: SOPs LIBRARY

Migration `34_sops.sql`:
```sql
CREATE TABLE sops (
  id uuid primary key default gen_random_uuid(),
  entity text not null, -- 'psnm', 'house', 'eternal', 'ben'
  category text,
  title text not null,
  description text,
  frequency text, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'on_event'
  steps jsonb, -- array of {step_number, action, detail, estimated_mins}
  required_items text[],
  output_expected text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE sop_executions (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid references sops(id),
  executed_by text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  steps_completed jsonb, -- tracking which steps done
  notes text,
  issues_encountered text
);
```

### Seed 16 SOPs (write full body — these are the ones that protect Ben's life)

**PSNM SOPs (6):**
1. **Daily Forklift Check** (frequency: daily, 5 mins) — steps: visual check, fluid levels, horn test, brake test, document completion
2. **Inbound Pallet Receipt** (frequency: on_event, 10 mins) — steps: check paperwork vs actual, condition check, weigh if required, allocate to location, scan/log, notify customer, file paperwork
3. **Outbound Pallet Release** (frequency: on_event, 8 mins) — steps: verify release authorisation, locate pallets, load/lift, update system, close out
4. **Monthly Stock Count** (frequency: monthly, 2 hours) — steps: print location list, walk and count, discrepancy investigation, sign off, file
5. **Incident Report** (frequency: on_event, 15 mins) — steps: make area safe, call H&S, photograph, witness statement, RIDDOR assessment, file, notify insurer if needed
6. **New Customer Onboarding** (frequency: on_event, 30 mins) — steps: contract signed, credit check, account code assigned, access codes issued, welcome email sent, first invoice scheduled, customer file created

**House SOPs (4):**
7. **3-Hour STR Turnover** (frequency: on_event, 180 mins) — steps: strip beds, wash bedding, clean bathrooms (3), kitchen deep clean, vacuum all floors, mop hard floors, restock consumables, check for damage, photograph finished state, log
8. **Guest Arrival Check** (frequency: on_event, 15 mins pre-arrival + 5 mins on arrival) — steps: final walkthrough, temperature set, lights on, key lockbox open, welcome message sent, phone standby
9. **Guest Departure Checkout** (frequency: on_event, 10 mins) — steps: message at 10am reminding checkout, 11am walkthrough for damage, photograph any issues, review left inside 24hr
10. **Hot Tub Weekly Service** (frequency: weekly, 45 mins) — steps: drain, scrub, refill, test chemical levels, adjust, log water change date

**Eternal SOPs (3):**
11. **Weekly Hours Logging** (frequency: weekly, 10 mins) — steps: review week's hours, confirm billable vs non, commit to system, notify Sam of unusual items
12. **Monthly Invoice Dispatch** (frequency: monthly, 20 mins) — steps: lock hours, generate invoice PDF, attach hours breakdown, email to Sam + Beth, log sent, diary 14-day chase if unpaid
13. **Estimate Authorisation** (frequency: on_event, 10 mins) — steps: review quote from team, check margin, verify parts available, verify lead time, authorise in writing, log in Eternal Estimates

**Ben Personal SOPs (3):**
14. **Morning Routine** (frequency: daily, 45 mins) — steps: wake 5am, hydrate, 10-min mindset practice, read Master Plan, check ROCKO brief, set Top 3, first deep-work block
15. **Evening Reflection** (frequency: daily, 20 mins) — steps: wins today, losses today, lessons, tomorrow's Top 3, mood/energy/sleep log, gratitude
16. **Weekly Money Meeting** (frequency: weekly, 60 mins) — Sunday evening — steps: review all entity balances, confirm upcoming bills, flag any gaps, confirm priorities for coming week, Sarah alignment on family money items, log decisions

Each SOP gets its full step-by-step content written into the seed migration.

### SOP UI

In each relevant portal (`sec-psnm-sops`, `sec-house-sops`, `sec-eternal-sops`, `sec-ben-sops`):
- List view of SOPs for that entity
- Filter by frequency / category
- One-tap "Start SOP" opens step-by-step execution view
- Each step: checkbox, "mark complete" moves to next
- Timer running showing elapsed
- "Log issue" at any step
- Completed SOP logs to `sop_executions`
- History tab shows last 30 days of executions

---

## POST-WORKSTREAMS-C-AND-D CHECKLIST

- [ ] Contacts table created with full-text search index
- [ ] CRM UI live in PSNM, House, Eternal, Ben portals
- [ ] 7+ seed contacts populated
- [ ] Global contact search working from any portal
- [ ] SOPs table created
- [ ] 16 SOPs seeded with full step arrays
- [ ] SOP UI in 4 portals with start/step-through/log flow

Commit message:
```
Workstreams C + D: Contacts CRM with full-text search and cross-entity tagging. SOPs library with 16 seeded procedures across PSNM/House/Eternal/Ben.
```

Reply `READY FOR NEXT CHUNK`.

---

# CHUNK 5 — WORKSTREAM E: BRIEF + NOTIFICATIONS + WEATHER (paste when Chunk 4 returns READY)

## 1. Morning Brief Verification

Verify `/api/morning-brief` endpoint:
- Fires at 6am UK time daily (check cron / scheduled trigger)
- Assembles 5-block content: Money / Yesterday's Outcomes / Today's Top 3 / Family / Close
- Calls ElevenLabs with Hannah voice ID `ROTATED_2026-04-25`
- Delivers MP3 via Telegram to Ben's chat_id (already in env)

If any step broken, fix it.

**5-block content template:**

**Block 1 - Money (20 sec):**
"Ben. Morning. It's [weekday] [date]. PSNM balance is £[amount]. Personal balance £[amount]. [X] days to May rent. [Top warm lead] is in the hot seat today — [name] at [company]."

**Block 2 - Yesterday's Outcomes (15 sec):**
"Yesterday you [won X / logged X calls / closed X quote / completed X jobs]. [One wins sentence.]"

**Block 3 - Today's Top 3 (25 sec):**
"Your Top 3 for today: One — [first priority]. Two — [second priority]. Three — [third priority]. These live in your portal."

**Block 4 - Family (15 sec):**
"Sarah's on [pilates module/schedule item] today. Hudson and Benson have [school/event]. Peanut [vet/walk note if any]. [Weather for Rotherham]."

**Block 5 - Close (5 sec):**
"Through heartache produces beautiful things. Roll."

Total: 60-90 sec. Hannah voice. One message per morning.

## 2. Evening Debrief (NEW)

Build `/api/evening-debrief` endpoint firing at 9pm UK daily:
- Pulls today's: mood/energy log, tasks completed, calls logged, money meeting status
- Generates 45-60 sec debrief in Hannah voice
- Pattern: "Ben. Evening. Today you [summary]. [Won X]. [Struggled with Y]. Tomorrow's Top 3 start with [first priority]. Sleep well."

## 3. Push Notifications — 5 Types

Migration `35_notifications.sql`:
```sql
CREATE TABLE notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'hot_signal', 'quote_opened', 'low_cash', 'schedule_conflict', 'rocko_proactive'
  severity text, -- 'critical', 'high', 'normal', 'low'
  title text,
  body text,
  data jsonb,
  read_at timestamptz,
  actioned_at timestamptz,
  channel_delivered text[], -- which channels sent: ['telegram', 'portal', 'sms']
  created_at timestamptz default now()
);
```

**5 Notification Types:**

1. **Hot Signal** (critical): warm lead replies, quote opened 3x in 24h, site visit confirmed
2. **Quote Opened** (high): first open of a sent quote
3. **Low Cash** (critical): PSNM balance < £500, personal balance < £100
4. **Schedule Conflict** (normal): two events overlapping, missed appointment
5. **ROCKO Proactive** (normal): pattern detection like "you've not called Sonnie in 5 days"

Each notification:
- Writes to `notifications` table
- Pushes via Telegram bot to Ben's chat
- Shows in portal notification drawer (bell icon top right)
- Optional SMS for critical (Twilio stub if key not present)

## 4. In-Portal Notification Drawer

Top-right bell icon in every portal header. Tap to open drawer showing:
- Unread notifications count badge
- Last 20 notifications
- Mark read / mark all read
- Tap notification to navigate to relevant portal section

## 5. Weather Endpoint Fix

`/api/weather` currently returning "failed to fetch". Debug:
- Check API key for weather service (probably open-meteo, no key needed, or OpenWeather which needs key)
- Check the fetch call in morning-brief and sec-today
- Fallback: if weather fails, continue brief without weather line (don't crash)

Use Open-Meteo (free, no key):
```
https://api.open-meteo.com/v1/forecast?latitude=53.42&longitude=-1.36&current=temperature_2m,wind_speed_10m,weather_code
```

## POST-WORKSTREAM-E CHECKLIST

- [ ] Morning brief fires on schedule with Hannah voice via Telegram
- [ ] Evening debrief fires 9pm daily
- [ ] 5 notification types all writable and deliverable
- [ ] Notification drawer shows in every portal
- [ ] Weather endpoint returning data (or graceful fallback)

Commit message:
```
Workstream E: Morning brief + evening debrief wired with Hannah voice. 5 push notification types via Telegram. In-portal notification drawer. Weather endpoint fixed (Open-Meteo).
```

Reply `READY FOR NEXT CHUNK`.

---

# CHUNK 6 — WORKSTREAM F: DEPLOY (paste when Chunk 5 returns READY)

## Deploy Sequence

1. **Preview deploy first:**
```
vercel deploy
```
Note the preview URL. Test it end-to-end.

2. **Smoke tests on preview URL:**
- Open login page, log in as Ben
- Click every portal (8 portals)
- In each portal click every top-level section
- Verify: no iframes anywhere, no console errors, no stuck loading spinners, design system consistent, mobile 375px looks right
- Log in as Sarah on another device — verify she sees only Sarah / House / Financials
- Submit a test quote via Atlas → verify PDF generates → verify logs to psnm_quotes
- Log a test SOP execution → verify persists
- Create a test contact → verify appears in correct portals
- Open notification drawer → verify renders
- Verify morning brief hits Telegram (check most recent scheduled fire)

3. **If any smoke test fails, fix before proceeding.**

4. **Merge to main (local):**
```
git checkout main
git merge --no-ff phase-1-6-complete
```

5. **Tag:**
```
git tag -a v3.5-system-complete -m "Phase 1.6 complete: all portals inline, Atlas priority engine, CRM, SOPs, notifications, brief+debrief"
```

6. **Production deploy:**
```
vercel deploy --prod
```

7. **Final verification on production URL:**
Same smoke test as preview, now on `rbtr-jarvis.vercel.app`.

8. **Write a one-paragraph "session summary" markdown to `/docs/SESSION_2026-04-23_PHASE_1_6_COMPLETE.md`:**
```markdown
# Phase 1.6 Complete — 23/24 April 2026

Deployed: v3.5-system-complete at https://rbtr-jarvis.vercel.app
Branch merged: phase-1-6-complete → main (local only, not pushed)
HEAD: [commit hash]

Completed:
- Workstream A: All 7 portals fully inline. Zero iframes. Legacy / reference-only.
- Workstream B: Atlas priority engine with daily call queue, tiered targeting, templates, touch sequencing, performance dashboard, quote PDF, site visit booking, pallet occupancy logger.
- Workstream C: Contacts CRM with full-text search, cross-entity tagging, 7 seed contacts.
- Workstream D: SOPs library with 16 seeded procedures across PSNM/House/Eternal/Ben.
- Workstream E: Morning brief + evening debrief via Hannah voice on Telegram. 5 notification types. Portal drawer. Weather fixed.

Deferred:
- Whisper voice input (needs OpenAI key)
- Bank feed / TrueLayer (pending approval)
- Stripe customer self-quote (pending identity verification)
- GitHub push (pending PAT)

Next session priorities:
- Connect OpenAI API for voice input
- Wire first real Atlas call queue based on ingested warm leads
- First Tier 1 cold call from queue

Ben: log morning sentiment, make first call from Atlas queue, verify notification drawer works.
```

9. **Final message to Ben (reply in chat, not a commit):**
```
RBTR Command Centre v3.5-system-complete is live.

Production: https://rbtr-jarvis.vercel.app
Tag: v3.5-system-complete
Branch phase-1-6-complete merged to main locally.

Session summary: /docs/SESSION_2026-04-23_PHASE_1_6_COMPLETE.md

All workstreams A-E shipped. Zero iframes. Zero console errors.
Smoke tests pass on production.

Good luck with the first calls.
```

10. **Session ends.**

---

# APPENDIX — CRITICAL CONTEXT FOR CHUNK QUESTIONS

## Ben's voice (for any copy generation)
Direct, British, northern, no jargon. Doesn't soften things. Example acceptable: "Chase Cepac. Sonnie left voicemail Monday — three days cold." Example unacceptable: "It might be helpful to circle back with Cepac soon."

## Sarah's voice (for her portal copy)
Warm, grounded, practical, not corporate. Example acceptable: "This week: module 3 practical, 2 client practices, one rest day." Example unacceptable: "This week's wellness journey continues with..."

## ROCKO voice (morning/evening brief)
Calm, confident, no-nonsense, slightly warmer than Ben's own voice. Named after Nate (mentor-style). Always ends with: "Through heartache produces beautiful things. Roll." (morning) or "Sleep well." (evening).

## Colours and design tokens
Black (`--color-bg: #000`), Gold (`--color-accent: #8B7330`), Iron (`--color-fg: #fff`), Steel (`--color-muted: #888`). Font: default system stack, no web fonts. Never use emojis in system text (emojis OK in Ben's own content).

## What Ben hates
- Loading spinners that don't resolve in 3 seconds
- Features that require re-entering data he's already entered elsewhere
- Empty states with no instruction on what to do
- Corporate language ("journey", "leverage", "synergy", "passionate about")
- Buttons that don't do what their label says
- Mobile views where the keyboard obscures the submit button

## What Ben loves
- One tap to his most common action
- Data persisting across sessions without him thinking about it
- ROCKO telling him what's next rather than him having to decide
- Numbers that change live when something happens
- Buttons that commit and confirm in one step

---

# END OF MASTER PROMPT

If any chunk fails or any blocker appears, stop and surface it in plain English. Do not guess on Ben's business logic. Do not skip a workstream to finish faster. Priority order if time short: A > B > E > C > D.

This is the system that carries a family across 45 countries for 4 years. Build it like it matters.
