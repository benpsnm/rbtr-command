# OVERNIGHT_BLOCKERS — Phase 2.6 session

Last updated 2026-04-22. Branch `phase-2-6-jarvis`.

Each blocker has a clear unblock action. Nothing here should take Ben
more than 15 minutes each.

---

## BLOCKER 1 · GitHub remote push

**State:** Local repo built, all Phase 2.6 commits local-only. Remote origin
configured (`https://github.com/benpsnm/-Users-bengreenwood-Desktop-rbtr-command-.git`)
but push failed — no cached credentials.

**Unblock:**
1. Generate a PAT at https://github.com/settings/tokens/new
   - Note: `rbtr-command-claude-code`
   - Scope: `repo` only
   - Expiration: 30 days
2. Paste the token in the chat (I mask it immediately)
3. I run `git credential approve` then push main + phase-2-6-jarvis

---

## BLOCKER 2 · Supabase email/password auth

**State:** Migration 29 (user_profiles + sarah_* tables + RLS) written but
not applied. /login page + auth proxy ready. Ben + Sarah auth.users rows
not yet created.

**Unblock (3 steps, 5 min):**
1. Paste migration 29 SQL at https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new
   (file on repo at v14/supabase/migrations/29_auth_profiles.sql)
2. In Supabase dashboard → Authentication → Providers → Email → Enable
3. In Authentication → Users → Add user:
   - ben@palletstoragenearme.co.uk (set password, mark email confirmed)
   - sarah@palletstoragenearme.co.uk (set password, mark email confirmed)
4. After both users exist, paste to /api/supabase-proxy (or run via SQL editor):

```sql
-- Ben profile
INSERT INTO user_profiles (id, role, portal_access, display_name)
SELECT id, 'ben',
       ARRAY['rbtr','psnm','ben','sarah','house','eternal','financials','landing_globals'],
       'Ben'
FROM auth.users WHERE email = 'ben@palletstoragenearme.co.uk'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role, portal_access = EXCLUDED.portal_access, display_name = EXCLUDED.display_name;

-- Sarah profile
INSERT INTO user_profiles (id, role, portal_access, display_name)
SELECT id, 'sarah',
       ARRAY['sarah','house','financials_limited','landing_globals'],
       'Sarah'
FROM auth.users WHERE email = 'sarah@palletstoragenearme.co.uk'
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role, portal_access = EXCLUDED.portal_access, display_name = EXCLUDED.display_name;
```

---

## BLOCKER 3 · Migration 30 (financial_transactions + bank_connections + house_cash_log)

**State:** Written, not applied.

**Unblock:** Paste v14/supabase/migrations/30_financials.sql in Supabase SQL editor.

---

## BLOCKER 4 · Mailgun

**State:** Domain `mg.palletstoragenearme.co.uk` added, all 5 DNS records at
Hostinger saved (2x MX + CNAME + SPF TXT + DKIM TXT). Account activation
email sent to sales@palletstoragenearme.co.uk — NOT CLICKED. SMS verification
stuck on "Too many codes requested" last night.

**Unblock:**
1. Check sales@palletstoragenearme.co.uk inbox for Mailgun activation email → click link
2. Retry SMS verification at https://app.mailgun.com/ (rate limit should have cleared)
3. If still stuck, email Mailgun support OR switch to SendGrid (code path identical, ~30 min migration)
4. Once verified: create Sending API Key, paste in chat:
   ```
   MAILGUN_API_KEY=<key>
   MAILGUN_DOMAIN=mg.palletstoragenearme.co.uk
   ```
5. I set both in Vercel and redeploy

---

## BLOCKER 5 · Anthropic tier upgrade

**State:** Org-wide 30,000 input tokens/min rate limit (Tier 0) makes bulk
sponsor research + 205-row Atlas triage impractical (~1 call/min max).

**Unblock:** Top up £30-50 at https://console.anthropic.com/settings/billing.
First charge lands on Tier 1 after 7-day age requirement. Tier 2 at $40 cumulative
with 7-day age. Tier 2 removes the practical bottleneck.

---

## BLOCKER 6 · Stripe

**State:** Stubbed per Rule 4. Schema has `stripe_payment_intent_id` column,
/public-site/quote.html shows payment element stub, /public-site/README.md
documents the 30-min wire-in path.

**Unblock tomorrow:** Ben creates Stripe account, provides keys:
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Then I flip `STRIPE_LIVE=true` in env, swap the stub in quote.html for real
Stripe Elements, add webhook endpoint for payment_intent.succeeded → writes
to financial_transactions.

---

## BLOCKER 7 · TrueLayer / Plaid Open Banking

**State:** `bank_connections` schema ready (LEGAL_SENSITIVE classification),
/financials.html shows "Open Banking — STUB" notice.

**Unblock:** Ben applies for a TrueLayer developer account
(https://console.truelayer.com/). Free tier is enough for personal use.
Once approved, provides CLIENT_ID + CLIENT_SECRET and I wire the OAuth flow
end-to-end (~2h build).

---

## BLOCKER 8 · psnm-public Vercel project (customer self-quote site)

**State:** All files in /public-site/, vercel.json configured, README.md
documents deployment. NOT deployed because creating a new Vercel project
needs Ben's interaction in the Vercel dashboard.

**Unblock:**
1. Go to https://vercel.com/new
2. Import /public-site as a new project (or Ben uses `vercel` CLI from that dir)
3. Name: `psnm-public`
4. Root directory: `public-site`
5. Framework preset: Other
6. Deploy
7. Then point `palletstoragenearme.co.uk` CNAME at `cname.vercel-dns.com`
   at Hostinger DNS (wait for Mailgun records to settle first — give it 24h)

---

## BLOCKER 9 · Solicitor review of /quote/terms DRAFT

**State:** `/public-site/quote/terms.html` contains a DRAFT UK storage T&Cs
auto-generated from standard warehouse contract templates. Flagged with a
banner: "Solicitor review required before public launch."

**Unblock:** Ben sends URL to a UK commercial solicitor for review. Expected
edits: liability caps, warehouse lien wording, GDPR clause specificity.

---

## BLOCKER 10 · WMS staff password

**State:** `/wms.html` client-side gate uses placeholder password
`change-before-hiring-staff`. Needs replacing before any real staff use it.

**Unblock:** When Ben hires first warehouse staff, set `WMS_STAFF_PASSWORD`
env in Vercel and I'll swap the placeholder for a proper env-checked flow
(via /api/supabase-proxy action='wms_check').

---

## BLOCKER 11 · Voice I/O (WS-B.9/B.10/B.11 from earlier spec)

**State:** Landing page orb is CSS-only breathing animation + click-to-legacy.
No wake word, no barge-in, no Whisper voice-in. The spec said "voice
navigation via ROCKO" — the groundwork is there (orb responds to click,
routes to legacy ROCKO) but the full wake-word + streaming is not built.

**Unblock (when ready):** Separate workstream — needs `OPENAI_API_KEY` for
Whisper, fresh session, probably 3-4h focused work. Out of scope for this
overnight.

---

## BLOCKER 12 · Legacy URL redirects

**State:** Phase 2.6 spec required old URLs `/#sponsors` to redirect to
`/rbtr/sponsors`. Legacy Command Centre still works at `/index.html#sponsors`.
New portal sidebars deep-link TO `/index.html#sponsors` (preserving existing
bookmarks) but there's no redirect FROM `/#sponsors` to the new portal.

**Reason:** Without a server-side router or hash routing JS on / (currently
the legacy index), this can't be done cleanly. Landing page is at `/landing.html`
not `/` — when Ben flips `/` to landing, legacy bookmarks will break until
redirect map is added. Logged for future polish.

---

## Everything else from earlier sessions — not blocking Phase 2.6

- Migration 28 paste (still pending — unlocks cash-log counters)
- ElevenLabs voice_id regression check (no recent reports, per Rule 10
  I'm not debugging mid-build)
- Supabase PAT revocation (already done per Ben's last message)
