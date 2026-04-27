# PSNM_STATE — Live System Truth
# Last updated: 2026-04-28 (Atlas v2 — full operational build deployed)
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
- **Pipeline tables**: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_offer_config`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`, `psnm_atlas_drafts`, `psnm_atlas_config`
- **All pipeline tables**: anon SELECT policy `USING (true)` active
- **psnm_atlas_drafts**: stores generated email drafts (status: pending_approval → approved/rejected → sent/failed)
- **psnm_atlas_config**: single row `id='main'`, daily_send_limit=50, paused=false, tone_mix='balanced'

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

## Integrations (live as of 2026-04-28)

- **SendGrid**: booking confirmation emails + Atlas v2 cold outreach dispatch
- **Telegram**: booking alerts + daily 7am brief → TELEGRAM_CHAT_ID=8669062243
- **Anthropic API (claude-sonnet-4-6)**: Atlas v2 draft generation (six-framework cold emails)
- **Social posts**: 12 posts seeded in psnm_social_posts, Make.com not yet wired

## Atlas v2 Deferred (Week 2)

- Touches 2–5 (LinkedIn DM, phone script, follow-up email, decision call)
- Reply inbox monitoring + auto-reply drafts
- Drip sequence scheduling
- Multi-channel via Make.com

---

## TODO (Ben actions only)

1. Wire Make.com social scenario (see ~/Desktop/MASTER_AUDIT/BEN_TODO.md → Priority 7)

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

---

_This file is the canonical source of truth. Update it in the same commit whenever state changes._
