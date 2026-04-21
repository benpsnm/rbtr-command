-- ===========================================================================
-- RBTR · Sponsor touch automation (Module E)
-- Tier-weighted schedules (T1:16 / T2:12 / T3:8), JAB/HOOK ratio 3:1,
-- templates per category, delivery via Mailgun/Twilio (env-configured).
-- ASCII-safe. Idempotent.
-- ===========================================================================

-- 1. Template library — reusable touch bodies indexed by (category, tier, kind)
CREATE TABLE IF NOT EXISTS sponsor_touch_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key     TEXT NOT NULL UNIQUE,     -- e.g. 'jab_email_tyres_t1_intro'
  kind             TEXT NOT NULL CHECK (kind IN ('jab','hook')),
  channel          TEXT NOT NULL CHECK (channel IN ('email','linkedin','sms','voice_note','physical_mail','phone','in_person')),
  category         TEXT NOT NULL,
  -- tyres | electrical | structural | recovery | bathroom_water |
  -- engine_suspension | safety_security_lighting | content | heating_hvac | kitchen_outdoor
  tier             INTEGER CHECK (tier IN (1,2,3)),
  subject          TEXT,
  body             TEXT NOT NULL,
  variables        JSONB,                    -- e.g. {"contact_name":"required","brand":"required"}
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stt_category_tier_kind ON sponsor_touch_templates(category, tier, kind);

-- 2. Scheduled touches — the actual playbook rows per sponsor
CREATE TABLE IF NOT EXISTS sponsor_touch_schedule (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id       UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  template_id      UUID REFERENCES sponsor_touch_templates(id) ON DELETE SET NULL,
  step_number      INTEGER NOT NULL,         -- 1..16 for T1, 1..12 for T2, 1..8 for T3
  offset_days      INTEGER NOT NULL,         -- days from activation (T+0, T+3d, etc)
  kind             TEXT NOT NULL,
  channel          TEXT NOT NULL,
  scheduled_for    TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'pending',
  -- pending | skipped | awaiting_approval | sent | delivered | opened | replied | paused | failed
  mode             TEXT NOT NULL DEFAULT 'approve',
  -- auto | approve | paused  (inherits from sponsor_targets.touch_mode; overrideable per step)
  sent_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  opened_at        TIMESTAMPTZ,
  replied_at       TIMESTAMPTZ,
  external_msg_id  TEXT,                     -- Mailgun message-id / Twilio SID
  last_error       TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sponsor_id, step_number)
);
CREATE INDEX IF NOT EXISTS idx_sts_sponsor       ON sponsor_touch_schedule(sponsor_id, step_number);
CREATE INDEX IF NOT EXISTS idx_sts_due           ON sponsor_touch_schedule(scheduled_for)  WHERE status IN ('pending','awaiting_approval');
CREATE INDEX IF NOT EXISTS idx_sts_status        ON sponsor_touch_schedule(status);

-- 3. Hot signals — detected engagement that needs human action fast
CREATE TABLE IF NOT EXISTS sponsor_hot_signals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id       UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  touch_id         UUID REFERENCES sponsor_touch_schedule(id) ON DELETE SET NULL,
  signal_type      TEXT NOT NULL,
  -- multi_open | reply_positive | link_click | web_visit | mention_social | inbound_message
  heat             TEXT NOT NULL DEFAULT 'hot',
  -- hot | warm | noise
  payload          JSONB,
  notified_at      TIMESTAMPTZ,               -- when Ben's SMS fired
  acknowledged_at  TIMESTAMPTZ,
  seen_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sig_sponsor_recent ON sponsor_hot_signals(sponsor_id, seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_sig_unack          ON sponsor_hot_signals(acknowledged_at) WHERE acknowledged_at IS NULL;

-- Triggers / comments / RLS
DROP TRIGGER IF EXISTS trg_sts_updated_at ON sponsor_touch_schedule;
CREATE TRIGGER trg_sts_updated_at BEFORE UPDATE ON sponsor_touch_schedule FOR EACH ROW EXECUTE FUNCTION _rbtr_set_updated_at();

COMMENT ON TABLE sponsor_touch_templates IS 'CLASSIFICATION: INTERNAL — outreach template library';
COMMENT ON TABLE sponsor_touch_schedule  IS 'CLASSIFICATION: INTERNAL — per-sponsor playbook + delivery log';
COMMENT ON TABLE sponsor_hot_signals     IS 'CLASSIFICATION: INTERNAL — live engagement signals';

ALTER TABLE sponsor_touch_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_touch_schedule  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_hot_signals     ENABLE ROW LEVEL SECURITY;

-- ── Tier-weighted schedule definitions (JAB=J, HOOK=H) ────────────────────
-- T1 (16 steps): T+0 J / +3d J / +7d J / +14d J / +30d J / +45d H /
--                +60d J / +90d J / +120d J / +150d H / +180d J /
--                +180d J / +210d J / +270d H / +300d J / +330d J
-- T2 (12): T+0 J / +7d J / +21d J / +45d H / +75d J / +90d J /
--          +120d H / +150d J / +210d J / +240d H / +280d J / +330d J
-- T3 (8):  T+0 J / +7d J / +30d H / +60d J / +90d H / +150d J / +210d J / +270d J

-- Helper view: what's due today / this week across all sponsors (for the brief + UI)
CREATE OR REPLACE VIEW sponsor_touches_due_week AS
SELECT s.id AS sponsor_id, s.brand_name, s.tier,
       t.step_number, t.kind, t.channel, t.scheduled_for, t.status, t.mode
FROM sponsor_touch_schedule t
JOIN sponsor_targets s ON s.id = t.sponsor_id
WHERE t.status IN ('pending','awaiting_approval')
  AND t.scheduled_for >= NOW() - INTERVAL '1 day'
  AND t.scheduled_for <= NOW() + INTERVAL '7 days'
ORDER BY t.scheduled_for;

COMMENT ON VIEW sponsor_touches_due_week IS 'CLASSIFICATION: INTERNAL — sponsor touches due today + next 7 days';
