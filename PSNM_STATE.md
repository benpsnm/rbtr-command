# PSNM_STATE — Live System Truth
# Last updated: 2026-04-27
# Rule: AI tools read this file first before answering anything about PSNM state.

---

## ⚠️ TWO SYSTEMS — READ THIS FIRST

There are two separate PSNM systems. They do not share state. Always confirm which one you mean before touching anything.

### System A — Rich Operational WMS
- **URL**: https://psnm-wms.netlify.app
- **Source file**: `~/Desktop/psnm/WMS/PSNM_v14.html` (single self-contained HTML file)
- **Hosting**: Netlify (drag-and-drop deploy — no git, no CI)
- **Database**: Supabase table `psnmwhm_store` (single row `id=psnm-main`, RLS disabled, anon key read/write)
- **Contains**: Warehouse map (Aisles A–J, 1,024 racked + 454 floor + 104 open floor), Goods In, Goods Out, Stock, Log, Customers, Rates, Dashboard, Bookings, CRM, Emails, Social, Invoices, Media, Auto tabs
- **KPI strip**: pallets stored / free / % full / weekly revenue / monthly estimate
- **Who uses it**: Ben daily for warehouse operations
- **Deploy method**: drag PSNM_v14.html onto Netlify dashboard

### System B — Customer-Facing Engine
- **URL**: https://rbtr-jarvis.vercel.app
- **Source**: `~/Desktop/rbtr-command/v14/`
- **Hosting**: Vercel (git-based, auto-deploy on push to main)
- **Database tables**: `psnm_enquiries`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`, `psnm_customers`, `psnm_occupancy_snapshots`
- **Contains**: Quote widget (/quote.html), booking API (/api/atlas), T&Cs (/terms.html), Atlas priority engine, daily brief cron, social posts pipeline, WMS staff dashboard (/wms.html)
- **Who uses it**: Customers (quote), Ben (portal + dashboard), Make.com (social), Telegram (briefs + alerts)
- **Deploy method**: `vercel deploy --prod` from `v14/` directory

### PENDING: Merge
Monday's first job: merge System A and System B into one canonical WMS at one URL with one login. See "OPEN MERGE TASK" at the bottom of this file.

---

## WHAT NOT TO DO

- **Never say "the WMS"** without specifying which one. Always say either "the rich WMS at psnm-wms.netlify.app" or "the Vercel /wms.html".
- **Don't touch PSNM_v14.html** (System A) without confirming Ben means that file, not the Vercel route.
- **Don't assume the two systems share data** — they don't. `psnmwhm_store` (System A) and `psnm_enquiries` etc. (System B) are separate tables with no live link.
- **Don't deploy System A via Vercel** or System B via Netlify. They have separate hosting and separate deploy methods.

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

## Infrastructure

| System | URL | Hosting | Source | Deploy method |
|--------|-----|---------|--------|---------------|
| Rich WMS (System A) | psnm-wms.netlify.app | Netlify | `~/Desktop/psnm/WMS/PSNM_v14.html` | Drag-and-drop to Netlify |
| Customer engine (System B) | rbtr-jarvis.vercel.app | Vercel | `~/Desktop/rbtr-command/v14/` | `vercel deploy --prod` |
| Supabase DB | mpxgyobotiqcawmqlhbf | Supabase | — | Management API / SQL editor |

## Deployed Features

| Feature | System | URL / location |
|---------|--------|---------------|
| Warehouse map (Aisles A–J) | **System A** | psnm-wms.netlify.app |
| Goods In / Out / Stock / Log tabs | **System A** | psnm-wms.netlify.app |
| WMS operational KPI strip | **System A** | psnm-wms.netlify.app (top bar) |
| Quote widget | **System B** | /quote.html |
| Booking API | **System B** | /api/atlas?action=book |
| T&Cs page | **System B** | /terms.html |
| Atlas priority engine | **System B** | /api/atlas |
| WMS staff dashboard (Dashboard tab) | **System B** | /wms.html |
| Daily 7am Telegram brief | **System B** | cron: /api/cron-morning-brief |
| Booking email confirmations | **System B** | SendGrid via /api/atlas |
| Booking Telegram alerts | **System B** | /api/atlas → Telegram |
| Social posts pipeline | **System B** | /api/atlas?action=social_due/post |

## Supabase Project

- **Project ref**: `mpxgyobotiqcawmqlhbf`
- **System A table**: `psnmwhm_store` (RLS disabled, anon key, single-row warehouse state)
- **System B tables**: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`

## Integrations (live as of 2026-04-27)

- **SendGrid**: SENDGRID_API_KEY in Vercel prod — booking confirmations fire automatically
- **Telegram booking alerts**: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID=8669062243 — fires on every booking
- **Daily 7am brief**: cron-morning-brief.js mode=psnm-brief → Telegram (bot token rotation pending)
- **Social posts**: 12 posts seeded, Make.com scenario not yet wired

## TODO (Ben actions only)

1. GitHub backup: `gh auth login` → push
2. ElevenLabs key rotation (sk_2932... exposed — see BEN_TODO.md)
3. Telegram bot token rotation (@Rbtr_rocko_bot exposed — see BEN_TODO.md)
4. Wire Make.com social scenario (see BEN_TODO.md)
5. Monday: execute OPEN MERGE TASK below

---

## OPEN MERGE TASK — Monday

**Goal**: One canonical WMS at one URL with one login. Eliminate the two-system confusion permanently.

**Approach**:
- Base: extend System A (rich WMS, PSNM_v14.html) — it has the operational map and is what Ben actually uses
- Add a new tab or panel to PSNM_v14.html that reads from System B's Supabase tables (`psnm_enquiries`, `psnm_outreach_targets`, etc.) using the same anon key
- Removes need for the simpler Dashboard at Vercel /wms.html (redirect or delete that route)
- Deploy updated PSNM_v14.html to Netlify as usual

**What this means in practice**:
- PSNM_v14.html gains direct Supabase reads against `psnm_enquiries`, `psnm_outreach_targets`, `psnm_outreach_touches`
- Hot leads, today's enquiries, outreach stats pulled from real DB into the rich WMS
- The KPI strip in System A (currently localStorage-only) gets wired to live Supabase occupancy data
- Vercel /wms.html becomes a redirect to psnm-wms.netlify.app or is simply removed

**Estimated effort**: 2–3 hours Claude Code

**Do not start this task mid-session** — it requires a clean read of both files (PSNM_v14.html at 3,136 lines and the Vercel wms.html) before any edits. Reserve a full session slot.

---

## MERGE PREP COMPLETE — 2026-04-27 PM

Tighten-up Pass 1 executed. System state verified before Monday merge session:

| Check | Result |
|-------|--------|
| System A (psnm-wms.netlify.app) | PASS — 200, anon read returns psnm-main row (wms_data: cells, floor, pallets, customers) |
| psnmwhm_store RLS | DISABLED — anon key reads full row |
| System B tables (5 total) | PASS — all have anon SELECT policy with USING (true) |
| Daily cron (cron-morning-brief.js) | PASS — uses SERVICE_ROLE, reads correct tables, sends to TELEGRAM_CHAT_ID |
| Orphaned code | wms.html (572 lines) stays until merge; wms_check action in supabase-proxy stays until merge |
| SUPABASE_ANON_KEY | Confirmed in Vercel production (pulled via vercel env pull) |

**Monday session should start with**: read MERGE_PROMPT_MONDAY.md in this same directory.

---

_This file is the canonical source of truth. Update it in the same commit whenever state changes._
