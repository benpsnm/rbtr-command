# Task 5 — Feature Inventory

---

## Standalone WMS Unique Features

Features that exist in `PSNM_v14_LIVE.html` (Netlify) but NOT in Command Centre PSNM portal (`psnm.html`):

| Feature | Description |
|---------|-------------|
| **Visual warehouse map** | Drag-select bay grid, 1,602 racked + aisle + floor positions |
| **Goods In** | Record pallets arriving — customer, location, handling charge, size, type, rate |
| **Goods Out** | Record pallets leaving — select by customer, pallet picker, handling charge |
| **Stock view** | Full inventory with customer and location filters |
| **Movement log** | Complete goods in/out history with date/ref filters |
| **Bulk operations** | Bulk release of multiple bays, sweep select on map |
| **Bay assignment modal** | Click any bay, assign/unassign customer, view details |
| **Customer rates** | Per-customer rate cards, deal type (weekly/monthly/quoted) |
| **Customer statements** | Generate printable storage statements per customer |
| **WMS invoicing** | Invoice generation from WMS internal data |
| **Supplier management** | Supplier records for WMS operations |
| **Revenue dashboard (WMS)** | Revenue by customer, recent movements, occupancy stats |
| **PWA / offline mode** | Works offline via localStorage; syncs when back online |
| **Realtime + polling** | Websocket + 4s poll fallback for multi-device sync |
| **Print support** | Print-optimised CSS (map, statements, invoices) |
| **Tasks panel (localStorage)** | Weekly task list, day-by-day schedule |
| **CRM panel (localStorage)** | Hellaby estate company contact tracker |
| **Compliance panel (localStorage)** | Compliance checklist |

---

## Command Centre PSNM Unique Features

Features in `psnm.html` or `wms.html` (CC, Vercel) but NOT in standalone WMS:

| Feature | File | Description |
|---------|------|-------------|
| **ROCKO warm-lead ingestion** | psnm.html + psnm-warm.js | Paste WhichWarehouse brief or quote emails → AI extracts leads → import to Supabase |
| **Warm lead CRM** | psnm.html | `psnm_warm_leads` table — temperature (hot/warm/cold/dead), touch logging, score |
| **WW leads inbox** | wms.html | WhichWarehouse inbound enquiry management with AI draft responses |
| **Quote generator** | psnm.html | Create and track `psnm_quotes` per enquiry |
| **Occupancy snapshot creation** | psnm.html | Can INSERT new daily snapshots to `psnm_occupancy_snapshots` |
| **Site visit scheduling** | psnm.html | Log site visits against warm leads |
| **Atlas v2 outreach queue** | wms.html | AI-generated email drafts (pending → approved → sent) |
| **Atlas v2 intelligence harvest** | wms.html | Companies House harvest, insolvency signals, defence signals |
| **Atlas v2 prospect enrichment** | wms.html | Enrich prospects with email, phone, LinkedIn |
| **Strategy tab** | wms.html | Read strategy docs: locked plan, Atlas v2 framework, system prompt |
| **Morning briefing data** | psnm.html | Reads `/api/briefing-data` for live KPIs |
| **Email templates display** | psnm.html | Reads `psnm_email_templates` for display |
| **Call scripts display** | psnm.html | Reads `psnm_call_scripts` for display (broken — see schema mismatch) |
| **Auth guard** | All CC pages | Supabase auth required; standalone WMS has NO auth |
| **Supabase proxy** | All CC pages | API routes via `/api/supabase-proxy` (service-role key, not anon) |

---

## Overlapping Features (both apps do this, potentially divergently)

| Feature | Standalone WMS | CC WMS / PSNM | Risk |
|---------|---------------|---------------|------|
| **Intelligence dashboard** | Read-only display from 4 tables | Identical + Atlas v2 panels | Low — additive |
| **Customer management** | In WMS JSON blob (`psnmwhm_store`) | `psnm_customers` SQL table | **HIGH — two separate registries** |
| **WMS state** | `psnmwhm_store` | `psnmwhm_store` (same table) | None — fully shared |
| **Tasks, CRM, Scripts, Revenue, Compliance, Links** | localStorage `psnm_v2` | localStorage `psnm_v2` (same key!) | Medium — same key, same schema, but device-specific |
| **Invoicing** | WMS internal (in JSON blob) | `psnm_invoices` SQL table | Medium — two separate invoice stores |
| **Outreach touches logging** | Standalone reads only | CC writes with touch_type (broken) | Low — writes silently drop field |
