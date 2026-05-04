# Integration Plan — This Week

**Recommendation: Option C — Retire Netlify, CC `wms.html` becomes the single WMS**

7-day execution plan. Read-only audit is done. This is the action list.

---

## Day 1 — Schema Fixes (3 hours)

These fixes are required regardless of any merge decision. Do them first.

### Step 1: Write `psnmwhm_store` migration (30 min)

Create `supabase/migrations/46_psnmwhm_store.sql`:

```sql
-- Migration 46: formalise psnmwhm_store table
-- This table was created manually. Writing the migration for DR + version control.
CREATE TABLE IF NOT EXISTS psnmwhm_store (
  id         TEXT PRIMARY KEY,
  wms_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE psnmwhm_store ENABLE ROW LEVEL SECURITY;
-- WMS uses anon key, needs full access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'psnmwhm_store' AND policyname = 'anon_all') THEN
    CREATE POLICY anon_all ON psnmwhm_store FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
COMMENT ON TABLE psnmwhm_store IS 'CLASSIFICATION: INTERNAL — WMS warehouse state blob';
```

Run against prod Supabase (or verify it already exists with `IF NOT EXISTS`).

### Step 2: Fix `psnm_call_scripts` schema (1.5 hours)

Create `supabase/migrations/47_fix_call_scripts.sql`:

```sql
-- Migration 47: add readable columns to psnm_call_scripts
-- Migration 27 created table with script_type/tier/script_cues schema.
-- Migration 32 tried a different schema but was a no-op.
-- psnm.html reads name/category/script_body — add those columns.
ALTER TABLE psnm_call_scripts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE psnm_call_scripts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE psnm_call_scripts ADD COLUMN IF NOT EXISTS script_body TEXT;
ALTER TABLE psnm_call_scripts ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]';

-- Seed the 6 scripts that migration 32 failed to insert
INSERT INTO psnm_call_scripts (name, category, script_body, objection_handlers)
VALUES
  ('Cold Outreach First Call', 'cold_first', '...', '[]'),
  -- [paste the 6 scripts from migration 32_psnm_templates.sql]
ON CONFLICT DO NOTHING;
```

Verify in psnm.html that Call Scripts tab now renders.

### Step 3: Fix missing columns (30 min)

Create `supabase/migrations/48_fix_missing_columns.sql`:

```sql
-- Migration 48: fix schema gaps identified in Stream 6 audit

-- 1. psnm_outreach_touches.touch_type (used by psnm.html:786)
ALTER TABLE psnm_outreach_touches
  ADD COLUMN IF NOT EXISTS touch_type TEXT;

-- 2. psnm_customers.monthly_revenue_gbp (used by atlas.js:395)
ALTER TABLE psnm_customers
  ADD COLUMN IF NOT EXISTS monthly_revenue_gbp NUMERIC;

-- Now update supabase-proxy ALLOWED_TABLES if not already there
-- (verify psnmwhm_store is in the allowlist)
```

After running: manually enter `monthly_revenue_gbp` for any live paying customers
in `psnm_customers` via `index.html` or Supabase table editor.

---

## Day 2 — WMS Diff and Port (2–3 hours)

### Step 4: Diff Netlify WMS vs CC wms.html (1 hour)

```bash
diff /Users/bengreenwood/Desktop/psnm/WMS/PSNM_v14_LIVE.html \
     /Users/bengreenwood/Desktop/rbtr-command/v14/public/wms.html \
     | grep "^[<>]" | grep -v "^---" | head -100
```

Specifically look for:
- Any cc_ panel content that differs (hardcoded task lists, company lists)
- Any warehouse layout constants that differ (AISLES array, bay counts)
- Any UI features in Netlify WMS not in CC wms.html

### Step 5: Port any Netlify-only content to CC wms.html (1–2 hours)

Likely small. The CC wms.html is already more advanced. The main thing to check
is whether the AISLES/bay configuration constants match.

---

## Day 3 — Migrate the PWA (30 min)

### Step 6: Reinstall PWA

1. Open Command Centre at its Vercel URL
2. Navigate to `/wms`
3. Safari: Share → Add to Home Screen → "PSNM WMS"
4. Repeat on any phone/tablet used operationally
5. Delete old "PSNM WMS.app" web clip from Desktop

### Step 7: Verify end-to-end

- Open new PWA → map loads → sync status = Live
- Add a test goods-in record → verify it appears in CC wms.html
- Open CC psnm.html → verify call scripts tab shows data
- Check Atlas reports something > £0 for MRR (after step 3 manual entry)

---

## Day 4–7 — Retire Netlify (optional, low priority)

### Step 8: Netlify retirement

Option 1: Leave the Netlify deployment idle (it costs nothing, no traffic).
Option 2: Set up a redirect at the Netlify URL pointing to the Vercel wms URL.
Option 3: Delete the Netlify deploy.

Recommendation: Leave idle for 4 weeks as insurance, then delete.

---

## What NOT to do this week

- Do not attempt to migrate WMS blob customer data into `psnm_customers` rows. This is
  a complex 1-2 day job that is not urgent. Live with the split for now.
- Do not try to sync cc_ localStorage panels to Supabase. Low ROI this week.
- Do not touch the `psnm_invoices` table. WMS invoices continue as-is.

---

## Success criteria for end of week

- [ ] `psnmwhm_store` has a migration file
- [ ] Call Scripts tab in psnm.html shows actual scripts
- [ ] `touch_type` column exists in `psnm_outreach_touches`
- [ ] `monthly_revenue_gbp` column exists in `psnm_customers`
- [ ] At least one active customer has `monthly_revenue_gbp` entered
- [ ] Atlas MRR shows a non-zero figure
- [ ] PWA is reinstalled pointing at Vercel
- [ ] Netlify WMS is left idle (not deleted yet)
