-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 29 · Phase 2.6 WS1 · User profiles + RLS for dual-user auth
--
-- user_profiles:
--   Ben  — full access (all 7 portals + globals)
--   Sarah — limited (sarah, house, financials_limited, landing_globals)
--   staff — WMS only (password-gated, see WS6 middleware)
--
-- Requires: Supabase email/password auth enabled from dashboard.
-- Ben + Sarah auth.users rows must be created via Admin API (separate step).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('ben','sarah','staff')),
  portal_access TEXT[] NOT NULL DEFAULT '{}',
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE user_profiles IS 'CLASSIFICATION: INTERNAL';

-- Sarah-specific shared tables (create stubs so RLS policies can reference them)
CREATE TABLE IF NOT EXISTS sarah_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT CHECK (scope IN ('day','week','month','life')),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
COMMENT ON TABLE sarah_goals IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS sarah_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_date DATE NOT NULL UNIQUE,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  one_line TEXT,
  tomorrow_priority TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE sarah_reflections IS 'CLASSIFICATION: INTERNAL';

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarah_goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarah_reflections ENABLE ROW LEVEL SECURITY;

-- user_profiles: users read their own row, service_role full access
DROP POLICY IF EXISTS user_profiles_self_read ON user_profiles;
CREATE POLICY user_profiles_self_read ON user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS user_profiles_service_role ON user_profiles;
CREATE POLICY user_profiles_service_role ON user_profiles
  FOR ALL TO public USING (auth.role() = 'service_role');

-- Sarah tables: Sarah can CRUD, Ben read-only (role='ben'), service_role full
DROP POLICY IF EXISTS sarah_goals_owner ON sarah_goals;
CREATE POLICY sarah_goals_owner ON sarah_goals FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sarah'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sarah'));

DROP POLICY IF EXISTS sarah_goals_ben_read ON sarah_goals;
CREATE POLICY sarah_goals_ben_read ON sarah_goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'ben'));

DROP POLICY IF EXISTS sarah_goals_service ON sarah_goals;
CREATE POLICY sarah_goals_service ON sarah_goals FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS sarah_reflections_owner ON sarah_reflections;
CREATE POLICY sarah_reflections_owner ON sarah_reflections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sarah'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sarah'));

DROP POLICY IF EXISTS sarah_reflections_ben_read ON sarah_reflections;
CREATE POLICY sarah_reflections_ben_read ON sarah_reflections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'ben'));

DROP POLICY IF EXISTS sarah_reflections_service ON sarah_reflections;
CREATE POLICY sarah_reflections_service ON sarah_reflections FOR ALL TO public USING (auth.role() = 'service_role');

-- Audit
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES ('phase_2_6_ws1_auth_schema', NULL,
        jsonb_build_object('migration','29','tables_added', 3, 'phase','2.6'));

COMMIT;

-- Verification
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename IN ('user_profiles','sarah_goals','sarah_reflections')
ORDER BY tablename;
