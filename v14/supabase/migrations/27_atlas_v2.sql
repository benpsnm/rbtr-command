-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 27 · Atlas v2 · PSNM survival engine
--
-- Tables:
--   psnm_offer_config        — Grand Slam Offer versions
--   psnm_call_scripts        — call scripts per type/tier
--   atlas_daily_actions      — today's queue, Ben taps to complete
--   psnm_cash_log            — PSNM business balance over time
--   personal_cash_log        — Ben's personal cash over time
--   rbtr_fund_log            — RBTR build fund over time
--   personal_priorities      — Ben's gate closures / asset sales
--
-- Column additions to psnm_outreach_targets:
--   is_dream20, ranking_reason, decision_maker_name/role/linkedin,
--   quality_score, research_notes, current_touch_count,
--   hot_flag, hot_flag_reason
--
-- All tables INTERNAL classification, RLS service-role only.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── psnm_outreach_targets column additions ─────────────────────────────────
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS is_dream20 BOOLEAN DEFAULT FALSE;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS ranking_reason TEXT;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS decision_maker_name TEXT;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS decision_maker_role TEXT;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS decision_maker_linkedin TEXT;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS quality_score INTEGER;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS research_notes JSONB;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS current_touch_count INTEGER DEFAULT 0;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS hot_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS hot_flag_reason TEXT;

-- ── Grand Slam Offer config (singleton active row) ─────────────────────────
CREATE TABLE IF NOT EXISTS psnm_offer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  offer_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE psnm_offer_config IS 'CLASSIFICATION: INTERNAL';

-- Seed default Grand Slam Offer v1
INSERT INTO psnm_offer_config (version, active, offer_json)
SELECT 1, TRUE, jsonb_build_object(
  'headline',          'First month free. No deposit. No contract. Cancel any time.',
  'dream_outcome',     'Your overflow stock stored, tracked, accessible 24/7 — off your premises, off your headcount, off your mind.',
  'perceived_likelihood', 'First month free. See it work. If pallet access isn''t faster than your current warehouse, we refund everything and help you find somewhere better.',
  'time_effort',       'Pallets collected from you within 48 hours. Monthly rolling. 14 days'' notice to cancel. Zero paperwork to start.',
  'risk_reversal',     'We take the risk, not you. Free first month. No deposit. Walk away any time in month 2.',
  'rate_tiers', jsonb_build_array(
    jsonb_build_object('range_max', 50,  'rate_per_pallet_week', 4.00),
    jsonb_build_object('range_max', 200, 'rate_per_pallet_week', 3.50),
    jsonb_build_object('range_max', null, 'rate_per_pallet_week', 3.00)
  )
)
WHERE NOT EXISTS (SELECT 1 FROM psnm_offer_config WHERE active = TRUE);

-- ── Call scripts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS psnm_call_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_type TEXT NOT NULL,
  tier TEXT DEFAULT 'standard',
  script_cues JSONB,
  objection_handlers JSONB,
  closing_question TEXT,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE psnm_call_scripts IS 'CLASSIFICATION: INTERNAL';

-- Seed default cold-call script (decision maker, first conversation)
INSERT INTO psnm_call_scripts (script_type, tier, script_cues, objection_handlers, closing_question, version, active)
SELECT 'cold_call_first', 'standard',
  jsonb_build_array(
    'Is this {{contact_first_name}}?',
    'Ben from Pallet Storage Near Me, Hellaby.',
    'Have you got 30 seconds?',
    '1,602 pallet spaces in Hellaby, 24/7 access, first month free.',
    'Twenty minutes from you.',
    'Do you ever run out of warehouse space, or you sorted?'
  ),
  jsonb_build_array(
    jsonb_build_object('objection','We''re sorted',        'response','Fair enough. Can I ask — who do you use currently? Any issues with them?'),
    jsonb_build_object('objection','Sometimes we need overflow','response','Perfect — that''s exactly who I built this for. Could I swing by yours this week for 10 minutes, show you photos?'),
    jsonb_build_object('objection','We don''t need storage','response','Fair — most people say that until peak season. I''ll leave my number. If it comes up, you know where I am.'),
    jsonb_build_object('objection','Too expensive',        'response','What are you paying now? I''m £4/pallet/week, first month free — send me one pallet as a trial, see if I save you money.'),
    jsonb_build_object('objection','Send me a quote',      'response','Happy to. Can I ask — how many pallets, what goods, starting when? So I send the real quote, not a generic one.')
  ),
  'When are you free to pop over to Hellaby this week? 20 minutes, I''ll show you round.', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM psnm_call_scripts WHERE script_type='cold_call_first' AND tier='standard' AND active=TRUE);

-- Seed Dream 20 variant (same structure, deeper personalisation cue)
INSERT INTO psnm_call_scripts (script_type, tier, script_cues, objection_handlers, closing_question, version, active)
SELECT 'cold_call_first', 'dream20',
  jsonb_build_array(
    'Is this {{contact_first_name}}?',
    'Ben from Pallet Storage Near Me, Hellaby. We haven''t spoken before.',
    '30 seconds?',
    'Saw your {{specific_recent_signal}} — thought I''d contact you directly.',
    '700 spaces in Hellaby, 24/7, first month free. Twenty minutes from you.',
    'How''s overflow going for you at the moment?'
  ),
  jsonb_build_array(
    jsonb_build_object('objection','We''re sorted',    'response','Who are you using? [listen] Any issues? [probe for weakness]'),
    jsonb_build_object('objection','Too expensive',    'response','What rate are you on? [listen] I''ll match or beat it, first month free — what''s the risk?'),
    jsonb_build_object('objection','Send me a quote',  'response','Happy to — better yet, can you pop over for 20 minutes? I''ll show you the unit, quote face to face, you''ll know today.')
  ),
  'Which afternoon this week works for a 20-minute site visit?', 1, TRUE
WHERE NOT EXISTS (SELECT 1 FROM psnm_call_scripts WHERE script_type='cold_call_first' AND tier='dream20' AND active=TRUE);

-- ── Daily actions queue ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atlas_daily_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_date DATE DEFAULT CURRENT_DATE,
  action_order INTEGER,
  target_id UUID REFERENCES psnm_outreach_targets(id),
  action_type TEXT CHECK (action_type IN (
    'send_email','make_call','follow_up_call','send_quote',
    'book_site_visit','physical_letter','linkedin_message',
    'linkedin_connection','drop_in_visit','send_whatsapp','handle_reply'
  )),
  action_label TEXT NOT NULL,
  action_payload JSONB,
  estimated_minutes INTEGER,
  priority_rank INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','done','skipped','rescheduled')),
  completed_at TIMESTAMPTZ,
  outcome_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE atlas_daily_actions IS 'CLASSIFICATION: INTERNAL';
CREATE INDEX IF NOT EXISTS idx_atlas_daily_actions_date ON atlas_daily_actions (action_date, priority_rank);

-- ── Cash logs — three separate entities, never commingled ──────────────────
CREATE TABLE IF NOT EXISTS psnm_cash_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  balance_gbp NUMERIC NOT NULL,
  source TEXT CHECK (source IN ('manual','bank_feed')),
  note TEXT
);
COMMENT ON TABLE psnm_cash_log IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS personal_cash_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  balance_gbp NUMERIC NOT NULL,
  source TEXT CHECK (source IN ('manual','bank_feed')),
  note TEXT
);
COMMENT ON TABLE personal_cash_log IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS rbtr_fund_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  balance_gbp NUMERIC NOT NULL,
  source TEXT CHECK (source IN ('manual','bank_feed')),
  note TEXT
);
COMMENT ON TABLE rbtr_fund_log IS 'CLASSIFICATION: INTERNAL';

-- ── Personal priorities (Gate closures, ad-hoc sales, consultancy hours) ───
CREATE TABLE IF NOT EXISTS personal_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  category TEXT CHECK (category IN ('gate','sale','consultancy','admin')),
  cash_potential_gbp NUMERIC,
  effort_hours NUMERIC,
  deadline DATE,
  status TEXT DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
COMMENT ON TABLE personal_priorities IS 'CLASSIFICATION: INTERNAL';

-- ── RLS enable + policies ──────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'psnm_offer_config','psnm_call_scripts','atlas_daily_actions',
    'psnm_cash_log','personal_cash_log','rbtr_fund_log','personal_priorities'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_service_role', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO public USING (auth.role() = ''service_role'')', t || '_service_role', t);
  END LOOP;
END $$;

-- ── Audit ──────────────────────────────────────────────────────────────────
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES ('atlas_v2_schema', NULL,
        jsonb_build_object('migration','27','tables_added', 7, 'columns_added_on_psnm_outreach_targets', 10));

COMMIT;

-- Verification — list new tables + anon RLS check
SELECT tablename FROM pg_tables
WHERE schemaname='public'
  AND tablename IN ('psnm_offer_config','psnm_call_scripts','atlas_daily_actions',
                    'psnm_cash_log','personal_cash_log','rbtr_fund_log','personal_priorities')
ORDER BY tablename;

SET LOCAL ROLE anon;
SELECT 'psnm_cash_log'      AS tbl, COUNT(*) AS anon_visible FROM psnm_cash_log UNION ALL
SELECT 'personal_cash_log',   COUNT(*) FROM personal_cash_log UNION ALL
SELECT 'rbtr_fund_log',       COUNT(*) FROM rbtr_fund_log UNION ALL
SELECT 'atlas_daily_actions', COUNT(*) FROM atlas_daily_actions UNION ALL
SELECT 'personal_priorities', COUNT(*) FROM personal_priorities UNION ALL
SELECT 'psnm_offer_config',   COUNT(*) FROM psnm_offer_config UNION ALL
SELECT 'psnm_call_scripts',   COUNT(*) FROM psnm_call_scripts;
RESET ROLE;
