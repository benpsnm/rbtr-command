# Atlas Intelligence Stack v2.2 — Build Summary
**Branch:** `feature/atlas-v2.2-intelligence-stack`
**Built:** 2026-05-05
**Status:** Ready for smoke test. Hard stop before production deploy or any dispatch.

---

## What This Is

A 4-layer AI pipeline that takes a `lead_id` and outputs a ready-to-approve cold email draft — or an explicit reject with reason. Each layer has a single job and logs its output so we can audit which layer produced what. The v2.1 pipeline (`atlas.js`) remains untouched and fully operational.

---

## Architecture

```
lead_id
  │
  ▼
┌────────────────────────────────────┐
│ LAYER 1: ENRICHER (_enricher.js)   │
│ Companies House + website scrape   │
│ + news search + sector context     │
│ → quality_score (0-100)            │
│ Cache: psnm_lead_enrichment        │
│ Quality < 40 → STOP (manual)       │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ LAYER 2: REASONER (_reasoner.js)   │
│ Claude Sonnet 4.6, temp 0.3        │
│ Identifies the angle — does NOT    │
│ write copy.                        │
│ → angle_brief (6 fields)           │
│ Storage: psnm_lead_angles          │
│ Confidence < 60 → STOP (human)     │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ LAYER 3: DRAFTER v2.2              │
│ (_drafter_v2_2.js)                 │
│ Claude Sonnet 4.6, temp 0.7        │
│ v2.1 prompt + v2.2 additions       │
│ Hook-led, 100-140 words            │
│ Claim verifier + draft validator   │
│ → draft in psnm_atlas_drafts       │
│   status: pending_critic           │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│ LAYER 4: CRITIC (_critic.js)       │
│ Claude Sonnet 4.6, temp 0.0        │
│ Adversarial framing: sceptical     │
│ UK ops director                    │
│ 7 checks (all must pass)           │
│                                    │
│ PASS → status: pending_approval    │
│ FAIL → loop back to Layer 3        │
│        (max 3 attempts)            │
│ 3x FAIL → status: needs_revision  │
└────────────────────────────────────┘
```

---

## Files Delivered

| File | Type | Purpose |
|------|------|---------|
| `api/_enricher.js` | Module | Layer 1 — CH API + website + news |
| `api/_reasoner.js` | Module | Layer 2 — angle identification |
| `api/_drafter_v2_2.js` | Module | Layer 3 — intelligence-led draft |
| `api/_critic.js` | Module | Layer 4 — adversarial critic |
| `api/_intelligence_pipeline.js` | Module | Orchestrator — runs all 4 layers |
| `api/v2_2_run.js` | Vercel function | HTTP endpoint for invocation |
| `supabase/migrations/47_lead_enrichment.sql` | Migration | psnm_lead_enrichment table + atlas_drafts extensions |
| `supabase/migrations/48_lead_angles.sql` | Migration | psnm_lead_angles table |

---

## New Database Tables

### psnm_lead_enrichment
One row per lead (UNIQUE lead_id). Updated on re-enrichment.
- `enrichment_data` JSONB — full blob: CH data, website pages, news, sector context
- `quality_score` INTEGER — 0-100
- `retrieved_at` TIMESTAMPTZ — used for cache TTL checks

### psnm_lead_angles
One row per pipeline run. Multiple rows per lead allowed (audit trail).
- `angle_brief` JSONB — 6 fields: primary_pain_point, evidence, prospect_role_lens, hook, what_to_avoid, confidence
- `confidence` INTEGER — 0-100

### psnm_atlas_drafts (extended)
Added: `source`, `enrichment_id`, `angle_id`, `critic_iterations`, `critic_log`
Status constraint extended: `pending_critic` is now a valid status.

---

## How to Invoke

### Run pipeline for a single lead (by company name or UUID)
```bash
POST /api/v2_2_run?action=run_pipeline
x-rbtr-auth: <token>
Content-Type: application/json

{ "company": "Gripple Ltd" }
# OR
{ "lead_id": "<uuid>" }
```

### Run smoke tests (5 pre-configured leads)
```bash
POST /api/v2_2_run?action=smoke_test
x-rbtr-auth: <token>
Content-Type: application/json

{}
```
Returns a summary for each lead: quality_score, reasoner_confidence, critic_verdict, draft_id.
All drafts land in `pending_approval` — review before any dispatch.

### Audit touch counts
```bash
POST /api/v2_2_run?action=audit_touch_counts
x-rbtr-auth: <token>
```
Returns: discrepancy_count, list of leads where stored current_touch_count ≠ actual sent count.

### Apply touch count fix
```bash
POST /api/v2_2_run?action=fix_touch_counts
x-rbtr-auth: <token>
Content-Type: application/json

{ "confirmed": true, "audit": <paste the audit result object here> }
```
Resets each discrepant lead's current_touch_count to match actual psnm_outreach_touches records.

---

## Data Integrity Audit — Touch Count

**Background:** Gripple (and potentially others) shows Touch 3 in psnm_outreach_targets.current_touch_count but has no sent records in psnm_outreach_touches. This would cause the drafter to generate a Touch 3 follow-up email for what is actually a cold first contact.

**Fix sequence (do this before the first real pipeline run):**
1. `POST /api/v2_2_run?action=audit_touch_counts` — inspect the discrepancy list
2. Verify the discrepancies look right (Gripple should show: stored=3, actual=0)
3. `POST /api/v2_2_run?action=fix_touch_counts` with `confirmed: true` and the audit object

The pipeline reads the ACTUAL touch count from psnm_outreach_touches at draft time (not the stored counter), so drafts generated before the fix will still have the correct touch number. The fix corrects the display in WMS.

---

## Smoke Test Guide

Run in this order. Review each before proceeding to the next.

| # | Lead | What to verify |
|---|------|----------------|
| 1 | **Gripple Ltd** | Enricher finds CH data + website. Reasoner identifies wire products manufacturing angle. Draft is Touch 1 tone (cold, polite). Critic passes. |
| 2 | **AF Blakemore & Son** | Large FMCG distributor. Enricher should find news. Reasoner should identify seasonal/overflow distribution angle. |
| 3 | **AJ Webb and Sons** | **CRITICAL TEST.** Fresh produce wholesale. PSNM is ambient-only — cannot serve chilled/fresh goods. The Reasoner should set confidence to 0 and flag this in what_to_avoid. Pipeline should stop at Layer 2 with `human_review_required`. If it reaches the drafter, the Critic must fail any draft that pitches cold storage. |
| 4 | **ABI Electronics Ltd** | Electronics manufacturing (Barnsley). Different industry lens — components, not food. Reasoner should identify electronics supply chain angle. |
| 5 | **GW Engineering** | Micro owner-run engineering company. Reasoner should note owner-managed lens (director = decision maker). Draft should be peer-to-peer, not corporate. |

**DO NOT DISPATCH any smoke test drafts.** All land in `pending_approval`. Review all 5 before sending anything.

---

## Critic Checklist (7 checks)

All 7 must pass. One fail = full fail.

1. `opener_specificity` — does opener reference something specific to THIS prospect?
2. `speculative_claims` — any numbers/assumptions not in enrichment_data?
3. `touch_tone_match` — does tone match the actual touch number?
4. `voice_quality` — no banned corp-speak (leverage, synergy, unlock, elevate, etc.)
5. `typos_grammar` — basic language quality
6. `real_reader_test` — would a busy ops director read past line 2?
7. `claim_cross_check` — claim verifier found no unverified PSNM facts (inherited from Layer 3)

---

## Environment Variables Required

All pre-existing. No new env vars needed.

| Variable | Used by |
|----------|---------|
| `ANTHROPIC_API_KEY` | Enricher (news search), Reasoner, Drafter, Critic |
| `COMPANIES_HOUSE_API_KEY` | Enricher (CH API) |
| `SUPABASE_URL` | All layers |
| `SUPABASE_SERVICE_ROLE` | All layers |
| `RBTR_AUTH_TOKEN` | v2_2_run.js endpoint auth |

---

## Deployment Note — Vercel Function Limit

`v2_2_run.js` is the 13th Vercel function in this project. The current plan limit is 12.

**Options before deploying:**
- A) Upgrade to Vercel Pro (no function limit)
- B) Add pipeline actions to `jarvis.js` instead of a new file, then delete `v2_2_run.js`
- C) Replace a low-usage function (e.g. `cron-backup.js`) if it's been superseded

This is a feature branch — deployment decision happens after smoke testing.

---

## What Stays Untouched

- `api/atlas.js` — v2.1 endpoint, fully operational
- `api/docs/_atlas_system_prompt.md` — canonical v2.1 prompt, loaded read-only by drafter
- All existing migrations (1-46)
- All other API files

---

## Limitations (Out of Scope for This Build)

- LinkedIn integration (deferred, £90/mo Sales Nav)
- Auto-dispatch (manual approval gate remains for batch 1)
- Template variations per touch number (single template)
- Reply handling (separate build)
- Google Maps Distance Matrix for live drive times (static verified table used)
