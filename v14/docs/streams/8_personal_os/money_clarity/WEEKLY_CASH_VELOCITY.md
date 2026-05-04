# Weekly Cash Velocity

How fast money moves through the system. Calculated weekly. Surfaced Monday morning.

---

## Definitions

### Inbound velocity
Average daily cash received over the last 7 days, per entity.

```
inbound_velocity = SUM(income transactions, last 7 days) / 7
```

### Outbound velocity
Average daily cash sent over the last 7 days, per entity.

```
outbound_velocity = SUM(expense transactions, last 7 days) / 7
```

### Working capital position
Current bank balance minus all known obligations due in the next 14 days.

```
working_capital = current_balance - SUM(scheduled_payments WHERE due_date <= today + 14)
```

Scheduled payments sourced from `scheduled_payments` table:

```
id              uuid, primary key
entity          text
amount          numeric(12,2)
due_date        date
description     text
status          text — 'pending' | 'paid'
```

### Days of cash runway
Current bank balance divided by average daily burn rate. Calculated per entity and rolled up.

```
runway_days = current_balance / outbound_velocity
```

Average daily burn = outbound_velocity (7-day average).

If outbound_velocity = 0, runway = null (display as "—").

---

## Calculation Examples

### Per entity

**PSNM:**
- Current balance: £8,200
- Known obligations in 14 days: £3,100
- Working capital: £5,100
- 7-day average daily burn: £420
- Runway: 19.5 days

**Eternal:**
- Current balance: £4,600
- Known obligations in 14 days: £1,800
- Working capital: £2,800
- 7-day average daily burn: £310
- Runway: 14.8 days

**House:**
- Current balance: £1,900
- Known obligations in 14 days: £1,200 (mortgage instalment)
- Working capital: £700
- 7-day average daily burn: £85
- Runway: 22.4 days

**Personal:**
- Current balance: £620
- Known obligations in 14 days: £0
- Working capital: £620
- 7-day average daily burn: £55
- Runway: 11.3 days

**RBTR:**
- Current balance: £3,400
- Known obligations in 14 days: £0 (savings pot — no outgoings)
- Working capital: £3,400
- 7-day average daily burn: £0
- Runway: — (savings only)

### Rolled-up view

- Total inbound (all entities, last 7 days): sum of all entity inbound velocities × 7
- Total outbound (all entities, last 7 days): sum of all entity outbound velocities × 7
- Net velocity: total inbound minus total outbound
- Combined runway: total operational balances / total average daily burn (RBTR excluded — it's not operational cash)

---

## Warning Thresholds

| Runway | Status | Action |
|---|---|---|
| > 14 days | Green | No action |
| 8–14 days | Amber | Amber banner in portal. Mentioned in next morning brief. |
| < 7 days | Red | Red banner. Mentioned twice in the same brief. |

ROCKO reads a red runway entity twice in the same morning brief — once in the financial update, once in the alerts section. This is not a bug.

---

## Portal Display

Weekly review card. Generated Monday morning at 06:00.

Layout:

```
CASH VELOCITY — WEEK OF [DATE]

Entity    | Inbound/day | Outbound/day | Working Capital | Runway
----------|-------------|--------------|-----------------|-------
PSNM      | £X          | £X           | £X              | X days
Eternal   | £X          | £X           | £X              | X days
House     | £X          | £X           | £X              | X days
Personal  | £X          | £X           | £X              | X days
Sarah     | £X          | £X           | £X              | X days
RBTR      | £X          | —            | £X              | —
----------|-------------|--------------|-----------------|-------
COMBINED  | £X          | £X           | £X              | X days
```

Colour applied to Runway column only, per the thresholds above.

---

## ROCKO Monday Brief Format

> "Cash velocity this week: inbound £[X], outbound £[Y], net £[Z]. PSNM runway [N] days, Eternal [N] days, Personal [N] days."

Read only entities with a defined runway. Skip RBTR and any entity with null runway. If any entity is red (< 7 days), read it twice.

---

## 4-Week Rolling Trend Chart

Bar chart, one pair of bars per week:
- Left bar: total inbound that week
- Right bar: total outbound that week
- Net line overlaid

Trend arrow shown above the chart:
- Improving: net velocity is increasing week on week (inbound growing faster than outbound, or outbound falling faster than inbound)
- Deteriorating: opposite

Calculation:

```
trend = (this_week_net - last_week_net)
arrow_up = trend > 0
arrow_down = trend < 0
arrow_flat = trend = 0
```

Data sourced from `financial_transactions` grouped by ISO week.

---

## API Endpoint

`GET /api/financial/cash-velocity?week=YYYY-Www`

Returns per-entity velocity data and rolled-up totals for the specified ISO week. Defaults to current week if no parameter supplied.
