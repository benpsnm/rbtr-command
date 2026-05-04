# Task 2 — WMS Table Access (Standalone)

Source: `/Users/bengreenwood/Desktop/psnm/WMS/PSNM_v14_LIVE.html`

## Supabase connection

- Project: `mpxgyobotiqcawmqlhbf` (same as Command Centre)
- Auth: anon key, embedded in plaintext (line 899)
- Client: Supabase JS v2, CDN-loaded

## Tables accessed

### `psnmwhm_store` — PRIMARY WMS TABLE
- **READ**: on startup, every 4 seconds (polling fallback), realtime subscription
- **WRITE**: update + upsert on every state change (debounced 800ms)
- **Columns used**: `id`, `wms_data` (JSONB blob), `updated_at`
- **Pattern**: Single-row JSON blob. The entire warehouse state lives in one row (`id = 'psnm-main'`).
- **No migration exists** — table was created manually in Supabase dashboard.

### `psnm_enquiries` — READ ONLY (Intelligence tab)
- Columns read: `id, company, contact_name, pallets, status, created_at, quoted_rate_gbp, estimated_monthly_revenue_gbp, source, notes`
- Triggered when user clicks Intelligence tab

### `psnm_outreach_targets` — READ ONLY (Intelligence tab)
- Columns read: `id, company, city, industry, priority_score, status, hot_flag, estimated_pallet_need, current_touch_count`

### `psnm_outreach_touches` — READ ONLY (Intelligence tab)
- Columns read: `id, outcome`

### `psnm_occupancy_snapshots` — READ ONLY (Intelligence tab)
- Columns read: `date, pallets`
- Last 7 rows only

## What the WMS does NOT touch via Supabase

The following tables exist in Supabase but the standalone WMS never reads or writes them:

- `psnm_customers` — paying customer records (SQL table)
- `psnm_invoices`
- `psnm_quotes`
- `psnm_warm_leads`
- `psnm_ww_leads`
- `psnm_atlas_drafts`
- `psnm_intelligence_prospects`

## WMS internal state structure

Everything inside `psnmwhm_store.wms_data` is a JSON object with shape:

```js
{
  cells:      {},  // racked bay positions → { customer, pallets, ... }
  floor:      {},  // floor positions
  aisleFloor: {},  // aisle floor positions
  pallets:    {},  // individual pallet metadata
  customers:  {},  // WMS-internal customer records (NOT psnm_customers table)
  movements:  [],  // goods in/out log
  suppliers:  {},  // supplier records
  nextId:     1    // incrementing ID counter
}
```

## `cc_` panels (Tasks, CRM, Scripts, Revenue, Compliance, Links)

These tabs exist in the standalone WMS but store their data in **localStorage** only
under the key `psnm_v2`. They are NOT synced to Supabase. They are device/browser-local.

localStorage keys used by standalone WMS:
- `psnm_wms2` — WMS state (synced to `psnmwhm_store`)
- `psnm_v2` — cc_ panels state (NOT synced, local only)
