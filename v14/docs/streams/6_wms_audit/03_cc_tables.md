# Task 3 — Command Centre PSNM Portal Tables

The Command Centre has TWO PSNM-related portals: `wms.html` and `psnm.html`.
Both connect to Supabase `mpxgyobotiqcawmqlhbf` via different mechanisms.

---

## A. CC `wms.html` (5,254 lines)

Served from Vercel. Same WMS as standalone but with Atlas v2 + Strategy tab added.
Uses direct Supabase JS client (same pattern as standalone WMS).

### Tables accessed

| Table | READ | WRITE | Method |
|-------|------|-------|--------|
| `psnmwhm_store` | ✓ | ✓ | Supabase JS update/upsert/select |
| `psnm_enquiries` | ✓ | — | `sbR()` via fetch (Intelligence tab) |
| `psnm_outreach_targets` | ✓ | ✓ | fetch direct + Atlas API (dispatch) |
| `psnm_outreach_touches` | ✓ | — | `sbR()` via fetch (Intelligence tab) |
| `psnm_occupancy_snapshots` | ✓ | — | `sbR()` via fetch (Intelligence tab) |
| `psnm_atlas_drafts` | ✓ | ✓ | `/api/atlas` (generate, approve, dispatch) |
| `psnm_intelligence_prospects` | ✓ | ✓ | `/api/atlas` (harvest, enrich, dispatch) |
| `psnm_ww_leads` | ✓ | ✓ | `/api/atlas` (get_ww_leads, update_ww_lead) |

Atlas API calls used from wms.html:
- `atlas?action=strategy_doc` — read strategy documents
- `atlas?action=intel_stats` — intelligence metrics
- `atlas?action=intel_harvest` — Companies House harvest
- `atlas?action=intel_enrich` — enrich prospects
- `atlas?action=intel_dispatch` — dispatch emails
- `atlas?action=intel_harvest_insolvency` — insolvency signal harvest
- `atlas?action=intel_harvest_defence` — defence contract harvest
- `atlas?action=intel_prospect` — view single prospect
- `atlas?action=get_ww_leads` — WhichWarehouse leads
- `atlas?action=generate_ww_response` — AI draft response
- `atlas?action=recompute_ww_quote` — recalculate quote
- `atlas?action=update_ww_lead` — update lead status
- `atlas?action=send_email` — send email via SendGrid

---

## B. CC `psnm.html` (1,034 lines)

Served from Vercel. Sales/CRM portal. Routes through `/api/supabase-proxy` for most reads.
Includes ROCKO warm-lead ingestion via `/api/extract-leads`.

### Tables accessed

| Table | READ | WRITE | Notes |
|-------|------|-------|-------|
| `psnm_warm_leads` | ✓ | ✓ | Primary warm CRM leads; update temperature/status |
| `psnm_enquiries` | ✓ | ✓ | Insert new enquiries from ROCKO import |
| `psnm_quotes` | ✓ | ✓ | Insert quotes when `quote_sent=true` on import |
| `psnm_outreach_touches` | ✓ | ✓ | Insert touches (incl. `touch_type='site_visit'`*) |
| `psnm_occupancy_snapshots` | ✓ | ✓ | Insert new daily snapshots |
| `psnm_email_templates` | ✓ | — | Display only |
| `psnm_call_scripts` | ✓ | — | Display only — **SCHEMA MISMATCH** (see Task 4) |
| `psnm_outreach_targets` | ✓ | ✓ | Via Atlas API |
| `psnm_ww_leads` | ✓ | ✓ | Via Atlas API |
| `psnm_atlas_drafts` | ✓ | ✓ | Via Atlas API |

*`touch_type` column was never added to `psnm_outreach_touches` in any migration.

### Extra columns used by psnm.html that were added in later migrations

These columns were added to base tables by migrations 24, 27, 31:

**`psnm_enquiries`** (added via migration 24 + 31):
- `quoted_rate_gbp`, `estimated_monthly_revenue_gbp` (migration 24)
- `lead_source`, `lead_source_ref`, `first_contact_at`, `last_contact_at`,
  `engagement_score`, `replied`, `quote_sent`, `temperature` (migration 31)

**`psnm_outreach_targets`** (added via migration 24 + 27):
- `estimated_pallet_need` (migration 24)
- `decision_maker_name`, `current_touch_count`, `hot_flag`, `hot_flag_reason` (migration 27)

**`psnm_outreach_touches`** (added via migration 31):
- `replied_at`, `enquiry_id` (migration 31)
- `touch_type` — **NOT IN ANY MIGRATION** (used in psnm.html:786)

---

## C. CC `index.html` (home portal)

Also reads/writes PSNM tables:

| Table | READ | WRITE |
|-------|------|-------|
| `psnm_enquiries` | ✓ | — |
| `psnm_customers` | ✓ | ✓ |
| `psnm_occupancy_snapshots` | ✓ | — |
| `psnm_outreach_targets` | ✓ | — |
| `psnm_invoices` | ✓ | — |

---

## D. CC API layer

**`api/atlas.js`** reads:
- `psnm_customers` — for MRR calculation (`monthly_revenue_gbp` column — **NOT IN ANY MIGRATION**)
- `psnm_enquiries`, `psnm_outreach_targets`, `psnm_outreach_touches`, `psnm_atlas_drafts`,
  `psnm_intelligence_prospects`, `psnm_ww_leads`

**`api/briefing-data.js`** reads (via supabase-proxy):
- `psnm_occupancy_snapshots` (latest row → `psnm_pallets_current`)
- `psnm_warm_leads` (due today, hot)
- `psnm_enquiries` (new 24h, urgent, overdue followups)
- `psnm_outreach_targets` (batch today)

**`api/cron-backup.js`** backs up:
- `psnm_enquiries`, `psnm_customers`, `psnm_occupancy_snapshots`
