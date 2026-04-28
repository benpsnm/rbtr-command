# PSNM_STATE — Live System Truth
# Last updated: 2026-04-28 (Prospect Intelligence Engine built)
# Rule: AI tools read this file first before answering anything about PSNM state.

---

## CANONICAL ARCHITECTURE

**One host. One URL. One source repo.**

| Layer | Detail |
|-------|--------|
| **Host** | Vercel (rbtr-jarvis.vercel.app) |
| **Repo** | github.com/benpsnm/rbtr-command → `v14/` subdirectory |
| **Deploy** | `vercel deploy --prod` from `v14/` OR push to main (auto-deploy) |
| **Database** | Supabase `mpxgyobotiqcawmqlhbf` — shared between WMS and customer-facing |
| **WMS source** | `v14/public/wms.html` (4,077 lines — rich WMS + Intelligence tab) |
| **WMS auth** | PSNM_STAFF_PASSCODE env var, checked via `/api/supabase-proxy?action=wms_check` |

**Netlify abandoned** — credit limit pause triggered 2026-04-27. Local backups retained at `~/Desktop/psnm/WMS/PSNM_v14_LIVE.html` and `PSNM_v14.html`. Do not attempt to redeploy to Netlify.

---

## URLs

| Route | Purpose |
|-------|---------|
| `/wms.html` | Rich operational WMS — Ben's daily tool |
| `/quote.html` | Customer quote widget |
| `/terms.html` | T&Cs |
| `/api/atlas` | Booking, Atlas priority engine, social pipeline, Atlas v2 outreach, strategy docs |
| `/api/cron-morning-brief` | Daily 7am Telegram brief |
| `/api/supabase-proxy` | Auth + DB proxy |

---

## WMS Tabs (at /wms.html)

Map · Goods In · Goods Out · Stock · Log · Customers · Rates · Dashboard · Tasks · CRM · Scripts · Revenue · Compliance · Links · Invoicing · Statements · Suppliers · **🧠 Intelligence** · **📋 Strategy**

**Intelligence tab** reads live from Supabase:
- KPI strip: warehouse occupancy + pipeline stats
- Enquiries Pipeline (psnm_enquiries)
- Hot Leads (psnm_outreach_targets, ordered by priority_score)
- Outreach Summary (psnm_outreach_touches)
- Occupancy Trend (psnm_occupancy_snapshots, last 7)
- **Atlas v2 Approval Queue** — review/approve/reject/edit AI-generated drafts
- **Generate Drafts** — triggers batch generation via Anthropic API
- **Dispatch Approved** — sends approved drafts via SendGrid
- **Leads Browser** — all 205 prospects, sortable/filterable, editable side panel
- **Atlas Settings** — daily limit, tone mix, territory filter, pause toggle

**Strategy tab** renders markdown docs:
- Locked Plan (PSNM_LOCKED_PLAN_v1.md)
- Atlas v2 Framework (ATLAS_V2_FRAMEWORK.md)
- System Prompt (_atlas_system_prompt.md)

---

## Warehouse

- **Capacity**: 1,602 pallet positions (1,024 racked + 454 aisle floor + 104 open floor)
- **Break-even**: 912 pallets at 57% occupancy
- **Location**: Unit 3C Hellaby Industrial Estate, Rotherham S66 8HR

## Pricing (current)

| Band | Rate |
|------|------|
| 1–49 pallets | £3.95/pallet/week |
| 50–149 pallets | £3.45/pallet/week |
| 150+ pallets | £2.95/pallet/week |

- Goods-in: £3.50/movement
- Goods-out: £3.50/movement
- Onboarding fee: £50 (waived for 50+ pallets on 12-week+ commitment)

## NEW OFFER (canonical — as of 2026-04-28)

**Trial offer: First week free — when you commit to 12 weeks**

| Term | Detail |
|------|--------|
| Week 1 | Storage free. G-in/out at standard £3.50/pallet. |
| Weeks 2–12 | Standard tier pricing applies. |
| After week 12 | Rolling monthly, 30 days notice to cancel. |
| Eligibility | One trial per company (tracked by CH number / trading name). |
| Walk-away | Day 5 conversation — exit with no further charges if not satisfied. |
| Onboarding fee | £50, waived at 50+ pallets — compatible with trial offer. |

**Retired offer (DELETE any reference):** ~~Free first month, no deposit, no contract~~
**Notice period:** 30 days (consistent across all T&Cs, outreach, config). Previously had "14 days" in time_effort — corrected 2026-04-28.

## Fixed Costs (monthly)

| Month | Fixed cost |
|-------|-----------|
| April 2026 | £8,280 |
| May 2026 | £9,280 |
| June 2026 | £10,280 |
| July 2026+ | £13,613 |

---

## Supabase Project

- **Project ref**: `mpxgyobotiqcawmqlhbf`
- **WMS table**: `psnmwhm_store` (RLS disabled, anon key, single-row warehouse state)
- **Pipeline tables**: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`, `psnm_atlas_drafts`, `psnm_atlas_config`, `psnm_ww_leads`, `psnm_intelligence_prospects`
- **All pipeline tables**: anon SELECT policy `USING (true)` active
- **psnm_atlas_drafts**: stores generated email drafts (status: pending_approval → approved/rejected → sent/failed)
- **psnm_atlas_config**: single row `id='main'`, daily_send_limit=50, paused=false, tone_mix='balanced'
- **psnm_ww_leads**: WhichWarehouse inbound leads (status: new → contacted → converted/lost). Populated by POST /api/atlas?action=inbound_email (SendGrid Inbound Parse webhook). Auth: SENDGRID_INBOUND_SECRET query param (bypasses x-rbtr-auth). WMS Intelligence tab surfaces leads with warm response generator.
  - **WAM path**: `source='whichwarehouse_wam'`. Detected by `WW-XXXX` + `whichwarehouse member` in body. All WAM-specific fields stored as JSON in `notes` column (keys: wam, ww_reference, opportunity_tier, product_nature, storage_only, duration_type, duration_weeks, brief_overview, pallet_weight_kg, pallet_volume_m3, origin_port, amazon_mention, parse_confidence, parse_flags, pallet_count_exact, quote). Quote auto-calculated by `api/_quote_calc.js` at ingest time.
  - **Direct path**: `source='whichwarehouse'` or `'email_inbound'`. notes = raw text (2000 char). No auto-quote.
  - **Scenario routing** (for generate_ww_response): blocked → hazmat triage; awkward_data → clarifying Q; location_mismatch → distance reframe; port_pressure → direct-from-port pitch; happy_path → full quote email.

## Vercel Environment Variables (production)

| Var | Purpose |
|-----|---------|
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE | Service role key (server-side only) |
| SUPABASE_ANON_KEY | Anon key (used by wms.html client-side via proxy) |
| PSNM_STAFF_PASSCODE | WMS login gate |
| SENDGRID_API_KEY | Booking confirmation emails |
| TELEGRAM_BOT_TOKEN | Booking alerts + daily brief |
| TELEGRAM_CHAT_ID | 8669062243 |
| RBTR_AUTH_TOKEN | Atlas API auth |
| ANTHROPIC_API_KEY | AI features |
| ELEVENLABS_API_KEY | Voice (rotation pending — sk_2932... exposed) |
| SENDGRID_INBOUND_SECRET | WW webhook auth — **LIVE in production** (set 2026-04-28). Gate verified: wrong secret → 401, correct → 200. |

## Integrations (live as of 2026-04-28)

- **SendGrid**: booking confirmation emails + Atlas v2 cold outreach dispatch + WW inbound parse (DNS pending Monday)
- **Telegram**: booking alerts + daily 7am brief + WW lead alerts → TELEGRAM_CHAT_ID=8669062243
- **Anthropic API (claude-sonnet-4-6)**: Atlas v2 draft generation + Daily General's Brief + WW warm response generation
- **Buffer**: PSNM Facebook + Instagram connected (free tier, login: sales@palletstoragenearme.co.uk). 12 posts seeded in psnm_social_posts; posting schedule to be queued. Make.com automation not yet wired.
- **WhichWarehouse**: inbound lead webhook built + deployed; DNS+Parse config pending Monday
- **WAM auto-quote pipeline**: full end-to-end — parser, quote calc, scenario routing, WMS UI with quote panel + RH&D clipboard, response generator. 4/4 smoke tests PASS (happy_path/port_pressure/blocked/awkward_data). `api/_quote_calc.js` underscore-prefixed (not a Vercel function, safe within 12-fn limit).
- **Prospect Intelligence Engine**: Companies House harvest → score (A/B/C) → Claude enrich → Atlas dispatch. Actions routed via atlas.js (intel_harvest/intel_enrich/intel_dispatch/intel_stats/intel_prospect). Cron: 06:00 daily + Monday C-tier sweep (days_back: 1095). WMS card in Intelligence tab. Table: `psnm_intelligence_prospects`. **COMPANIES_HOUSE_API_KEY live in Vercel.** Current DB: **44 total — A:3 B:24 C:17.** Region mapping fixed (lookup table, 11 records corrected). Enrichment JSON parser fixed (robust extraction). A-tier enrichment ran: 0/3 emails found (too new, no web presence). C-tier fix: WMS Harvest button now uses days_back:1095; weekly Monday cron sweep added.

## Social Media

### PSNM — Active (as of 2026-04-28)

| Platform | Account | Followers | Status |
|----------|---------|-----------|--------|
| Facebook | PSNM Page | ~42 | ✅ Active, connected to Buffer |
| Instagram | PSNM | ~37 | ✅ Active, connected to Buffer |
| LinkedIn | PSNM Company Page | — | ⚠️ Exists, dormant — no personal account driving it |

Buffer login: sales@palletstoragenearme.co.uk (free tier). 12 posts seeded in `psnm_social_posts`. Posting schedule + queue: Ben to configure today.

**Gap:** No Ben Greenwood personal LinkedIn. Required before LinkedIn outreach (Atlas v2 Touch 2 — LinkedIn DM) can work. Week 2–3 priority.

### Other Accounts (not PSNM, do not cross-post)

| Account | Platform | Followers | Notes |
|---------|---------|-----------|-------|
| Sons of Guns | FB | ~1,000 | Phase 2 — Airbnb after Barnsley reno |
| Sons of Guns | IG | ~2,000 | Phase 2 — Airbnb after Barnsley reno |
| Co-Lab Custom Studios | IG | ~57,000 | Parked until PSNM break-even (locked plan). Future RBTR asset. |
| Co-Lab Custom Studios | FB | — | Parked (same rule) |
| RBTR | FB + IG | — | Placeholders squatted, dormant |
| Ben Greenwood | FB | — | Personal — occasional "what I'm building now" soft signal-boost OK |
| ben_son_of_a_gun | IG | — | Personal |
| Axel Brothers | — | — | Kids — personal, keep separate |

### Rules

- **Never** post PSNM content via Co-Lab or Sons of Guns audiences — algorithmic punishment, brand confusion, Riley exposure risk.
- Ben Greenwood FB (personal) may post occasional "what I'm building" content as a soft signal-boost for PSNM.
- All Buffer scheduling for PSNM uses the sales@ login, not personal email.
- Co-Lab audiences stay parked until PSNM reaches break-even (per locked plan).

---

## Phase 2 — Locked Copy (build when ready)

### Insolvency rescue outreach (NOT YET BUILT)
- **Subject:** `Stock with [failed_company]? — rapid onboarding available`
- **Body framing:** calm, professional, can-help. No specific time promises.
  - Use: "we can move fast — typically 3-5 working days from contract signed"
  - Do NOT use: "48hr rescue", "48-hour", "same-week start"
  - Tone: "You need a fast, reliable solution. We've done this before. Here's how quickly we can move."
- **When:** triggered by Companies House dissolution/insolvency event in harvest feed

---

## ATLAS V2 OUTREACH — Locked Template v2.0

**Version:** v2.0 — locked 2026-04-28
**Reference email:** `v14/api/docs/_atlas_v2_reference_email.md` (POO-CH POUCH, Grade B, Wales)
**Canonical system prompt:** `v14/api/docs/_atlas_system_prompt.md`

### Key principles

| Principle | Rule |
|-----------|------|
| **Subject** | Company name + specific hook or question. Under 60 chars. |
| **Opener** | Industry + location specific. Not generic. First sentence earns the read. |
| **Geographic argument** | Factual drive times only. Phrase: "GB's logistics heartland". |
| **Trial offer** | "First week free with 12-week commitment. Onboarding 3-5 working days. Day 5 walk-away." |
| **Onboarding timing** | "Typically 3-5 working days from contract signed. We coordinate haulier booking — minimal admin your side." |
| **Word count** | 120–170 body words. Every sentence earns its place. |
| **Sign-off** | 6 lines: Ben Greenwood / Founder / Hellaby S66 8HR / Tel / sales@ / website |

### Permanently prohibited

- "48-hour", "same-week start", "next-day" collection/onboarding
- "Zero paperwork" or "no paperwork"
- "No deposit"
- "1 in 4" or any conversion rate stat (PSNM has no verified data)
- "Population-weighted centre of Great Britain" (not defensible)
- Specific percentage savings claims ("saves 30%", "25-30% vs Midlands")
- Competitor rate benchmarking ("Midlands rates £4.50-5.50")
- "Less than a daily coffee" comparisons
- "Real facility" / "real despatch" defensive framing

### Quality gate — `_draft_validator.js` (v2.0, 2026-04-28)

Every draft is validated before entering the approval queue. Drafts with any error-severity issue are routed to `needs_revision` status in WMS (amber border, issues listed inline). Ben can Override & Approve, Reject, or Fix & Approve from the Needs Revision tab.

**Validate retroactively:** WMS → Outreach Queue → 🔍 Validate button runs `POST /api/atlas?action=validate_existing` against all `pending_approval` drafts.

**Integration points:**
- `atlas.js` `generateDrafts()` — validates after Claude response, before DB insert
- `_intelligence_core.js` `scoreAndDispatch()` — same
- `atlas.js` `validateExistingDrafts()` — retroactive scan

### Cron behaviour

- **06:00 daily**: `intel_harvest_daily` — harvests new CH company registrations into `psnm_intelligence_prospects`. **Does NOT auto-generate drafts.**
- **Draft generation**: manual only via WMS Intelligence tab → "Generate Drafts" button or `POST /api/atlas?action=intel_dispatch`
- **Dispatch**: manual only via WMS Intelligence tab → "Dispatch Approved" (or individual approve buttons)

---

## Atlas v2 Deferred (Week 2)

- Touches 2–5 (LinkedIn DM, phone script, follow-up email, decision call)
- Reply inbox monitoring + auto-reply drafts
- Drip sequence scheduling
- Multi-channel via Make.com

---

## TODO (Ben actions only)

1. **Run full initial harvest** (one-time): `curl -X POST 'https://rbtr-jarvis.vercel.app/api/atlas?action=intel_harvest' -H 'x-rbtr-auth: TOKEN' -H 'Content-Type: application/json' -d '{"batch_size":100,"days_back":365}'` — pulls last 365 days. Then run Enrich on top 50 A/B via WMS button.
2. Wire Make.com social scenario (see ~/Desktop/MASTER_AUDIT/BEN_TODO.md → Priority 7)
2. **READY — follow ~/Desktop/MASTER_AUDIT/SENDGRID_INBOUND_SETUP.md (~13 min, 3 sections):**
   - Section 1: Hostinger DNS — MX record `inbound` → `mx.sendgrid.net` priority 10
   - Section 2: SendGrid Inbound Parse — add `inbound.palletstoragenearme.co.uk`, webhook URL with secret
   - Section 3: Hostinger email filter on sales@ — forward @whichwarehouse.com/.net to `leads@inbound.palletstoragenearme.co.uk`, keep copy
3. WhichWarehouse account — Ben has emailed WW to change lead delivery to sales@palletstoragenearme.co.uk (architecture: WW → sales@ → filter → inbound subdomain → SendGrid Parse → auto-quoter)
4. `SENDGRID_INBOUND_SECRET` **already live in Vercel** — no action needed

---

## MERGE / CONSOLIDATION HISTORY

| Date | Action |
|------|--------|
| 2026-04-27 AM | System B (Vercel) built: quote, booking API, Atlas, Telegram, SendGrid |
| 2026-04-27 PM | Pass 1: RLS opened on all B-side tables, psnmwhm_store fixed |
| 2026-04-27 PM | Pass 2: Intelligence tab merged into PSNM_v14_LIVE.html |
| 2026-04-27 PM | Netlify paused (credit limit) — WMS moved to Vercel /wms.html |
| 2026-04-27 PM | ✅ Single canonical host. One URL. One repo. |
| 2026-04-28 AM | Atlas v2 deployed: draft generation, approval queue, dispatch, CRM browser, strategy tab |
| 2026-04-28 AM | All 11 smoke tests passed. 10 drafts pre-generated for top prospects. |
| 2026-04-28 AM | PWA manifest + branded icons (installable as Mac/iPhone app) |
| 2026-04-28 AM | Daily General's Brief — AI-generated ops brief replacing basic stats (fires 07:00 BST) |
| 2026-04-28 AM | Test data cleared — clean baseline for launch. Zero occupancy snapshot seeded (1602 capacity, 912 BE). |
| 2026-04-28 PM | WW lead integration shipped — psnm_ww_leads table live, inbound_email endpoint deployed, parser smoke tested (PASS). DNS+Parse config pending Monday. |
| 2026-04-28 PM | WAM auto-quote pipeline shipped — parser + `_quote_calc.js` + scenario engine + WMS UI (quote panel, RH&D clipboard, source filter). 4/4 smoke tests PASS. |
| 2026-04-28 PM | SendGrid Inbound Parse infrastructure ready — SENDGRID_INBOUND_SECRET live in Vercel, secret gate verified. Ben's manual config (DNS + SendGrid + filter) documented at ~/Desktop/MASTER_AUDIT/SENDGRID_INBOUND_SETUP.md. |

---

_This file is the canonical source of truth. Update it in the same commit whenever state changes._
