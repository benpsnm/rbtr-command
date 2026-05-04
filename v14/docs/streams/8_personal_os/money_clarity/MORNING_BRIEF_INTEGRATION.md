# Morning Brief Integration

Exactly what numbers ROCKO reads every morning. No softening. This is a data delivery system, not a motivational service.

---

## Delivery Position

Financial section is delivered after weather and diary summary. It begins with a clean break: "Financial update. [Day], [Date]."

---

## Section 1: Net Position Yesterday

For each entity that had any transactions the prior day:

```
"[Entity] was up/down £[X] yesterday."
```

Rules:
- "Up £X" or "down £X." No other framing.
- Skip entities with zero transactions. Do not say "no activity."
- Read in this order: PSNM, Eternal, House, Personal, Sarah, RBTR.
- If an entity had income and expense that netted to zero, skip it — zero net means nothing happened worth reading.

Example output:
> "PSNM was up £340 yesterday. Eternal was down £120 yesterday. Personal was down £55 yesterday."

---

## Section 2: Red-Line Alerts

Read before MTD numbers. Alerts take priority.

If there are active unacknowledged alerts:
> "Red line: [entity] cash is at £[X]. That's below the floor."

If multiple alerts:
> "Two red lines. PSNM cash at £[X], below the £500 floor. Personal at £[X], below the £100 floor."

If no active alerts:
> "No red lines today."

Never skip this section. If there are no alerts, say so. Ben needs to hear the word "no red lines" — it's confirmation the check ran.

---

## Section 3: MTD Net Per Active Entity

Read for all entities that have had any transactions this calendar month.

```
"Month to date: [Entity] net £[X], [Entity] net £[X]."
```

Rules:
- Positive and negative both read aloud.
- Negative reads as "net negative £[X]" — not "a deficit of."
- Do not round to the nearest hundred. Read the actual number.
- RBTR is always read, even if net zero — it is the departure fund and Ben wants to hear it.

Example:
> "Month to date: PSNM net £1,820. Eternal net negative £440. Personal net negative £180. RBTR net £600."

---

## Section 4: Monday Runway Reminder (Mondays only)

On Monday mornings, after the MTD section:

> "[N] days to departure. RBTR fund at £[X], needs to be at £[X] by 1 January 2027. Currently [on track / behind by £X/month]."

"Behind by £[X]/month" is the phrasing. Not "slightly behind" or "a little short." The number is the number.

---

## Section 5: One Financial Truth Per Week (Mondays only)

On Monday mornings, after the runway reminder:

One rotating insight from the data. Ben maintains a pool of 12 — one per week, rotating on a 12-week cycle.

Stored in `weekly_financial_truths` table:

```
id              uuid, primary key
week_number     integer — 1 to 12
truth_text      text — the exact sentence ROCKO reads
entity          text — optional, if entity-specific
last_read_date  date
```

ROCKO reads the current week's entry verbatim.

Example truths:
- "PSNM's highest spend month last year was August. You're currently tracking above that pace."
- "Eternal has had three consecutive months of declining revenue."
- "House fixed costs have increased by £[X] year on year."
- "Personal spend was above the green threshold for 4 of the last 6 months."
- "RBTR fund contributions have been consistent. You've missed zero months."
- "The truck build has consumed £[X] more than the original estimate."

Ben writes these. ROCKO reads them unchanged. No embellishment.

---

## Delivery Rules

These apply to every financial section, every day, without exception:

| Rule | Detail |
|---|---|
| Read the number, not the spin | "Down £X" not "a slight dip" or "a modest decline" |
| No encouragement | ROCKO does not say "good work" or "you're doing well" unless Ben explicitly asks |
| Flag anomalies directly | If a number looks wrong (e.g., PSNM showing income of £0 for three consecutive days when it should have transactions), ROCKO says: "That looks wrong. Check PSNM transactions." |
| Length | Financial brief under 90 seconds in spoken form at normal speech pace |
| No filler | No "so," "just to note," "I should mention." Straight to the numbers. |

---

## Anomaly Detection

ROCKO flags a number as potentially wrong when:

1. An entity that usually has daily transactions shows zero for 3+ consecutive days
2. A transaction amount is more than 3x the entity's daily average (could be legitimate — just flagged)
3. A balance drops by more than 50% day-on-day

Anomaly phrasing:
> "That looks wrong. Check [entity] transactions."

ROCKO does not speculate about the cause. It flags and moves on.

---

## Script Template

```
"Financial update. [Day], [Date].

[SECTION 1 — Yesterday]
[Entity] was [up/down] £[X] yesterday. [repeat per entity with activity]

[SECTION 2 — Red lines]
[No red lines today.] OR [Red line: [entity] at £[X].]

[SECTION 3 — MTD]
Month to date: [entity] net £[X]. [repeat per active entity]

[MONDAY ONLY — SECTION 4 — Runway]
[N] days to departure. RBTR fund at £[X], needs £[X] by 1 January 2027. Currently [on track / behind by £X/month].

[MONDAY ONLY — SECTION 5 — Truth]
[Truth text verbatim.]"
```

---

## Source Data for Each Section

| Section | Source |
|---|---|
| Yesterday net | `financial_transactions`, prior day, aggregated per entity |
| Red-line alerts | `financial_alerts` where `status = 'active'` |
| MTD net | `financial_transactions`, current month, aggregated per entity |
| Runway | `runway_status` view (pre-computed daily) |
| Weekly truth | `weekly_financial_truths` by current week number |

The brief is assembled by `GET /api/atlas/morning-brief` which calls the financial module and returns a structured JSON payload. ROCKO consumes the payload and reads from it — it does not do its own calculations.
