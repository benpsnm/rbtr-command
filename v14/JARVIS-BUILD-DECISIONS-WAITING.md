# JARVIS Build Decisions Waiting

## Rocko v2 Phase 1 — Migration Blocker (14 May 2026, 12:45)

**Issue:** Cannot apply migration 078_rocko_v2_schema.sql programmatically
- psql not available
- pg module connection failing  
- Supabase CLI not installed

**Migration SQL:** `v14/supabase/migrations/078_rocko_v2_schema.sql`

**Ben action (2 min):**
1. https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new
2. Paste migration SQL
3. Run
4. Verify: rocko_v2_sessions, rocko_v2_messages, rocko_v2_integrations

**Status:** Proceeding with Phase 1 build. Tables needed before self-test.
