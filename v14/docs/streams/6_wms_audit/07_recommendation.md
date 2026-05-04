# Task 7 — Recommended Path

## Recommendation: Option C — Retire Netlify, Make CC `wms.html` the Single WMS

### The core argument

The merge is 70% done already. `wms.html` in Command Centre already IS the WMS — it uses
the same Supabase table (`psnmwhm_store`), has every warehouse feature, and has Atlas v2
on top. The Netlify version is the old one. Ben is maintaining two codebases that serve the
same single-row Supabase table. That's the source of all the confusion.

The work to "merge" is not a big port — it's mostly:
1. Verify the Netlify WMS has nothing that CC wms.html lacks (quick diff)
2. Fix 3 schema bugs that exist regardless of which option is chosen
3. Update the PWA install to point at Vercel
4. Retire the Netlify deployment

### Why this specifically fits Ben's situation

**Solo + time-constrained**: One codebase to maintain. Every feature added to CC wms.html
(Atlas v2, Intelligence, Strategy) is immediately available in the WMS. There is no "sync the
Netlify version" step. This halves the cognitive overhead of PSNM development.

**Survival pressure**: The schema bugs mean Atlas is reporting £0 MRR and the morning
briefing has incorrect data. These bugs exist in both options A and C — but in Option C you
fix them once and never think about Netlify again. The morning briefing becomes accurate.

**14-month expedition deadline**: The PSNM system needs to run with minimal intervention
after July 2027. One URL, one codebase, one Supabase connection is the configuration that
a future assistant or employee can understand in 5 minutes. Two apps with diverging schemas
is not.

**Atlas v2 visibility**: The Netlify WMS has no Atlas v2 panels. That means Ben switches
app to manage outreach then switches back for WMS. CC wms.html has both on the same page.

### The one genuine cost

The installed "PSNM WMS.app" on the desktop and any phone install points at Netlify.
Ben will need to:
1. Navigate to the Vercel CC URL → `/wms`
2. Install as PWA from there
3. Delete the old PSNM WMS.app

This is a 15-minute job. It is the entire switching cost.

### Execution order (keep it tight)

**Day 1 (3–4 hours)**:
1. Diff `PSNM_v14_LIVE.html` vs `wms.html` — identify any Netlify-only feature
2. Port any missing features to `wms.html` (likely minimal — it's already more advanced)
3. Write `psnmwhm_store` migration (`46_psnmwhm_store.sql`)
4. Fix `psnm_call_scripts` — add `name`, `category`, `script_body` columns via migration

**Day 2 (3–4 hours)**:
5. Fix `psnm_customers` by deprecating it — write a migration to either:
   a. Add `psnmwhm_store_id` linking column, or
   b. Accept it's a parallel record for financial/legal use and never reconcile
6. Fix `psnm_outreach_touches` — add `touch_type` column via migration
7. Fix `monthly_revenue_gbp` on `psnm_customers` — add column
8. Reinstall PWA from Vercel URL
9. Turn off Netlify (or leave idle — no harm but stop maintaining it)

### What NOT to do

- Do not try to migrate WMS customer data from `psnmwhm_store` blob into `psnm_customers`.
  That is a complex data migration with high breakage risk. Accept that `psnm_customers`
  is the "financial/CRM view" and the WMS blob is the "operational view". They can coexist
  if the columns are fixed.
- Do not try to sync the localStorage `cc_` panels to Supabase. It's a nice-to-have but
  costs 8+ hours for marginal gain. Leave it for after expedition prep.
