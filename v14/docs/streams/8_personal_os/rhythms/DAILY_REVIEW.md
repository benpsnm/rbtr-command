# Daily Review

> 7 minutes. No phone after you start. This is the lid going on the day.

---

## Date / Time

**Date:** _______________  
**Time started:** _______________  
**Day of week:** _______________

---

## State Check

| Metric | Score (1–10) | Notes |
|--------|-------------|-------|
| Mood | | |
| Energy | | |
| Sleep quality (last night) | | |

**In one sentence — how did today actually feel?**

> _______________________________________________________________________________

---

## What Worked

_(3 bullets max. Be specific — not "I was productive", but what actually happened.)_

-
-
-

---

## What Didn't

_(3 bullets max. No softening. What actually went wrong or got left behind?)_

-
-
-

---

## What I Wish I'd Done

_(One line. The thing that kept nagging.)_

> _______________________________________________________________________________

---

## Top 3 for Tomorrow

_(Priority order. Not a wish list — commitments.)_

1.
2.
3.

---

## Gratitude

_(One thing, specific. Not "my family" — what exactly, from today?)_

> _______________________________________________________________________________

---

## One Truth

_(Something real. Not for the highlight reel. Could be uncomfortable. Write it anyway.)_

> _______________________________________________________________________________

---

## Atlas Integration Note

The following fields from this review map to Supabase for Atlas pattern surfacing:

| Field | Supabase Table | Column |
|-------|---------------|--------|
| Mood score | `mood_log` | `score`, `logged_at` |
| Energy score | `energy_log` | `score`, `logged_at` |
| Sleep quality | `sleep_log` | `quality_score`, `logged_at` |
| Top 3 tomorrow | `task_intentions` | `description`, `priority_rank`, `for_date` |

Atlas will surface mood/energy trends in the morning briefing when ≥5 consecutive days are logged. Gaps in the log are surfaced as a pattern break, not ignored.

Entries are written to Supabase via the `/log-review` command in the command centre. Raw text of "one truth" and gratitude are **never** synced — they stay local.
