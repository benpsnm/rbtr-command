# Daily P&L Spec

Per-entity income, spend, and net across three time horizons. Surfaced in the ROCKO morning brief and the portal.

---

## Entities

PSNM, Eternal, House, Personal, Sarah, RBTR.

---

## Data Points Per Entity

| Field | Definition |
|---|---|
| Today income | Sum of `amount` where `type = 'income'`, `entity = [entity]`, `date = today` |
| Today spend | Sum of `amount` where `type = 'expense'`, `entity = [entity]`, `date = today` |
| Today net | Today income minus today spend |
| MTD income | Same filter, `date >= first day of current month` |
| MTD spend | Same filter, `date >= first day of current month` |
| MTD net | MTD income minus MTD spend |
| YTD income | Same filter, `date >= 1 Jan current year` |
| YTD spend | Same filter, `date >= 1 Jan current year` |
| YTD net | YTD income minus YTD spend |

---

## Data Source

Table: `financial_transactions`

Required columns:

```
id              uuid, primary key
entity          text — 'psnm' | 'eternal' | 'house' | 'personal' | 'sarah' | 'rbtr'
type            text — 'income' | 'expense'
amount          numeric(12,2) — always positive. direction determined by type.
date            date
description     text
created_at      timestamptz
```

Aggregations are calculated in the API layer. No aggregation logic in the client.

API endpoint: `GET /api/financial/daily-pnl?date=YYYY-MM-DD`

Response shape:

```json
{
  "date": "2026-05-04",
  "entities": {
    "psnm": {
      "today": { "income": 0, "spend": 0, "net": 0 },
      "mtd":   { "income": 0, "spend": 0, "net": 0 },
      "ytd":   { "income": 0, "spend": 0, "net": 0 }
    }
  }
}
```

---

## Refresh

- Scheduled: daily at 06:00, triggered by Supabase pg_cron or a Vercel cron job.
- On-demand: portal "Refresh" button calls `POST /api/financial/refresh-pnl`.
- Cache TTL: 30 minutes between on-demand refreshes to prevent hammering.

---

## Portal Display

Full table. All three time periods. All entities in rows, time periods in columns.

### Colour Coding (net column only)

| Condition | Colour |
|---|---|
| Net positive | No highlight (normal text) |
| Net negative, within tolerance | Amber background |
| Net negative, beyond tolerance | Red background |

Tolerance thresholds stored in `burn_thresholds` table, editable from admin panel. See MONTHLY_BURN_RATE.md for default values.

Table layout:

```
Entity    | Today Net | MTD Net | YTD Net
----------|-----------|---------|--------
PSNM      | £X        | £X      | £X
Eternal   | £X        | £X      | £X
House     | £X        | £X      | £X
Personal  | £X        | £X      | £X
Sarah     | £X        | £X      | £X
RBTR      | £X        | £X      | £X
----------|-----------|---------|--------
TOTAL     | £X        | £X      | £X
```

---

## ROCKO Morning Brief Format

ROCKO reads headline numbers only. One line per entity that had activity. Skip entities with zero transactions.

Format: `"[Entity]: up/down £X today, MTD net £Y."`

Example:

> "PSNM: up £340 today, MTD net £1,820. Eternal: down £120 today, MTD net negative £440."

Rules:
- "Up £X" or "down £X" — not "a positive movement of."
- Negative MTD is read as "MTD net negative £X" — not "a slight shortfall."
- If an entity has no transactions today, skip it. Don't say "no activity."

---

## Mandatory Surface Rule

If any entity shows a negative YTD net, it surfaces in the morning brief unprompted. It is not buried in a tab. It is not available only on request.

ROCKO says: `"[Entity] is negative year to date: £X."`

This rule cannot be disabled.
