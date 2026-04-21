-- ===========================================================================
-- RBTR · Legal / structural pathway tracking
--
-- Three related but separate structural tracks Ben is navigating:
--   1. APA signing      — asset purchase / protection agreement
--   2. Axel Brothers    — corporate structure confirmation
--   3. Guy Sharron      — legal negotiation pathway (audience-threshold gated)
--
-- All three feed ROCKO's morning brief via briefing-data.js. All three are
-- LEGAL_SENSITIVE — never quoted in outbound content. Names/details remain
-- strictly inside the Command Centre.
--
-- ASCII-safe. Idempotent.
-- ===========================================================================

-- ── APA signing status (one row, singleton) ───────────────────────────────
CREATE TABLE IF NOT EXISTS apa_status (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  signed            BOOLEAN NOT NULL DEFAULT FALSE,
  draft_reviewed    BOOLEAN DEFAULT FALSE,
  solicitor_engaged BOOLEAN DEFAULT FALSE,
  next_action       TEXT,
  next_action_at    DATE,
  signed_at         TIMESTAMPTZ,
  notes             TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);
INSERT INTO apa_status (id, signed) VALUES (1, FALSE) ON CONFLICT (id) DO NOTHING;

-- ── Axel Brothers pathway (corporate structure) ──────────────────────────
CREATE TABLE IF NOT EXISTS axel_brothers_pathway (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status           TEXT NOT NULL DEFAULT 'not_engaged',
  -- not_engaged | intro_sent | responded | meeting_booked | diligence |
  -- structure_agreed | docs_drafted | signed | closed_declined
  stage_notes      TEXT,
  audience_threshold_met BOOLEAN DEFAULT FALSE,
  next_milestone   TEXT,
  next_milestone_at DATE,
  last_contact_at  TIMESTAMPTZ,
  contact_name     TEXT,
  contact_email    TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO axel_brothers_pathway (status) VALUES ('not_engaged')
  ON CONFLICT DO NOTHING;

-- ── Guy Sharron pathway (legal negotiation) ──────────────────────────────
CREATE TABLE IF NOT EXISTS guy_sharron_pathway (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage                 TEXT NOT NULL DEFAULT 'not_engaged',
  -- not_engaged | awaiting_threshold | initial_contact | reviewing |
  -- proposal_drafted | negotiating | agreement_drafted | signed_off | closed
  audience_threshold_target INTEGER,
  -- subscribers/followers Ben needs before approach makes sense
  audience_threshold_met    BOOLEAN DEFAULT FALSE,
  next_milestone       TEXT,
  next_milestone_at    DATE,
  last_contact_at      TIMESTAMPTZ,
  contact_name         TEXT,
  contact_email        TEXT,
  contact_phone        TEXT,
  solicitor_ref        TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO guy_sharron_pathway (stage, audience_threshold_met)
  VALUES ('awaiting_threshold', FALSE)
  ON CONFLICT DO NOTHING;

-- ── Auto-update updated_at ───────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_apa_updated_at       ON apa_status;
DROP TRIGGER IF EXISTS trg_axel_updated_at      ON axel_brothers_pathway;
DROP TRIGGER IF EXISTS trg_guy_updated_at       ON guy_sharron_pathway;

CREATE TRIGGER trg_apa_updated_at  BEFORE UPDATE ON apa_status              FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();
CREATE TRIGGER trg_axel_updated_at BEFORE UPDATE ON axel_brothers_pathway   FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();
CREATE TRIGGER trg_guy_updated_at  BEFORE UPDATE ON guy_sharron_pathway     FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

-- ── Classification tags (ALL LEGAL_SENSITIVE) ────────────────────────────
COMMENT ON TABLE apa_status             IS 'CLASSIFICATION: LEGAL_SENSITIVE — APA signing status. Never mention in outbound content.';
COMMENT ON TABLE axel_brothers_pathway  IS 'CLASSIFICATION: LEGAL_SENSITIVE — corporate structure negotiation; reputational + legal risk if leaked.';
COMMENT ON TABLE guy_sharron_pathway    IS 'CLASSIFICATION: LEGAL_SENSITIVE — legal negotiation pathway; never name outside Command Centre.';

-- RLS on (service_role bypasses)
ALTER TABLE apa_status             ENABLE ROW LEVEL SECURITY;
ALTER TABLE axel_brothers_pathway  ENABLE ROW LEVEL SECURITY;
ALTER TABLE guy_sharron_pathway    ENABLE ROW LEVEL SECURITY;

-- Sanity:
--   SELECT * FROM apa_status;
--   SELECT status, next_milestone FROM axel_brothers_pathway;
--   SELECT stage, audience_threshold_met, audience_threshold_target FROM guy_sharron_pathway;
