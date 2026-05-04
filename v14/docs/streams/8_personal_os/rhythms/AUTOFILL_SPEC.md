# Autofill Spec — Rhythm Templates

> Technical specification for how each rhythm template pre-populates from system data.  
> Trigger: `/prepare-review [daily|weekly|monthly|quarterly|annual]` in the command centre.  
> Returns a pre-filled markdown draft. Ben reviews and edits before saving as canonical record.

---

## Principles

1. **Auto-fill is for data retrieval, not thinking.** The system fetches numbers, summaries, and context. The human writes everything that requires judgement.
2. **Blank by design means blank.** Fields marked "blank by design" are intentionally not pre-filled. They are the point of the exercise.
3. **Pre-fill happens before the session, not during.** The draft should be ready and waiting — not assembled while the clock is running.
4. **No private fields leave the system.** "One truth", gratitude, and family reflection sections never sync to Supabase or any external service.

---

## Daily Review

**Trigger:** `/prepare-review daily` — fires automatically at 9pm, delivered to command centre dashboard. ROCKO can prompt verbally: *"Your daily review is ready."*

### Pre-populated fields

| Field | Source | Supabase table / API | Notes |
|-------|--------|----------------------|-------|
| Date / time header | System clock | — | Auto-inserted |
| Mood score | Wearable or manual log from earlier in day | `mood_log` | Last entry for `TODAY()` |
| Energy score | Wearable or manual log | `energy_log` | Last entry for `TODAY()` |
| Sleep quality | Wearable or manual log | `sleep_log` | Entry from morning |
| Atlas daily summary | Atlas morning brief output | `atlas_briefs` | `brief_type = 'daily'`, today's date |
| Tomorrow's calendar events | Google Calendar API | — | Next calendar day, all events |
| Top 3 carryovers | Any task_intentions not marked complete | `task_intentions` | `for_date = TODAY()`, `status != 'complete'` — listed as context, not pre-filled into tomorrow's list |

### Blank by design

- "How today actually felt" — one sentence
- What worked (3 bullets)
- What didn't (3 bullets)
- What I wish I'd done
- Top 3 for tomorrow — carryovers are shown as reference, but Ben sets tomorrow's list himself
- Gratitude line
- One truth

**Rationale:** The data fields tell you what happened. The blank fields tell you what it meant. Both are necessary. Only one can be automated.

---

## Weekly Money Meeting

**Trigger:** `/prepare-review weekly` — Sunday, fires at 8:50pm (10 minutes before meeting start). Delivered to command centre. Both Ben and Sarah can view.

### Pre-populated fields

| Field | Source | Supabase table | Notes |
|-------|--------|----------------|-------|
| PSNM income this week | Financial transactions | `transactions` | `entity = 'PSNM'`, `type = 'income'`, current ISO week |
| PSNM spend this week | Financial transactions | `transactions` | `entity = 'PSNM'`, `type = 'expense'`, current ISO week |
| Eternal income / spend | Same | `transactions` | `entity = 'Eternal'` |
| House income / spend | Same | `transactions` | `entity = 'House'` |
| Personal income / spend | Same | `transactions` | `entity = 'Personal'` |
| RBTR spend this week | Same | `transactions` | `entity = 'RBTR'` |
| RBTR YTD total | Aggregated | `transactions` | `entity = 'RBTR'`, `date >= [year start]` |
| Outstanding invoices | Invoice table | `invoices` | `status = 'outstanding'`, `created_at < NOW() - INTERVAL '7 days'` |
| Last week's decisions | Decision log | `decision_log` | `meeting_date = [last Sunday]` — shown for review only |
| Inter-entity balances | Running balance table | `entity_loans` | All open balances |

### Blank by design

- "How the week felt" per entity — spoken aloud, not typed into a form
- Notable decisions made this week — requires human context
- Red flags — system can flag anomalies (>20% variance from prior week), but Ben and Sarah confirm what's actually a red flag
- Tonight's decisions — always blank; this is the meeting's output, not its input

**Anomaly surfacing (not pre-fill):** The system can annotate rows where spend is >20% above the 4-week rolling average, or where an invoice has been outstanding >21 days. These appear as `[!]` flags in the draft — for attention, not action. Ben decides what's a real flag.

---

## Monthly Retrospective

**Trigger:** `/prepare-review monthly` — last Friday of the month (to give Ben the weekend to review pre-work before Sunday's session). Delivered to command centre.

### Pre-populated fields

| Field | Source | Supabase table / API | Notes |
|-------|--------|----------------------|-------|
| Atlas monthly summary | Atlas brief | `atlas_briefs` | `brief_type = 'monthly'`, current month |
| Git commit log | Git API / shell | — | `git log --since=[month start] --oneline` — listed as reference block |
| Income by entity (MTD) | Transactions | `transactions` | Grouped by entity, current month |
| Spend by entity (MTD) | Transactions | `transactions` | Grouped by entity, current month |
| Burn rate vs prior month | Aggregated | `money_clarity` | Current month vs prior month, % change |
| RBTR fund balance | Accounts | `accounts` | `account_type = 'RBTR'` |
| Last month's theme | Prior retro | `monthly_retros` | `month = prior` — shown at top as reminder |

### Blank by design

- What shipped (business, personal, expedition) — git log is reference, not the answer
- What didn't ship and why honestly — intentionally never pre-filled
- Kill list — requires human judgement; system cannot determine what should be killed
- Double-down list — same; evidence is available but interpretation is human
- Sarah + sons section — private; never touched by system
- Theme for next month — always blank

**Note:** The git commit log is reference material, not the shipped items list. Ben decides what counts as "shipped" — a commit is not the same as a deliverable.

---

## Quarterly Pivot

**Trigger:** `/prepare-review quarterly` — last week of March, June, September, December. Delivered to command centre.

### Pre-populated fields

| Field | Source | Supabase table / API | Notes |
|-------|--------|----------------------|-------|
| Days to departure | System calculation | — | `1 Jul 2027 - TODAY()` |
| YTD revenue by entity | Transactions | `transactions` | Grouped by entity, YTD |
| YTD spend by entity | Transactions | `transactions` | Grouped by entity, YTD |
| RBTR budget: spent, remaining, projected gap | Accounts + transactions | `accounts`, `transactions` | Running calculation |
| Truck build milestone completion % | Milestone tracker | `expedition_milestones` | `status = 'complete'` / total |
| Prior quarter's goals | Goal log | `goals` | `quarter = [prior Q]` |
| Prior quarter pivot records | Pivot log | `pivot_records` | All open pivots |
| Atlas quarterly mood/energy trend | Atlas | `atlas_briefs` | `brief_type = 'quarterly'` |

### Blank by design

- All 5 questions — every single one. These are for thinking, not data retrieval.
- The pivot record — the system creates the template, Ben decides if a pivot has occurred and writes it
- The one thing for next quarter — never pre-filled

**Rationale:** Quarterly questions require stepping back from the data. Pre-filling answers to strategic questions produces cargo-cult planning. The data is available as context; the questions stay blank.

---

## Annual Audit

**Trigger:** `/prepare-review annual` — first Monday of December. Full data pull; largest pre-fill of the year. Delivered to command centre as a structured draft document.

### Pre-populated fields

| Field | Source | Supabase table / API | Notes |
|-------|--------|----------------------|-------|
| Full year P&L per entity | Transactions | `transactions` | Grouped by entity, `year = [current]` |
| Revenue vs target per entity | Targets + actuals | `goals`, `transactions` | Delta calculated |
| Net position per entity | Accounts | `accounts` | Current snapshot |
| Atlas annual summary | Atlas | `atlas_briefs` | `brief_type = 'annual'` |
| Mood trend (annual avg) | Mood log | `mood_log` | Monthly averages, full year |
| Energy trend (annual avg) | Energy log | `energy_log` | Monthly averages, full year |
| Sleep quality trend | Sleep log | `sleep_log` | Monthly averages, full year |
| Truck build milestone completion | Milestones | `expedition_milestones` | All milestones, status, dates |
| RBTR fund: annual spend, balance, projected gap | Accounts + transactions | `accounts`, `transactions` | Full year calculation |
| All 4 quarterly pivot records | Pivot log | `pivot_records` | `year = [current]` — shown as context |
| Prior year audit summary | Annual audit log | `annual_audits` | `year = [prior]` — shown for comparison |

### Blank by design

- All verdict fields (continue / grow / wind down) — requires human decision
- Sarah section — private; never touched by system
- Hudson section — private
- Benson section — private
- Family health section — private
- Ben's mental load, stress events — private
- The one health decision for January — always blank
- Legacy / sons section — private
- Letter to self — always blank; this is the point of the entire exercise

**Note on the letter:** The letter to self is the most important output of the Annual Audit. It is never pre-filled, never prompted with structure during writing, and never synced anywhere. It is saved locally to `docs/annual/[YEAR]_letter.md` — not to Supabase.

---

## Implementation Notes

### Command centre integration

```
/prepare-review daily      → fetches day's data, builds DAILY_REVIEW draft
/prepare-review weekly     → fetches week's financial data, builds WEEKLY_MONEY_MEETING draft
/prepare-review monthly    → fetches month's data + Atlas summary, builds MONTHLY_RETROSPECTIVE draft
/prepare-review quarterly  → fetches YTD data + milestones, builds QUARTERLY_PIVOT draft
/prepare-review annual     → fetches full year data + Atlas annual summary, builds ANNUAL_AUDIT draft
```

### Output behaviour

- Returns a pre-filled `.md` draft with autofilled sections clearly marked `[AUTO-FILLED]`
- Blank by design fields are marked `[FILL THIS IN]` — not left empty, to make the structure visible
- Ben reviews the draft, removes the markers, and saves the final canonical version

### Storage of canonical records

| Rhythm | Save location |
|--------|--------------|
| Daily | `docs/daily/YYYY-MM-DD_review.md` |
| Weekly | `docs/weekly/YYYY-WNN_money.md` |
| Monthly | `docs/monthly/YYYY-MM_retro.md` |
| Quarterly | `docs/quarterly/YYYY-Q[N]_pivot.md` |
| Annual | `docs/annual/YYYY_audit.md` |
| Annual letter | `docs/annual/YYYY_letter.md` (local only, never synced) |

### Privacy boundary

The following data is **never** written to Supabase, never passed to Atlas, and never leaves the local filesystem:

- "One truth" from daily reviews
- Gratitude lines
- Sarah, Hudson, Benson sections from monthly and annual reviews
- Family health notes
- Letter to self

This is non-negotiable. The system is a tool. These are private records.
