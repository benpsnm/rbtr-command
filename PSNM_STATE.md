# PSNM_STATE — Live System Truth
# Last updated: 2026-04-27 (Pass 2 — WMS Merge Complete)
# Rule: AI tools read this file first before answering anything about PSNM state.

---

## ✅ MERGE COMPLETE — 2026-04-27

The two-system confusion is resolved. There is now **one canonical WMS**.

---

## ONE SYSTEM — THE CANONICAL WMS

### The WMS — psnm-wms.netlify.app
- **URL**: https://psnm-wms.netlify.app
- **Source file**: `~/Desktop/psnm/WMS/PSNM_v14_LIVE.html` (single self-contained HTML, 4,078 lines)
- **Hosting**: Netlify (drag-and-drop deploy — no git, no CI)
- **Deploy method**: drag `PSNM_v14_LIVE.html` onto Netlify dashboard
- **Databases**:
  - `psnmwhm_store` — warehouse operational state (cells, pallets, customers, movements). RLS disabled, anon key read/write.
  - `psnm_enquiries`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_occupancy_snapshots` — Intelligence tab live data (anon SELECT via USING(true) policies)
- **Tabs**: Map, Goods In, Goods Out, Stock, Log, Customers, Rates, Dashboard, Tasks, CRM, Scripts, Revenue, Compliance, Links, Invoicing, Statements, Suppliers, **🧠 Intelligence** (new)
- **Intelligence tab sections**: KPI strip (warehouse + pipeline), Enquiries Pipeline, Hot Leads, Outreach Summary, Occupancy Trend
- **Who uses it**: Ben daily for all warehouse operations + pipeline view

### Customer-Facing Engine — rbtr-jarvis.vercel.app
- **URL**: https://rbtr-jarvis.vercel.app
- **Source**: `~/Desktop/rbtr-command/v14/`
- **Hosting**: Vercel (git-based, auto-deploy on push to main)
- **Contains**: Quote widget (/quote.html), booking API (/api/atlas), T&Cs (/terms.html), Atlas priority engine, daily brief cron, social posts pipeline
- **/wms.html**: Now a redirect → https://psnm-wms.netlify.app
- **Who uses it**: Customers (quote), Make.com (social), Telegram (briefs + alerts)
- **Deploy method**: `vercel deploy --prod` from `v14/` directory

---

## WHAT NOT TO DO

- **Do NOT edit PSNM_v14.html** (3,136 lines, outdated). The live source is `PSNM_v14_LIVE.html` (4,078 lines).
- **Do NOT deploy the WMS via Vercel** — WMS is on Netlify, drag-and-drop only.
- **Do NOT use the service role key in client-side code** — anon key only in PSNM_v14_LIVE.html.
- **Do NOT use the old System A / System B terminology** — the merge is done. One WMS.

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
| WMS (canonical) | psnm-wms.netlify.app | Netlify | `~/Desktop/psnm/WMS/PSNM_v14_LIVE.html` | Drag-and-drop to Netlify |
| Customer engine | rbtr-jarvis.vercel.app | Vercel | `~/Desktop/rbtr-command/v14/` | `vercel deploy --prod` |
| Supabase DB | mpxgyobotiqcawmqlhbf | Supabase | — | Management API / SQL editor |

## Deployed Features

| Feature | Where |
|---------|-------|
| Warehouse map (Aisles A–J) | psnm-wms.netlify.app → Map tab |
| Goods In / Out / Stock / Log | psnm-wms.netlify.app → respective tabs |
| WMS operational KPI strip | psnm-wms.netlify.app → top bar |
| Dashboard (warehouse KPIs) | psnm-wms.netlify.app → Dashboard tab |
| 🧠 Intelligence tab | psnm-wms.netlify.app → Intelligence tab |
| Quote widget | rbtr-jarvis.vercel.app/quote.html |
| Booking API | rbtr-jarvis.vercel.app/api/atlas?action=book |
| T&Cs page | rbtr-jarvis.vercel.app/terms.html |
| Atlas priority engine | rbtr-jarvis.vercel.app/api/atlas |
| Daily 7am Telegram brief | cron: /api/cron-morning-brief |
| Booking email confirmations | SendGrid via /api/atlas |
| Booking Telegram alerts | /api/atlas → Telegram |
| Social posts pipeline | /api/atlas?action=social_due/post |
| /wms.html | Redirect → psnm-wms.netlify.app |

## Supabase Project

- **Project ref**: `mpxgyobotiqcawmqlhbf`
- **WMS table**: `psnmwhm_store` (RLS disabled, anon key, single-row warehouse state)
- **Pipeline tables**: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`
- **All pipeline tables**: anon SELECT policy `USING (true)` active

## Integrations (live as of 2026-04-27)

- **SendGrid**: SENDGRID_API_KEY in Vercel prod — booking confirmations fire automatically
- **Telegram booking alerts**: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID=8669062243 — fires on every booking
- **Daily 7am brief**: cron-morning-brief.js mode=psnm-brief → Telegram (bot token rotation pending)
- **Social posts**: 12 posts seeded, Make.com scenario not yet wired

## TODO (Ben actions only)

1. **Deploy merged WMS to Netlify**: drag `~/Desktop/psnm/WMS/PSNM_v14_LIVE.html` onto the Netlify dashboard for psnm-wms.netlify.app. This activates the Intelligence tab live. (5 min)
2. ElevenLabs key rotation (sk_2932... exposed — see BEN_TODO.md)
3. Telegram bot token rotation (@Rbtr_rocko_bot exposed — see BEN_TODO.md)
4. Wire Make.com social scenario (see BEN_TODO.md)

---

## MERGE COMPLETE — 2026-04-27 Pass 2

| Check | Result |
|-------|--------|
| Intelligence tab injected | ✅ 3-point injection into PSNM_v14_LIVE.html |
| All 4 Supabase queries | ✅ PASS (column names verified via Management API) |
| showPane hook | ✅ `loadIntelligence()` wired |
| Vercel /wms.html | ✅ Replaced with meta-redirect → psnm-wms.netlify.app |
| Vercel deploy | ✅ Deployed (meta redirect confirmed live) |
| Netlify deploy | ⏳ **Ben action** — drag PSNM_v14_LIVE.html onto Netlify dashboard |
| Source file | `~/Desktop/psnm/WMS/PSNM_v14_LIVE.html` (4,078 lines) |

---

_This file is the canonical source of truth. Update it in the same commit whenever state changes._
