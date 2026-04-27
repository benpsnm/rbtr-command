# PSNM_STATE — Live System Truth
# Last updated: 2026-04-27
# Rule: AI tools read this file first before answering anything about PSNM state.

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

## Systems

- **Rich WMS**: psnm-wms.netlify.app — syncing to `psnmwhm_store` table in Supabase (RLS disabled; anon key read/write). Last known state: 2026-03-28. Fixed 2026-04-27 (RLS was blocking anon reads).
- **Command Centre / RBTR portal**: rbtr-jarvis.vercel.app
- **Quote widget**: rbtr-jarvis.vercel.app/quote.html
- **T&Cs**: rbtr-jarvis.vercel.app/terms.html
- **WMS staff view (with Dashboard)**: rbtr-jarvis.vercel.app/wms.html (passcode-gated)

## Supabase Project

- Project ref: `mpxgyobotiqcawmqlhbf`
- Key tables: `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_social_posts`, `psnmwhm_store`

## Integrations (live)

- **Email confirmations**: SendGrid (SENDGRID_API_KEY set in Vercel prod) — fires on every booking
- **Telegram booking alerts**: firing on every booking (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID=8669062243 set)
- **Daily 7am brief**: cron-morning-brief.js mode=psnm-brief → Telegram (awaiting TELEGRAM_BOT_TOKEN rotation)
- **Social posts**: 12 posts seeded in psnm_social_posts, Make.com scenario not yet wired

## TODO (Ben actions only)

1. GitHub backup: gh auth login → push
2. ElevenLabs key rotation (sk_2932... exposed)
3. Telegram bot token rotation (@Rbtr_rocko_bot exposed)
4. Wire Make.com social scenario
5. Paste full PSNM_STATE.md content here when available

---

_This file is the canonical source of truth. Update it in the same commit whenever state changes._
