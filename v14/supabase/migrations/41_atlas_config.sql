-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 41 · psnm_atlas_config
-- Single-row config table for Atlas v2 generation settings.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS psnm_atlas_config (
  id                  TEXT PRIMARY KEY DEFAULT 'main',
  daily_send_limit    INTEGER DEFAULT 50,
  paused              BOOLEAN DEFAULT FALSE,
  tone_mix            TEXT DEFAULT 'balanced'
                        CHECK (tone_mix IN ('warm','balanced','direct','aggressive')),
  territory_filter    TEXT[] DEFAULT ARRAY['S Yorkshire','W Yorkshire','Derbyshire','Notts'],
  service_excludes    TEXT[] DEFAULT ARRAY['hazardous','food','temperature_sensitive'],
  framework_weights   JSONB DEFAULT '{"hormozi":1.0,"storybrand":1.0,"brunson":0.8,"kennedy":1.0,"cardone":0.7,"holmes":0.6}',
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config row
INSERT INTO psnm_atlas_config (id) VALUES ('main')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE psnm_atlas_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atlas_config_service_role" ON psnm_atlas_config;
CREATE POLICY "atlas_config_service_role"
  ON psnm_atlas_config FOR ALL TO public
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "atlas_config_anon_read" ON psnm_atlas_config;
CREATE POLICY "atlas_config_anon_read"
  ON psnm_atlas_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "atlas_config_anon_update" ON psnm_atlas_config;
CREATE POLICY "atlas_config_anon_update"
  ON psnm_atlas_config FOR UPDATE USING (true);

COMMIT;
