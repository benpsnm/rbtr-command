# Session Summary — Agentic Stack Upgrade (2026-05-06 / 2026-05-07)

## Branch: feature/agentic-stack-upgrade | Commit: a7b42b3 | Status: NOT PUSHED

### What was built

**Phase 0 (earlier session, feature/atlas-v2.2-intelligence-stack):**
- PSNM_STATE.md Phase 0c-alt section (compact) — commit d643b2e, pushed
- Intel funnel audit via Supabase REST — confirmed 0 live sends, enrichment at 6.8% success rate
- psnm-wms password gate diagnosed (pre-existing SHA-256 client-side gate); hash replaced with kaqtat-xudvyv-2pozgE
- Vercel billing 402 diagnosed — `softBlock: UNPAID_INVOICE`, subscription `canceled`

**Phase 1 — Claude Code infrastructure:**
- `CLAUDE.md` (root): project context, operating rules, commit conventions, sub-agent registry
- `/Users/bengreenwood/Desktop/psnm/deploy/CLAUDE.md`: standalone WMS context
- `.claude/agents/the-grunt.md` — read-only verification sub-agent
- `.claude/agents/stuart-the-reviewer.md` — pre-deploy code/security review
- `.claude/agents/kevin-the-architect.md` — pre-build planning specialist
- `.claude/settings.json` — live hooks (v14/*.js syntax check + prod-deploy guard)
- `.claude/hooks.json` — reference copy

**Phase 2 — Caching + worktrees:**
- `/tmp/prompt-caching-proposal.md` — 7 call sites audited, 2 eligible (~$197/yr saving)
- Worktree `rbtr-command-supabase-build` → `feature/standalone-supabase-build`
- Worktree `rbtr-command-intel-fix` → `feature/intel-enrichment-fix`
- `state-snapshots/worktree-cheatsheet.md` + `state-snapshots/standalone-supabase-spec.md`

### BEN-DECISION-NEEDED

**1. Apply prompt caching diffs? (two 3-line changes, ~$197/yr saving)**

`v14/api/_drafter_v2_2.js` ~line 184:
```diff
+   'anthropic-beta': 'prompt-caching-2024-07-31',
-   system: systemPrompt,
+   system: [
+     { type: 'text', text: v21, cache_control: { type: 'ephemeral' } },
+     { type: 'text', text: v22Section },
+   ],
```
`v14/api/_critic.js` ~line 201:
```diff
+   'anthropic-beta': 'prompt-caching-2024-07-31',
-   system: CRITIC_SYSTEM,
+   system: [{ type: 'text', text: CRITIC_SYSTEM, cache_control: { type: 'ephemeral' } }],
```

**2. Test hooks in practice** — make a test edit to any v14/*.js file and confirm the syntax-check hook fires.

**3. Vercel billing** — needs dashboard action ~13 May when eBay clears.

**4. psnm-wms GitHub webhook** — fix via Vercel dashboard after billing resolved.

### Deferred work

| Item | Spec | Effort |
|---|---|---|
| Standalone WMS → Supabase | `state-snapshots/standalone-supabase-spec.md` | 12h Phase 0+1 |
| Intel enrichment fix | `feature/intel-enrichment-fix` worktree | TBD |
| `generateDraftViaAtlas()` caching refactor | `/tmp/prompt-caching-proposal.md` Site 3 | ~1h |
| Email enrichment 4 stuck prospects | PSNM_STATE.md | 2h |
| isSameOrigin removal from atlas.js | PSNM_STATE.md | 30m |

To push when ready: `git push -u origin feature/agentic-stack-upgrade`

---

# Session Summary — Stream 5: AirBnB Launch Sprint (2026-05-04)

## Branch: stream-5-airbnb-launch | Commit: c1f9634 | Status: COMPLETE — NOT MERGED

### 8 files in `/v14/docs/streams/5_airbnb_launch/`
- `LISTING_COPY_3_VARIANTS.md` — 3 full listing copies (Dark Luxury / Wellness Sanctuary / Couples Hideaway), each with title, short desc, 1000+ word long desc, house rules, amenities
- `PHOTOGRAPHY_SHOT_LIST.md` — 50 shots with composition, lighting window, props, exclusions, shoot day schedule
- `DYNAMIC_PRICING_2026.md` — Day-by-day CSV May–Dec 2026: weekends, bank holidays, Sheffield Utd/Wed games, Christmas +75%, NYE £400 flat, last-minute -15%
- `100_GUEST_MESSAGES.md` — ~45 templates in Sarah's voice: full lifecycle + all problem scenarios + special occasions
- `SUPPLIER_DIRECTORY.md` — Template complete; contact fields blank (Sarah to fill)
- `LAUNCH_WEEK_PLAYBOOK.md` — 7-day pre-launch plan: photoshoot → platform builds → soft launch → public
- `LISTINGS_FOR_SECONDARY_PLATFORMS.md` — Booking.com, VRBO, Plum Guide positioning, direct website copy
- `SUMMARY.md` — Sprint overview, revenue model, A/B test plan, 9 human actions required

### Human actions required before launch
1. Book photographer
2. Confirm attic areas are photoshoot-ready
3. Fill supplier contacts in SUPPLIER_DIRECTORY.md
4. Confirm bedroom/bathroom count and max guest numbers
5. Set up dedicated property email (woodheadmews@gmail.com or similar)
6. Select 10 soft-launch contacts
7. Update Sheffield fixtures monthly in pricing CSV
8. Decide cancellation policy (Moderate recommended)
9. VAT registration check if annual turnover will exceed threshold

---

# Previous session: 2026-04-29 (continued)

## Status: PATH C DEPLOY COMPLETE

---

## Atlas Claim-Source Verification Layer — LIVE ON MAIN + PRODUCTION

### Merge commit: `b635bf5`
### Latest production commit: `4f5a533`
### Production deployment: `v14-7nlanoxfu-beniproautobodies-8729s-projects.vercel.app`

---

## What was completed this session

All verification tests passed. Feature branch `feature/claim-source-layer` merged to `main`. Production deployed and smoke-tested.

### Post-merge calibration commits (all on main after merge):

| SHA | Description |
|-----|-------------|
| `490acbd` | Fix migration 45 seed data (corrected rates/offer terms committed to match what was applied in DB) |
| `51b31fb` | Hyphen normalisation: "ambient-only" now matches "ambient only" |
| `8ed4f92` | Bump haiku max_tokens 512→1024 (truncation on longer bodies); validator drive-time comma attribution fix |
| `5d15522` | Sub-hour drive times: "NN minutes" → "NNmin" normalisation (Sheffield 25min, Leeds 45min) |
| `29f2a90` | Unknown claim_type fallback → 'other'; exact value match for postcodes (S66 8HR) |
| `4f5a533` | Lower phrase-match floor from 8 → 6 chars (single-word "ambient" now matches "ambient only") |

---

## Final three-prospect verification (production)

### Test (a) — JONSOR APPAREL LTD (RM6 6AX, Grade A)
- validator: pass ✓
- claim_verdict: **all_green**
- would_status: **pending_approval** ✓

### Test (b) — FAKHR AL-IMTIYAZ FOR INDUSTRIAL LTD (M40 8WN, Grade A)
- validator: pass ✓ (one warning: trial_offer_present — pre-existing, non-blocking)
- claim_verdict: **all_green**
- would_status: **pending_approval** ✓

### Test (c) — Deliberate fabrication: London 1h 30min (actual 3h 15min)
- verdict: **has_red_claims**
- RED claim: drive_time/london: "1h 30min from us" — correctly caught ✓

### Production smoke test — DIGITAL AVENUE PRIME LTD (BD2 2AD, Grade A)
- validator: pass ✓
- claim_verdict: **all_green**
- would_status: **pending_approval** ✓
- 9 claims verified: 1602 capacity, postcode, 12-week commitment, 30-day notice, first week free, onboarding 3–5 days, £3.50/movement, London 3h15min, Birmingham 1h45min

---

## Known outstanding items

### 1. Validator warning: "trial_offer_present" false negative (non-blocking)
The validator REQUIRED pattern for `trial_offer_present` sometimes fails to match "first week free when you commit to 12 weeks" — pre-existing regex quirk. It's a warning (severity: warning), not an error, so it doesn't block approval. To be addressed in a separate validator calibration pass.

### 2. Unstaged changes on main (stashed from previous session)
Four files have uncommitted changes that were stashed before the merge:
- `api/briefing-data.js` — BuiltDad day calculation from start_date
- `api/docs/_atlas_system_prompt.md` — updates
- `api/morning-brief.js` — updates
- `api/supabase-proxy.js` — minor change

These are live in the working tree (stash was popped after merge). Review and commit when ready.

### 3. SUPABASE_SERVICE_ROLE rotation
User noted intent to rotate this credential (mentioned 2026-04-29).

---

## Rollback

```bash
git revert 2baf642
```
Fully restores prior `_intelligence_core.js` pipeline. Migration 45 tables are additive and harmless if left.

---

## Production auth token note
The preview deployments bypassed auth (RBTR_AUTH_TOKEN not set on Preview env). Production uses the token from `.env.local` **production pull** — different from the old `.env.local` entry. If .env.local needs updating, pull fresh with `vercel env pull`.
