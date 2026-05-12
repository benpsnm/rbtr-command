# Build Prompt Template — Autonomous Overnight Work

*Every consolidated build prompt for autonomous overnight work starts from this template. Fill in build-specific phases. Never delete the CORE RULE section.*

---

## 0. PRE-FLIGHT 0 — BANKRUPTCY-AWARE CHECK (run before any technical step)

Before proceeding, verify all three:

**(a)** Is this build creating assets, communications, or commitments in Ben's name when they should be in Sarah's? If yes, redesign before proceeding. Ben's name does not appear on Sarah's STR entity, accounts, platforms, or insurance.

**(b)** Does this build affect Ben's bankruptcy positioning — by adding to liabilities, transferring assets, or creating new financial commitments? If yes, surface to Ben for explicit approval before any execution.

**(c)** Does this build add operational load to Sarah? If yes, ensure the deliverable is single-click for her. All complexity handled upstream.

Only after all three return clean: proceed to technical pre-flight below.

*Bankruptcy-aware rule locked 11 May 2026. See CLAUDE.md.*

---

## 1. CORE RULE (immutable — copy verbatim into every build prompt)

Before asking Ben anything — check if you can do it yourself. Then check if there's another path. Only when both fail do you surface to Ben. Default = agent acts. Exception = Ben acts.

The 5% that genuinely need Ben: macOS permission dialogs, Face ID/fingerprint, 2FA codes, money leaving an account, anything legally requiring his identity. Not file edits. Not API calls. Not build decisions.

Escalation format only: "Ben, this needs your physical input because [specific reason]. Single tap/action: [what to do]. Takes [X seconds]." One option. No discussion. The single best path.

Everything else: handle it, document it, report it.

*Rule locked 8 May 2026. This rule overrides any instruction below that contradicts it.*

---

## 2. Pre-flight check pattern

Run these before starting any build phase. If any check fails, stop and report to Obsidian inbox — do NOT proceed.

```
[ ] SPEC EXISTS — state-snapshots/[spec-name].md is present and complete
[ ] ENV VERIFIED — required env vars present (list them here)
[ ] TOOLS VERIFIED — required MCP servers / CLIs available (list them here)
[ ] BRANCH CONFIRMED — on correct branch (not main unless intentional)
[ ] NO SUSPENDED BILLING — Vercel billing active (check: curl rbtr-jarvis.vercel.app)
[ ] PSNM_STATE.md READ — operational ground truth loaded for this session
[ ] TASK QUEUE READ — GET /api/tasks?status=open,in_progress,blocked — surface P1 tasks to Ben; add build tasks via bulk endpoint with source='agent'
```

---

## 3. Phases with self-review gates

For each phase:

```
### Phase N: [Phase name]

Goal: [one sentence]
Files: [list files that will change]
Gate: [what must be true before moving to Phase N+1]

Steps:
1. [step]
2. [step]
...

Self-review (BEFORE proceeding to next phase):
- [ ] All changed files syntax-checked (node --check / cat verification)
- [ ] No scope creep — nothing added that wasn't in spec
- [ ] No credentials hardcoded
- [ ] Auth paths (test d / test e) still intact if auth was touched
- [ ] Gate condition met: [restate gate condition]

If gate fails: STOP. Document failure in Obsidian inbox. Do not continue.
```

---

## 4. Self-rollback path

If a phase produces a broken state that cannot be fixed in one step:

```
1. git stash (if changes not committed)
   OR git revert [commit hash] (if committed)
2. Verify rollback: re-run the pre-flight checks for this phase
3. Write failure report to ~/Documents/RBTR-Brain/00-Inbox/BUILD-ROLLBACK-[date].md
   Include: what broke, what was attempted, what was rolled back, what needs Ben's decision
4. STOP. Do not attempt the phase again without Ben's explicit instruction.
```

---

## 5. Status report destination

All build reports go to: `~/Documents/RBTR-Brain/00-Inbox/`

File naming: `BUILD-REPORT-[project]-[date].md`

Report structure:
```
# Build Report — [project] — [date]

## What ran
[phases completed]

## What changed
[files modified, commits made, hashes]

## What's live
[deploy URLs if applicable]

## What needs Ben
[only if a genuine 5% task surfaced — otherwise "nothing"]

## What's next
[next phase or "build complete"]
```

Keep it short. Ben reads the report, not the play-by-play.

---

## 6. PHASE FINAL — Auto-diagnose (mandatory, every build)

Before writing the status report, POST to `/api/diagnose/post-build` with `triggered_by` and `build_summary`. Reversible issues auto-fix. Genuine Ben items surface in next Rocko brief. The status report references the diagnosis ID returned.

```bash
curl -s -X POST https://rbtr-jarvis.vercel.app/api/diagnose/post-build \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by":"[build-name]","build_summary":"[one-line summary]"}' \
  | jq '{log_id,shipped_count,auto_fixed_count,ben_needed_count,top_ben_task}'
```

Include the returned `log_id` in the status report under "## Diagnosis". If Vercel is 402 (billing suspended), log the call as pending and note `log_id: null` — do not skip the phase entirely.
