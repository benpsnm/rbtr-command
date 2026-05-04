# Task 8 — Data Integrity Audit

## Risk 1: WMS customers vs `psnm_customers` — CRITICAL

**Severity**: Critical  
**Stale data impact**: Atlas, morning briefing, index.html all read `psnm_customers`
for MRR and customer count. WMS stores customers in `psnmwhm_store.wms_data.customers` blob.
These are completely separate registries with no link.

| Source | Format | Who writes it | Who reads it |
|--------|--------|---------------|--------------|
| `psnmwhm_store.wms_data.customers` | JSON object, keyed by internal ID | WMS (standalone + CC) | WMS only |
| `psnm_customers` SQL table | Normalised rows with UUID PKs | `index.html` only | Atlas, index.html, briefing |

**Effect if not fixed**: 
- Atlas reports £0 MRR (no `monthly_revenue_gbp` column and no data)
- Morning briefing says "0 active customers"
- A real customer paying £X/week is invisible to Atlas and the briefing

**Fix**: Two acceptable approaches:
1. **Accept the split**: `psnm_customers` = financial/CRM view (manually maintained); WMS blob = operational view. Add `monthly_revenue_gbp` column and manually enter revenue when a customer goes live.
2. **Bridge**: When a customer is added/updated in the WMS, a Supabase realtime trigger or a daily cron upserts a matching row in `psnm_customers`.

Option 1 is 30 minutes. Option 2 is 1–2 days.

---

## Risk 2: `psnm_call_scripts` schema mismatch — HIGH

**Severity**: High  
**Stale data impact**: The Call Scripts tab in `psnm.html` reads `name, category, script_body`
but the live table has `script_type, tier, script_cues`. The 6 scripts seeded in
migration 32 never inserted (wrong column names → PG error). The 2 scripts seeded in
migration 27 have the wrong columns for what psnm.html expects.

**Effect**: Call Scripts tab appears empty. Ben's call workflow has no in-app scripts.

**Fix**: Migration to add `name TEXT, category TEXT, script_body TEXT` columns to
`psnm_call_scripts`, then seed the 6 scripts from migration 32. 2 hours.

---

## Risk 3: `psnm_outreach_touches.touch_type` missing column — MEDIUM

**Severity**: Medium  
**Stale data impact**: `psnm.html` inserts `touch_type: 'site_visit'` when logging a
site visit. Supabase REST API with anon key ignores unknown columns silently, so the
insert probably succeeds but `touch_type` is never stored. Any query filtering by
`touch_type = 'site_visit'` returns nothing.

**Effect**: Site visit history filtering in psnm.html (line 761) returns no rows.
Site visits are logged but untagged.

**Fix**: `ALTER TABLE psnm_outreach_touches ADD COLUMN IF NOT EXISTS touch_type TEXT;`
Migration 47. 30 minutes.

---

## Risk 4: `psnm_customers.monthly_revenue_gbp` missing — HIGH

**Severity**: High  
**Stale data impact**: `api/atlas.js:395` reads this column for MRR. Column not in any
migration → either doesn't exist or exists as a dashboard-added orphan column.

**Effect**: Atlas MRR = £0. Morning briefing revenue = £0. The "Intelligence" tab revenue
KPI is wrong.

**Fix**: `ALTER TABLE psnm_customers ADD COLUMN IF NOT EXISTS monthly_revenue_gbp NUMERIC;`
30 minutes. Then manually enter the actual revenue for any live customer.

---

## Risk 5: `psnmwhm_store` has no migration — HIGH

**Severity**: High  
**Stale data impact**: If Supabase project is reset, cloned, or migrated, this table is
lost. All warehouse data (bays, customers, stock, movements) disappears.

**Effect**: Catastrophic data loss if project is ever recreated.

**Fix**: Write migration `46_psnmwhm_store.sql`:
```sql
CREATE TABLE IF NOT EXISTS psnmwhm_store (
  id          TEXT PRIMARY KEY,
  wms_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Anon read + write (WMS uses anon key)
ALTER TABLE psnmwhm_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON psnmwhm_store FOR ALL USING (true) WITH CHECK (true);
```
30 minutes.

---

## Risk 6: `cc_` panels (Tasks/CRM/Scripts/Revenue/Compliance/Links) are localStorage-only — MEDIUM

**Severity**: Medium  
**Stale data impact**: The Tasks week schedule, CRM contact tracking, Revenue targets,
Compliance checklists, Links — all stored in `localStorage['psnm_v2']`. If Ben clears
browser storage, installs a new browser, or uses a different device, all state is lost.
The Tasks tab has hardcoded weekly tasks (not from Supabase) so those survive, but
completion ticks and CRM contact marks are lost.

**Effect**: Inconsistency between desktop and mobile sessions.

**Fix**: Not urgent. The cc_ panel data is low-stakes operational notes. Leave it until
after the main merge.

---

## Risk 7: WMS invoices vs `psnm_invoices` SQL table — LOW

**Severity**: Low  
**Stale data impact**: WMS can generate invoices from its internal customer data, but those
invoices are not stored in `psnm_invoices` SQL table. The `psnm_invoices` table is
effectively empty or manually managed via `index.html`.

**Effect**: Invoice history exists in WMS but not in the SQL financial record. Not
currently used for any automated process so no live breakage.

**Fix**: Long-term, WMS invoicing should write to `psnm_invoices`. Not urgent.

---

## Summary Risk Table

| Issue | Severity | Fix Time | Urgency |
|-------|----------|----------|---------|
| `psnm_customers` registry split (MRR = £0) | Critical | 30 min + manual entry | This week |
| `psnm_call_scripts` schema mismatch | High | 2h | This week |
| `psnm_customers.monthly_revenue_gbp` missing | High | 30 min | This week |
| `psnmwhm_store` no migration (data loss risk) | High | 30 min | This week |
| `psnm_outreach_touches.touch_type` missing | Medium | 30 min | This week |
| `cc_` panels localStorage-only | Medium | 8–12h | After merge |
| WMS invoices not in `psnm_invoices` | Low | 4–8h | After expedition prep |
