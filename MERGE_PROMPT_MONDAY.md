# MERGE_PROMPT_MONDAY — Full WMS Merge Session Brief
# Created: 2026-04-27
# Purpose: Paste this entire file as the opening prompt for Monday's merge session.
# Goal: One canonical WMS at one URL with one login.

---

## SESSION GOAL

Merge System A (rich WMS at psnm-wms.netlify.app) and System B (Vercel /wms.html Dashboard) into a single canonical WMS.

**End state:**
- psnm-wms.netlify.app is the one WMS Ben uses
- It has a new "Intelligence" tab showing live data from System B Supabase tables
- Vercel /wms.html redirects to psnm-wms.netlify.app (or is removed)
- No more two-system confusion

---

## CONTEXT — READ FIRST

Two systems exist. Do NOT conflate them.

### System A — Rich WMS (BASE for this merge)
- **URL**: https://psnm-wms.netlify.app
- **Source**: The Netlify-deployed HTML. The local file `~/Desktop/psnm/WMS/PSNM_v14.html` is OUTDATED (3,136 lines). The live deployed version is ~3,870 lines and is the real source. **Download the live version before editing.**
- **Database**: Supabase `psnmwhm_store` table (single-row, anon key, RLS disabled)
- **Current anon key** (from Vercel env pull): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weGd5b2JvdGlxY2F3bXFsaGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjY2ODIsImV4cCI6MjA4OTg0MjY4Mn0.Lo-3Q0PbbOZmNsw3iAOzytgn80O0l7TKHXTYwhqsWog`
- **Supabase URL**: `https://mpxgyobotiqcawmqlhbf.supabase.co`
- **Deploy method**: Drag updated HTML onto Netlify dashboard (no git, no CI)

### System B — Vercel Dashboard (DATA SOURCE, being absorbed)
- **Source**: `~/Desktop/rbtr-command/v14/public/wms.html` (572 lines)
- **Auth**: `wms_check` action via `/api/supabase-proxy` — passcode checked against `PSNM_STAFF_PASSCODE` env var
- **Tables it reads** (all have anon SELECT USING(true) policies):
  - `psnm_enquiries` — booking enquiries
  - `psnm_customers` — customer records with pallets_live, rate_gbp_week
  - `psnm_outreach_targets` — leads with priority_score, outcome
  - `psnm_outreach_touches` — outreach activity
  - `psnm_occupancy_snapshots` — daily occupancy snapshots
  - `psnm_offer_config` — offer configuration
  - `psnm_social_posts` — social post queue

---

## STEP-BY-STEP PLAN

### Step 1 — Download the live System A source
```bash
curl -s https://psnm-wms.netlify.app -o ~/Desktop/psnm/WMS/PSNM_v14_LIVE.html
wc -l ~/Desktop/psnm/WMS/PSNM_v14_LIVE.html
```
Work from `PSNM_v14_LIVE.html`. Do NOT edit the old PSNM_v14.html.

### Step 2 — Locate the tab structure in PSNM_v14_LIVE.html
Search for the existing tab buttons and tab content divs. The live version has tabs like: Warehouse, Goods In, Goods Out, Stock, Log, Customers, Rates, Dashboard, Bookings, CRM, Emails, Social, Invoices, Media, Auto.

### Step 3 — Add Intelligence tab (new tab, reads System B tables)
Insert a new tab button "Intelligence" after the existing tabs. Add a new tab content div with these sections (mirror the design system already in the file):

**Section: KPI Strip** (live from Supabase)
- Pallets stored / free / % full (from `psnm_customers` sum of pallets_live)
- Weekly revenue estimate (sum pallets_live * rate_gbp_week)
- Monthly projection vs fixed cost (Apr=£8,280, May=£9,280, Jun=£10,280, Jul+=£13,613)
- Break-even gap (912 pallets at 57%)

**Section: Today's Enquiries**
- Query: `psnm_enquiries?created_at=gte.<today>&select=id,company,pallets,status,created_at&order=created_at.desc`
- Show as clickable rows; expand to show notes/quote details

**Section: Hot Leads**
- Query: `psnm_outreach_targets?order=priority_score.desc&limit=5&select=company_name,priority_score,outcome,notes`
- Show top 5 with score badges

**Section: Outreach Summary**
- Query: `psnm_outreach_touches?select=id,status,outcome` (all time or last 30 days)
- Count by outcome: delivered / opened / replied / booked

**Section: Occupancy Trend**
- Query: `psnm_occupancy_snapshots?order=date.desc&limit=7&select=date,pallets_count`
- Show last 7 days as a simple table or sparkline

### Step 4 — Wire the anon key into the Intelligence tab
The new tab should use `fetch()` directly against Supabase REST with the anon key (hardcode it in the Intelligence tab JS block — consistent with how the existing psnmwhm_store calls work in the live file).

```javascript
const SUPA_URL = 'https://mpxgyobotiqcawmqlhbf.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weGd5b2JvdGlxY2F3bXFsaGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjY2ODIsImV4cCI6MjA4OTg0MjY4Mn0.Lo-3Q0PbbOZmNsw3iAOzytgn80O0l7TKHXTYwhqsWog';
const sbHeaders = { apikey: ANON, Authorization: `Bearer ${ANON}` };

async function sbFetch(table, qs = '') {
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${qs}`, { headers: sbHeaders });
  return r.json();
}
```

### Step 5 — Test locally
Open PSNM_v14_LIVE.html in Safari. Click Intelligence tab. Confirm data loads (no 401/CORS errors — anon key is public-safe).

### Step 6 — Deploy to Netlify
Drag `PSNM_v14_LIVE.html` onto the Netlify dashboard for the psnm-wms site. Verify the Intelligence tab is live at psnm-wms.netlify.app.

### Step 7 — Update Vercel /wms.html to redirect
In `~/Desktop/rbtr-command/v14/public/wms.html`, replace the full page content with a redirect:
```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=https://psnm-wms.netlify.app">
  <title>WMS — Redirecting</title>
</head>
<body>
  <p>Redirecting to <a href="https://psnm-wms.netlify.app">psnm-wms.netlify.app</a>...</p>
</body>
</html>
```
Deploy: `cd ~/Desktop/rbtr-command/v14 && vercel deploy --prod`

### Step 8 — Update PSNM_STATE.md
Mark the merge complete. Remove the OPEN MERGE TASK section. Update the Infrastructure table to show one WMS URL.

---

## WHAT NOT TO DO

- Do NOT edit the old `PSNM_v14.html` (3,136 lines) — it is outdated
- Do NOT deploy System A via Vercel or System B via Netlify
- Do NOT use the service role key in client-side code — anon key only
- Do NOT delete wms.html before the redirect is tested and live

---

## VERIFICATION CHECKLIST

- [ ] Intelligence tab visible at psnm-wms.netlify.app
- [ ] KPI strip shows live pallet count (matches sum from psnm_customers)
- [ ] Today's enquiries section loads (may be empty if no enquiries today — that's fine)
- [ ] Hot leads section shows ≥1 row from psnm_outreach_targets
- [ ] Vercel /wms.html redirects to psnm-wms.netlify.app
- [ ] PSNM_STATE.md updated and committed

---

## ESTIMATED EFFORT

2–3 hours. Start fresh session, read both files first, then build.
