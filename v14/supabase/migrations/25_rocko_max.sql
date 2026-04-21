-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 25 · ROCKO Max · jarvis_conversations schema + rocko_memories
--
-- B.2 — extend jarvis_conversations with session + model tracking columns
-- B.5 — create rocko_memories table with classification + RLS
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── B.2 · jarvis_conversations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jarvis_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS tokens_in INTEGER;
ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS tokens_out INTEGER;
ALTER TABLE jarvis_conversations ADD COLUMN IF NOT EXISTS tools_called TEXT[];

CREATE INDEX IF NOT EXISTS idx_jarvis_conv_session ON jarvis_conversations (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jarvis_conv_content_ilike ON jarvis_conversations USING gin (to_tsvector('english', content));

COMMENT ON TABLE jarvis_conversations IS 'CLASSIFICATION: INTERNAL';

-- ── B.5 · rocko_memories ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rocko_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT CHECK (category IN ('fact','preference','person','ongoing','decision','rule')),
  content TEXT NOT NULL,
  source_conversation_id UUID,
  confirmed_by_ben BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  times_referenced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced_at TIMESTAMPTZ
);
COMMENT ON TABLE rocko_memories IS 'CLASSIFICATION: INTERNAL';

-- ── RLS (service role only for both, anon blocked) ─────────────────────────
ALTER TABLE jarvis_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rocko_memories        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jarvis_conversations_service_role ON jarvis_conversations;
CREATE POLICY jarvis_conversations_service_role ON jarvis_conversations FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS rocko_memories_service_role ON rocko_memories;
CREATE POLICY rocko_memories_service_role ON rocko_memories FOR ALL TO public USING (auth.role() = 'service_role');

-- ── Add to proxy allow-list reference (docs only; proxy's in-memory Set
--    already includes jarvis_conversations; rocko_memories needs adding to
--    api/supabase-proxy.js) ─────────────────────────────────────────────────

COMMIT;

-- RLS verification — anon must see zero rows from both tables.
SET LOCAL ROLE anon;
SELECT 'jarvis_conversations' AS tbl,
       (SELECT COUNT(*) FROM jarvis_conversations) AS anon_visible_count
UNION ALL
SELECT 'rocko_memories',
       (SELECT COUNT(*) FROM rocko_memories);
RESET ROLE;
