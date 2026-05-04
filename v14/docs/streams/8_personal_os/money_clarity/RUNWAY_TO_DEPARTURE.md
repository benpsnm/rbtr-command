# Runway to Departure

The most important financial document. Departure: 1 July 2027.

---

## Header

```
DAYS TO DEPARTURE: [calculated daily from today to 2027-07-01]
```

As of 4 May 2026: **423 days.**

This number is recalculated daily. It is displayed at the top of this view in the portal at all times, in large type. It is not buried.

---

## 1. What's Needed by Departure

Target balances to hit before wheels roll on 1 July 2027.

| Fund | Target | Purpose |
|---|---|---|
| RBTR expedition budget | £[X] | Truck completion, ferry crossings, visas, 90-day running costs |
| House mortgage buffer | £[X] | Mortgage covered while away, plus buffer for property issues |
| PSNM working capital floor | £[X] | Business keeps running without Ben drawing from it daily |
| Eternal working capital floor | £[X] | Same — operational continuity |
| Personal savings floor | £[X] | Ben's personal float at departure |
| **Total needed** | **£[X]** | |

Ben to populate the £[X] values with actuals. These are stored in `departure_targets` table:

```
id              uuid, primary key
fund            text — 'rbtr' | 'house_buffer' | 'psnm_floor' | 'eternal_floor' | 'personal_floor'
target_amount   numeric(12,2)
notes           text
updated_at      timestamptz
```

---

## 2. Current Position

| Fund | Current Balance | Target | Gap |
|---|---|---|---|
| RBTR | £[X] | £[X] | £[X] |
| House buffer | £[X] | £[X] | £[X] |
| PSNM working capital | £[X] | £[X] | £[X] |
| Eternal working capital | £[X] | £[X] | £[X] |
| Personal floor | £[X] | £[X] | £[X] |
| **Total** | **£[X]** | **£[X]** | **£[X]** |

Gap = target minus current. Positive = deficit. Negative = surplus (show in green).

Current balances linked to `entity_balances` table:

```
id              uuid, primary key
entity          text
fund_type       text
balance         numeric(12,2)
as_of_date      date
source          text — 'manual' | 'bank_feed'
```

Updated manually or via bank feed integration. Source is recorded so stale manual figures are flagged.

---

## 3. Monthly Savings Rate Required

```
months_remaining = DATEDIFF(months, today, 2027-07-01)
monthly_target   = gap_per_fund / months_remaining
```

As of 4 May 2026, months remaining: approximately 13.9 months.

Display per fund:

```
RBTR: gap £[X] / 13.9 months = £[X]/month required
House buffer: £[X] / 13.9 = £[X]/month required
...
```

### On-track check

Current savings rate sourced from average monthly inflows to each fund over the last 3 months.

```
on_track = current_monthly_rate >= monthly_target

if on_track:
    "On track."
else:
    "Behind by £[X]/month."
```

No softening. "Behind by £420/month" is the output. Not "slightly behind pace."

---

## 4. Trajectory Line

Projection: if current savings rate continues unchanged, what balance does each fund reach on 1 July 2027?

```
projected_balance = current_balance + (current_monthly_rate * months_remaining)
```

Chart: one line per fund.
- Solid line: actual balance month by month (historical)
- Dashed line: projected balance from today forward
- Horizontal target line: the required balance at departure
- X-axis: Jan 2026 to Jul 2027
- Y-axis: £0 to [max target]

Where projected line meets or crosses the target line = on track. Where it falls short = visible shortfall gap.

---

## 5. The Gap

Which entity or fund is furthest behind? State it plainly.

Portal shows a ranked list of gaps, largest to smallest:

```
1. RBTR fund: short by £[X] — requires £[X]/month additional
2. House buffer: short by £[X] — requires £[X]/month additional
...
```

Beneath each line: one concrete lever.

Examples:
- "PSNM needs to increase monthly net by £[X] to close the RBTR gap by departure."
- "Reducing Eternal variable spend by £[X]/month closes the House buffer gap."

These are not automated recommendations — they are pre-written by Ben and stored in `runway_notes` table, updated when the gap changes materially. The portal surfaces them alongside the numbers.

---

## 6. Red Line

If the RBTR fund does not reach £[X] by 1 January 2027, the departure timeline is in jeopardy.

This is stated plainly in the portal. No softening. The text reads:

> **"If RBTR fund is below £[X] on 1 January 2027, departure on 1 July 2027 is not viable."**

That sentence is displayed permanently in this view, in bold, with the current RBTR balance beside it.

1 January 2027 is the decision point — 6 months before departure. Enough time to adjust or abort.

ROCKO reads this on the first Monday of each month:

> "RBTR fund red line check: balance £[X], red line target £[X] by 1 Jan 2027. Currently [on track / behind by £X]."

---

## 7. Data Refresh

- Balance figures: updated manually or daily via bank feed
- Projections: recalculated daily at 06:00
- Months remaining: recalculated daily against departure date constant (`2027-07-01`)
- Departure date is a constant. It does not update unless Ben manually changes it in admin settings.

---

## API Endpoint

`GET /api/financial/runway`

Returns: targets, current balances, gaps, monthly rates required, on-track status per fund, and projected balances at departure.
