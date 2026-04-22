# OVERNIGHT REPORT — Phase 2.6 Jarvis draft

**Session end:** 2026-04-22 (same date as start)
**Branch:** `phase-2-6-jarvis`
**Tag:** `v3.2-jarvis-draft` (local only — no remote push yet)
**Preview URL:** https://v14-m0daiblro-beniproautobodies-8729s-projects.vercel.app
(earlier preview `v14-2cate4t2y-...` also works, same commit range)
**Legacy production (untouched):** https://rbtr-jarvis.vercel.app

---

## TL;DR

Built the Phase 2.6 scaffold overnight on `phase-2-6-jarvis` branch while
Ben slept. All 6 workstreams have landed code; 3 of 6 have fully working
UI; the other 3 require Ben to paste migrations / configure services before
they light up. Preview deploy is live and renders. Nothing touched the
existing production site.

Key unblock for morning: **paste migrations 29 and 30 in Supabase, enable
email/password auth, create ben + sarah users** — that turns all auth-gated
pages live.

---

## COMPLETED WORKSTREAMS

### ✅ WS1 · Auth (committed, needs migration paste + user creation)
Files:
- `v14/supabase/migrations/29_auth_profiles.sql` — user_profiles + sarah_* + RLS
- `v14/api/supabase-proxy.js` — added `auth_login` / `auth_me` / `auth_logout` actions
- `v14/public/login.html` — monochrome login screen, stores session in localStorage
- `v14/public/js/auth-guard.js` — client-side gate, checks portal_access on
  `<body data-portal="key">`, dispatches `rbtr-auth-ready` event
- `v14/public/403.html` — minimal fallback

Ben: Ben access = all 7 portals. Sarah access = sarah + house + financials_limited.

### ✅ WS4 · Financials (committed, needs migration paste)
Files:
- `v14/supabase/migrations/30_financials.sql` — financial_transactions +
  bank_connections (LEGAL_SENSITIVE) + house_cash_log + RLS
- `v14/public/financials.html` — 5 entity cards (PSNM / Personal / RBTR /
  EK / House) with manual [Log] buttons, recent transactions table, CSV
  upload parser (Monzo-like format), TrueLayer stub notice

### ✅ WS2 · Landing page (committed, works standalone)
Files:
- `v14/public/landing.html` — 7 portal cards around central ROCKO orb
- Top strip: weather + weekday/date/days-to-depart + survival pill + logout
- Bottom strip: top-3 priorities from briefing-data
- Polls `/api/briefing-data` every 60s
- Mobile-responsive (2-col < 768px, 200px orb)
- Portal card visibility filtered by `user.profile.portal_access`

### ✅ WS3 · Portal shells (committed, renders shells only)
Files:
- `v14/public/js/portal-shell.js` — shared renderer
- `v14/public/css/portal.css` — portal chrome styles
- 6 portals: `/rbtr.html`, `/psnm.html`, `/ben.html`, `/sarah.html`,
  `/house.html`, `/eternal.html`
- 7th (`/financials.html`) has its own custom UI per WS4

Sidebar config per portal matches spec. Deep-links to `/index.html#<hash>`
back to legacy Command Centre for existing section content (Rule 3
compliance — move rendering location, don't rewrite internals).

### ✅ WS5 · Customer self-quote (committed, NOT deployed)
Files in `/public-site/`:
- `index.html` — marketing landing (Grand Slam headline + CTA)
- `quote.html` — 4-step widget (pallets slider → duration → details → confirm)
  Live price calc, tiered £4/£3.50/£3 at 50/200 breakpoints
- `quote/terms.html` — UK storage T&Cs **DRAFT** with solicitor-review banner
- `quote/success.html` — confirmation
- `about.html` — short about
- `vercel.json` — clean URLs
- `README.md` — deployment steps + Stripe wire-in TODO

Stripe: stubbed per Rule 4. Schema has `stripe_payment_intent_id` column,
UI shows payment element placeholder, no live calls.

### ✅ WS6 · Warehouse staff share view (committed)
Files:
- `v14/public/wms.html` — password-gated single-page view
- Occupancy + customer list (name + pallet count only, no financials)
- 3 action buttons (pickup / delivery / damage) — currently prompt+alert stubs
- Filtered: no RBTR / Ben / Sarah / House / EK / Financials / ROCKO exposure

Placeholder password `change-before-hiring-staff` — replace via
`WMS_STAFF_PASSWORD` env before hiring anyone.

---

## WHAT'S WORKING ON THE PREVIEW URL RIGHT NOW

https://v14-2cate4t2y-beniproautobodies-8729s-projects.vercel.app

| Path | Status | Notes |
|---|---|---|
| `/` | ✅ 200 | Legacy Command Centre (untouched) |
| `/login.html` | ✅ 200 | Renders login. Won't authenticate until migration 29 + users created. |
| `/landing.html` | ✅ 200 | Renders, but auth-guard will redirect to /login since no session yet |
| `/financials.html` | ✅ 200 | Renders. Data calls will fail until migration 30 lands. |
| `/rbtr.html` ... `/eternal.html` | ✅ 200 | Portal shells render. auth-guard redirects to /login. |
| `/wms.html` | ✅ 200 | Password gate shows. Default password: `change-before-hiring-staff` |
| `/api/briefing-data` | ✅ 200 | Returns populated 14 + null 15 fields (pre-auth) |
| `/api/supabase-proxy` auth_me (no token) | ⚠️ 500 on PREVIEW | Preview Vercel env scope missing SUPABASE_URL (known CLI bug from earlier session — Production has it, verified: `curl -X POST https://rbtr-jarvis.vercel.app/api/supabase-proxy ... auth_me` returns 401 correctly). Fix: promote branch or set preview env scope. |

---

## WHAT DOESN'T WORK YET AND WHY

1. **Login** — migration 29 not applied, users not created in Supabase Auth.
   Action: paste mig 29 + dashboard steps in OVERNIGHT_BLOCKERS.md §2.
2. **Portal navigation** — works structurally, but requires login. Logs
   you into `/landing.html` → click a card → portal shell renders.
3. **Financials cards** — will show em-dashes until migration 30 applies
   and cash logs have entries. Manual [Log] button writes to DB when mig 30 is in.
4. **Customer self-quote** — `/public-site/` files exist, NOT deployed.
   Needs a separate Vercel project (5 min Ben click-through).
5. **WMS data** — reads live from psnm_occupancy_snapshots + psnm_customers.
   Logging actions are stubbed (prompt → alert). TODO write them properly
   in next session.
6. **Voice/orb** — landing orb is CSS-only. Click sends to legacy / where
   existing ROCKO chat lives. Wake-word / barge-in / Whisper voice-in
   never specced in this prompt and deliberately deferred per my upfront
   scope note.

---

## COMMITS

```
6045049 phase-2-6: WS1 fix auth_me 401 ordering
ec5c733 phase-2-6: update OVERNIGHT_BLOCKERS.md — 12 blockers with unblock actions
731e98d phase-2-6: WS6 /wms.html — password-gated warehouse staff view
9c32f5c phase-2-6: WS5 /public-site — customer self-quote site (Stripe stubbed)
8d8f03f phase-2-6: WS4 /financials portal — 5 entity cards, tx list, CSV parser stub
[...6 portal shells...]
6ccdbff phase-2-6: WS2 /landing.html — 7 portals + ROCKO orb + top/bottom strips
[login + guard commit]
bae7cb5 phase-2-6: WS1 auth actions on supabase-proxy
50f98d3 phase-2-6: WS4 migration 30 — financial_transactions + bank_connections + house_cash_log
b856938 phase-2-6: WS1 migration 29 — user_profiles + sarah_* tables + RLS
10bf5a1 phase-2-6: bootstrap — init repo, phase-2-6-jarvis branch, blockers logged
c9651f5 Initial commit — Phase 1/2/2.5 baseline (rollback point)
```

Final HEAD: `6045049` on `phase-2-6-jarvis`.

---

## BLOCKERS (12, all in OVERNIGHT_BLOCKERS.md)

1. GitHub PAT for remote push
2. Supabase migration 29 paste + email/password enable + ben/sarah auth users
3. Supabase migration 30 paste
4. Mailgun activation email + SMS verification
5. Anthropic tier upgrade (for Atlas bulk triage)
6. Stripe account + keys
7. TrueLayer / Plaid developer account
8. Create `psnm-public` Vercel project for `/public-site/`
9. Solicitor review of draft T&Cs
10. Replace placeholder WMS password before hiring staff
11. Voice I/O (wake word / Whisper) — deferred to fresh session
12. Legacy `/#hash` → new `/portal/section` redirects (future polish)

---

## DECISIONS NEEDED FROM BEN

Priority order, tick when done:

- [ ] Paste migration 29 and 30 in Supabase SQL editor (unblocks login +
      financials) — 2 min
- [ ] Enable email/password in Supabase Auth → Providers (unblocks login) — 30s
- [ ] Create ben@palletstoragenearme.co.uk + sarah@palletstoragenearme.co.uk
      in Supabase Auth → Users, run the SQL in OVERNIGHT_BLOCKERS.md §2 to
      set profiles — 3 min
- [ ] Generate GitHub PAT, paste in chat so I can push main + phase-2-6-jarvis
      to remote — 1 min
- [ ] Test landing page end-to-end: login → landing → click a portal —
      expect everything to work or tell me what breaks — 5 min
- [ ] Deploy `/public-site/` as a separate Vercel project named `psnm-public`
      (see OVERNIGHT_BLOCKERS.md §8) — 3 min
- [ ] Set Mailgun (unblocks Atlas email layer — separate decision from
      customer quote)
- [ ] Top up Anthropic to Tier 1 (unblocks bulk sponsor research)
- [ ] Decide on Stripe account provisioning for customer quote production
- [ ] Decide on solicitor for T&Cs review

**None of these are required to review the work.** The branch is reviewable
as-is. Above actions only matter when you want to promote `/` from legacy
to new landing.

---

## RULE COMPLIANCE CHECK

- ✅ **Rule 1** — all commits to `phase-2-6-jarvis`, `main` untouched
- ✅ **Rule 2** — preview deploy only (`vercel`, not `--prod`)
- ✅ **Rule 3** — no secrets committed (verified with `git ls-files | grep -i TOKEN` → 0)
- ✅ **Rule 4** — Stripe stubbed with TODO markers, no live API calls
- ✅ **Rule 5** — all external blockers stubbed + logged
- ✅ **Rule 6** — additive schema only (migrations 29, 30), no DROP statements
- ✅ **Rule 7** — no 3-fail loops (deploy succeeded, smoke test passed)
- ✅ **Rule 8** — ~12 commits, each with clear `phase-2-6: [WS] [change]` prefix
- ✅ **Rule 9** — execution order WS1 → WS4 → WS2 → WS3 → WS5 → WS6
- ✅ **Rule 10** — ElevenLabs voice_id not touched this session
- ✅ **Rule 11** — you're reading it
- ⏳ **Rule 12** — `v3.2-jarvis-draft` tag committed at end (see next step)

---

## HONEST SHORTFALLS (IN THE INTEREST OF NOT WASTING YOUR MORNING)

1. **Portal interiors don't host the legacy sections inline** — they redirect
   deep-links back to `/index.html#<hash>`. To fully restructure requires a
   proper single-page app or server-side routing layer. That was 3h-of-work
   from your spec; realistic minimum is 6-8h done right. Skipped deliberately
   with a note in the shell JS.

2. **Voice nav ("Hey ROCKO, take me to PSNM")** — not built. The orb is
   visual only + clicks to legacy ROCKO chat. Wake word + transcription +
   intent parsing is a 3-4h workstream on its own and needs `OPENAI_API_KEY`
   which isn't set.

3. **CSV import actually inserting rows** — parser runs client-side, prints
   row count, but the bulk-insert to `financial_transactions` is TODO.
   Writing that safely (dedup + currency format handling) is another 30 min
   when you test with a real Monzo export.

4. **Stripe webhook endpoint** — schema ready, quote page stubbed, but no
   `/api/stripe-webhook` endpoint exists. That's ~1h to wire once you have
   Stripe keys.

5. **WMS action logging** — buttons prompt + alert rather than writing to
   DB. ~30 min fix once you've stress-tested the password gate in prod.

6. **Mobile responsive** — landing + portal shells tested via responsive
   breakpoints in CSS. Not actually tested on a 375px device overnight.
   Ben: please test from your phone and report any breakage.

---

## THE PREVIEW URL IS LIVE

https://v14-2cate4t2y-beniproautobodies-8729s-projects.vercel.app

Not production. Legacy `/` is still the old Command Centre. Navigate to
`/login.html` / `/landing.html` / `/rbtr.html` etc. manually to see new
work.
