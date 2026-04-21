-- ===========================================================================
-- RBTR · Audience snapshots + content pieces
-- Both are SPONSOR_VISIBLE — these are the numbers ROCKO quotes in sponsor
-- pitches to prove momentum. Individual post copy is fine to paraphrase;
-- never expose unpublished drafts.
-- ASCII-safe. Idempotent.
-- ===========================================================================

-- 1. Audience snapshots — one row per platform per day (typically captured
-- nightly by a cron / manual log). Ordered reads by captured_at DESC give
-- latest state + growth deltas.
CREATE TABLE IF NOT EXISTS audience_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  platform           TEXT NOT NULL,
  -- youtube | instagram | tiktok | facebook | linkedin | x | newsletter |
  -- community | website | other
  handle             TEXT,
  -- @rbtr, channel ID, etc
  total              INTEGER NOT NULL,
  -- subs/followers/members depending on platform
  daily_growth       INTEGER,
  -- diff vs yesterday (computed and stored for speed; can also be derived)
  engagement_rate    NUMERIC,
  -- percentage; platform-specific definition
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_audience_platform_date ON audience_snapshots(platform, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_audience_captured ON audience_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_audience_platform_latest ON audience_snapshots(platform, snapshot_date DESC);

-- 2. Content pieces — every published (or scheduled) piece of content
CREATE TABLE IF NOT EXISTS content_pieces (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_type         TEXT NOT NULL,
  -- video | short | reel | post | story | newsletter | podcast | blog | live
  platform           TEXT NOT NULL,
  -- youtube | instagram | tiktok | facebook | linkedin | x | newsletter | other
  title              TEXT NOT NULL,
  description        TEXT,
  script_url         TEXT,
  -- link to script doc (google doc / notion / local)
  published_url      TEXT,
  -- live URL once posted
  scheduled_for      TIMESTAMPTZ,
  published_at       TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'idea',
  -- idea | scripted | filmed | edited | scheduled | published | retired
  tags               TEXT[],
  build_section_id   UUID REFERENCES build_bible_sections(id) ON DELETE SET NULL,
  -- link to the build bible section this piece covers
  views              INTEGER,
  likes              INTEGER,
  comments           INTEGER,
  shares             INTEGER,
  watch_time_mins    INTEGER,
  revenue_gbp        NUMERIC,
  -- net revenue attributed if trackable
  sponsor_mentioned  TEXT,
  -- brand_name if a sponsor features; used to prove deliverables
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_status        ON content_pieces(status);
CREATE INDEX IF NOT EXISTS idx_content_published     ON content_pieces(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_content_scheduled     ON content_pieces(scheduled_for)    WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_content_platform      ON content_pieces(platform, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_build_section ON content_pieces(build_section_id) WHERE build_section_id IS NOT NULL;

-- Auto-update updated_at on content_pieces
DROP TRIGGER IF EXISTS trg_content_updated_at ON content_pieces;
CREATE TRIGGER trg_content_updated_at
BEFORE UPDATE ON content_pieces
FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Classification tags ────────────────────────────────────────────────────
COMMENT ON TABLE audience_snapshots IS 'CLASSIFICATION: SPONSOR_VISIBLE';
COMMENT ON TABLE content_pieces     IS 'CLASSIFICATION: SPONSOR_VISIBLE';

-- RLS on (service_role bypasses)
ALTER TABLE audience_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pieces     ENABLE ROW LEVEL SECURITY;

-- ── Helper view: latest audience per platform + 30-day growth ─────────────
CREATE OR REPLACE VIEW audience_latest AS
WITH latest AS (
  SELECT DISTINCT ON (platform) platform, handle, total, daily_growth, engagement_rate, captured_at, snapshot_date
  FROM audience_snapshots
  ORDER BY platform, snapshot_date DESC
),
thirty_day AS (
  SELECT platform, MIN(total) AS total_30d_ago
  FROM audience_snapshots
  WHERE snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY platform
)
SELECT l.platform, l.handle, l.total, l.daily_growth,
       (l.total - COALESCE(t.total_30d_ago, l.total)) AS growth_30d,
       l.engagement_rate, l.captured_at, l.snapshot_date
FROM latest l
LEFT JOIN thirty_day t ON t.platform = l.platform;

COMMENT ON VIEW audience_latest IS 'CLASSIFICATION: SPONSOR_VISIBLE — convenience view for briefing + sponsor decks';

-- Sanity:
--   SELECT * FROM audience_latest ORDER BY total DESC;
--   SELECT platform, status, COUNT(*) FROM content_pieces GROUP BY 1,2 ORDER BY 1,2;
