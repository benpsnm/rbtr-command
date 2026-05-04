# Rolled-Up Balance Sheet

Ben and Sarah's complete net position. Updated weekly.

---

## Update Cadence

Refreshed every Monday at 06:00. Some fields are manual inputs (property, vehicles, business assets) — flagged clearly if the figure is more than 7 days old.

---

## Assets

### Property

- Family home (in Sarah's name)
- Estimated current value: £[X] — marked as estimated, not a formal valuation
- Outstanding mortgage: £[X] (sourced from `liabilities` table — updated monthly)
- Net equity: estimated value minus outstanding mortgage
- Last updated: [date]

The fact that the property is in Sarah's name is documented here explicitly, not buried. Net equity is a shared family asset, treated as such in the balance sheet.

### Vehicles

| Vehicle | Description | Estimated Value | Notes |
|---|---|---|---|
| Expedition truck | [Make/model/year] | £[X] | Value grows as build progresses — see truck_build_value |
| [Other vehicle] | [Make/model/year] | £[X] | |

Truck value field (`truck_build_value`) is updated manually by Ben as build milestones complete. The value represents the truck as a built asset — not scrap value, not replacement cost. Ben's estimate.

### Business Assets

Rough figures only — not audited values.

| Entity | Asset | Estimated Value |
|---|---|---|
| PSNM | Stock and spray equipment | £[X] |
| Eternal | Spray foam rig, equipment | £[X] |

These are updated manually, quarterly at minimum. Marked "rough estimate" in the display.

### Cash

Per entity bank balances, summed:

| Entity | Balance |
|---|---|
| PSNM | £[X] |
| Eternal | £[X] |
| House | £[X] |
| Personal | £[X] |
| Sarah | £[X] |
| RBTR | £[X] |
| **Total cash** | **£[X]** |

Sourced from `entity_balances` table. Dates of last update shown per row — if any balance is more than 7 days old, the row is flagged amber.

### Savings

| Account | Owner | Type | Balance |
|---|---|---|---|
| [Account name] | Ben / Sarah / Joint | ISA / Savings / Pension | £[X] |

Pensions included if Ben has values available. Marked as "estimated transfer value" if the figure is a projection, not a statement balance.

### RBTR Fund

- Dedicated expedition savings pot
- Current balance: £[X]
- Shown separately from general cash — it is ring-fenced and has a specific purpose and target
- Target at departure: £[X] (cross-referenced from RUNWAY_TO_DEPARTURE.md)

### Total Assets

```
total_assets = property_equity + vehicle_values + business_assets + total_cash + savings + rbtr_fund
```

---

## Liabilities

### Mortgage

- Outstanding balance: £[X]
- Monthly payment: £[X]
- Approximate months remaining: [N]
- In Sarah's name — documented, not buried

### Business Loans and Credit Facilities

| Entity | Facility | Balance | Monthly Payment |
|---|---|---|---|
| PSNM | [Loan/overdraft] | £[X] | £[X] |
| Eternal | [Loan/overdraft] | £[X] | £[X] |

Update manually when balances change.

### Personal Debt

| Type | Balance | Notes |
|---|---|---|
| Credit card | £[X] | |
| [Other] | £[X] | |

If zero, state zero. No omissions.

### RBTR Outstanding Costs

What is still to be spent on the truck build and pre-departure preparation, estimated.

```
rbtr_outstanding = total_estimated_build_cost - amount_spent_to_date
```

Sourced from `rbtr_build_tracker` table:

```
id              uuid, primary key
item            text
estimated_cost  numeric(12,2)
actual_cost     numeric(12,2) — null if not yet spent
category        text — 'truck' | 'equipment' | 'admin' | 'other'
status          text — 'planned' | 'in_progress' | 'complete'
```

Outstanding build cost = sum of `estimated_cost` where `status != 'complete'`.

### Total Liabilities

```
total_liabilities = mortgage_balance + business_loans + personal_debt + rbtr_outstanding
```

---

## Net Position

```
net_position = total_assets - total_liabilities
```

Displayed prominently. Not softened. If negative, it says negative.

---

## Week-on-Week Movement

```
weekly_change = this_week_net_position - last_week_net_position
```

Display:
- "Net position up £[X] this week."
- "Net position down £[X] this week."

Direction and magnitude. No editorialising.

### Year-on-Year

If data available from the same week last year:

```
yoy_change = this_week_net_position - same_week_last_year_net_position
```

Display: "Year on year: up/down £[X]."

If prior year data not available, display: "Year-on-year comparison not yet available."

---

## Display Notes

| Field | Note |
|---|---|
| Property value | Always shown as "estimated" — not a valuation |
| Truck value | Shows last updated date. Grows as build progresses. |
| Business assets | "Rough estimate" label on every row |
| Stale balances | Any balance > 7 days old flagged amber |
| Sarah's name on property | Shown explicitly in the property row |

---

## Storage

All balance sheet inputs stored in Supabase. Manual fields have `updated_at` and `updated_by` columns. Weekly snapshots saved to `balance_sheet_snapshots` table for trend tracking:

```
id              uuid, primary key
snapshot_date   date
total_assets    numeric(12,2)
total_liabilities numeric(12,2)
net_position    numeric(12,2)
detail_json     jsonb — full breakdown
created_at      timestamptz
```

---

## API Endpoint

`GET /api/financial/balance-sheet?week=YYYY-Www`

Returns full balance sheet for the specified week. Defaults to current week.
