# Monthly Burn Rate

Fixed vs variable costs per entity. RAG thresholds. Month-on-month trend.

---

## Structure

Each entity has two cost layers: fixed (seeded in a table) and variable (derived from transaction data).

---

## Data Sources

### Fixed costs

Table: `fixed_costs`

```
id              uuid, primary key
entity          text
name            text
amount          numeric(12,2)
frequency       text — 'monthly' (only monthly supported initially)
active          boolean
notes           text
```

Fixed costs are not calculated from transactions. They are seeded and maintained in this table. The sum of active fixed costs for an entity = its fixed burn floor. Changes to fixed costs (new contract, cancelled subscription) require a manual update to this table via the admin panel.

### Variable costs

Derived from `financial_transactions`:
- All records where `type = 'expense'` and `entity = [entity]`
- Exclude any transaction linked to a `fixed_cost_id` (foreign key, optional — add when transaction matches a known fixed cost)
- Calculate monthly totals for the last 12 months
- Average variable = mean of those 12 months
- Highest month = max of those 12 months
- Lowest month = min of those 12 months

---

## Per Entity Reference

### PSNM

Example fixed costs (Ben to update with actuals):
- Unit rent: £[X]/month
- Vehicle insurance: £[X]/month
- Software (CRM, accounts): £[X]/month
- Total fixed: £[X]/month

Variable: derived from transactions.

RAG thresholds:
- Green: < £6,000/month total burn
- Amber: £6,000–£8,000/month
- Red: > £8,000/month

---

### Eternal

Example fixed costs:
- Insurance: £[X]/month
- Equipment finance: £[X]/month
- Van running costs (fixed portion): £[X]/month
- Total fixed: £[X]/month

Variable: derived from transactions.

RAG thresholds:
- Green: < £3,000/month
- Amber: £3,000–£4,500/month
- Red: > £4,500/month

---

### House

Example fixed costs:
- Mortgage: £[X]/month
- Buildings and contents insurance: £[X]/month
- Council tax: £[X]/month
- Utilities (standing charges): £[X]/month
- Total fixed: £[X]/month

Variable: derived from transactions (groceries, maintenance, fuel, etc.).

RAG thresholds:
- Green: < £2,500/month
- Amber: £2,500–£3,500/month
- Red: > £3,500/month

---

### Personal

Example fixed costs:
- Phone contract: £[X]/month
- Subscriptions: £[X]/month
- Total fixed: £[X]/month

Variable: all personal discretionary spend.

RAG thresholds:
- Green: < £2,000/month
- Amber: £2,000–£3,000/month
- Red: > £3,000/month

---

### Sarah

Example fixed costs:
- Phone contract: £[X]/month
- Subscriptions: £[X]/month
- Total fixed: £[X]/month

Variable: all Sarah's discretionary spend.

RAG thresholds:
- Sarah's thresholds: Ben to set. No default specified — her financial layer is tracked separately.

---

### RBTR

Fixed costs (build phase):
- Build-related direct debits or finance: £[X]/month
- Storage (if applicable): £[X]/month
- Total fixed: £[X]/month

Variable: equipment purchases, parts, build materials.

RAG thresholds:
- Green: < £1,500/month
- Amber: £1,500–£2,500/month
- Red: > £2,500/month

Note: RBTR burn rate is expected to spike as departure approaches. Threshold should be reviewed quarterly.

---

## Total Burn Rate Calculation

```
total_burn = fixed_total + average_variable
```

This is the headline number displayed in the portal and used for runway calculations.

---

## Month-on-Month Trend

Calculated on the 1st of each month for the prior month:

```
change_gbp = this_month_total_burn - last_month_total_burn
change_pct = (change_gbp / last_month_total_burn) * 100
```

Display:
- "Up £X (+Y%)" with an upward arrow — burn is increasing
- "Down £X (−Y%)" with a downward arrow — burn is decreasing
- Colour: up is amber (costs rising). Down is green (costs falling). Neither is inherently good — context matters.

---

## Portal Display

Per entity card:

```
[ENTITY NAME] — BURN RATE
Status: [GREEN | AMBER | RED]

Fixed costs:        £X/month
Avg variable:       £X/month
Total burn:         £X/month

Variable range (12m):  Low £X  |  High £X
Month vs last month:   [Up/Down] £X ([+/-]Y%)

[Trend arrow] [RAG pill]
```

---

## Threshold Storage

All RAG thresholds stored in Supabase `burn_thresholds` table:

```
id              uuid, primary key
entity          text
green_max       numeric(12,2)
amber_max       numeric(12,2)
updated_at      timestamptz
updated_by      text
```

Editable from the admin panel. Changes are logged with timestamp.

---

## API Endpoint

`GET /api/financial/burn-rate?entity=[entity]&month=YYYY-MM`

Returns fixed total, variable average, total burn, RAG status, and trend vs prior month.
