-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 26 · Drop NOT NULL on legacy jarvis_conversations.user_msg /
-- assistant_msg so the ROCKO Max per-turn write path doesn't fail.
--
-- Migration 9 defined jarvis_conversations with { user_msg, assistant_msg }
-- as the shape (one row per exchange). Migration 25 added per-turn columns
-- (role + content, one row per message). Both shapes coexist, but legacy
-- NOT NULL constraints block the new shape. This drops those constraints.
-- No data loss — columns stay; they just become nullable.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='jarvis_conversations' AND column_name='user_msg'
  ) THEN
    EXECUTE 'ALTER TABLE jarvis_conversations ALTER COLUMN user_msg DROP NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='jarvis_conversations' AND column_name='assistant_msg'
  ) THEN
    EXECUTE 'ALTER TABLE jarvis_conversations ALTER COLUMN assistant_msg DROP NOT NULL';
  END IF;
END $$;

COMMIT;

-- Verification — list current NOT NULL columns on jarvis_conversations
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='jarvis_conversations'
ORDER BY ordinal_position;
