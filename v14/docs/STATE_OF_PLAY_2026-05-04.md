# State of Play — Mon 4 May 2026 (end of day)

## Production (deployed, live)
- Commit: 4f5a533 — fix(claim-verifier): lower phrase-match floor from 8 to 6 chars
- Latest tag: v3.7-commercial-engine-live
- URL: https://rbtr-jarvis.vercel.app
- Status: stable, no deploys pending tonight

## What's live in production
- Path C / Atlas claim-source verification layer (9 verified claims: capacity, postcode, both drive times, goods-in/out, first week free, onboarding, notice period, 12-week commitment)
- SendGrid multipart parser fix for WW inbound emails
- Phase 1.6 build complete
- v3.5-system-complete: portals inline, Atlas priority engine, CRM, 16 SOPs, weather fixed, notifications, evening debrief

## Drift map (what's where)

| Layer | Ahead by | What's on it |
|---|---|---|
| Production (4f5a533) | baseline | live and stable |
| main | +2 commits | 991601e atlas v2.1 prompt + 91a0f8c warm leads — committed, not deployed |
| feat/wms-extensions | +3 commits over main | 1938dbf mig 44 codified + 41b430c WMS phase 1 scaffold + 33d32e2 rollback — add-only, not merged |
| Live Supabase DB | runs ahead of main migrations | mig 44 applied manually before being codified |

All three drifts are add-only. Nothing broken. Nothing lost.

## Database migrations
- Migrations 32–35: applied (contacts, sops, notifications, family_sons, family_peanut all present)
- Migration 40: applied (psnm_atlas_drafts table exists)
- Migration 44: APPLIED to live DB (5 rows currently carrying status='needs_revision' — proven). Codified on feat/wms-extensions only, not yet on main.
- Migration 45: applied (atlas_claim_verification on main, commit 490acbd)
- Migration 46: written but not applied (WMS phase 1 scaffolding on feat/wms-extensions)

## Working tree
Clean on feat/wms-extensions. The four api files that previous session warned about (api/briefing-data.js, api/docs/_atlas_system_prompt.md, api/morning-brief.js, api/supabase-proxy.js) were committed on main at 991601e. Not lost.

Untracked: SESSION_SUMMARY.md (parent dir), docs/, supabase/.temp/ — leave alone.

## 8-stream merge (queued, NOT shipping tonight)
- 29 April YOLO run, all 8 streams committed
- Audit complete: docs/streams/AUDIT_2026-04-29.md
- Documented merge order: streams 1, 3, 4, 5, 8 first (independent off main HEAD at the time), then stream-7 last (brings stream-2 and stream-6 with it). Retire stream-6 standalone after.
- Note: main has moved on since the streams branched. Merges may need rebase or merge commits.

## Next concrete decisions (Tue morning, fresh head)
1. Deploy main → production (2 add-only commits, low risk, smoke-test atlas v2.1 prompt + warm leads)
2. Merge feat/wms-extensions → main (3 add-only commits, smoke-test WMS phase 1 scaffolding before deploy)
3. Then plan 8-stream merge sequence

## Rollback if anything breaks
- Production rollback: vercel rollback to deploy before 4f5a533 (last known stable was v3.5-system-complete tag)
- Database: migrations 32–46 are all forward-only. Migration 46 has a rollback file (33d32e2). Earlier migrations would need manual SQL — flag before any rollback.
- Working tree: clean, nothing to recover

## Open Claude Code sessions
- Top-left terminal (this one, currently on feat/wms-extensions): keep
- Bottom-right terminal (29-April streams audit): keep
- All others (the scattered windows showing stale recaps): close
