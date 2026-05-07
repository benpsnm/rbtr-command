# Standalone-to-Supabase Wire-up Spec
**Date:** 7 May 2026  
**Author:** Claude (from code audit of /Users/bengreenwood/Desktop/psnm/deploy/index.html)  
**Status:** Planning document — no implementation started

---

## 1. CURRENT STATE

### Screens in standalone today (15 tabs)

| Tab | Pane ID | Description |
|-----|---------|-------------|
| Map | `map` | Interactive 1,602-pallet warehouse grid. Click cell to assign/move/check out. Bulk assign/out mode. Aisle + floor + aisle-floor positions. |
| Goods In | `goodsin` | Process incoming pallets. Customer select, location auto-assign or manual, rate entry, handling fee. |
| Goods Out | `goodsout` | Process pallet collection. Search by PID/customer, calc days stored + fee, mark out. |
| Stock | `stock` | Full pallet inventory table. Filter by customer, export CSV. |
| Log | `movements` | Timestamped movement history (goods in, goods out, moves). Export CSV. |
| Customers | `customers` | Customer CRUD. Name, contact, email, phone, notes. Revenue summary. |
| Rates | `rates` | Rate calculator. Pallets × rate × weeks. Hardcoded tier table. |
| Dashboard | `dashboard` | Top stats (occupied, weekly revenue, customers). Recent movements table. Revenue by customer chart. |
| Bookings | `bookings` | Enquiry pipeline + active booking form. Calc weekly rate. Generate welcome email (opens Gmail compose). |
| CRM | `crm2` | Hardcoded lead list (~200 companies, L001–L200+). Status filter (new/hot/contacted). CSV upload with broken Anthropic call. Status persisted to localStorage. |
| Emails | `emails2` | Template email generator. Uses same lead list as CRM. Filter unsent/hot/opened. Opens Gmail compose. Status changes update localStorage. |
| Social | `social2` | Static content — Facebook post copy/templates. Paste-and-post workflow. No live integration. |
| Invoices | `invoices2` | Invoice generation for active bookings from `psnm_v14_bk`. Opens Gmail compose with invoice text. |
| Media | `media2` | Static asset links/thumbnails. No data store. |
| Auto | `auto2` | Status board for Facebook, Instagram, LinkedIn, email campaign, booking system, AI chatbot, WhatsApp. Static HTML — no live data. |

### Where data is currently stored

| Key | Storage | Contents |
|-----|---------|----------|
| `psnm_wms2` | localStorage | Core WMS state: `{cells, floor, aisleFloor, pallets, customers, movements, nextId}`. All pallet positions, all customer records, all movement history. The entire warehouse in one blob. |
| `psnm_v14_bk` | localStorage | Active bookings array `[{id, company, contact, email, pallets, type, rate, startDate, goods, notes, status}]` |
| `psnm_v14_eq` | localStorage | Enquiry pipeline array. Same schema as bookings. Includes DEMO1 fallback. |
| `psnm_crm4_status` | localStorage | `{leadId: 'contacted' \| 'new' \| 'hot'}` — status overrides for the hardcoded CRM lead list. |
| Hardcoded JS arrays | Inline JS | ~200 leads (L001–L200+) with company, city, postcode, industry, email, status. Compiled into the HTML at build time. NOT synced with psnm_outreach_targets in Supabase. |

### What auth exists

Client-side SHA-256 gate (lines 6–51). Password hash embedded in HTML. `sessionStorage` session (cleared on tab close). No server, no JWT, no rate-limit enforcement (lockout is also client-side). Hash was rotated 6 May to known password `kaqtat-xudvyv-2pozgE`.

### What's broken

- `crm2Upload()` at line 2959: `fetch('https://api.anthropic.com/v1/messages', ...)` with no API key header. Returns 401. CSV-to-lead-list extraction feature is completely broken.
- No Supabase connection anywhere in the file.
- Standalone CRM lead list (~200 hardcoded entries) is entirely separate from `psnm_outreach_targets` (205 rows in Supabase). They overlap in subject matter but are not the same data.

---

## 2. TARGET STATE

### Which CC WMS workflows are mirrored in standalone

The Map, Goods In, Goods Out, Stock, Log, Customers, Rates, and Dashboard tabs are the shared "ops core" — these are the workflows warehouse staff actually use. They currently mirror the Command Centre's `/wms.html` in function (both were built from the same codebase at some point) but are now drifted.

### Which staff workflows are unique to standalone (or should be)

- **Goods In / Goods Out on mobile** — standalone is the intended mobile-first surface for a staff member walking the warehouse. The CC is a desk tool.
- **Quick cell lookup** — staff need to find "where is customer X's pallets" without admin context.
- **Customers tab** — staff may need to check rates or contact info.

The following tabs are **not** appropriate for staff and should either be hidden or removed in the standalone: CRM, Emails, Bookings, Social, Invoices, Media, Auto. These are sales/admin tools only Ben uses.

### Which tables read/write from each side

| Table | CC (wms.html) | Standalone | Notes |
|-------|--------------|------------|-------|
| psnm_outreach_targets | Read (Atlas drafts reference it) | Currently: none (hardcoded list instead) | Should be same data eventually |
| psnm_atlas_drafts | Read/Write | No | CC-only |
| psnm_intelligence_prospects | Read/Write | No | CC-only |
| psnm_outreach_events | Read | No | CC-only |
| psnm_inbound_replies | Read | No | CC-only |
| psnm_ww_leads | Read | No | CC-only |
| **psnm_pallets** (does not exist yet) | Would replace localStorage | Would replace localStorage | Core WMS data needs its own table |
| **psnm_customers** (does not exist yet) | Would replace localStorage | Would replace localStorage | Core WMS data |
| **psnm_movements** (does not exist yet) | Would replace localStorage | Would replace localStorage | Core WMS data |

Note: the WMS core data (pallets, customers, movements) currently lives in localStorage and does **not** exist in Supabase at all. Before standalone can read from Supabase, this data needs migrating to new tables — or WMS needs connecting to existing Supabase psnm_outreach_targets as a start point (but that's the wrong table for pallet data).

---

## 3. ARCHITECTURE OPTIONS

### Option A: Direct Supabase access from standalone (anon key + RLS)

The standalone HTML makes requests directly to Supabase REST API using the public anon key. Row-Level Security policies enforce what anon users can read/write.

**Pros:**
- No backend needed — pure static SPA remains
- Simple to implement (add Supabase anon key to HTML, replace localStorage reads/writes with fetch calls)
- Free tier handles the request volume easily
- Supabase anon key is intended for exactly this pattern

**Cons:**
- Anon key is visible in the HTML source (anyone who can access the page can see it — but page is password-gated, so exposure is limited to someone who breaks the SHA-256 gate, which is trivial)
- RLS policies must be written correctly — a mistake exposes data
- No audit trail of who made what change (all requests look the same to Supabase)
- Mutations from standalone bypass v14 business logic (e.g. no Telegram alert on goods-in, no rate validation)

**Effort:** ~8–12h. Mostly creating the DB tables (psnm_pallets, psnm_customers, psnm_movements), migrating localStorage data, writing RLS policies, replacing ~20 read/write points in index.html.

**Security:** Acceptable for a single-role ops tool on a private network. Not acceptable if the page ever becomes public or multi-tenant.

---

### Option B: Proxy through v14 atlas.js (standalone calls v14 API)

The standalone HTML calls `https://rbtr-jarvis.vercel.app/api/atlas?action=wms_*` endpoints. v14 handles auth, validation, and DB writes. Standalone never touches Supabase directly.

**Pros:**
- No new Supabase credentials in the HTML
- Business logic centralised in v14 (Telegram alerts, rate validation, dedup all happen server-side)
- Auth is handled server-side — if v14 JWT cookie model is extended to standalone, it's a real auth layer not SHA-256 theatre
- Consistent data model: both CC and standalone write through the same API

**Cons:**
- v14 must be live for standalone to function. Right now v14 is billing-suspended — standalone would also be broken.
- Every WMS action requires a round-trip to iad1 (Washington DC). Goods-in scan on a mobile in a warehouse = 200–400ms per tap instead of instant.
- Requires building WMS API endpoints in atlas.js (currently has no WMS CRUD endpoints)
- Adds 12+ function routes to v14, pushing closer to Vercel's 12-function limit (v14 already hits this — each new api/ file is a function)

**Effort:** ~20–30h. Build WMS CRUD API in v14, write standalone to call it, handle auth cookie cross-origin, test on mobile.

**Security:** Stronger. But introduces availability coupling: billing pause on v14 = standalone down too (as happened last night).

---

### Recommendation

**Option A: Direct Supabase access** for now.

Reasoning for Ben's situation:
1. v14 is billing-suspended and will stay fragile until payment is resolved. Coupling standalone to v14 means standalone breaks whenever v14 has problems.
2. Ben is time-poor and broke. Option A is half the hours at a third of the complexity.
3. The threat model for the SHA-256 gate is "casual snooping by a warehouse worker." Direct Supabase with RLS and anon key is strictly more secure than the current gate.
4. The Vercel 12-function limit is already a constraint. Adding WMS endpoints to v14 will require rearchitecting the function layout.

Option B becomes the right choice when: the unified psnm-core.js unification happens (Phase 2), because at that point standalone and CC share code and the proxy pattern is natural.

---

## 4. TABLE MAPPING (for Option A)

New tables required (none exist yet):

| Table | Columns (minimal viable) | Read | Write | RLS note |
|-------|--------------------------|------|-------|----------|
| `psnm_pallets` | id, pid (text), customer_name, cell_key, date_in, weekly_rate, goods_description, is_out, date_out, notes | anon | anon | anon can read all, write own session — or just anon full access (single-tenant) |
| `psnm_customers` | id, name, contact, email, phone, notes, created_at | anon | anon | Same |
| `psnm_movements` | id, pid, type (in/out/move), customer_name, from_cell, to_cell, qty, handling_fee, rate, operator, created_at | anon | anon (insert only) | No delete/update for integrity |

Existing tables touched by standalone (read-only, for future expansion):

| Table | Use | Access needed |
|-------|-----|--------------|
| `psnm_outreach_targets` | Replace hardcoded CRM lead list | anon read, filtered by region |
| `psnm_atlas_drafts` | Read draft status per target | anon read (sensitive — defer) |

Tables **not** touched by standalone:

- `psnm_intelligence_prospects` — CC-only
- `psnm_outreach_events` — CC-only  
- `psnm_inbound_replies` — CC-only
- `psnm_ww_leads` — CC-only

### RLS policy pattern for new tables

```sql
-- Example for psnm_pallets: full anon access (single-tenant, gate is auth layer)
create policy "anon_read" on psnm_pallets for select using (true);
create policy "anon_insert" on psnm_pallets for insert with check (true);
create policy "anon_update" on psnm_pallets for update using (true);
-- No delete policy — use is_out flag instead
```

---

## 5. AUTH MIGRATION

### Current state

Client-side SHA-256 gate in a `<script>` block at the top of index.html. Passes on `sessionStorage.getItem('psnm_auth') === '1'`. Session clears on tab close. No server sees the password.

### Target

Same v14 Pattern A: bcrypt hash server-side, JWT cookie, HttpOnly Secure SameSite=Strict, 30-day expiry.

### Blocker

Standalone is a **static SPA** — there is no server to run bcrypt or issue JWTs. Two sub-options:

**Sub-option A1 (with Option A architecture):** Keep the SHA-256 gate but rotate the hash whenever the password changes. Acceptable for a warehouse ops tool used by 1–2 known staff. The gate prevents casual access; the real security is that Supabase RLS limits what anon can do.

**Sub-option A2 (add a minimal auth edge function):** Deploy a single Vercel serverless function (separate from v14) on the `psnm-wms` project that does bcrypt check + issues a JWT cookie. Standalone checks the cookie before loading. This is a separate 4-function project, no conflict with v14 limits.

**Sub-option B (with Option B architecture):** Re-use v14 auth endpoints directly. Standalone redirects to `rbtr-jarvis.vercel.app/login.html` for auth, then the cookie is set on the v14 domain. Cross-origin cookies don't work here — standalone would need to be on the same domain or use a token instead. Complex.

### Recommended path

A1 for now (keep SHA-256 gate, known password, rotate via git push). A2 when the psnm-wms project gets its own Vercel functions anyway (Phase 1–2 of the unification plan). Do not block Supabase wire-up on auth migration — they are independent.

---

## 6. EFFORT ESTIMATE

| Phase | Task | Hours | Blocks |
|-------|------|-------|--------|
| 0 | Write migrations for psnm_pallets, psnm_customers, psnm_movements | 2h | Nothing |
| 0 | Export current localStorage data to seed the new tables (one-time script) | 1h | Migration |
| 1 | Add Supabase anon key to standalone, replace localStorage `save()`/`load()` with REST calls | 4h | Migration |
| 1 | Replace goods-in / goods-out writes | 2h | Phase 1 start |
| 1 | Replace stock / movements reads | 2h | Phase 1 start |
| 1 | Replace customers CRUD | 1h | Phase 1 start |
| 2 | Replace bookings/enquiries localStorage with psnm_bookings table (new table needed) | 3h | Independent |
| 3 | Replace hardcoded CRM list with live read from psnm_outreach_targets | 2h | Independent |
| 3 | Fix broken CSV-extract by proxying to v14 atlas.js | 1h | v14 must be live |
| 4 | Auth: A2 sub-option — standalone auth edge function | 4h | Independent |

**Recommended sequence:** Phase 0 → Phase 1 (this unblocks the core ops use case for staff). Phase 2–4 in any order.

**What can be parallel:** Phase 2, 3, 4 are fully independent once Phase 1 is done.

**What blocks what:** Phase 3 (CSV extract fix) needs v14 to be live. Everything else works regardless of v14 status.

**Total for Phase 0+1 (core wire-up):** ~12h  
**Total for Phases 0–4 (full):** ~22h

---

## 7. RISKS

1. **localStorage data loss during migration.** The `psnm_wms2` blob contains all live pallet positions and customer data. If the migration script corrupts it, the warehouse state is gone. Mitigation: export to JSON file before any code change, store in Supabase as a backup row.

2. **Supabase anon key in HTML.** The key is publicly readable by anyone who gets past the SHA-256 gate. If the gate is bypassed (trivially, it's client-side), they have read/write access to psnm_pallets, psnm_customers, psnm_movements. Mitigation: these tables contain no PII beyond company names and contact details which are already semi-public. Not catastrophic if leaked, but not ideal.

3. **Single-browser state right now.** `psnm_wms2` in localStorage is device-specific. If Ben uses standalone on his phone and another staff member uses it on a tablet, they have two independent states. The Supabase migration fixes this — shared DB is the main benefit.

4. **v14 billing suspension affects the CSV-extract fix (Phase 3).** Low priority item but it'll stay broken until v14 is live.

5. **Hardcoded lead list vs psnm_outreach_targets drift.** The ~200 hardcoded CRM entries overlap with the 205 Supabase targets but are not the same data. Merging them without duplicating or losing status flags requires a careful reconciliation step. Do not assume they can be naively unioned.

6. **No rollback on pallet writes once live on Supabase.** Currently localStorage writes are synchronous and local — easy to recover from. A Supabase write that partially fails (network drop mid-goods-in) could leave orphan state. Mitigation: wrap goods-in in a transaction or use upsert-by-pid.
