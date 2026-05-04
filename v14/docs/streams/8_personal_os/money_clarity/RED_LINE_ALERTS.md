# Red Line Alerts

Automatic flags for dangerous financial conditions. These cannot be snoozed or hidden. Ben acknowledges them manually in the portal. That's the only way they go away.

---

## Supabase Table: `financial_alerts`

```sql
CREATE TABLE financial_alerts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity         text NOT NULL,
  type           text NOT NULL,
  triggered_at   timestamptz NOT NULL DEFAULT now(),
  value          numeric(12,2) NOT NULL,   -- the actual figure that triggered it
  threshold      numeric(12,2) NOT NULL,   -- the floor/ceiling that was breached
  message        text NOT NULL,            -- the exact message ROCKO and portal display
  status         text NOT NULL DEFAULT 'active',  -- 'active' | 'acknowledged'
  acknowledged_at timestamptz,
  acknowledged_by text
);
```

Active alerts: `status = 'active'`. Acknowledged: moved to `'acknowledged'`, kept in the log. History retained for 12 months. Exportable to CSV from admin panel.

ROCKO reads all active unacknowledged alerts every morning. There is no auto-snooze.

---

## Alert 1: PSNM Cash Critical

**Trigger:** PSNM bank balance drops below £500.

**Check frequency:** Daily at 06:00, and on every manual balance update.

**Actions:**
- Surfaces immediately in ROCKO brief
- Red banner at the top of the portal (persists until acknowledged)
- Push notification sent

**Message:**
```
"PSNM CASH CRITICAL: Balance £[X]. Below floor of £500."
```

**Acknowledgement:** Ben clicks "Acknowledge" in the portal alert panel. Status moves to 'acknowledged'. The balance is still shown — acknowledgement does not hide the problem, it logs that Ben has seen it.

**Re-trigger:** If balance drops further after acknowledgement, a new alert fires.

---

## Alert 2: Personal Cash Critical

**Trigger:** Personal account balance drops below £100.

**Check frequency:** Daily at 06:00, and on every manual balance update.

**No amber state for this alert.** It goes straight to red.

**Actions:**
- Surfaces immediately in ROCKO brief
- Red banner in portal
- Push notification sent

**Message:**
```
"PERSONAL CASH CRITICAL: £[X]. Immediate attention required."
```

**Acknowledgement:** Same as Alert 1 — manual only.

---

## Alert 3: Any Entity 30 Days from Negative

**Trigger:** For any entity with an operational cash balance, runway falls to 30 days or fewer.

```sql
runway_days = current_balance / avg_daily_burn_last_7d
TRIGGER when runway_days <= 30
```

RBTR is excluded — it is a savings pot with no burn rate.

**Actions:**
- Amber banner in portal for that entity
- Mentioned in next morning brief

**Message:**
```
"[Entity] has approximately [N] days of runway at current burn rate."
```

**Note:** If runway then falls below 7 days, Alert 1/2 or a separate escalation applies. This alert does not auto-escalate — a new, higher-severity alert fires independently.

---

## Alert 4: Invoice Overdue by 14 Days

**Trigger:** Any record in `invoices` table where:
```sql
due_date < CURRENT_DATE - 14
AND status != 'paid'
```

**Check frequency:** Daily at 06:00.

**Actions:**
- Listed in morning brief under "Outstanding"
- Appears in portal alerts panel

**Message:**
```
"[Client] invoice £[X] is [N] days overdue."
```

Example: "Acme Ltd invoice £1,400 is 17 days overdue."

**Invoices table required columns:**

```sql
CREATE TABLE invoices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity      text NOT NULL,
  client      text NOT NULL,
  amount      numeric(12,2) NOT NULL,
  due_date    date NOT NULL,
  status      text NOT NULL DEFAULT 'unpaid',  -- 'unpaid' | 'paid' | 'disputed'
  invoice_ref text,
  created_at  timestamptz DEFAULT now()
);
```

**Multiple overdue invoices:** ROCKO reads each one. Portal groups them by entity.

---

## Alert 5: Runway Slips by More than 7 Days vs Plan

**Trigger:** The projected RBTR fund balance at 1 July 2027, recalculated daily, has fallen more than 7 days' worth of burn below the original plan.

```
projected_balance_at_departure = rbtr_current_balance + (monthly_contribution_rate * months_remaining)
plan_balance_at_departure       = rbtr_departure_target
slip_amount                     = plan_balance_at_departure - projected_balance_at_departure
slip_days_equivalent            = slip_amount / avg_daily_rbtr_target_accrual

TRIGGER when slip_days_equivalent > 7
```

**Actions:**
- Surfaces in weekly Monday brief
- Persistent banner in Runway to Departure view in portal

**Message:**
```
"Runway warning: RBTR departure fund is now projecting £[X] short of target. Departure plan has slipped [N] days equivalent."
```

**This alert does not go away on its own.** Ben acknowledges it, then must take action to close the gap. If the gap widens further, a new alert fires even if the previous one is acknowledged.

---

## Alert 6: RBTR Monthly Contribution Missed

**Trigger:** On the 1st of each month, check whether the RBTR fund received its planned monthly contribution. If not received by the 3rd of the month, fire this alert.

Planned monthly contribution stored in `departure_targets.rbtr_monthly_contribution` field.

```sql
-- Check: has RBTR received >= planned contribution since the 1st of this month?
SELECT SUM(amount)
FROM financial_transactions
WHERE entity = 'rbtr'
  AND type = 'income'
  AND date >= date_trunc('month', CURRENT_DATE)
```

If sum < planned contribution by the 3rd, alert fires.

**Actions:**
- Portal alert banner
- Mentioned in next ROCKO brief

**Message:**
```
"RBTR monthly contribution not received. Fund is £[X] behind schedule."
```

**Phrasing is exact.** Not "the contribution appears to be delayed." Behind schedule by £[X].

---

## Alert Priority Order

When ROCKO reads alerts, the order is:

1. Personal Cash Critical (Alert 2) — highest severity, read first
2. PSNM Cash Critical (Alert 1)
3. Other entity cash critical alerts
4. Runway slip (Alert 5)
5. RBTR contribution missed (Alert 6)
6. Runway < 30 days (Alert 3) — per entity, in entity order
7. Overdue invoices (Alert 4) — grouped by entity

If there are more than 4 alerts, ROCKO reads the top 4 by priority and says: "Plus [N] additional alerts in the portal."

---

## Implementation Notes

- Alert deduplication: before inserting a new alert, check for an existing active alert of the same `entity` + `type`. If one exists and is active, do not insert a duplicate — update the `value` field on the existing record instead.
- Re-trigger logic: once an alert is acknowledged, it can fire again if the condition is still met at the next check. Acknowledgement is not a fix. It is a receipt.
- Alert history: all records kept for 12 months. Soft delete only — no hard deletes from this table.
- Export: admin panel offers CSV export of `financial_alerts` filtered by date range, entity, and type.

---

## Portal Alert Panel

Fixed panel visible on all portal pages (not just the financial section). Collapses to an icon if no active alerts.

Displays:
- Count of active alerts
- Severity indicator (red if any red-line, amber if amber-only)
- List of active alerts with entity, message, and triggered timestamp
- "Acknowledge" button per alert
- Link to full alert history

The panel cannot be dismissed globally. Individual alerts must be acknowledged individually.
