# Stream 8 — Personal OS Summary

**Branch:** stream-8-personal-os  
**Completed:** 4 May 2026  
**Ceiling:** 90 minutes across 4 parts

---

## What Was Built

### Part A — Rhythms (`rhythms/`)

Six operational cadence documents forming the backbone of Ben's personal review system:

| File | Cadence | Duration | Who |
|------|---------|----------|-----|
| `DAILY_REVIEW.md` | End of day | 7 min | Ben solo |
| `WEEKLY_MONEY_MEETING.md` | Sunday 9pm | 30 min | Ben + Sarah |
| `MONTHLY_RETROSPECTIVE.md` | Last Sunday of month | 60 min | Ben solo |
| `QUARTERLY_PIVOT.md` | Q-end (Mar/Jun/Sep/Dec) | 90 min | Ben solo |
| `ANNUAL_AUDIT.md` | December | Full day | Ben solo |
| `AUTOFILL_SPEC.md` | — | — | Technical spec |

`AUTOFILL_SPEC.md` defines the `/prepare-review [rhythm]` command that pre-populates each template from Supabase data before the human touches it. Critical separation: family sections, "one truth", gratitude, and the annual letter never sync to any system. They stay on paper or local disk.

---

### Part B — Sarah's Personal Portal (`sarah_portal/`)

A private command centre for Sarah. Ben cannot access it by default — this is enforced at the database level (RLS exclusion), not by convention.

| File | Contents |
|------|----------|
| `DESIGN_PRINCIPLES.md` | Privacy model, aesthetic direction, what it is and isn't |
| `SECTIONS.md` | 7 sections: Mood/Journal, Dreams, Friendship Log, Personal Goals, Body, Reading, Spaces |
| `JOURNAL_PROMPTS.md` | 30 prompts for when free-writing feels stuck |
| `INVITE_FROM_BEN.md` | The letter Ben hands her when he gives this to her |

Key decision: no RAG status, no countdowns, no productivity metrics anywhere in this portal. The aesthetic is a journal, not a dashboard.

---

### Part C — Sons Portal (`sons_portal/`)

Kid-facing adventure portal for Hudson (7 by departure) and Benson (3 by departure). Read-only, encouraging, family-PIN gated.

| File | Contents |
|------|----------|
| `DESIGN_PRINCIPLES.md` | Visual-first UI, Hudson vs Benson mode, safety baseline |
| `SECTIONS.md` | 6 sections: Countdown, Truck Photos, Map, Packing Lists, Memory Wall, Adventure Log |
| `CONTENT_PLAN_PRE_DEPARTURE.md` | Weekly/monthly cadence through to July 2027 |
| `AGE_APPROPRIATE_COPY.md` | Language calibration guide + sample copy for both boys |
| `SAFETY_RULES.md` | 10 non-negotiable rules, including decommissioning protocol |

Key decision: content stays human-written. Ben writes every caption himself. No AI-generated voice, no automated posts. The portal is alive because he feeds it, and stale is worse than absent.

---

### Part D — Money Clarity Engine (`money_clarity/`)

Seven financial specs. Aggressive, honest, no softening.

| File | Contents |
|------|----------|
| `DAILY_PNL_SPEC.md` | Per-entity daily P&L, 3 time periods, ROCKO format |
| `WEEKLY_CASH_VELOCITY.md` | Inbound/outbound velocity, runway, 4-week rolling chart |
| `MONTHLY_BURN_RATE.md` | Fixed + variable costs, RAG thresholds per entity |
| `RUNWAY_TO_DEPARTURE.md` | The central document: £ needed, current position, gap, trajectory |
| `ROLLED_UP_BALANCE_SHEET.md` | Ben + Sarah's complete net position, weekly |
| `MORNING_BRIEF_INTEGRATION.md` | Exact ROCKO financial brief script, delivery rules |
| `RED_LINE_ALERTS.md` | 6 alert rules, full DDL, no auto-snooze |

`RUNWAY_TO_DEPARTURE.md` is the most important document in this stream. It contains the hard statement: if the RBTR fund doesn't hit target by 1 January 2027, departure on 1 July 2027 is not viable. This is permanent and visible.

---

## Build Order Recommendation

**Ship first:**
1. `money_clarity/RED_LINE_ALERTS.md` → implement alerts immediately. These are safety rails, not features.
2. `money_clarity/MORNING_BRIEF_INTEGRATION.md` → integrate into ROCKO's daily brief. Atlas already has the data; this is wiring.
3. `rhythms/DAILY_REVIEW.md` → simplest rhythm to start. Builds the habit before the more complex cadences.

**Ship second:**
4. `money_clarity/RUNWAY_TO_DEPARTURE.md` → the numbers need to be live. Every week that passes without this is a week of trajectory data lost.
5. `rhythms/WEEKLY_MONEY_MEETING.md` → once the data is live, the meeting template activates.
6. `sons_portal/` → content starts accumulating now. Truck photos every Friday begins immediately, portal or not.

**Ship third:**
7. `sarah_portal/` → needs auth isolation work before it goes live. Don't hand this to Sarah until the RLS is verified.
8. `money_clarity/ROLLED_UP_BALANCE_SHEET.md` → needs property valuation input from Sarah first.

**Defer:**
9. `rhythms/AUTOFILL_SPEC.md` → implement this after the rhythms are established manually. Don't automate what you haven't done by hand yet.
10. `rhythms/MONTHLY_RETROSPECTIVE.md`, `QUARTERLY_PIVOT.md`, `ANNUAL_AUDIT.md` → use the templates now; build the autofill pipeline later.

---

## What's Not Here

- UI implementation — all of the above is spec + templates. Frontend work is a separate stream.
- Supabase schema migrations — referenced throughout but not created here. Need dedicated migration files.
- ROCKO integration code — `MORNING_BRIEF_INTEGRATION.md` defines the format; the API changes go in `api/morning-brief.js`.
- Sarah's auth isolation — the RLS policy that excludes Ben from her tables needs a migration and a review.

---

## Cross-Stream Dependencies

| This stream requires | From |
|---------------------|------|
| `financial_transactions` table with `entity` + `type` columns | Stream 3 (financial data layer) |
| `invoices` table | Stream 3 |
| ROCKO morning brief API | Stream 2 (Atlas / morning brief) |
| Supabase auth with per-user RLS | Stream 1 (auth setup) |
| `mood_log`, `energy_log`, `sleep_log` tables | Stream 4 (health/wellbeing layer) |
