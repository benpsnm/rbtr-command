# Stream 6 — WMS / Command Centre Audit Summary

**Date**: 2026-05-04  
**Session**: Stream 6 of 8 — Read-only audit  
**Auditor**: Claude Sonnet 4.6

---

## TL;DR

The WMS and Command Centre are not two separate apps — they are **one fractured app**.
The merge is 70% done but nobody noticed because the fracture points are invisible until
you read the code.

**Do this week: Option C.** Retire the Netlify WMS, fix 3 schema bugs (4 hours total),
reinstall the PWA pointing at Vercel. Done.

---

## Key Facts

### WMS Location

```
Standalone WMS:    /Desktop/psnm/WMS/PSNM_v14_LIVE.html  (Netlify)
CC WMS:            /v14/public/wms.html  (Vercel, more advanced)
Shared DB:         Supabase mpxgyobotiqcawmqlhbf (same project, same tables)
```

### The WMS is already in Command Centre

`wms.html` in CC has EVERY feature the Netlify WMS has, PLUS Atlas v2 email generation
and a Strategy tab. The Netlify version is an older fork that Ben installed as a PWA
before the CC version was built. Continuing to use it means:

- Missing Atlas v2 panels
- Missing Strategy tab  
- Maintaining two codebases that share one Supabase table

### The 5 Broken Things

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | `psnmwhm_store` has no migration | Data loss risk on DB reset | 30 min migration |
| 2 | `psnm_call_scripts` has two incompatible schemas | Call Scripts tab empty | 2h migration |
| 3 | `psnm_customers.monthly_revenue_gbp` column missing | Atlas MRR = £0 always | 30 min migration |
| 4 | `psnm_outreach_touches.touch_type` column missing | Site visits untagged | 30 min migration |
| 5 | WMS customers ≠ SQL customers | Atlas sees no real customers | Accept split, enter data manually |

### The 1 Invisible Architecture Problem

There are two customer registries:
- **WMS operational customer list** (inside `psnmwhm_store.wms_data.customers` JSON blob)
- **SQL `psnm_customers` table** (used by Atlas, morning briefing, index.html)

A paying customer "Terry & Tracey" with 40 bays in the WMS is invisible to Atlas and the
morning briefing because nobody wrote them to `psnm_customers`. Atlas's MRR is £0.
The morning briefing says "0 active customers". This is not a merge problem — it is a
missing manual step that needs to happen regardless of option chosen.

### The `cc_` Panel Situation

Tasks, CRM, Scripts, Revenue, Compliance, Links tabs in BOTH versions of the WMS store
their data in **localStorage** only (key `psnm_v2`). They are not synced to Supabase,
not shared between devices. This is a design choice that has worked so far because Ben
mostly uses one device. It is fixable but not this week.

---

## Recommended Action (Option C)

**Day 1** (3h): Write 3 migration files — `46_psnmwhm_store`, `47_fix_call_scripts`,
`48_fix_missing_columns`. Run against prod Supabase.

**Day 2** (2h): Diff Netlify WMS vs CC wms.html, port any missing content.

**Day 3** (30 min): Reinstall PWA from Vercel URL. Leave Netlify idle.

**After expedition prep**: Sync cc_ panels to Supabase, bridge WMS/SQL customer
registries if needed.

---

## Documents in This Audit

| File | Content |
|------|---------|
| `01_wms_location.md` | Where the WMS codebase lives |
| `02_wms_tables.md` | Tables standalone WMS reads/writes |
| `03_cc_tables.md` | Tables CC portal reads/writes |
| `04_overlap_matrix.md` | Full table overlap + schema mismatch details |
| `05_feature_inventory.md` | Feature comparison by app |
| `06_options.md` | Options A/B/C with effort, risk, timeline |
| `07_recommendation.md` | Recommended path with reasoning |
| `08_data_integrity.md` | All stale-data risks ranked by severity |
| `INTEGRATION_PLAN_THIS_WEEK.md` | Step-by-step migration plan |
| `SUMMARY.md` | This file |
