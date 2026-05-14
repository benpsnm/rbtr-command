-- Migration 071: User Voices (ElevenLabs Voice Cloning)
-- Created: 2026-05-14
-- Purpose: Store cloned voice IDs for Ben + Sarah custom Rocko voices

CREATE TABLE IF NOT EXISTS user_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- 'ben' or 'sarah'
  voice_id TEXT NOT NULL, -- ElevenLabs voice_id
  voice_name TEXT NOT NULL,
  sample_audio_url TEXT, -- Optional: URL to sample audio in Supabase Storage
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_voices_user ON user_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_voices_active ON user_voices(user_id, is_active) WHERE is_active = true;

-- Unique constraint: only one active voice per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_voices_active_unique ON user_voices(user_id) WHERE is_active = true;

-- RLS Policies
ALTER TABLE user_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_voices_select_own ON user_voices
  FOR SELECT
  USING (true); -- Allow all to read (needed for Rocko TTS lookup)

CREATE POLICY user_voices_insert_own ON user_voices
  FOR INSERT
  WITH CHECK (user_id IN ('ben', 'sarah')); -- Only ben/sarah can insert

CREATE POLICY user_voices_update_own ON user_voices
  FOR UPDATE
  USING (user_id IN ('ben', 'sarah'));

-- Updated timestamp trigger
CREATE TRIGGER user_voices_updated_at
  BEFORE UPDATE ON user_voices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
