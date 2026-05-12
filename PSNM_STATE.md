# PSNM_STATE.md — Single source of truth

**Last updated:** 2026-05-06 ~15:15  
**Last updated by:** Ben + Claude (Phase 0c-alt complete — app-layer auth live in v14)  
**Rule:** AI tools read this file FIRST in every session before answering anything about state. Every change to the system requires updating this file in the same commit. No exceptions.

---

## Quick context for any new session

Pallet Storage Near Me (PSNM) is a 1,602-pallet ambient warehouse at Unit 3C, Hellaby Industrial Estate, Rotherham S66 8HR. Operated solo by Ben Greenwood. Two production deployments share PSNM operations:

- **`rbtr-jarvis.vercel.app`** — Command Centre (Rocko). Ben's omniscient view. Contains PSNM operations + RBTR expedition + AirBnB + JMW legal + Eternal Kustoms + personal trackers. Currently serves PSNM via /wms.html.
- **`psnm-wms.vercel.app`** — Standalone PSNM WMS for ops staff. Currently lacks Atlas/PIP/WW Leads (drift from CC). Backed up to github.com/benpsnm/psnm-wms.

Architectural goal: shared `psnm-core.js` so both surfaces stay in sync. Spec at `/tmp/psnm-unification-spec.md`.

---

## Production deployments

### rbtr-jarvis.vercel.app (Command Centre)
- Vercel project: v14, ID prj_WmfOs1RwgvTdWk9thP6mZWHVLpWf
- Source: this repo, working branch feature/atlas-v2.2-intelligence-stack
- Deploy method: manual `vercel --prod` from /Users/bengreenwood/Desktop/rbtr-command/v14
- Auth: **LIVE — Phase 0c-alt complete (6 May)**. Pattern A single-password JWT cookie session. Login page at /login.html. Cookie `psnm_session` HttpOnly Secure SameSite=Strict 30d. Header path (`x-rbtr-auth`) unchanged — crons/scripts unaffected.

### psnm-wms.vercel.app (Standalone)
- Vercel project: psnm-wms, ID prj_VMnipQ7zEPUMGUjsHyYg1NU74oYz
- Source: /Users/bengreenwood/Desktop/psnm/deploy/index.html
- Backed up to github.com/benpsnm/psnm-wms (private)
- Deploy method: manual `vercel --prod` from /Desktop/psnm/deploy/
- Auth: client-side SHA256 password gate only (weak). Phase 0c-alt deferred — standalone is static SPA with no backend to protect.
- Feature gap: no Atlas, no PIP, no WW Leads (drifted from Command Centre)

---

## Production environment variables (rbtr-jarvis project)

| Variable | Length | Notes |
|---|---|---|
| RBTR_AUTH_TOKEN | 64 chars | API auth header value, used as `x-rbtr-auth` |
| CRON_SECRET | 64 chars | NEW 6 May. Bearer auth on cron endpoints |
| SENDGRID_INBOUND_SECRET | 32 chars | Query param secret for inbound parse webhook |
| SENDGRID_WEBHOOK_PUBLIC_KEY | 180 chars | NEW 6 May. PEM-wrapped ECDSA P-256 public key for event webhook signature verification |
| WMS_PASSWORD_HASH | 60 chars | NEW 6 May. bcrypt cost 10. Hash of CC admin password. |
| SESSION_SIGNING_KEY | 64 chars | NEW 6 May. 64 hex char HMAC key for JWT HS256 signing. |
| SUPABASE_URL | n/a | https://mpxgyobotiqcawmqlhbf.supabase.co |
| SUPABASE_SERVICE_ROLE | 41 chars | Service-role key for backend writes |
| PSNM_INTELLIGENCE_AUTORUN | n/a | Currently `false`. Cron-driven intelligence stack runs are off. Flip to `true` after Phase 0c |
| TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM | n/a | WhatsApp outbound only, no inbound webhook |
| ANTHROPIC_MODEL_HEAVY, ANTHROPIC_MODEL_DEFAULT, ANTHROPIC_MODEL | n/a | LLM model identifiers used by atlas.js intelligence stack |
| BEN_PHONE, BRIEF_HOUR, BRIEF_TIMEZONE | n/a | Cron config for morning/evening briefs |
| ELEVENLABS_VOICE_ID | n/a | Voice clone for TTS in briefs |

---

## Database state (Supabase project mpxgyobotiqcawmqlhbf)

### Migrations applied (latest)
- 47_lead_enrichment.sql — Companies House + web + news enrichment cache
- 48_lead_angles.sql — angle generation per lead
- 49_atlas_drafts_sg_message_id.sql — adds sg_message_id column to drafts (FIXED 6 May)
- 50_psnm_outreach_events.sql — SendGrid event capture
- 51_atlas_drafts_superseded_status.sql — status='superseded' for dispatch dedup
- 52_psnm_inbound_replies.sql — inbound reply capture (NEW 5 May)

### Table row counts (as of 6 May 2026 ~11:30)
| Table | Count | Notes |
|---|---|---|
| psnm_outreach_targets | 205 | Master prospect list |
| psnm_intelligence_prospects | 44 | PIP harvested |
| psnm_atlas_drafts | 48 | See breakdown below |
| psnm_outreach_events | 8 | 6 orphaned (pre-Fix A). 2 from Fix B test dispatch — both have draft_id + sg_message_id populated |
| psnm_inbound_replies | 2 | Both test rows from ben.greenwood89@yahoo.com on 5 May |
| psnm_ww_leads | 10 | All status='new', 6 from today (6 May) — UNACTIONED |

### psnm_atlas_drafts by status
| Status | Count |
|---|---|
| sent | 11 (10 have sg_message_id=NULL — pre-migration sends; 1 backfilled: Marc Deakin Fix C) |
| superseded | 17 (1 Fix B test draft + 16 Bug 3 no-email drafts — all archived) |
| failed | 0 (RESOLVED — see Bug 3 below) |
| needs_revision | 11 (critic flagged, never re-fixed) |
| pending_approval | 6 |
| pending_critic | 2 |
| rejected | 2 (Gripple + ABI Electronics, rejected 5 May per dispatch dedup audit) |

Source breakdown: 41 legacy (no source tag), 7 tagged v2.2_stack.

---

## Live systems

### Atlas v2.2 Intelligence Stack (live, deployed 5 May)
4-layer pipeline: Enricher → Reasoner → Drafter v2.2 → Critic. Runs on cron when `PSNM_INTELLIGENCE_AUTORUN=true` (currently false). Per-prospect dedup guard active in dispatchApproved() with Telegram alert on duplicate detection.

### SendGrid Event Webhook (live 6 May, was broken 5 May)
- Endpoint: `/api/sendgrid_events`
- ECDSA P-256 signature verification (separate file pattern, raw body read via async iterator to preserve signed bytes)
- Was broken from 5 May ~16:00 to 6 May ~09:25 because SENDGRID_WEBHOOK_PUBLIC_KEY env var was empty. All events during this window returned 401 signature_verification_failed.
- Fixed 6 May 09:25 by setting public key from SendGrid dashboard with proper PEM wrapping. Verified working — 6 events captured since.

### SendGrid Inbound Parse (live, 5 May)
Two webhooks configured:
- `parse.palletstoragenearme.co.uk` → `/api/sendgrid_inbound` — captures replies to Reply-To header at `replies@parse.palletstoragenearme.co.uk`
- `inbound.palletstoragenearme.co.uk` → `/api/atlas?action=inbound_email` — captures WhichWarehouse leads (older path)
- Both in PARSED mode (Send Raw OFF). Switched 5 May after raw mode dropped subject/body.
- Reply-To header injected into outbound at sendEmail() and dispatchApproved()

### Cron jobs (rbtr-jarvis Vercel project)
All require `Authorization: Bearer $CRON_SECRET` (NEW 6 May). Vercel internal cron scheduler bypasses by sending header automatically.

| Path | Schedule |
|---|---|
| /api/cron-morning-brief | 06:00 daily (RBTR brief) |
| /api/cron-morning-brief?mode=psnm-brief | 06:00 daily (PSNM brief) |
| /api/cron-morning-brief?mode=evening | 21:00 daily |
| /api/cron-backup | 03:00 daily |
| /api/atlas?action=intel_harvest_daily | 06:00 daily |
| /api/atlas?action=intel_harvest_insolvency_daily | 06:15 daily |
| /api/atlas?action=intel_harvest_defence_weekly | 06:30 Sundays |

### Telegram bot
- Uses long-polling (no inbound webhook). Bot name: rocko bot.
- Alerts fired by: dispatch dedup guard, inbound reply capture, morning brief, evening reflection.

---

## 🔴 Known bugs in production

### Bug 1 — sg_message_id capture (FIXED 6 May)
- Root cause investigated and resolved (see /tmp/bug1-diagnosis.md for full analysis)
- Fix A: sendgrid_events.js now captures sg_message_id on every event insert (commit d72c983)
- Fix B: dispatchApproved() confirmed working — test dispatch captured sg_message_id=hkTfUwv5Q1O4PoXz1oTo5g
- Fix C: Marc Deakin draft (id=6933cb45) backfilled with sg_message_id=XYr0qyZmSqqV646RVHB4pQ
- Remaining: 10 Apr 27-29 drafts have sg_message_id=NULL — unrecoverable (SendGrid activity history expired). Accepted.
- Future dispatches: fully linked (draft → sg_message_id → events → inbound replies)

### Bug 2 — Outreach events orphaned (PARTIALLY RESOLVED 6 May)
- 6 pre-Fix-A events in psnm_outreach_events still have draft_id=NULL, sg_message_id=NULL (old dispatches — no custom_args in payload)
- These 6 orphaned events are unrecoverable — accepted
- New events (post-Fix A) correctly capture both draft_id and sg_message_id (verified via Fix B test)

### Bug 3 — 16 failed drafts (RESOLVED 6 May)
- Root cause: all 16 had `error: no_email` — v2.1 pipeline generated drafts for 4 prospects with null email addresses; no email was ever sent
- Single failure pattern, no code bug; the no_email guard worked correctly
- Affected prospects (all still uncontacted, email=null): Clugston Distribution Services (quality 82), International Stones UK (78), Stanton Logistics (75), All Shires Foods Ltd (68) + 1 orphan (Poo-Ch Pouch, no prospect record)
- Action: all 16 bulk-superseded 6 May with critic_log entry. Status is now clean (failed=0)
- Next: find email addresses for the 4 named prospects; generate fresh v2.2 drafts once unified WMS is live
- Full diagnosis: /tmp/bug3-diagnosis.md

### Open issue 4 — 11 needs_revision drafts in limbo
- Critic flagged, never re-processed by Reasoner
- These are sitting in pending_approval queue with critic_log content invisible in UI

### Open issue 5 — 10 unactioned WhichWarehouse leads
- All status='new'
- 2 from 29 Apr, 2 from 30 Apr, 6 from 6 May (today)
- Today's 6 are urgent — real inbound business
- ACTION: Ben handling 6 May 10:00

---

## Atlas config (live)

- daily_send_limit: 50
- paused: false
- tone_mix: balanced
- territory_filter: S Yorkshire, W Yorkshire, Derbyshire, Notts

---

## Recent work history (most recent first)

### 6 May 2026
- 09:00 — Marc Deakin reply sent (peer-to-peer logistics relationship at AF Blakemore)
- 09:10 — Phase 0a shipped: CRON_SECRET set on rbtr-jarvis production, all 7 cron endpoints now require Bearer auth
- 09:25 — Phase 0b config shipped: SENDGRID_WEBHOOK_PUBLIC_KEY set with PEM wrapping (was empty for 18 hours)
- 09:25 — Laptop crash, recovered
- 09:30 — Phase 0b verified: 6 events flowed into psnm_outreach_events (but Bug 2 surfaced — events orphaned)
- 09:50 — Ground-truth audit run: surfaced Bugs 1, 2, 3 + state file 7 days out of date
- 09:55 — PSNM_STATE.md updated to current truth
- ~10:00 — Bug 1 root cause diagnosed (3-layer analysis, full memo at /tmp/bug1-diagnosis.md)
- ~10:10 — Fix A: sg_message_id added to sendgrid_events.js event insert (commit d72c983), deployed
- ~10:20 — Fix C: Marc Deakin draft sg_message_id backfilled from send_result JSON (id=6933cb45)
- ~10:30 — Fix B: Test dispatch to yahoo.com verified — sg_message_id=hkTfUwv5Q1O4PoXz1oTo5g captured on draft; 2 events arrived with draft_id + sg_message_id both populated. Capture pipeline confirmed end-to-end.
- ~11:00 — Fix B cleanup: test draft marked superseded, test prospect marked do_not_contact, .env.production removed. PSNM_STATE.md updated.
- ~11:30 — Bug 3 resolved: all 16 failed drafts diagnosed (single pattern: no_email), bulk-superseded. failed=0, superseded=17. 4 high-value prospects (Clugston, Int'l Stones, Stanton, All Shires) flagged for email enrichment + re-draft.
- ~12:00–15:15 — Phase 0c-alt complete: app-layer auth built and deployed to v14 production. Commit 094cb5a. All 8 end-to-end tests passed. Blast radius zero.

### 5 May 2026
- Atlas v2.2 intelligence stack shipped to production (Enricher/Reasoner/Drafter/Critic)
- SendGrid Event Webhook URL migrated to /api/sendgrid_events (signature verification rebuilt with separate file pattern, raw body handling)
- 29 April double-dispatch incident audited (old pipeline). Gripple + ABI rejected with critic_log audit trail
- Migration 51 (superseded status) applied
- Dispatch dedup guard added to dispatchApproved() with Telegram alert
- Migration 52 (psnm_inbound_replies) applied
- Inbound reply capture pipeline built end-to-end: SendGrid Inbound Parse → /api/sendgrid_inbound → DB + Telegram alert
- Reply-To header added to all outbound (sendEmail + dispatchApproved)
- DNS MX records configured for parse.palletstoragenearme.co.uk
- 39 commits of drift pushed origin/main on Command Centre repo
- Vercel upgraded to Pro plan
- /Desktop/psnm/deploy backed up to github.com/benpsnm/psnm-wms

### 29 April 2026
- Double-dispatch incident: 19 drafts → 6 prospects in same morning batch (old v2.1 pipeline). Caused 2 prospects (Charlotte Hill at Gripple, Shaun Hayes at ABI) to receive 2 emails 6 seconds apart.

---

## Phase 0c-alt — App-Layer Auth — COMPLETE (6 May 2026)

Shipped v14 production. Replaces stale Supabase login. Pattern A: single password, JWT cookie session, 30-day fixed expiry. OR'd with existing x-rbtr-auth header so all crons/scripts continue working unchanged.

- Commit: 094cb5a (feat(auth): app-layer auth for v14)
- Deploy: aq0jeo2gg → rbtr-jarvis.vercel.app
- Files: api/auth/{login,logout,middleware,check}.js + public/login.html + atlas.js (+15 lines path 4.5 cookie) + wms.html (sync XHR auth check + topbar logout button)
- Cookie: psnm_session, HttpOnly Secure SameSite=Strict, Path=/, Max-Age 30d, JWT HS256
- Env: WMS_PASSWORD_HASH, SESSION_SIGNING_KEY (both in v14 production, verified)
- Deps: bcryptjs@3.0.3, jsonwebtoken@9.0.3, cookie@1.1.1
- Tests: 8/8 passed end-to-end including blast-radius (d: x-rbtr-auth, e: Bearer CRON_SECRET)
- Secrets stored: /tmp/auth-build-state-2026-05-06.md

Deferred:
- psnm-wms standalone auth (no backend to protect — pure static SPA)
- standalone CSV-extract feature broken (fetch to api.anthropic.com with no key — proxy through v14 later)
- atlas.js path 4.5 shadowed by isSameOrigin — intentional, removed in follow-up after cookie auth proven
- wms.html scripts at lines 4090/4265 not auth-gated (atlas.js will 401 their calls during redirect window — benign)
- localStorage not cleared on logout (single-role pattern, not a privacy issue)

## Deferred for tomorrow

1. **Standalone CSV-extract proxy** — `psnm-wms.vercel.app/index.html` line 2959 calls `api.anthropic.com/v1/messages` without an API key (broken feature, no exposure). Fix: proxy through `v14/api/atlas.js`. Low priority.
2. **Standalone password gate decision** — psnm-wms is static SPA (no backend). Decide: leave public-static or port Pattern A login from v14. Architecture conversation only.
3. **`run_intelligence_cycle` grep** — not in atlas.js action list (test e returned 400 not 401). Verify no cron calls this action: `grep -r 'run_intelligence_cycle' v14/`
4. **isSameOrigin removal** — follow-up PR: remove `isSameOrigin` path from `checkAuth()` once cookie auth is proven. Cookie path currently shadowed for normal browser traffic.
5. **Email enrichment** — find addresses for Clugston Distribution Services, International Stones UK, Stanton Logistics, All Shires Foods Ltd; generate fresh v2.2 drafts.

---

## Active spec / planning docs

- `/tmp/psnm-unification-spec.md` — 5,242-word unification spec from 5 May night
- `/tmp/v21-drafts-review.md` — 5 May review of 3 unsent v2.1 drafts (still pending action)
- (PSNM_POSSIBILITIES.md was created 26 April but not currently in repo — needs restoration)

---

## Phase plan locked from spec review (5 May)

| Phase | Description | Estimate | Status |
|---|---|---|---|
| 0a | CRON_SECRET | 1h | DONE 6 May |
| 0b | SendGrid event signature key fix | 1h | DONE 6 May |
| 0c | Vercel Password Protection on both deployments | 1h | SUPERSEDED by 0c-alt |
| 0c-alt | App-layer auth (bcrypt+JWT cookie, Pattern A) on v14 | ~3h | **DONE 6 May** (commit 094cb5a) |
| 0.5 | API auth (token injected at page load, verified by /api/atlas) | 4-6h | pending |
| 1 | Reconcile standalone drift (bring psnm-wms up to CC parity) | 2-3h | pending |
| 2 | Extract psnm-core.js (shared component for both deployments) | 4-6h | pending |
| 3 | Inbound Replies Inbox UI | 3-4h | pending |
| 4 | Outreach Events Timeline UI | 3h | pending |
| 5 | Draft History + Critic Log UI | 3.5h | pending |
| 6 | Connect new psnm-wms GitHub repo as Vercel deploy source | 1h | pending |
| 7 | Draft Response feature (Atlas-generated replies to inbound) | TBD | pending |

Bug fixes (pre-Phase 0c):
- Bug 1: FIXED 6 May (Fix A + Fix B + Fix C — capture pipeline verified end-to-end)
- Bug 2: PARTIALLY RESOLVED — 6 old orphaned events unrecoverable; new events now correctly linked
- Bug 3: RESOLVED 6 May — all 16 no_email drafts superseded; 4 prospects flagged for email enrichment

---

## Decisions locked (from spec review)

- Architecture: monorepo with two entry HTML files, shared `psnm-core.js`
- Auth: separate passwords for standalone vs Command Centre (operator vs Ben)
- Both deployments will be feature-complete with full PSNM stack including Atlas, Inbox, Events, Critic Log
- Command-Centre-only modules (RBTR, AirBnB, JMW, Eternal, personal) NEVER appear in standalone
- API auth model: option (b) — token injected at page load, verified by /api/atlas
- Reply-To header literals to be refactored to env vars (EMAIL_REPLY_TO, EMAIL_REPLY_TO_NAME) — pending
- 29 April double-dispatch batch (Gripple, ABI, Barnsley, Spar Doncaster, Sheffield produce, Bidfood Nottingham): do NOT re-dispatch for 6-8 weeks; use different angle when re-engaging

---

## Working agreements for AI tools

1. **Read this file FIRST.** Before answering anything about state, capacity, what's deployed, what's broken — read this file first.
2. **Update this file as part of every change.** A change to the system without an update to this file is incomplete work.
3. **Trust observable output, not narrative.** Verify with `cat`, `curl`, `vercel inspect`, DB queries — not assumptions or memory.
4. **Show full output.** Do not summarise as "above" or "completed" without the actual evidence.
5. **Stop on unexpected output.** If a step's result doesn't match expectations, halt and report — do not guess or proceed.
6. **No production changes without explicit confirmation.** Read-only diagnostics are fine; deploys, env changes, and DB writes need a yes from Ben in chat.

---

## Sensitive references

- All env var values: stored in Vercel project settings only. Never echo to chat.
- CRON_SECRET, RBTR_AUTH_TOKEN, SUPABASE_SERVICE_ROLE: save to 1Password
- SendGrid public key: IS public, safe to share
- SENDGRID_INBOUND_SECRET (993f6f4fac8f4c2c9b36cfc4ace32bad): query param secret, not catastrophic if leaked but rotate if exposed externally
