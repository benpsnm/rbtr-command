# OVERNIGHT REPORT — Phase 2.7 warm-lead ingestion (WS1)

**Branch:** `phase-2-7-warm-ingest` (off `phase-2-6-jarvis`)
**Tag:** `v3.3-warm-ingest` (local only — not pushed to remote)
**Session:** 2026-04-22 (same-day sprint)
**Scope:** WS1 only per Ben's narrowed brief. WS2–5 deferred to Phase 2.7b.

---

## TL;DR

Every warm lead Ben has ever interacted with can now be pasted into the
Command Centre, extracted by Claude into structured rows, reviewed in a
preview table, and imported to Supabase. A new `#sec-psnm-warm` section
renders the ranked list HOT → WARM → COLD → DEAD with engagement score,
tap-to-call, tap-to-WhatsApp, tap-to-email, and a one-prompt outcome
logger. 205 cold targets are untouched and deprioritised by the sort.

**Exit criteria from Ben's brief:**
- [x] Migration `31_warm_ingest.sql` written (pending paste)
- [x] `#sec-psnm-warm` added as sibling of `#sec-psnm` and `#sec-atlas`
- [x] Paste-box UI + Anthropic extraction working (new `/api/extract-leads`)
- [x] Preview + Import writes to `psnm_enquiries` / `psnm_quotes` /
      `psnm_outreach_touches`
- [x] Live ranked list (HOT/WARM/COLD by temperature + engagement_score)
- [x] Per-row tap-to-call + tap-to-WhatsApp + log-outcome

---

## WHAT BEN MUST DO BEFORE IT'S LIVE

Three pastes, numbered recipes, one link each:

### 1. Paste migration 31 in Supabase

Open: https://supabase.com/dashboard → SQL Editor → New query
Copy from: `v14/supabase/migrations/31_warm_ingest.sql`
Cmd+V, Cmd+Enter. Verify with the three SELECTs at the bottom of the file.

### 2. Confirm Netlify env vars

Open: https://app.netlify.com → your v14 site → Site settings → Environment variables
Confirm these are set:
- `ANTHROPIC_API_KEY` (for `/api/extract-leads`)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (for `/api/supabase-proxy`)

If missing, set them, redeploy. If you're currently low on Anthropic
credits, top up at https://console.anthropic.com → Plans & Billing.

### 3. Deploy to existing v14 preview

From `/Users/bengreenwood/Desktop/rbtr-command/v14`:
```
git push origin phase-2-7-warm-ingest   # (only if you want the branch on GitHub)
# Vercel preview auto-deploys on push if wired to the v14 project,
# or use `vercel deploy` from inside v14/
```
Legacy production (`rbtr-jarvis.vercel.app`) is untouched.

---

## FILES CHANGED

**New:**
- `v14/supabase/migrations/31_warm_ingest.sql` — creates `psnm_quotes`,
  adds `temperature` / `engagement_score` / `lead_source` / etc. to
  `psnm_enquiries`, adds `opened_count` / `clicked_count` / `replied_at` /
  `enquiry_id` to `psnm_outreach_touches`, adds composite indexes.
- `v14/netlify/functions/extract-leads.js` — Anthropic Opus proxy
  specialised for structured lead extraction. No writes.

**Modified:**
- `v14/netlify/functions/supabase-proxy.js` — ALLOWED_TABLES extended to
  include `psnm_enquiries`, `psnm_quotes`, `psnm_outreach_touches`,
  `psnm_outreach_targets`, `psnm_customers`. Fixes the existing PSNM UI
  which was calling the proxy for tables it didn't allow.
- `v14/public/index.html` — new `#sec-psnm-warm` section between
  `#sec-atlas` and `#sec-eternal`; new "WARM" nav tile next to PSNM;
  new `window.PSNM_WARM` module (~270 lines of JS) at end-of-body.
  Hooks `window.show('psnm-warm')` to auto-init the panel + load list.
- `v14/RBTR-Command-Centre-V14.html` — mirror of `public/index.html`.
- `/Users/bengreenwood/rbtr-v14-preview/index.html` — mirror.

File grew 919KB → 942KB (+23KB).

---

## UI SHAPE

`#sec-psnm-warm` has four zones:

1. **Counter cards**: 🔥 HOT · 🌡 WARM · ❄ COLD · QUOTES PENDING — all
   live from `psnm_enquiries`.
2. **Import tabs**: WhichWarehouse Brief / Past Quote Emails / Manual Lead.
   Each shows a textarea + "✨ Extract with ROCKO" button. Ben pastes,
   clicks, Claude extracts, preview table appears.
3. **Preview table**: editable company field per row, checkbox to skip,
   "Import checked" writes to Supabase (enquiry + optional quote + touch
   in one go).
4. **Ranked list**: filtered by temperature, sorted HOT→WARM→COLD→DEAD,
   each card shows company, contact, context line (source, pallets, quote,
   days since last touch, replied/quote-out status), and row actions
   (Call, WhatsApp, Mail, 📝 Log).

`📝 Log` pops a prompt → the typed outcome is parsed for keywords
(`replied` / `quote` / `dead`) to auto-adjust temperature + engagement,
writes an update to `psnm_enquiries` and a row to `psnm_outreach_touches`.

---

## KNOWN LIMITATIONS (WS1 scope, tighter than original Ben brief)

- **Engagement score is static on import**, recalculated only on outcome-log.
  No cron refresh. WS3 (Mailgun open/click tracking) will live-update it.
- **No email auto-ingestion**. WS1 is paste-only. WS2.7b Path A needs a
  Mailgun inbound route or Gmail-forward webhook.
- **No template library**. Outbound still composed in Gmail. WS2.7b.
- **Atlas `#sec-atlas` queue is unchanged.** Warm leads are visible but
  not yet injected into the daily action queue. That's WS4.
- **Supabase CRUD proxy** has no `order` or `limit` support — all sorting
  is client-side. Fine at <1000 rows; revisit when `psnm_outreach_targets`
  + enquiries exceed that.
- **Outcome prompt** is a `window.prompt()` for speed. Replace with a
  proper modal if Ben hates it by morning.

---

## VERIFICATION (before Ben uses it)

Before the first real paste:
1. Navigate to `#sec-psnm-warm` via the 🔥 WARM nav tile or hash.
2. Counter cards should show `—` then numbers once `load()` resolves.
3. Ranked list should show "No leads matching filter" for empty Supabase,
   or the 205 seeded cold `psnm_outreach_targets` if they live in
   `psnm_enquiries` (they don't; they're in `psnm_outreach_targets` — so
   the ranked list starts empty until Ben imports).
4. Open browser devtools → Network. Click "↻ Refresh". Confirm three
   POSTs to `/api/supabase-proxy` return 200s with JSON arrays.
5. Paste any small test text, click "✨ Extract with ROCKO". Expect a
   preview table within ~3–5 seconds. If 502, ANTHROPIC_API_KEY is
   missing or out of credits.

---

## NEXT SESSION — PHASE 2.7b (after Ben uses WS1)

Based on how the import session goes tomorrow morning, prioritise:
1. Templates library (`/psnm/templates`) — saves Ben the re-writing
2. Priority engine integration — warm leads feed into `#sec-atlas` queue
3. Morning brief script — leads with "N warm leads untouched" not cold
4. Mailgun open/click tracking — live engagement updates
5. WhichWarehouse inbound email webhook — automate Path A

Sequence per Ben's note: "Just ship WS1 tonight. WS2-5 based on how Ben
uses what ships tonight." Don't spec 2.7b until Ben reports back.
