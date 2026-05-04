# Task 6 — Options Decision Document

## Context

- **Ben is solo.** No dev team. 90 min dev sessions, survival-mode business pressure.
- **Expedition deadline**: July 2027 (14 months). PSNM must be generating enough revenue
  to be self-sustaining (or closed) before departure.
- **Both apps already share `psnmwhm_store`** — the WMS state is already shared.
- **CC `wms.html` is the more advanced version** — standalone Netlify is behind.
- **The "merge" is partially done** but fragmented: separate customer registries,
  separate invoices, broken call scripts, localStorage-only panels.

---

## Option A — Keep Both Apps, Share Supabase, Fix Sync Gaps

**What this means**: Keep the Netlify WMS as the primary operational tool. Fix the data
gaps so both apps see consistent data. Add a `psnmwhm_store` migration. Stop using
`psnm_customers` as a parallel registry.

**Pros**:
- Netlify WMS is installed on Ben's phone as a PWA — operational workflow unchanged
- Minimal new code — just fix the broken plumbing
- WMS state already syncs between apps (shared `psnmwhm_store`)
- 0 retraining of muscle memory

**Cons**:
- Two codebases to maintain forever
- Netlify WMS misses Atlas v2, Strategy tab, WW leads inbox
- Ben will drift between two URLs for different tasks
- cc_ panels (Tasks/CRM/Scripts) are localStorage-only in BOTH — no fix without code changes
- Schema mismatches still need fixing regardless

**Effort**: 8–12 hours
- Write `psnmwhm_store` migration (1h)
- Fix `psnm_call_scripts` schema conflict (2h)
- Fix `monthly_revenue_gbp` missing column (1h)
- Fix `touch_type` in `psnm_outreach_touches` (1h)
- Decide fate of `psnm_customers` vs WMS blob (3–4h design + migration)

**Risk**: Medium. The Netlify WMS stays outdated vs CC wms.html. Every time a feature
is added to CC wms.html, the standalone diverges further. Maintenance debt grows.

**Timeline**: 1 focused day.

---

## Option B — Embed Netlify WMS as iframe in Command Centre

**What this means**: Add an iframe in CC pointing at the Netlify URL for the warehouse
map/ops view. CC remains the single URL for everything else.

**Pros**:
- No porting work — WMS continues as-is
- CC becomes the single URL
- Reasonable effort

**Cons**:
- iframe cross-origin issues (Netlify domain ≠ Vercel domain — cookies, storage won't share)
- localStorage won't cross iframe origin boundary — `psnm_v2` cc_ data won't be shared
- Two auth contexts (CC has Supabase auth, Netlify WMS has none)
- PWA experience breaks — the installed "PSNM WMS" app still goes to Netlify
- Mobile iframe UX is poor (scroll hijacking, viewport issues)
- Netlify WMS will still diverge from CC over time

**Effort**: 4–6 hours to wire up, but ongoing iframe maintenance pain.

**Risk**: High. Cross-origin iframe is brittle. Looks worse than two separate tabs.

**Timeline**: 1 day to set up, weeks of debugging edge cases.

**Recommendation**: Do not use this option.

---

## Option C — Port All Netlify WMS Features into CC `wms.html`

**What this means**: `wms.html` (CC) already has the WMS core. Port the remaining
divergences from the Netlify version, fix all schema issues, retire the Netlify deployment.
One URL. One codebase.

**Pros**:
- One URL for everything (PSNM ops + CRM + Atlas)
- CC wms.html already has Atlas v2 + Strategy that Netlify WMS lacks
- No schema drift — fixes schema mismatches once
- psnmwhm_store migration can be written once
- Auth guard works correctly
- Atlas MRR, morning briefing, customer data all consistent
- Long-term: zero maintenance overhead of dual codebases

**Cons**:
- The installed "PSNM WMS" PWA app on desktop/phone still points at Netlify URL
  → Ben must reinstall the PWA pointing at the Vercel URL
- CC wms.html is already 5,254 lines — porting remaining Netlify-only features adds ~200–400 lines
- Need to verify diff between two files to find what, if anything, Netlify has that CC wms.html doesn't
- Small risk of breaking working WMS during porting

**Effort**: 6–10 hours
- Diff the two WMS files, identify any Netlify-only features (2h)
- Port any missing features to CC wms.html (2–4h)
- Write `psnmwhm_store` migration (1h)
- Fix `psnm_call_scripts` schema (2h)
- Fix `monthly_revenue_gbp`, `touch_type` (1h)
- Reinstall PWA pointing at Vercel URL (15 min)

**Risk**: Low–Medium. The WMS state is already shared (same Supabase table). The
transition is mostly URL change + schema fixes. No data migration needed for warehouse ops.

**Timeline**: 1–2 focused days.

---

## Comparison Table

| | Option A | Option B | Option C |
|---|---|---|---|
| Effort (hours) | 8–12 | 4–6 + ongoing | 6–10 |
| Risk | Medium | High | Low–Medium |
| One URL for PSNM | No | Fragile | Yes |
| Fixes schema mismatches | Yes | No | Yes |
| Atlas v2 in WMS | No | No | Yes |
| Maintenance overhead | High (2 codebases) | Very High (iframe hell) | Low (1 codebase) |
| PWA reinstall required | No | Yes | Yes |
| Survivable solo | Yes | No | Yes |
