-- Migration 080: Enable RLS on 41 unprotected tables (v3.3 security hardening)
-- Date: 2026-05-18
-- Context: Supabase security advisory identified 41 tables with RLS DISABLED
-- Strategy: Enable RLS + add owner-only policies (Ben + Sarah via user_profiles.role)

-- ============================================================================
-- ENABLE RLS ON ALL 41 TABLES
-- ============================================================================

ALTER TABLE IF EXISTS public.psnmwhm_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_mood_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_nate_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_colab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_dro_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ben_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_sons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_sons_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_peanut ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_peanut_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.eternal_hours_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.eternal_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.eternal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.eternal_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.eternal_shareholder_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_job_supplier_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.house_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.psnm_warm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.psnm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.psnm_touch_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbtr_guy_martin_pathway ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbtr_build_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbtr_route_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbtr_audience_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rbtr_account_resurrection ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sarah_today_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sarah_pilates_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sarah_wellness_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sarah_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sop_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OWNER-ONLY POLICIES (Ben + Sarah via user_profiles.role IN ('owner', 'partner'))
-- ============================================================================
-- NOTE: Assumes user_profiles table exists with id (uuid, FK to auth.users)
-- and role (text, values: 'owner', 'partner', etc)
-- ============================================================================

-- Helper function to check if user is owner/partner
CREATE OR REPLACE FUNCTION public.is_owner_or_partner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('owner', 'partner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply owner-only policies to all 41 tables

-- Ben personal tables
CREATE POLICY "Owners can do anything" ON public.ben_goals FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.ben_mood_log FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.ben_notes FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.ben_nate_conversations FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.ben_colab_events FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.ben_dro_status FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.ben_tasks FOR ALL USING (is_owner_or_partner());

-- Family tables
CREATE POLICY "Owners can do anything" ON public.family_sons FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.family_sons_events FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.family_peanut FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.family_peanut_events FOR ALL USING (is_owner_or_partner());

-- Eternal Kustoms tables
CREATE POLICY "Owners can do anything" ON public.eternal_hours_log FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.eternal_estimates FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.eternal_invoices FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.eternal_builds FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.eternal_shareholder_payments FOR ALL USING (is_owner_or_partner());

-- House/FORGE tables
CREATE POLICY "Owners can do anything" ON public.house_suppliers FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.house_job_supplier_assignments FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.house_costs FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.house_bookings FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.house_inventory FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.house_compliance FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.house_message_templates FOR ALL USING (is_owner_or_partner());

-- PSNM tables
CREATE POLICY "Owners can do anything" ON public.psnm_warm_leads FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.psnm_email_templates FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.psnm_touch_schedule FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.psnmwhm_store FOR ALL USING (is_owner_or_partner());

-- RBTR tables
CREATE POLICY "Owners can do anything" ON public.rbtr_guy_martin_pathway FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.rbtr_build_log FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.rbtr_route_phases FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.rbtr_audience_snapshots FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.rbtr_account_resurrection FOR ALL USING (is_owner_or_partner());

-- Sarah personal tables
CREATE POLICY "Owners can do anything" ON public.sarah_today_log FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.sarah_pilates_progress FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.sarah_wellness_log FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.sarah_content_calendar FOR ALL USING (is_owner_or_partner());

-- Shared utility tables
CREATE POLICY "Owners can do anything" ON public.contacts FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.contact_interactions FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.sops FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.sop_executions FOR ALL USING (is_owner_or_partner());
CREATE POLICY "Owners can do anything" ON public.notifications FOR ALL USING (is_owner_or_partner());

-- ============================================================================
-- PUBLIC-READ POLICIES (for specific tables that need anon access)
-- ============================================================================
-- NOTE: Only apply to tables that genuinely need public read access
-- Most tables above are owner-only and should NOT have public read
-- ============================================================================

-- Example (uncomment if needed):
-- CREATE POLICY "Public can read SOPs" ON public.sops FOR SELECT USING (true);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after migration to verify RLS is enabled:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN (
--   'psnmwhm_store', 'ben_goals', 'ben_mood_log', 'ben_notes',
--   'ben_nate_conversations', 'ben_colab_events', 'ben_dro_status',
--   'ben_tasks', 'family_sons', 'family_sons_events', 'family_peanut',
--   'family_peanut_events', 'eternal_hours_log', 'eternal_estimates',
--   'eternal_invoices', 'eternal_builds', 'eternal_shareholder_payments',
--   'house_suppliers', 'house_job_supplier_assignments', 'house_costs',
--   'house_bookings', 'house_inventory', 'house_compliance',
--   'house_message_templates', 'psnm_warm_leads', 'psnm_email_templates',
--   'psnm_touch_schedule', 'rbtr_guy_martin_pathway', 'rbtr_build_log',
--   'rbtr_route_phases', 'rbtr_audience_snapshots',
--   'rbtr_account_resurrection', 'sarah_today_log', 'sarah_pilates_progress',
--   'sarah_wellness_log', 'sarah_content_calendar', 'contacts',
--   'contact_interactions', 'sops', 'sop_executions', 'notifications'
-- )
-- ORDER BY tablename;
--
-- Expected: All 41 tables should have rowsecurity = true
