-- ===========================================================================
-- RBTR · Supabase Storage bucket for daily brief audio
-- ASCII-safe. Idempotent. Safe to re-run.
-- NOTE: usually you do NOT need to run this manually — /api/init-storage
-- creates the bucket via the Storage REST API. This SQL is the same idea
-- expressed in pure SQL for completeness.
-- ===========================================================================

-- 1. Create the bucket (or update its settings if it exists).
-- public = true means anyone with the URL can listen. URLs include the
-- date-based filename which is predictable, so consider this "soft privacy".
-- For stronger privacy, set public = false and use signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'daily-briefs',
  'daily-briefs',
  true,
  10485760,                              -- 10 MB cap per file
  ARRAY['audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public             = EXCLUDED.public;

-- 2. Drop any prior policies with our names so the re-run is clean.
DROP POLICY IF EXISTS "public read on daily-briefs"          ON storage.objects;
DROP POLICY IF EXISTS "service role write on daily-briefs"   ON storage.objects;

-- 3. Public read policy — anyone can GET an object in this bucket.
CREATE POLICY "public read on daily-briefs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'daily-briefs');

-- 4. Service role (used by Vercel function) writes — explicit policy
-- (service_role bypasses RLS by default, but this documents intent).
CREATE POLICY "service role write on daily-briefs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'daily-briefs');

-- Sanity check after running:
--   SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'daily-briefs';
--   SELECT polname FROM pg_policy WHERE polrelid = 'storage.objects'::regclass;
