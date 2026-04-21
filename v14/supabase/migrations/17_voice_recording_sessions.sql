-- ===========================================================================
-- RBTR · Voice cloning pipeline
-- Ben and Sarah record audio samples; they get uploaded to Storage; optionally
-- piped to ElevenLabs to create custom voice clones.
-- ASCII-safe. Idempotent.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS voice_recording_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person                  TEXT NOT NULL CHECK (person IN ('ben','sarah')),
  session_date            DATE DEFAULT CURRENT_DATE,
  script_used             TEXT,
  script_title            TEXT,
  audio_url               TEXT,          -- public URL in Storage bucket voice-samples
  storage_path            TEXT,          -- bucket-relative path
  duration_secs           INTEGER,
  file_size_bytes         INTEGER,
  quality_notes           TEXT,
  uploaded_to_elevenlabs  BOOLEAN DEFAULT FALSE,
  elevenlabs_voice_id     TEXT,
  elevenlabs_voice_name   TEXT,
  cloned_at               TIMESTAMPTZ,
  is_active_voice         BOOLEAN DEFAULT FALSE,   -- the one ROCKO currently reads briefs in
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vrs_person_date ON voice_recording_sessions(person, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_vrs_active      ON voice_recording_sessions(is_active_voice) WHERE is_active_voice = TRUE;

COMMENT ON TABLE voice_recording_sessions IS 'CLASSIFICATION: INTERNAL — voice samples + ElevenLabs clone refs';

ALTER TABLE voice_recording_sessions ENABLE ROW LEVEL SECURITY;

-- ── Storage bucket for raw audio samples ──────────────────────────────────
-- Private bucket (not public like daily-briefs) because these are personal voice
-- prints and we don't want them scrapable even via obscure URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-samples',
  'voice-samples',
  false,                          -- private
  25 * 1024 * 1024,               -- 25 MB cap per clip
  ARRAY['audio/mpeg','audio/mp3','audio/webm','audio/wav','audio/mp4','audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Only service_role can read/write this bucket. No public SELECT policy.
-- (Clients go through /api/voice-upload and receive signed URLs from /api/voice-play.)
DROP POLICY IF EXISTS "service role write voice-samples" ON storage.objects;
DROP POLICY IF EXISTS "service role read voice-samples"  ON storage.objects;
-- (both are implicit via service_role; explicit policies here only if we
--  wanted scoped anon access, which we don't.)

-- Sanity:
--   SELECT person, count(*), bool_or(is_active_voice) AS has_active
--   FROM voice_recording_sessions GROUP BY person;
