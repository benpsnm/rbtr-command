-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 schema reconciliation — additive only, no drops.
-- Executes Appendix A (v3 spec, 29 canonical tables) as a superset migration:
--   • 4 renames (apa_status / axel_brothers_status / debt_line_consultation /
--     guy_sharron_pathway → legal_* prefix)
--   • ADD COLUMN IF NOT EXISTS for every target column on kept tables
--   • CREATE TABLE IF NOT EXISTS for the 7 net-new tables
--   • RLS enabled on every public table + service-role policies
--   • Orphans (jarvis_*, content_pieces, audience_latest, axel_brothers_pathway,
--     etc.) logged to reconciliation_audit — NEVER dropped, they're load-bearing
--     for the existing front end + Telegram delivery + Built Dad counter.
--
-- After this runs, the final test block verifies RLS by switching to the
-- anon role and confirming all 4 legal_* tables return zero rows.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 0. reconciliation_audit (must exist before we log to it) ────────────────
CREATE TABLE IF NOT EXISTS reconciliation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE reconciliation_audit IS 'CLASSIFICATION: INTERNAL';

INSERT INTO reconciliation_audit (action, table_name, details)
VALUES ('phase1_start', NULL,
        jsonb_build_object('started_at', NOW(), 'spec_version', 'v3.0', 'plan', 'additive_only'));

-- ── 1. LEGAL TABLE RENAMES (conditional, idempotent) ────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='apa_status')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='legal_apa_status') THEN
    EXECUTE 'ALTER TABLE apa_status RENAME TO legal_apa_status';
    INSERT INTO reconciliation_audit(action, table_name, details)
    VALUES ('rename', 'apa_status', jsonb_build_object('to', 'legal_apa_status'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='axel_brothers_status')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='legal_axel_brothers_status') THEN
    EXECUTE 'ALTER TABLE axel_brothers_status RENAME TO legal_axel_brothers_status';
    INSERT INTO reconciliation_audit(action, table_name, details)
    VALUES ('rename', 'axel_brothers_status', jsonb_build_object('to', 'legal_axel_brothers_status'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='debt_line_consultation')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='legal_debt_line_consultation') THEN
    EXECUTE 'ALTER TABLE debt_line_consultation RENAME TO legal_debt_line_consultation';
    INSERT INTO reconciliation_audit(action, table_name, details)
    VALUES ('rename', 'debt_line_consultation', jsonb_build_object('to', 'legal_debt_line_consultation'));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='guy_sharron_pathway')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='legal_guy_sharron_pathway') THEN
    EXECUTE 'ALTER TABLE guy_sharron_pathway RENAME TO legal_guy_sharron_pathway';
    INSERT INTO reconciliation_audit(action, table_name, details)
    VALUES ('rename', 'guy_sharron_pathway', jsonb_build_object('to', 'legal_guy_sharron_pathway'));
  END IF;
END $$;

-- ── 2. ADD COLUMN IF NOT EXISTS on kept/renamed tables to match Appendix A ──

-- sponsor_targets
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS touch_mode TEXT DEFAULT 'approve';
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS deal_type TEXT;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS deal_value_gbp NUMERIC;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS deal_signed_at TIMESTAMPTZ;
ALTER TABLE sponsor_targets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON TABLE sponsor_targets IS 'CLASSIFICATION: PUBLIC';

-- build_bible_sections
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS content_v1_0 TEXT;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS content_v1_1 TEXT;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS content_v1_2 TEXT;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS featured_sponsor_ids UUID[] DEFAULT '{}';
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS estimated_start_date DATE;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS estimated_complete_date DATE;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS actual_complete_date DATE;
ALTER TABLE build_bible_sections ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON TABLE build_bible_sections IS 'CLASSIFICATION: SPONSOR_VISIBLE';

-- build_progress_updates
ALTER TABLE build_progress_updates ADD COLUMN IF NOT EXISTS progress_percent_before INTEGER;
ALTER TABLE build_progress_updates ADD COLUMN IF NOT EXISTS progress_percent_after INTEGER;
ALTER TABLE build_progress_updates ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE build_progress_updates ADD COLUMN IF NOT EXISTS hours_worked NUMERIC;
ALTER TABLE build_progress_updates ADD COLUMN IF NOT EXISTS costs_incurred_gbp NUMERIC;
ALTER TABLE build_progress_updates ADD COLUMN IF NOT EXISTS visible_to_sponsors BOOLEAN DEFAULT TRUE;
COMMENT ON TABLE build_progress_updates IS 'CLASSIFICATION: SPONSOR_VISIBLE';

-- audience_snapshots
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS youtube_subscribers INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS youtube_views_30d INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS youtube_watch_hours_30d NUMERIC DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS instagram_followers INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS instagram_reach_30d INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS instagram_engagement_rate NUMERIC DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS tiktok_followers INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS tiktok_views_30d INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS linkedin_followers INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS linkedin_impressions_30d INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS email_subscribers INTEGER DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS email_open_rate NUMERIC DEFAULT 0;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS audience_demographics JSONB;
ALTER TABLE audience_snapshots ADD COLUMN IF NOT EXISTS top_performing_content JSONB;
COMMENT ON TABLE audience_snapshots IS 'CLASSIFICATION: SPONSOR_VISIBLE';

-- daily_briefs
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS script_word_count INTEGER;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS audio_duration_secs INTEGER;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS delivery_channel TEXT;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS delivery_message_id TEXT;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS listened_to_at TIMESTAMPTZ;
ALTER TABLE daily_briefs ADD COLUMN IF NOT EXISTS error_message TEXT;
COMMENT ON TABLE daily_briefs IS 'CLASSIFICATION: INTERNAL';

-- evening_reflections (v3 spec is simple: mood + one_line + tomorrow_priority)
ALTER TABLE evening_reflections ADD COLUMN IF NOT EXISTS mood_score INTEGER;
ALTER TABLE evening_reflections ADD COLUMN IF NOT EXISTS one_line TEXT;
ALTER TABLE evening_reflections ADD COLUMN IF NOT EXISTS tomorrow_priority TEXT;
COMMENT ON TABLE evening_reflections IS 'CLASSIFICATION: INTERNAL';

-- psnm_enquiries
ALTER TABLE psnm_enquiries ADD COLUMN IF NOT EXISTS quoted_rate_gbp NUMERIC;
ALTER TABLE psnm_enquiries ADD COLUMN IF NOT EXISTS estimated_monthly_revenue_gbp NUMERIC;
COMMENT ON TABLE psnm_enquiries IS 'CLASSIFICATION: INTERNAL';

-- psnm_customers
ALTER TABLE psnm_customers ADD COLUMN IF NOT EXISTS company_registration_number TEXT;
ALTER TABLE psnm_customers ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE psnm_customers ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'net_30';
COMMENT ON TABLE psnm_customers IS 'CLASSIFICATION: INTERNAL';

-- psnm_occupancy_snapshots — alignment columns
ALTER TABLE psnm_occupancy_snapshots ADD COLUMN IF NOT EXISTS total_capacity INTEGER DEFAULT 700;
ALTER TABLE psnm_occupancy_snapshots ADD COLUMN IF NOT EXISTS monthly_revenue_current_gbp NUMERIC;
ALTER TABLE psnm_occupancy_snapshots ADD COLUMN IF NOT EXISTS break_even_pallets INTEGER DEFAULT 827;
COMMENT ON TABLE psnm_occupancy_snapshots IS 'CLASSIFICATION: INTERNAL';

-- psnm_invoices
COMMENT ON TABLE psnm_invoices IS 'CLASSIFICATION: LEGAL_SENSITIVE';

-- psnm_outreach_targets
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS distance_miles NUMERIC;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS estimated_pallet_need INTEGER;
ALTER TABLE psnm_outreach_targets ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 50;
COMMENT ON TABLE psnm_outreach_targets IS 'CLASSIFICATION: INTERNAL';

-- voice_recording_sessions
ALTER TABLE voice_recording_sessions ADD COLUMN IF NOT EXISTS script_id TEXT;
ALTER TABLE voice_recording_sessions ADD COLUMN IF NOT EXISTS duration_secs INTEGER;
ALTER TABLE voice_recording_sessions ADD COLUMN IF NOT EXISTS quality_notes TEXT;
ALTER TABLE voice_recording_sessions ADD COLUMN IF NOT EXISTS uploaded_to_elevenlabs BOOLEAN DEFAULT FALSE;
ALTER TABLE voice_recording_sessions ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT;
COMMENT ON TABLE voice_recording_sessions IS 'CLASSIFICATION: INTERNAL';

-- Contacts / intelligence / proposals tables (classification-only)
COMMENT ON TABLE sponsor_contacts IS 'CLASSIFICATION: INTERNAL';
COMMENT ON TABLE sponsor_intelligence_reports IS 'CLASSIFICATION: INTERNAL';

-- platform_baselines + resurrection_log (classification only, they exist from mig 23)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='platform_baselines') THEN
    EXECUTE 'COMMENT ON TABLE platform_baselines IS ''CLASSIFICATION: INTERNAL''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='resurrection_log') THEN
    EXECUTE 'COMMENT ON TABLE resurrection_log IS ''CLASSIFICATION: INTERNAL''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sponsor_touch_templates') THEN
    EXECUTE 'COMMENT ON TABLE sponsor_touch_templates IS ''CLASSIFICATION: INTERNAL''';
  END IF;
END $$;

-- Renamed legal tables — ADD COLUMN IF NOT EXISTS to reach Appendix A shape
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS parties TEXT;
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS signed_date DATE;
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE legal_apa_status ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON TABLE legal_apa_status IS 'CLASSIFICATION: LEGAL_SENSITIVE';

ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS winding_up_type TEXT;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS winding_up_started DATE;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS creditor_status_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS creditor_status_notes TEXT;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS ben_personal_exposure TEXT;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS ip_consulted BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS ip_consultation_date DATE;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS ip_name TEXT;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS apa_dependency_notes TEXT;
ALTER TABLE legal_axel_brothers_status ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON TABLE legal_axel_brothers_status IS 'CLASSIFICATION: LEGAL_SENSITIVE';

ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS consultation_booked BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS consultation_date DATE;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS consultant_name TEXT;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS consultant_firm TEXT;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS consultation_cost_gbp NUMERIC;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS outcomes_notes TEXT;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE legal_debt_line_consultation ADD COLUMN IF NOT EXISTS pre_rebrand_status TEXT;
COMMENT ON TABLE legal_debt_line_consultation IS 'CLASSIFICATION: LEGAL_SENSITIVE';

ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS current_stage INTEGER DEFAULT 1;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS stage_1_started DATE DEFAULT CURRENT_DATE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS audience_threshold_target INTEGER DEFAULT 70000;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS audience_threshold_met BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS audience_threshold_met_at DATE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_drafted BOOLEAN DEFAULT TRUE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_drafted_at DATE DEFAULT '2026-04-20';
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_content TEXT;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_physically_sealed BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_sealed_at DATE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS envelope_location TEXT;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS letter_sent_at DATE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS response_received BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS response_type TEXT;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS response_received_at DATE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS follow_up_sent_at DATE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS collaboration_agreed BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS revenue_share_percent NUMERIC;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS total_paid_gbp NUMERIC DEFAULT 0;
ALTER TABLE legal_guy_sharron_pathway ADD COLUMN IF NOT EXISTS addressed_to TEXT DEFAULT 'Guy and Sharron Martin';
COMMENT ON TABLE legal_guy_sharron_pathway IS 'CLASSIFICATION: LEGAL_SENSITIVE';

-- ── 3. NEW TABLES (7) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('build_progress','audience_proof','proposal','quarterly_update')),
  sponsor_id UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  content_id UUID,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  viewer_ip_hashed TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE share_tokens IS 'CLASSIFICATION: PUBLIC';

CREATE TABLE IF NOT EXISTS sponsor_touches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  touch_number INTEGER NOT NULL CHECK (touch_number BETWEEN 1 AND 16),
  touch_type TEXT NOT NULL,
  jab_or_hook TEXT CHECK (jab_or_hook IN ('jab','hook')),
  subject TEXT,
  body TEXT,
  tracking_url TEXT,
  deadline_text TEXT,
  scheduled_for TIMESTAMPTZ,
  approved_by_ben BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  opened_count INTEGER DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  outcome TEXT,
  next_touch_scheduled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE sponsor_touches IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS sponsor_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsor_targets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  sb7_sections JSONB NOT NULL,
  grand_slam_offer JSONB NOT NULL,
  audience_snapshot JSONB NOT NULL,
  proposed_deliverables JSONB,
  proposed_ask_gbp NUMERIC,
  risk_reversal_clause TEXT,
  pdf_url TEXT,
  share_token TEXT,
  sent_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_type TEXT CHECK (response_type IN ('accepted','counter','declined','no_response') OR response_type IS NULL),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE sponsor_proposals IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS voice_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person TEXT NOT NULL,
  elevenlabs_voice_id TEXT NOT NULL UNIQUE,
  is_active_for_brief BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);
COMMENT ON TABLE voice_clones IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS psnm_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id UUID REFERENCES psnm_enquiries(id),
  quote_number TEXT UNIQUE NOT NULL,
  pallets INTEGER,
  duration_weeks INTEGER,
  rate_per_pallet_week NUMERIC,
  container_20ft_count INTEGER DEFAULT 0,
  container_40ft_count INTEGER DEFAULT 0,
  handling_movements INTEGER DEFAULT 0,
  subtotal_gbp NUMERIC,
  vat_gbp NUMERIC,
  total_gbp NUMERIC,
  pdf_url TEXT,
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','declined','expired')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE psnm_quotes IS 'CLASSIFICATION: INTERNAL';

CREATE TABLE IF NOT EXISTS psnm_content_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT CHECK (content_type IN ('linkedin_post','gbp_update','blog_post','case_study','email_newsletter')),
  platform TEXT,
  title TEXT,
  body TEXT,
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted','cancelled')),
  posted_at TIMESTAMPTZ,
  posted_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE psnm_content_queue IS 'CLASSIFICATION: INTERNAL';

-- ── 4. SEED SINGLETON LEGAL ROWS (only if table is empty) ───────────────────

INSERT INTO legal_apa_status (document_name, parties)
SELECT 'Retrospective APA: Axel Brothers Customs Ltd → Sarah Jane Jones',
       'Axel Brothers Customs Ltd (Ben Greenwood, sole director), Sarah Jane Jones'
WHERE NOT EXISTS (SELECT 1 FROM legal_apa_status);

INSERT INTO legal_axel_brothers_status (winding_up_type)
SELECT 'TBC'
WHERE NOT EXISTS (SELECT 1 FROM legal_axel_brothers_status);

INSERT INTO legal_debt_line_consultation (consultation_booked)
SELECT FALSE
WHERE NOT EXISTS (SELECT 1 FROM legal_debt_line_consultation);

INSERT INTO legal_guy_sharron_pathway (current_stage)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM legal_guy_sharron_pathway);

-- ── 5. ENABLE RLS ON EVERY PUBLIC TABLE ─────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ── 6. CREATE POLICIES (drop-if-exists-then-create makes it idempotent) ─────

-- Helper: idempotent policy macro
CREATE OR REPLACE FUNCTION _rbtr_ensure_service_role_policy(tbl TEXT) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=tbl) THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_service_role', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO public USING (auth.role() = ''service_role'')',
                   tbl || '_service_role', tbl);
  END IF;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _rbtr_ensure_anon_read_policy(tbl TEXT) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=tbl) THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_anon_read', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO public USING (true)',
                   tbl || '_anon_read', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_service_role', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO public USING (auth.role() = ''service_role'')',
                   tbl || '_service_role', tbl);
  END IF;
END $$ LANGUAGE plpgsql;

-- PUBLIC tables — anon SELECT allowed
SELECT _rbtr_ensure_anon_read_policy('sponsor_targets');
SELECT _rbtr_ensure_anon_read_policy('share_tokens');

-- SPONSOR_VISIBLE + INTERNAL + LEGAL_SENSITIVE — service_role only
SELECT _rbtr_ensure_service_role_policy('build_bible_sections');
SELECT _rbtr_ensure_service_role_policy('build_progress_updates');
SELECT _rbtr_ensure_service_role_policy('audience_snapshots');
SELECT _rbtr_ensure_service_role_policy('sponsor_contacts');
SELECT _rbtr_ensure_service_role_policy('sponsor_intelligence_reports');
SELECT _rbtr_ensure_service_role_policy('sponsor_touches');
SELECT _rbtr_ensure_service_role_policy('sponsor_touch_templates');
SELECT _rbtr_ensure_service_role_policy('sponsor_proposals');
SELECT _rbtr_ensure_service_role_policy('daily_briefs');
SELECT _rbtr_ensure_service_role_policy('evening_reflections');
SELECT _rbtr_ensure_service_role_policy('resurrection_log');
SELECT _rbtr_ensure_service_role_policy('platform_baselines');
SELECT _rbtr_ensure_service_role_policy('voice_recording_sessions');
SELECT _rbtr_ensure_service_role_policy('voice_clones');
SELECT _rbtr_ensure_service_role_policy('psnm_enquiries');
SELECT _rbtr_ensure_service_role_policy('psnm_customers');
SELECT _rbtr_ensure_service_role_policy('psnm_occupancy_snapshots');
SELECT _rbtr_ensure_service_role_policy('psnm_quotes');
SELECT _rbtr_ensure_service_role_policy('psnm_invoices');
SELECT _rbtr_ensure_service_role_policy('psnm_outreach_targets');
SELECT _rbtr_ensure_service_role_policy('psnm_outreach_touches');
SELECT _rbtr_ensure_service_role_policy('psnm_content_queue');
SELECT _rbtr_ensure_service_role_policy('reconciliation_audit');
SELECT _rbtr_ensure_service_role_policy('legal_apa_status');
SELECT _rbtr_ensure_service_role_policy('legal_axel_brothers_status');
SELECT _rbtr_ensure_service_role_policy('legal_debt_line_consultation');
SELECT _rbtr_ensure_service_role_policy('legal_guy_sharron_pathway');

-- Orphan jarvis_* + related — keep existing policies, just make sure service_role has access
SELECT _rbtr_ensure_service_role_policy('jarvis_goals');
SELECT _rbtr_ensure_service_role_policy('jarvis_accomplishments');
SELECT _rbtr_ensure_service_role_policy('jarvis_reflections');
SELECT _rbtr_ensure_service_role_policy('jarvis_learning_sessions');
SELECT _rbtr_ensure_service_role_policy('jarvis_learning_streaks');
SELECT _rbtr_ensure_service_role_policy('jarvis_tool_registry');
SELECT _rbtr_ensure_service_role_policy('jarvis_signals');
SELECT _rbtr_ensure_service_role_policy('jarvis_conversations');
SELECT _rbtr_ensure_service_role_policy('jarvis_builtdad');
SELECT _rbtr_ensure_service_role_policy('jarvis_sensitive_access_log');
SELECT _rbtr_ensure_service_role_policy('build_bible_attachments');
SELECT _rbtr_ensure_service_role_policy('content_pieces');
SELECT _rbtr_ensure_service_role_policy('axel_brothers_pathway');
SELECT _rbtr_ensure_service_role_policy('sponsor_touch_schedule');
SELECT _rbtr_ensure_service_role_policy('sponsor_hot_signals');

-- ── 7. ORPHAN FLAG SWEEP — log every current table NOT in Appendix A target ─
-- These are kept, not dropped. Ben reviews in a later pass.
DO $$
DECLARE
  target_tables TEXT[] := ARRAY[
    'sponsor_targets','sponsor_contacts','sponsor_intelligence_reports',
    'sponsor_touches','sponsor_touch_templates','sponsor_proposals',
    'build_bible_sections','build_progress_updates',
    'audience_snapshots','platform_baselines','share_tokens',
    'daily_briefs','evening_reflections','resurrection_log',
    'voice_recording_sessions','voice_clones',
    'psnm_enquiries','psnm_customers','psnm_occupancy_snapshots',
    'psnm_quotes','psnm_outreach_targets','psnm_outreach_touches','psnm_content_queue',
    'legal_apa_status','legal_axel_brothers_status',
    'legal_debt_line_consultation','legal_guy_sharron_pathway',
    'psnm_invoices','reconciliation_audit'
  ];
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> ALL(target_tables)
  LOOP
    -- Only insert if not already flagged in this run
    IF NOT EXISTS (
      SELECT 1 FROM reconciliation_audit
      WHERE action = 'orphan_flagged'
        AND table_name = t
        AND created_at > NOW() - INTERVAL '10 minutes'
    ) THEN
      INSERT INTO reconciliation_audit(action, table_name, details)
      VALUES ('orphan_flagged', t,
              jsonb_build_object('status', 'kept', 'reason', 'not in Appendix A target list; load-bearing for existing flows'));
    END IF;
  END LOOP;
END $$;

-- ── 8. FINAL AUDIT ROW ──────────────────────────────────────────────────────
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES ('phase1_complete', NULL,
        jsonb_build_object('completed_at', NOW(),
                           'target_tables', 29,
                           'approach', 'additive_superset',
                           'drops', 0));

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS VERIFICATION TEST — MUST PASS. Run after the migration above commits.
-- All four SELECTs must return zero rows when executed as the anon role.
-- ═══════════════════════════════════════════════════════════════════════════

SET ROLE anon;
SELECT 'legal_apa_status' AS tbl, CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result FROM legal_apa_status
UNION ALL
SELECT 'legal_axel_brothers_status', CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM legal_axel_brothers_status
UNION ALL
SELECT 'legal_debt_line_consultation', CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM legal_debt_line_consultation
UNION ALL
SELECT 'legal_guy_sharron_pathway', CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM legal_guy_sharron_pathway;
RESET ROLE;

-- List the orphan flags so Ben can see what's kept:
SELECT table_name, details->>'reason' AS reason
FROM reconciliation_audit
WHERE action = 'orphan_flagged'
  AND created_at > NOW() - INTERVAL '10 minutes'
ORDER BY table_name;
