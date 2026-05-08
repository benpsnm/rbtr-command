# Standalone WMS — Supabase Wire-Up Spec
# Version: 1.0 — Written 8 May 2026 (reverse-engineered from index.html)

**Purpose:** Replace localStorage with Supabase-backed persistence in psnm-wms.vercel.app.  
**Approach:** Static SPA cannot embed service-role credentials → all DB access proxied through new v14 API endpoints.  
**Source of truth for code build:** This file.

---

## Part 1 — localStorage Data Structures (current)

### Key: `psnm_wms2`

Top-level state object `S`:

```json
{
  "cells":      { "A-1-1": 4, "B-3-2": 17 },
  "floor":      { "FL-1-1": 5 },
  "aisleFloor": { "A-FL-1-1": 9 },
  "pallets": {
    "1": {
      "id": 1,
      "customer": "Acme Ltd",
      "ref": "PO-001",
      "desc": "Machine components",
      "weight": "250",
      "size": "standard",
      "notes": "",
      "dateIn": "2026-04-15",
      "timeIn": "09:30",
      "location": "A-1-1",
      "stype": "racked",
      "weeklyRate": 6.50,
      "out": false,
      "outDate": null,
      "outTime": null
    }
  },
  "customers": {
    "Acme Ltd": {
      "name": "Acme Ltd",
      "contact": "John Smith",
      "phone": "07700 900123",
      "email": "john@acme.co.uk",
      "rate": "6.50",
      "deal": "none",
      "notes": ""
    }
  },
  "movements": [
    {
      "type": "IN",
      "date": "2026-04-15",
      "time": "09:30",
      "customer": "Acme Ltd",
      "ref": "PO-001",
      "pallets": 1,
      "location": "A-1-1",
      "rate": 6.50,
      "handling": 4.00,
      "desc": "Machine components",
      "notes": "Goods in"
    }
  ],
  "nextId": 2
}
```

**Notes on `cells`/`floor`/`aisleFloor`:** These are occupancy maps keyed by location string → pallet ID (integer). They are derived state (can be reconstructed from pallets). Do NOT store them in Supabase — reconstruct on load from the `pallets` table (`out=false` rows, using `location` field).

**Pallet `stype` values:** `"racked"` | `"floor"` | `"aislefloor"`  
**Pallet `deal` values:** `"none"` | `"starter"` | `"lockin"` | `"scaleup"`  
**Location key formats:**
- Racked: `"A-1-1"` (aisle-bay-shelf)
- Floor: `"FL-1-1"` (pos-stack)
- Aisle-floor: `"A-FL-1-1"` (aisle-FL-bay-stack)

---

### Key: `psnm_v14_bk` (bookings)

Array of booking objects:

```json
[
  {
    "id": "BK1714000000000",
    "company": "Healthcare Equipment Ltd",
    "contact": "Sarah Jones",
    "email": "sarah@healthequip.co.uk",
    "phone": "07700 900456",
    "pallets": "500",
    "type": "floor",
    "rate": "4.50",
    "startDate": "2026-05-01",
    "goods": "Medical equipment",
    "notes": "Confirmed booking",
    "status": "active",
    "created": "2026-04-09T00:00:00.000Z"
  }
]
```

---

### Key: `psnm_v14_eq` (enquiries)

Same shape as bookings, but `status: "enquiry"` and `id` prefix `"EQ"`:

```json
[
  {
    "id": "EQ1714000000000",
    "company": "Healthcare Equipment Ltd",
    "contact": "Sarah Jones",
    "email": "sarah@healthequip.co.uk",
    "phone": "",
    "pallets": "500",
    "type": "floor",
    "rate": "",
    "startDate": "",
    "goods": "Mobility aids",
    "notes": "500 pallets",
    "status": "enquiry",
    "created": "2026-04-09T00:00:00.000Z"
  }
]
```

---

### Key: `psnm_crm4_status`

Object mapping lead ID → status string. The master lead list (208 entries, `CRM2_LEADS`) is hardcoded in JS. Only overrides are persisted:

```json
{
  "L001": "contacted",
  "L007": "opened",
  "L032": "cold"
}
```

**CRM status values:** `"new"` | `"hot"` | `"opened"` | `"contacted"` | `"cold"`

---

## Part 2 — Supabase Schema

### Table: `psnm_pallets`

```sql
CREATE TABLE psnm_pallets (
  id            INTEGER PRIMARY KEY,           -- matches S.nextId counter; NOT serial (imported from localStorage)
  customer      TEXT NOT NULL,
  ref           TEXT,
  description   TEXT NOT NULL,
  weight_kg     TEXT,                          -- stored as string in localStorage ("250"), keep as text to avoid lossy conversion
  size          TEXT DEFAULT 'standard',
  notes         TEXT,
  date_in       DATE NOT NULL,
  time_in       TEXT,                          -- "HH:MM" string, no timezone needed
  location      TEXT NOT NULL,                 -- location key e.g. "A-1-1", "FL-2-1", "B-FL-3-2"
  stype         TEXT NOT NULL CHECK (stype IN ('racked','floor','aislefloor')),
  weekly_rate   NUMERIC(6,2) NOT NULL DEFAULT 6.50,
  out           BOOLEAN NOT NULL DEFAULT false,
  out_date      DATE,
  out_time      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_psnm_pallets_customer ON psnm_pallets(customer);
CREATE INDEX idx_psnm_pallets_out ON psnm_pallets(out);
CREATE INDEX idx_psnm_pallets_location ON psnm_pallets(location) WHERE out = false;
```

---

### Table: `psnm_customers`

```sql
CREATE TABLE psnm_customers (
  name          TEXT PRIMARY KEY,              -- customer name IS the key in localStorage
  contact       TEXT,
  phone         TEXT,
  email         TEXT,
  rate          TEXT DEFAULT '6.50',           -- stored as string ("6.50") matching localStorage
  deal          TEXT DEFAULT 'none' CHECK (deal IN ('none','starter','lockin','scaleup')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_psnm_customers_email ON psnm_customers(email) WHERE email IS NOT NULL AND email != '';
```

---

### Table: `psnm_movements`

Append-only log. No updates or deletes.

```sql
CREATE TABLE psnm_movements (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('IN','OUT','MOVE','ADJUST')),
  date          DATE NOT NULL,
  time          TEXT NOT NULL,                 -- "HH:MM"
  customer      TEXT NOT NULL,
  ref           TEXT,
  pallets       INTEGER NOT NULL DEFAULT 1,
  location      TEXT,                          -- may be comma-separated list for multi-pallet moves
  rate          NUMERIC(6,2),                  -- null on OUT
  handling      NUMERIC(8,2) DEFAULT 0,
  description   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
```sql
CREATE INDEX idx_psnm_movements_date ON psnm_movements(date DESC);
CREATE INDEX idx_psnm_movements_customer ON psnm_movements(customer);
CREATE INDEX idx_psnm_movements_type ON psnm_movements(type);
```

---

### Table: `psnm_bookings`

Maps from `psnm_v14_bk` localStorage key.

```sql
CREATE TABLE psnm_bookings (
  id            TEXT PRIMARY KEY,              -- "BK" + timestamp, matches localStorage
  company       TEXT NOT NULL,
  contact       TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  pallets       TEXT,                          -- stored as string ("500")
  type          TEXT,                          -- "floor" | "racked"
  rate          TEXT,
  start_date    TEXT,                          -- ISO date string or empty
  goods         TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Table: `psnm_enquiries`

Maps from `psnm_v14_eq` localStorage key.

```sql
CREATE TABLE psnm_enquiries (
  id            TEXT PRIMARY KEY,              -- "EQ" + timestamp
  company       TEXT NOT NULL,
  contact       TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  pallets       TEXT,
  type          TEXT,
  rate          TEXT,
  start_date    TEXT,
  goods         TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'enquiry' CHECK (status IN ('enquiry','converted','closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Table: `psnm_crm_status`

Maps from `psnm_crm4_status` localStorage key (just the overrides object).

```sql
CREATE TABLE psnm_crm_status (
  lead_id       TEXT PRIMARY KEY,              -- "L001" .. "L208"
  status        TEXT NOT NULL CHECK (status IN ('new','hot','opened','contacted','cold')),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

---

## Part 3 — Row Level Security

```sql
-- Enable RLS on all new tables
ALTER TABLE psnm_pallets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_enquiries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE psnm_crm_status ENABLE ROW LEVEL SECURITY;

-- Service role has full access (bypasses RLS by default in Supabase — no policy needed)
-- No public access (anon role is blocked by RLS with no permissive policy)
-- All access goes through v14 proxy using service-role key
```

**Rule:** No policies granting access to `anon` or `authenticated` roles. The only actor is the v14 server using `SUPABASE_SERVICE_ROLE`. This is correct because psnm-wms is operator-only, not multi-tenant.

---

## Part 4 — v14 Proxy Endpoints

All endpoints live at `/api/standalone/` in v14.

### Auth pattern (all endpoints)

```javascript
const { requireAuth } = require('../auth/middleware');

module.exports = async (req, res) => {
  const auth = requireAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.reason });
  }
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://psnm-wms.vercel.app', 'http://localhost:3000'];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // ... handler
};
```

**Auth sources accepted:**
- `x-rbtr-auth` header (existing token — for scripts/curl testing)
- `psnm_session` JWT cookie (browser — same session cookie as v14/wms.html)

The SHA-256 gate on psnm-wms is client-side only and does NOT issue a session cookie. For the Supabase-backed version, the SHA-256 gate continues to gate the UI, and all API calls use the `x-rbtr-auth` header passed from the page (or set as a page-level constant).

**Implementation decision:** Store `RBTR_AUTH_TOKEN` value as a JS constant in a `<script>` block in index.html (gated behind the existing SHA-256 check so it's never visible unauthenticated). Pass as `x-rbtr-auth` header on every fetch. This avoids needing a full cookie-session on the standalone.

---

### Supabase client pattern (reuse across all endpoints)

```javascript
// shared: v14/api/standalone/_db.js
const { createClient } = require('@supabase/supabase-js');
let _client;
function getDb() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _client;
}
module.exports = { getDb };
```

---

### Endpoint: `GET/POST/PUT/DELETE /api/standalone/pallets`

**GET** — list active pallets (out=false)

Query params:
- `?all=true` — include out=true records (for movement history reconstruction)
- `?customer=<name>` — filter by customer

Response:
```json
{
  "pallets": [
    {
      "id": 1,
      "customer": "Acme Ltd",
      "ref": "PO-001",
      "desc": "Machine components",
      "weight": "250",
      "size": "standard",
      "notes": "",
      "dateIn": "2026-04-15",
      "timeIn": "09:30",
      "location": "A-1-1",
      "stype": "racked",
      "weeklyRate": 6.50,
      "out": false,
      "outDate": null,
      "outTime": null
    }
  ],
  "nextId": 42
}
```

Note: response uses camelCase to match localStorage exactly. Endpoint translates `date_in → dateIn`, `weekly_rate → weeklyRate`, etc.

**POST** — create pallet(s). Body: array of pallet objects (same camelCase shape as above, without `id`). Server assigns `id` from `SELECT MAX(id)+1` with gap-fill fallback.

Response: `{ "pallets": [{ ...created }], "nextId": <new max+1> }`

**PUT** — update a pallet. Body: `{ id, ...fields }`. Only `out`, `outDate`, `outTime`, `location`, `weeklyRate`, `notes`, `ref` can be updated.

Response: `{ "pallet": { ...updated } }`

**DELETE** `?id=<n>&confirm=true` — hard delete. Only for migration cleanup. Requires `?confirm=true` to prevent accidental deletion.

---

### Endpoint: `GET/POST/PUT/DELETE /api/standalone/customers`

**GET** — all customers

Response: `{ "customers": { "Acme Ltd": { name, contact, phone, email, rate, deal, notes } } }`

(Object keyed by name to match `S.customers` localStorage shape exactly.)

**POST** — upsert customer. Body: `{ name, contact, phone, email, rate, deal, notes }`

Uses `INSERT ... ON CONFLICT (name) DO UPDATE`.

Response: `{ "customer": { ...upserted } }`

**PUT** — same as POST (alias, both do upsert).

**DELETE** `?name=<name>` — delete customer (only if no active pallets).

---

### Endpoint: `GET/POST /api/standalone/movements`

Append-only. No PUT/DELETE.

**GET** — paginated movement log.

Query params:
- `?limit=200` (default 200)
- `?offset=0`
- `?customer=<name>`
- `?type=IN|OUT`
- `?from=YYYY-MM-DD`

Response: `{ "movements": [...], "total": 847 }`

(Each movement in camelCase: `{ type, date, time, customer, ref, pallets, location, rate, handling, desc, notes }`)

**POST** — append movement(s). Body: single object or array.

Response: `{ "movements": [{ id, ...fields }] }`

---

### Endpoint: `GET/POST/PUT/DELETE /api/standalone/bookings`

**GET** — all bookings (status=active by default).

Query: `?status=active|cancelled|completed|all`

Response: `{ "bookings": [...] }` (camelCase, matching `psnm_v14_bk` array shape)

**POST** — create booking. Body: booking object (without `id`; server generates `"BK" + Date.now()`).

**PUT** — update booking. Body: `{ id, ...fields }`. Typically used to set `status: "cancelled"`.

**DELETE** `?id=<id>` — hard delete.

---

### Endpoint: `GET/POST/PUT/DELETE /api/standalone/enquiries`

Same pattern as bookings but for `psnm_v14_eq`. Server generates `"EQ" + Date.now()` IDs.

---

### Endpoint: `GET/POST/DELETE /api/standalone/crm`

**GET** — all status overrides.

Response: `{ "status": { "L001": "contacted", "L007": "opened" } }` (matches `psnm_crm4_status` shape)

**POST** — upsert status for one lead. Body: `{ leadId: "L001", status: "contacted" }`

Uses `INSERT ... ON CONFLICT (lead_id) DO UPDATE SET status = ..., updated_at = now()`.

Response: `{ "ok": true }`

**DELETE** `?leadId=L001` — reset lead to default status (removes override row, JS will show master `st` value).

---

## Part 5 — Client Rewrite Strategy

### Fetch wrapper (add to index.html `<script>` section, after auth gate)

```javascript
const PROXY = 'https://rbtr-jarvis.vercel.app/api/standalone';
const AUTH_TOKEN = '<RBTR_AUTH_TOKEN_VALUE>';   // injected at build time OR set as env on Vercel

async function proxyGet(path, params = {}) {
  const url = new URL(PROXY + path);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const r = await fetch(url, { headers: { 'x-rbtr-auth': AUTH_TOKEN } });
  if (!r.ok) throw new Error(`proxy ${path} → ${r.status}`);
  return r.json();
}

async function proxyPost(path, body) {
  const r = await fetch(PROXY + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-rbtr-auth': AUTH_TOKEN },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`proxy ${path} POST → ${r.status}`);
  return r.json();
}
```

**Security note:** `AUTH_TOKEN` is a JS constant in the page. It is gated behind the SHA-256 password check (the token is never served to unauthenticated visitors because the gate fires before DOMContentLoaded). This is acceptable for operator-only tooling. Post-Supabase, Phase 4 of PSNM_LOCKED_PLAN_v1.md replaces this with proper server-side auth.

### Replace `save()` / `load()`

```javascript
// OLD
function save(){ localStorage.setItem('psnm_wms2', JSON.stringify(S)); }
function load(){ const d=localStorage.getItem('psnm_wms2'); if(d) S=Object.assign(S,JSON.parse(d)); }

// NEW — async save (call save() anywhere; it debounces writes)
let _saveTimer;
function save() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_flushSave, 400);
}
async function _flushSave() {
  try {
    // Reconstruct cells/floor/aisleFloor from pallets on the server
    // Only send the data tables, not the derived maps
    await Promise.all([
      proxyPost('/pallets/sync', { pallets: S.pallets, nextId: S.nextId }),
      proxyPost('/customers/sync', { customers: S.customers }),
    ]);
    // movements are appended individually at time of action (see movement sections)
  } catch(e) { console.error('[psnm:save]', e); toast('Save failed — working offline', true); }
}

async function load() {
  try {
    const [pd, cd, md, bd, ed, crd] = await Promise.all([
      proxyGet('/pallets'),
      proxyGet('/customers'),
      proxyGet('/movements', { limit: 500 }),
      proxyGet('/bookings'),
      proxyGet('/enquiries'),
      proxyGet('/crm'),
    ]);
    // Rebuild S
    S.pallets = {};
    pd.pallets.forEach(p => { S.pallets[p.id] = p; });
    S.nextId = pd.nextId;
    S.customers = cd.customers;
    S.movements = md.movements;
    // Reconstruct occupancy maps
    S.cells = {}; S.floor = {}; S.aisleFloor = {};
    Object.values(S.pallets).filter(p => !p.out).forEach(p => {
      if (p.location.startsWith('FL')) S.floor[p.location] = p.id;
      else if (p.location.includes('-FL-')) S.aisleFloor[p.location] = p.id;
      else S.cells[p.location] = p.id;
    });
    // Bookings/enquiries
    v14Bookings = bd.bookings;
    v14Enquiries = ed.enquiries;
    // CRM
    const _saved = crd.status;
    crm2Leads.forEach(l => { if (_saved[l.id]) l.st = _saved[l.id]; });
  } catch(e) {
    console.error('[psnm:load]', e);
    toast('Loading from local backup…', false);
    // Fallback: use existing localStorage data if Supabase unreachable
    const d = localStorage.getItem('psnm_wms2');
    if (d) S = Object.assign(S, JSON.parse(d));
    v14Bookings = JSON.parse(localStorage.getItem('psnm_v14_bk') || '[]');
    v14Enquiries = JSON.parse(localStorage.getItem('psnm_v14_eq') || '[]');
    const _saved = JSON.parse(localStorage.getItem('psnm_crm4_status') || '{}');
    crm2Leads.forEach(l => { if (_saved[l.id]) l.st = _saved[l.id]; });
  }
}
```

**Offline fallback:** localStorage remains populated in parallel during migration period. After migration is confirmed clean, remove localStorage writes in Phase 3 cleanup PR.

### Sync endpoint `/pallets/sync` and `/customers/sync`

These bulk-replace endpoints handle the "save everything" semantics of the old `save()` function. They receive the full `S.pallets` object and upsert all rows.

```
POST /api/standalone/pallets/sync
Body: { pallets: { "1": {...}, "2": {...} }, nextId: 42 }
```

Server iterates the object, does bulk upsert via `supabase.from('psnm_pallets').upsert(rows)`. Same for customers.

---

## Part 6 — `vercel.json` CORS (v14)

Add to v14's `vercel.json` headers block:

```json
{
  "source": "/api/standalone/(.*)",
  "headers": [
    { "key": "Access-Control-Allow-Origin", "value": "https://psnm-wms.vercel.app" },
    { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
    { "key": "Access-Control-Allow-Headers", "value": "Content-Type, x-rbtr-auth" }
  ]
}
```

Note: `Access-Control-Allow-Origin` is set to the exact origin (not `*`) so cookies work if needed later. CORS preflight OPTIONS is handled in each endpoint.

---

## Part 7 — Migration Tool (`migrate-to-supabase.html`)

Standalone HTML file at `/Users/bengreenwood/Desktop/psnm/deploy/migrate-to-supabase.html`.

**Flow:**
1. Reads `psnm_wms2` from localStorage → counts pallets, customers, movements
2. Reads `psnm_v14_bk`, `psnm_v14_eq`, `psnm_crm4_status`
3. Asks user to confirm: "Migrate N pallets, M customers, P movements?"
4. POSTs to `/api/standalone/pallets/sync` (all pallets incl. out=true)
5. POSTs to `/api/standalone/customers/sync`
6. POSTs to `/api/standalone/movements` in batches of 50
7. POSTs bookings, enquiries individually
8. POSTs CRM status overrides
9. Re-reads from Supabase via GET, compares counts
10. Reports: "Migrated N/N pallets ✓, M/M customers ✓, P/P movements ✓" or shows mismatches

**This tool is run once by Ben manually. It is NOT run by the autonomous build.** The build creates the tool; Ben runs it after verifying Phase 5.

---

## Part 8 — Phase Sequence (build order)

```
Phase 0: Pre-flight + branch
Phase 1: Supabase schema (CREATE TABLE, RLS, indexes) + smoke test
Phase 2: v14 proxy endpoints (all 7 files in /api/standalone/)
Phase 3: v14 deploy + curl test each endpoint
Phase 4: index.html client rewrite (fetch wrapper + load() + save() + per-section wiring)
  Phase 4a: pallets (highest volume, most complex)
  Phase 4b: customers
  Phase 4c: movements (append-only — simplest)
  Phase 4d: bookings + enquiries
  Phase 4e: CRM status
Phase 5: migrate-to-supabase.html tool
Phase 6: E2E verification (preview deploy, smoke test each section)
Phase 7: Production deploy (ONLY if billing resolved AND Phase 6 green)
Phase 8: Final report
```

---

## Part 9 — Rollback Plan

**If proxy endpoints break v14:**
```bash
cd /Users/bengreenwood/Desktop/rbtr-command/v14
vercel rollback   # rolls back v14 to previous production deployment
```

**If psnm-wms standalone breaks:**
```bash
cd /Users/bengreenwood/Desktop/psnm/deploy
vercel rollback   # rolls back standalone to pre-build deployment
```

**Data:** Supabase tables are additive (new tables only, no changes to existing tables). Dropping them is safe: `DROP TABLE IF EXISTS psnm_pallets, psnm_customers, psnm_movements, psnm_bookings, psnm_enquiries, psnm_crm_status;`

localStorage data is untouched during build (offline fallback preserves it). If Supabase sync fails, the app falls back to localStorage automatically.

---

## Part 10 — Stop Conditions

Stop and write status report if:
1. Supabase table CREATE fails after 3 retries
2. v14 proxy endpoint returns non-2xx for valid auth after 3 fix+redeploy cycles
3. CORS preflight fails from psnm-wms.vercel.app origin
4. `vercel --prod` fails for v14 (billing issue on that project too)
5. Standalone billing still suspended at Phase 7 → stop before Phase 7, report tables+endpoints ready but standalone deploy deferred

---

## Part 11 — Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth in standalone | x-rbtr-auth header token in JS (gated by SHA-256) | No session infrastructure in static SPA; adding one is Phase 4 of PSNM plan |
| `save()` debounce | 400ms | Prevents write storm on rapid UI actions (e.g. goods-in 20 pallets) |
| cells/floor/aisleFloor in DB | Not stored — reconstructed on load | Derived from pallets.location; storing them causes dual-write consistency bugs |
| `nextId` | MAX(id)+1 on GET /pallets | Simpler than a sequence; works for migration (preserves existing IDs) |
| Offline fallback | Yes — localStorage read on fetch error | Ops staff must not be blocked if Supabase is down |
| Movements bulk load limit | 500 on initial load | Keeps load time under 1s; paginate older history on demand |
| CRM leads source | Still hardcoded JS array; only overrides in DB | ~208 leads; not worth a full table until Atlas outreach is integrated |
