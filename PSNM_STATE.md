# PSNM_STATE — Live System Truth
# Last updated: 2026-04-27 (single-host consolidation — Vercel only)
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
| `/api/atlas` | Booking, Atlas priority engine, social pipeline |
| `/api/cron-morning-brief` | Daily 7am Telegram brief |
| `/api/supabase-proxy` | Auth + DB proxy |

---

## WMS Tabs (at /wms.html)

Map · Goods In · Goods Out · Stock · Log · Customers · Rates · Dashboard · Tasks · CRM · Scripts · Revenue · Compliance · Links · Invoicing · Statements · Suppliers · **🧠 Intelligence**

**Intelligence tab** reads live from Supabase:
- KPI strip: warehouse occupancy (from S state) + pipeline stats
- Enquiries Pipeline (psnm_enquiries)
- Hot Leads (psnm_outreach_targets, ordered by priority_score)
- Outreach Summary (psnm_outreach_touches)
- Occupancy Trend (psnm_occupancy_snapshots, last 7)

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
- **Pipeline tables**: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`
- **All pipeline tables**: anon SELECT policy `USING (true)` active

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

## Integrations (live as of 2026-04-27)

- **SendGrid**: booking confirmation emails fire on every booking
- **Telegram**: booking alerts + daily 7am brief → TELEGRAM_CHAT_ID=8669062243
- **Social posts**: 12 posts seeded in psnm_social_posts, Make.com not yet wired

---

## TODO (Ben actions only)

1. ElevenLabs key rotation (sk_2932... exposed — see BEN_TODO.md)
2. Telegram bot token rotation (@Rbtr_rocko_bot — see BEN_TODO.md)
3. Wire Make.com social scenario (see BEN_TODO.md)

---

## MERGE / CONSOLIDATION HISTORY

| Date | Action |
|------|--------|
| 2026-04-27 AM | System B (Vercel) built: quote, booking API, Atlas, Telegram, SendGrid |
| 2026-04-27 PM | Pass 1: RLS opened on all B-side tables, psnmwhm_store fixed |
| 2026-04-27 PM | Pass 2: Intelligence tab merged into PSNM_v14_LIVE.html |
| 2026-04-27 PM | Netlify paused (credit limit) — WMS moved to Vercel /wms.html |
| 2026-04-27 PM | ✅ Single canonical host. One URL. One repo. |

---

_This file is the canonical source of truth. Update it in the same commit whenever state changes._
