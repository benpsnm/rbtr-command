-- ═══════════════════════════════════════════════════════════════════════════
-- RBTR · Daily Briefs + Evening Reflections
-- Idempotent. Paste into Supabase SQL editor.
-- Pairs with: api/jarvis.js (brief persistence), UI evening reflection form.
-- ═══════════════════════════════════════════════════════════════════════════

-- Note: gen_random_uuid() requires pgcrypto (already enabled on Supabase by default).
-- If you ever see "function gen_random_uuid() does not exist": CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS daily_briefs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_date           DATE NOT NULL UNIQUE,
  generated_at         TIMESTAMPTZ DEFAULT NOW(),
  script_text          TEXT NOT NULL,
  script_word_count    INTEGER,
  audio_url            TEXT,                         -- Supabase Storage URL
  audio_duration_secs  INTEGER,
  delivery_status      TEXT DEFAULT 'pending',
  -- pending | generating | rendered | delivered | failed
  whatsapp_message_id  TEXT,
  delivered_at         TIMESTAMPTZ,
  listened_to_at       TIMESTAMPTZ,
  data_sources_used    JSONB,
  error_message        TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evening_reflections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reflection_date       DATE NOT NULL UNIQUE,
  mood_score            INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  one_line_reflection   TEXT,
  tomorrow_priority     TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes that matter
CREATE INDEX IF NOT EXISTS idx_daily_briefs_date   ON daily_briefs(brief_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_status ON daily_briefs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_evening_ref_date    ON evening_reflections(reflection_date DESC);

-- Classification tags (see CLASSIFICATION-POLICY.md)
COMMENT ON TABLE daily_briefs         IS 'CLASSIFICATION: INTERNAL — Rocko morning briefing script + audio + delivery trail.';
COMMENT ON TABLE evening_reflections  IS 'CLASSIFICATION: INTERNAL — Ben''s end-of-day mood + one-line reflection + tomorrow''s priority.';

-- RLS on by default — Netlify/Vercel function uses service_role, bypasses RLS.
-- Browser never touches these directly.
ALTER TABLE daily_briefs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE evening_reflections  ENABLE ROW LEVEL SECURITY;

-- Handy view: streak of completed evening reflections (for a wellness badge)
CREATE OR REPLACE VIEW evening_reflection_streak AS
WITH dated AS (
  SELECT reflection_date,
         reflection_date - (ROW_NUMBER() OVER (ORDER BY reflection_date))::int AS grp
  FROM evening_reflections
)
SELECT MAX(reflection_date) AS last_date,
       COUNT(*) AS streak_length
FROM dated
GROUP BY grp
ORDER BY last_date DESC
LIMIT 1;

COMMENT ON VIEW evening_reflection_streak IS 'CLASSIFICATION: INTERNAL — current evening reflection streak.';

-- Quick sanity:
-- SELECT * FROM jarvis_classification_overview WHERE table_name IN ('daily_briefs','evening_reflections');
