# OVERNIGHT_BLOCKERS — Phase 2.6 + 2.7 + v3.3 live

Last updated 2026-04-22 12:XX. Tag `v3.3-jarvis-and-warm-leads-live`.
Merged to `main`, deployed to production **rbtr-jarvis.vercel.app**.

Ben signed in successfully. 7 portals render, extract-leads Opus 4.7
endpoint live.

---

## ✅ RESOLVED (closed since last report)

- Supabase migrations 29 + 30 + 31 applied
- Email/password auth provider enabled
- Ben + Sarah auth.users created (after one password-recreate round)
- user_profiles populated (Ben: 8 portals, Sarah: 4 portals)
- sbHeaders hotfix shipped — auth_login now works end-to-end
- Phase 2.6 + Phase 2.7 merged to `main` and deployed to production

---

## STILL OPEN

### 1 · GitHub remote push (highest priority when Ben has time)

**State:** All commits local-only. Remote origin:
`https://github.com/benpsnm/-Users-bengreenwood-Desktop-rbtr-command-.git`
— push fails with "could not read Username" (no cached credentials).

**Consequence:** No cloud backup. No Vercel GitHub-integration auto-deploy.
Production currently updates via `vercel --prod` from Ben's laptop only.

**Unblock:**
1. Generate PAT at https://github.com/settings/tokens/new (scope: `repo`, 30 days)
2. Paste in chat (I mask)
3. I run `git credential approve` → push main + phase-2-6-jarvis +
   phase-2-7-warm-ingest + all tags
4. Bonus: connect the Vercel v14 project to GitHub so future `main`
   pushes auto-deploy

---

### 2 · Supabase PAT rotation (housekeeping)

You pasted a password in plaintext during the user-reset flow
(`Hudson10$9`). Even though the user has been recreated with a fresh
password, rotate that one in Supabase → Authentication → Users if it's
still active on either user. Zero action needed if you already did it.

---

### 3 · Mailgun SMS verification (from earlier session)

Still stuck on "Too many activation codes requested". DNS records (MX/
CNAME/SPF/DKIM) all live at Hostinger. Email warming layer for Atlas
can't fire until account activation succeeds.

**Unblock options:**
- Wait 24h, retry SMS — rate limit should have cleared
- Email Mailgun support (help.mailgun.com) — usually 4-12 h reply
- Pivot to SendGrid (identical code path, simpler verify — ~30 min
  migration when you're ready)

---

### 4 · Anthropic tier upgrade

Org-wide 30k input tokens/min rate limit makes bulk sponsor research +
205-row Atlas triage impractical (1 call/min max). Top up £30-50 at
https://console.anthropic.com/settings/billing. Tier 1 lands after
first charge + 7-day age; Tier 2 at $40 cumulative.

---

### 5 · Stripe account for customer self-quote

`/public-site/quote.html` is shipped with Stripe fully stubbed (schema
has `stripe_payment_intent_id`, UI has a placeholder, TODO markers
in README.md).

When ready:
- Create Stripe account
- Get keys, set `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` in
  Vercel env for the future `psnm-public` project
- Wire Elements + Payment Intent creation (~30 min)

---

### 6 · TrueLayer / Plaid Open Banking

`bank_connections` schema ready (LEGAL_SENSITIVE). `/financials.html`
shows "Open Banking — STUB" notice. Deferred until Ben has a
TrueLayer developer account.

---

### 7 · psnm-public Vercel project (customer self-quote deploy)

Files all in `/public-site/`, NOT deployed. Needs Ben to create a
separate Vercel project via dashboard (or `vercel --project psnm-public`
from the /public-site dir). Then point `palletstoragenearme.co.uk`
CNAME at cname.vercel-dns.com.

---

### 8 · Solicitor review of /quote/terms DRAFT

UK storage T&Cs draft at `/public-site/quote/terms.html` with banner
flagging "DRAFT — Solicitor review required before public launch."

---

### 9 · WMS staff password

`/wms.html` uses placeholder `change-before-hiring-staff`. Replace via
`WMS_STAFF_PASSWORD` env before any real staff use it.

---

### 10 · Voice I/O (wake word / barge-in / Whisper)

Never built. Landing orb is CSS-only, click → legacy ROCKO chat.
Separate 3-4 h workstream when ready, needs `OPENAI_API_KEY`.

---

### 11 · Legacy `/` vs new `/landing`

`/` still renders the legacy 71-section Command Centre. `/landing.html`
is the new Jarvis landing. Login currently redirects to `?r=/` by
default; pass `?r=/landing.html` to land on new. Future cutover:
make landing.html the default `/`, redirect old `/#<hash>` URLs to
new `/portal/<hash>` equivalents.

---

### 12 · Preview Vercel env scope

Known Vercel CLI bug: env vars set via CLI don't always reach the
Preview scope. Production has everything needed. Preview deploys
return 500 on supabase-proxy auth actions. Non-blocking — production
works.
