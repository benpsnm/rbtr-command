-- ===========================================================================
-- RBTR · Resurrection Days tracker (Module I)
-- 30-day Instagram + YouTube rebuild protocol.
-- Two tables + seed data.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS resurrection_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number     INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  platform       TEXT NOT NULL CHECK (platform IN ('instagram','youtube')),
  date_actual    DATE,
  tasks          JSONB NOT NULL,
  -- shape: [{"id":"scout_feed","label":"...","completed":false,"notes":""}]
  time_spent_mins INTEGER,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day_number, platform)
);
CREATE INDEX IF NOT EXISTS idx_res_day_platform ON resurrection_log(day_number, platform);

CREATE TABLE IF NOT EXISTS platform_baselines (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform       TEXT NOT NULL,
  recorded_date  DATE NOT NULL,
  followers      INTEGER,
  reach_7d       INTEGER,
  engagement_rate NUMERIC,
  views_7d       INTEGER,
  watch_hours_7d NUMERIC,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (platform, recorded_date)
);

DROP TRIGGER IF EXISTS trg_res_updated_at ON resurrection_log;
CREATE TRIGGER trg_res_updated_at BEFORE UPDATE ON resurrection_log FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE resurrection_log    IS 'CLASSIFICATION: INTERNAL';
COMMENT ON TABLE platform_baselines  IS 'CLASSIFICATION: INTERNAL';

ALTER TABLE resurrection_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_baselines ENABLE ROW LEVEL SECURITY;

-- Seed Day 1-30 with default task arrays per platform (Ben can tick off,
-- edit notes, log time). This matches the Week 1 Checklist PDF pattern.
-- Week 1 (1-7): audit + close-friends soft launch
-- Week 2 (8-14): close-friends content trial, tone + hook testing
-- Week 3 (15-21): public announcement + daily content
-- Week 4 (22-30): daily cadence, measure + refine

-- Helper to seed a row
DO $$
DECLARE
  ig_tasks JSONB;
  yt_tasks JSONB;
  d INTEGER;
  week INTEGER;
BEGIN
  FOR d IN 1..30 LOOP
    week := CEIL(d::numeric / 7);
    -- Compose default tasks — same pattern per week, per platform
    IF week = 1 THEN
      ig_tasks := '[
        {"id":"audit_profile","label":"Audit profile: bio, highlights, pinned","completed":false},
        {"id":"archive_orphans","label":"Archive off-brand posts","completed":false},
        {"id":"close_friends_list","label":"Curate Close Friends list (trusted circle)","completed":false},
        {"id":"draft_soft_story","label":"Draft 1× soft Close-Friends-only story","completed":false},
        {"id":"observe_competitors","label":"Observe 3 comparable creators: format + cadence","completed":false}
      ]'::jsonb;
      yt_tasks := '[
        {"id":"audit_channel","label":"Audit channel: banner, about, playlists, pinned","completed":false},
        {"id":"unlist_legacy","label":"Unlist any legacy / off-brand videos","completed":false},
        {"id":"channel_trailer_plan","label":"Outline new channel trailer (60-90s)","completed":false},
        {"id":"playlists_structure","label":"Plan 4-6 playlists matching 2027 expedition structure","completed":false},
        {"id":"analytics_baseline","label":"Screenshot current analytics for baseline","completed":false}
      ]'::jsonb;
    ELSIF week = 2 THEN
      ig_tasks := '[
        {"id":"cf_story","label":"Post 1 Close-Friends story","completed":false},
        {"id":"cf_feedback","label":"Ask 3 CF members for honest tone feedback","completed":false},
        {"id":"post_draft","label":"Draft 1 feed post for public (don''t publish yet)","completed":false}
      ]'::jsonb;
      yt_tasks := '[
        {"id":"unlisted_test","label":"Upload 1 unlisted video (build clip, 60s)","completed":false},
        {"id":"thumbnail_test","label":"Test 2 thumbnail variants with CF","completed":false},
        {"id":"script_announce","label":"Draft announcement video script","completed":false}
      ]'::jsonb;
    ELSIF week = 3 THEN
      ig_tasks := '[
        {"id":"public_post","label":"Publish first public post (announcement)","completed":false},
        {"id":"respond_comments","label":"Respond to every comment in first 2h","completed":false},
        {"id":"story_daily","label":"Post 1 story today","completed":false}
      ]'::jsonb;
      yt_tasks := '[
        {"id":"announce_video","label":"Publish announcement video","completed":false},
        {"id":"pin_comment","label":"Pin a welcome comment with context","completed":false},
        {"id":"community_post","label":"Post in Community tab","completed":false}
      ]'::jsonb;
    ELSE
      ig_tasks := '[
        {"id":"daily_content","label":"Post 1 feed OR 1 reel","completed":false},
        {"id":"daily_story","label":"Post 1-2 stories","completed":false},
        {"id":"daily_engage","label":"Reply + comment on 5 peer accounts","completed":false}
      ]'::jsonb;
      yt_tasks := '[
        {"id":"short_or_video","label":"Publish 1 Short or work on long-form","completed":false},
        {"id":"respond_comments","label":"Respond to every comment within 24h","completed":false},
        {"id":"analytics_scan","label":"Check retention + CTR of last 3 uploads","completed":false}
      ]'::jsonb;
    END IF;

    INSERT INTO resurrection_log (day_number, platform, tasks)
    VALUES (d, 'instagram', ig_tasks)
    ON CONFLICT (day_number, platform) DO NOTHING;

    INSERT INTO resurrection_log (day_number, platform, tasks)
    VALUES (d, 'youtube', yt_tasks)
    ON CONFLICT (day_number, platform) DO NOTHING;
  END LOOP;
END $$;

-- Sanity:
--   SELECT COUNT(*) FROM resurrection_log;  -- expect 60
