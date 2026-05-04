# Task 4 — Table Overlap Matrix

Legend:
- **WMS-standalone** = `/Desktop/psnm/WMS/PSNM_v14_LIVE.html` (Netlify)
- **CC-wms** = `/v14/public/wms.html` (Vercel)
- **CC-psnm** = `/v14/public/psnm.html` (Vercel)
- **CC-api** = `/v14/api/*.js` (Vercel serverless)

---

## Tables Only in WMS (not in CC at all)

| Table | Notes |
|-------|-------|
| `psnmwhm_store` | Core WMS state blob. **No migration exists.** Also used by CC-wms. |

*Note: `psnmwhm_store` is shared by both WMS versions but absent from CC-psnm and CC-api.*

---

## Tables Only in Command Centre (not in standalone WMS)

| Table | Owner | Notes |
|-------|-------|-------|
| `psnm_warm_leads` | CC-psnm | Warm CRM leads from WhichWarehouse + manual entry |
| `psnm_quotes` | CC-psnm | Quote pipeline |
| `psnm_customers` | CC-index, CC-api | SQL customer table — **dead, see below** |
| `psnm_invoices` | CC-index | Invoice records |
| `psnm_atlas_drafts` | CC-wms, CC-api | Atlas v2 email draft queue |
| `psnm_intelligence_prospects` | CC-wms, CC-api | Companies House harvest results |
| `psnm_ww_leads` | CC-wms, CC-api | WhichWarehouse inbound leads |
| `psnm_email_templates` | CC-psnm | Email template library |
| `psnm_call_scripts` | CC-psnm, CC-api | Call script library — schema mismatch |
| `psnm_touch_schedule` | (defined in migration) | Not actively used anywhere |
| `psnm_offer_config` | CC-api | Grand Slam Offer configuration |
| `psnm_cash_log` | CC-api | PSNM business balance |
| `psnm_social_posts` | (defined in migration) | Social queue — not used yet |
| `psnm_content_queue` | (defined in migration) | Content queue — not used yet |

---

## Shared Tables (both apps read or write)

| Table | Standalone WMS | CC-wms | CC-psnm | CC-api | Owner |
|-------|---------------|--------|---------|--------|-------|
| `psnmwhm_store` | R/W | R/W | — | — | **Shared** |
| `psnm_enquiries` | R | R | R/W | R | **CC-psnm** owns writes |
| `psnm_outreach_targets` | R | R/W | R/W | R/W | **CC-wms+api** own writes |
| `psnm_outreach_touches` | R | R | R/W | — | **CC-psnm** owns writes |
| `psnm_occupancy_snapshots` | R | R | R/W | R | **CC-psnm** owns writes |

---

## Schema Mismatches (same table, different expected columns)

### 1. `psnm_call_scripts` — CRITICAL MISMATCH

Migration **27** (runs first) created table with:
```
script_type TEXT NOT NULL
tier TEXT
script_cues JSONB
objection_handlers JSONB
closing_question TEXT
version INTEGER
active BOOLEAN
```

Migration **32** (runs later) tried `CREATE TABLE IF NOT EXISTS` with:
```
name TEXT NOT NULL
category TEXT
script_body TEXT NOT NULL
objection_handlers JSONB
```

Because `CREATE TABLE IF NOT EXISTS` is a no-op when the table already exists, migration 32's schema never applied. The live table has migration 27's schema. Migration 32's INSERT attempts also silently fail (wrong column names).

**Effect**: CC `psnm.html` reads `name, category, script_body` which don't exist → returns no usable data → Call Scripts tab appears empty or broken.

---

### 2. `psnm_outreach_touches` — MISSING COLUMN

CC `psnm.html` inserts `touch_type: 'site_visit'` at line 786, but no migration
adds `touch_type` to `psnm_outreach_touches`. The column appears in `sponsor_touches`
(migration 24) but was never added to the PSNM table.

**Effect**: Any site visit logging attempt either silently drops the field (Supabase ignores unknown columns via REST) or fails with a column error. Either way, `touch_type` data is never stored.

---

### 3. `psnm_customers.monthly_revenue_gbp` — MISSING COLUMN

`api/atlas.js:395` reads `monthly_revenue_gbp` from `psnm_customers` to calculate MRR.
This column was never created in any migration for `psnm_customers`.

Migration 24 added `company_registration_number`, `vat_number`, `payment_terms` to
`psnm_customers` but NOT `monthly_revenue_gbp`.

**Effect**: Atlas's MRR calculation always returns £0 (column either doesn't exist
or was added manually via Supabase dashboard with no migration record). The morning
briefing's revenue figures may be wrong.

---

### 4. `psnm_customers` — ORPHANED TABLE (structural mismatch)

The most critical finding:

- WMS (standalone + CC) stores customer data **inside** `psnmwhm_store.wms_data.customers` JSON blob
- `psnm_customers` is a **separate SQL table** that nobody writes to from the WMS
- Only `index.html` and `atlas.js` read `psnm_customers`
- The two registries have ZERO synchronisation

**Effect**: A customer "Terry & Tracey" allocated 40 bays in the WMS has no record in
`psnm_customers`. Atlas calculates active customers as 0. The morning briefing's customer
count, revenue, and occupancy metrics are drawn from different sources to the WMS's live data.

---

### 5. `psnmwhm_store` — NO MIGRATION

Both WMS apps depend on this table, but it exists only because it was manually created in
Supabase. No migration file. If the Supabase project were reset or migrated to a new project,
this table and all warehouse state would be lost.
