# Built Dad — Portal Integration Spec

Target: `sec-bestself` and `sec-builtdad` sections of the RBTR Command Centre portal.

This spec covers what to build, what to display, and how the sections relate. No code here — just the product definition.

---

## Section Structure

Built Dad lives in two places in the portal:

1. **`sec-builtdad`** — the primary Built Dad section (programme-specific, detailed)
2. **`sec-bestself`** — a summary card that surfaces the current state without requiring navigation to the full section

---

## `sec-builtdad` — Full Section

### Header Block

**Day counter** — Large, prominent: `Day {N} of 56`. Auto-calculated from programme start date (20 April 2026). Updates automatically at midnight.

**Week label** — Below the counter: `Week {N} — {Theme name}`. Derived from day number (Days 1–7 = Week 1, etc.).

**Progress bar** — Visual bar showing N/56 completion. No percentage label needed — the day number is enough.

**Programme status** — One of: `Active`, `Complete`, or (if today > Day 56) `Post-Programme`. Once past Day 56, the section doesn't disappear — it archives.

---

### Today's Prompt Panel

A card showing:
- The current day's reflection prompt from DAILY_PROMPTS_56.md
- The day number and week theme as context label
- A "Mark as reflected" toggle — binary, no text required. Toggling it changes the card's visual state (muted/faded) to indicate done. Does not require any written input.
- Optional: a text input area for a written note (not required, just available). If populated, saves locally. Not surfaced anywhere else.

Behaviour: the prompt auto-advances at midnight. Yesterday's prompt is not shown (it's gone — that's intentional).

---

### Weekly Milestone Panel

Appears from Day 1 of each week, updates each Monday.

Displays:
- Week number and theme
- A collapsible checklist of that week's milestone items (from WEEKLY_MILESTONES.md): what to have done, learned, faced
- The suggested Sarah check-in topic for the week — visible but not tracked
- A "Week complete" toggle that activates on Day 7 of each week

State: checkboxes are user-toggled but not required — no compliance scoring. The list is a prompt, not a task manager.

---

### Photo Log Panel

A grid view — 56 slots in a 7×8 grid layout.

- Empty slots show the day number and a muted prompt label (e.g., "Day 12 — your face after cold exposure")
- Filled slots show the uploaded photo, day number, and prompt label on hover
- Upload: tap/click any slot to upload a photo. Single photo per day. Replaces if re-uploaded.
- No social sharing controls. No public toggle. This is private by default.
- Photos stored in user's Supabase bucket under `builtdad/photos/`
- On Day 56: a "Generate 56-photo essay" option appears — creates a single scrollable view of all 56 photos in order with day labels. Exportable as a PDF or shareable as a private link.

---

### Partner Check-In Tab

A secondary tab within `sec-builtdad`.

Displays:
- This week's Sarah check-in question (from SARAH_CHECKINS.md)
- The rationale/framing for the question (the "Why this question" text)
- A "Check-in done this week" toggle — binary, no detail required
- Historical log: which weeks have been marked done

This tab is intentionally simple. No sharing, no Sarah-side portal access. It's a reminder to Ben, not a couples dashboard.

---

### Programme History / Archive

After Day 56, the full section persists in a read-only "Archive" state:
- All 56 prompts visible with their mark-as-reflected states
- All 8 weekly milestones with completion states
- Full photo grid
- Programme start and end dates
- A label: "Built Dad — April to June 2026 — Complete"

---

## `sec-bestself` — Summary Card

A compact card in the Best Self section that shows:

- Current Built Dad day: `Day {N} / 56`
- Today's prompt (truncated to first sentence, expandable on tap)
- Whether today's reflection has been marked done
- Whether this week's Sarah check-in has been done
- A link → to the full `sec-builtdad` section

This card disappears from Best Self after Day 56 and is replaced with a static "Built Dad Complete — June 2026" badge.

---

## Data Model

All Built Dad data is scoped to `user_id` and stored in Supabase.

| Field | Type | Notes |
|---|---|---|
| `bd_start_date` | date | 2026-04-20, fixed |
| `bd_reflections` | jsonb | `{day: N, done: bool, note: string|null}[]` |
| `bd_weekly_milestones` | jsonb | `{week: N, done: bool}[]` |
| `bd_checkins` | jsonb | `{week: N, done: bool}[]` |
| `bd_photos` | storage refs | Supabase bucket paths, one per day slot |

No server-side enforcement of "correct" behaviour. Ben toggles what he wants. The data exists for his reference, not for compliance tracking.

---

## Interactions

- No notifications or push reminders from the portal — Built Dad is self-directed
- No streak mechanics, no gamification
- No public-facing component — nothing in Built Dad is visible to anyone except Ben (and Sarah if she's looking at his screen)
- Mobile-first layout: the daily prompt and mark-as-reflected toggle should be usable in under 10 seconds on a phone

---

## Future Consideration (Post Day 56)

If Built Dad runs again (year 2, or a variant), the archive of year 1 should remain intact and a new cycle should be creatable from the same section. Architecture should allow for this without requiring a rebuild.
