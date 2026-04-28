# PSNM_STATE — Live System Truth
# Last updated: 2026-04-28 (social media accounts documented)
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
- Onboarding fee: £50 (waived for 50+ pallets)

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
- **Pipeline tables**: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`, `psnm_atlas_drafts`, `psnm_atlas_config`, `psnm_ww_leads`
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

## Atlas v2 Deferred (Week 2)

- Touches 2–5 (LinkedIn DM, phone script, follow-up email, decision call)
- Reply inbox monitoring + auto-reply drafts
- Drip sequence scheduling
- Multi-channel via Make.com

---

## TODO (Ben actions only)

1. Wire Make.com social scenario (see ~/Desktop/MASTER_AUDIT/BEN_TODO.md → Priority 7)
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
