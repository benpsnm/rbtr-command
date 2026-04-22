# OVERNIGHT REPORT — v3.3 Jarvis + Warm Leads live

**Session end:** 2026-04-22 · merge + prod deploy confirmed
**Branch:** `main` at `ac3e9db` (hotfix), tag `v3.3-jarvis-and-warm-leads-live` at `a34889c`
**Production URL:** **https://rbtr-jarvis.vercel.app**
**Login:** https://rbtr-jarvis.vercel.app/login.html?r=/landing.html
**Ben verified sign-in and landed on /landing.html with 7 portals visible.**

---

## WHAT'S LIVE RIGHT NOW

| Path | Purpose | Auth |
|---|---|---|
| `/` | Legacy 71-section Command Centre (untouched) | none |
| `/login.html` | Email/password login | — |
| `/landing.html` | New Jarvis landing with 7 portals + orb | required |
| `/rbtr.html` ... `/eternal.html` | 7 portal shells | required, portal_access gated |
| `/financials.html` | 5-entity cash dashboard, manual log + CSV | required |
| `/wms.html` | Password-gated warehouse staff view | client password |
| `/api/extract-leads` | Claude Opus 4.7 structured lead extraction | server-side ANTHROPIC_API_KEY |
| `/api/supabase-proxy` | CRUD + auth_login / auth_me / auth_logout | same-origin exempt + token |
| Legacy `/api/*` endpoints | briefing-data, jarvis, atlas, morning-brief, tts, voice-studio, telegram, sponsor-research, cron-* | Unchanged |

## SCHEMA

Migrations applied in Supabase this session:
- 29 → user_profiles + sarah_goals + sarah_reflections + RLS
- 30 → financial_transactions + bank_connections + house_cash_log + RLS
- 31 → psnm_quotes + columns on psnm_enquiries / psnm_outreach_touches

## USERS

| Email | UUID | Role | Portal access |
|---|---|---|---|
| ben@rbtr.co.uk | 38b3636a-5d6b-434e-8d09-294fdd4af77d | ben | rbtr, psnm, ben, sarah, house, eternal, financials, landing_globals |
| sarah@rbtr.co.uk | f4bcaf76-b03d-4f95-a568-02fcc819b839 | sarah | sarah, house, financials, landing_globals |

## TEST THESE NEXT

**Priority 1 — Warm Leads ingestion (core survival feature)**
- `#sec-psnm-warm` section at https://rbtr-jarvis.vercel.app/#sec-psnm-warm
- Paste a WhichWarehouse email or past quote thread → Extract
- Preview table should show parsed leads with fields editable
- Tick rows → Import → Warm List tab ranks HOT/WARM/COLD/DEAD
- Tap-to-call / WhatsApp / mail / outcome-log buttons open respective apps

**Priority 2 — Sarah user**
- Log out (👤 top-right)
- Sign in as `sarah@rbtr.co.uk`
- Should see 3 portals only (Sarah, House, Financials)

**Priority 3 — Financials**
- /financials.html → 5 entity cards render
- Click [Log] on any entity → enter £ → cash logged
- Upload a test CSV to see the parser

---

## COMMIT HISTORY (this session)

```
ac3e9db hotfix: define sbHeaders() at module scope in supabase-proxy
a34889c v3.3: Jarvis landing + auth + portals + warm leads ingestion (merge)
3fe1b7f phase-2-7: reconcile untracked V14 working copy
cb55154 phase-2-7: port extract-leads endpoint to Vercel api/
9b16668 phase-2-7: WS1 warm-lead ingestion + ranked-list UI (parallel session)
c590103 phase-2-6: OVERNIGHT_REPORT updated
f9875b1 phase-2-6: VERSION bump v3.2-jarvis-draft
6045049 phase-2-6: WS1 fix auth_me 401 ordering
ec5c733 phase-2-6: update OVERNIGHT_BLOCKERS
731e98d phase-2-6: WS6 /wms.html
a993198 phase-2-6: WS5 /public-site
8d8f03f phase-2-6: WS4 /financials portal
438bf41 phase-2-6: WS3 portal shells
6ccdbff phase-2-6: WS2 /landing.html
2a860e8 phase-2-6: WS1 /login + auth-guard + 403
bae7cb5 phase-2-6: WS1 auth actions on supabase-proxy
50f98d3 phase-2-6: WS4 migration 30
b856938 phase-2-6: WS1 migration 29
10bf5a1 phase-2-6: bootstrap
c9651f5 Initial commit — baseline
```

Tag `v3.3-jarvis-and-warm-leads-live` on `a34889c` (parent of hotfix `ac3e9db`).

---

## EXIT CRITERIA CHECK

- [x] Migrations 29, 30, 31 applied to Supabase
- [x] Email/password auth enabled
- [x] Ben + Sarah users + user_profiles populated
- [x] Production URL accessible, Ben signed in
- [x] #sec-psnm-warm section live in v14/public/index.html
- [x] Paste → Extract flow tested (Northmark Logistics sample extracted cleanly via Opus 4.7)
- [x] Phase 2.6 + Path 2 merged on a single commit
- [x] v3.3-jarvis-and-warm-leads-live tag set locally
- [x] Production serves new Jarvis + warm leads
- [x] Ben confirmed "im in"

## DEFERRED / OPEN

- [ ] `git push origin main --tags` — awaiting PAT (OVERNIGHT_BLOCKERS §1)
- [ ] Vercel ↔ GitHub integration for auto-deploys
- [ ] Sarah user end-to-end test (Ben to do)
- [ ] Warm-leads full round-trip test (Ben to do)
- [ ] Legacy-URL redirect map
- [ ] Mailgun / Stripe / TrueLayer / Anthropic tier upgrade (OVERNIGHT_BLOCKERS §3-7)

---

## ROLLBACK PATH

If production breaks:

```
cd /Users/bengreenwood/Desktop/rbtr-command/v14
git -C .. checkout main
git -C .. reset --hard v3.2-jarvis-draft   # pre-merge baseline
vercel --prod --yes
```

v3.2-jarvis-draft predates the merge and was the last stable production
tag before v3.3.

---

## WHAT I DIDN'T DO

Per Rule 10 (don't debug voice_id mid-build) and scope decisions:

- Voice nav / wake word / Whisper transcription — deferred
- Full portal interior rewrite (sections deep-link to legacy `/#hash`)
- psnm-public separate Vercel project deploy
- Mailgun warming layer live (account not activated)

All logged in OVERNIGHT_BLOCKERS.md.
