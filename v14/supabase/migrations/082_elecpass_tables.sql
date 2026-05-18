-- Migration 082: ElecPass portal schema
-- Date: 2026-05-18
-- Context: v3.3 Phase 4 — ElecPass electrical compliance management portal

-- ============================================================================
-- ELECPASS TABLES
-- ============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS public.ep_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  postcode text,
  subscription_tier text DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  mrr_gbp numeric DEFAULT 0,
  status text DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'paused', 'cancelled')),
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ep_customers_email ON public.ep_customers(email);
CREATE INDEX idx_ep_customers_status ON public.ep_customers(status);

-- Engineers (NICEIC/NAPIT registered electricians)
CREATE TABLE IF NOT EXISTS public.ep_engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ep_customers(id) ON DELETE CASCADE,
  engineer_name text NOT NULL,
  scheme_registration text, -- NICEIC, NAPIT, ELECSA, etc
  scheme_reg_number text NOT NULL,
  email text,
  phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ep_engineers_customer ON public.ep_engineers(customer_id);
CREATE INDEX idx_ep_engineers_scheme ON public.ep_engineers(scheme_registration);

-- Assessments (EICR / Part P assessments)
CREATE TABLE IF NOT EXISTS public.ep_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.ep_customers(id) ON DELETE CASCADE,
  engineer_id uuid REFERENCES public.ep_engineers(id) ON DELETE SET NULL,
  property_address text NOT NULL,
  postcode text NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('eicr', 'part_p', 'pat', 'thermal_imaging')),
  assessment_date date NOT NULL,
  cert_issued_date date,
  cert_number text,
  cert_pdf_url text,
  circuits_tested int,
  c1_faults int DEFAULT 0, -- Category 1 (danger present)
  c2_faults int DEFAULT 0, -- Category 2 (potentially dangerous)
  c3_faults int DEFAULT 0, -- Category 3 (improvement recommended)
  pass_fail text CHECK (pass_fail IN ('satisfactory', 'unsatisfactory')),
  next_inspection_due date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ep_assessments_customer ON public.ep_assessments(customer_id);
CREATE INDEX idx_ep_assessments_date ON public.ep_assessments(assessment_date DESC);
CREATE INDEX idx_ep_assessments_pass_fail ON public.ep_assessments(pass_fail);
CREATE INDEX idx_ep_assessments_type ON public.ep_assessments(assessment_type);

-- Compliance Checks (individual circuit/item checks within assessment)
CREATE TABLE IF NOT EXISTS public.ep_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.ep_assessments(id) ON DELETE CASCADE,
  circuit_name text NOT NULL, -- lighting, sockets, cooker, etc
  location text, -- kitchen, bedroom 1, etc
  circuit_type text, -- ring final, radial, lighting
  protection_device text, -- MCB, RCD, RCBO
  rating text, -- 32A, 6A, etc
  check_result text CHECK (check_result IN ('pass', 'c1', 'c2', 'c3', 'fyi')),
  test_readings jsonb, -- {insulation_resistance, earth_fault_loop, rcd_trip_time, etc}
  check_notes text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ep_compliance_assessment ON public.ep_compliance_checks(assessment_id);
CREATE INDEX idx_ep_compliance_result ON public.ep_compliance_checks(check_result);

-- Remedial Work (follow-up work required from assessments)
CREATE TABLE IF NOT EXISTS public.ep_remedial_work (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.ep_assessments(id) ON DELETE CASCADE,
  check_id uuid REFERENCES public.ep_compliance_checks(id) ON DELETE SET NULL,
  fault_category text NOT NULL CHECK (fault_category IN ('c1', 'c2', 'c3')),
  description text NOT NULL,
  location text,
  recommended_action text,
  priority text DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'deferred')),
  estimated_cost_gbp numeric,
  scheduled_date date,
  completed_date date,
  completed_by uuid, -- engineer who completed
  completion_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ep_remedial_assessment ON public.ep_remedial_work(assessment_id);
CREATE INDEX idx_ep_remedial_status ON public.ep_remedial_work(status);
CREATE INDEX idx_ep_remedial_priority ON public.ep_remedial_work(priority);

-- Pricing Tiers
CREATE TABLE IF NOT EXISTS public.ep_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name text UNIQUE NOT NULL, -- starter, professional, enterprise
  monthly_price_gbp numeric NOT NULL,
  annual_price_gbp numeric NOT NULL,
  max_assessments_per_month int,
  max_engineers int,
  features jsonb, -- array of feature flags
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.ep_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ep_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ep_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ep_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ep_remedial_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ep_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (customer-specific policies in future)
CREATE POLICY "Owners can do anything" ON public.ep_customers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.ep_engineers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.ep_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.ep_compliance_checks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.ep_remedial_work FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.ep_pricing_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

-- Public can read pricing tiers
CREATE POLICY "Public can read pricing" ON public.ep_pricing_tiers FOR SELECT USING (active = true);

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO public.ep_pricing_tiers (tier_name, monthly_price_gbp, annual_price_gbp, max_assessments_per_month, max_engineers, features)
VALUES
  ('starter', 29, 290, 50, 2, '["eicr_generation", "digital_storage", "email_reminders", "part_p_certificates"]'::jsonb),
  ('professional', 79, 790, 200, 10, '["eicr_generation", "digital_storage", "email_reminders", "part_p_certificates", "remedial_tracking", "custom_branding", "priority_support"]'::jsonb),
  ('enterprise', 199, 1990, 999, 999, '["eicr_generation", "digital_storage", "email_reminders", "part_p_certificates", "remedial_tracking", "custom_branding", "priority_support", "api_access", "white_label", "pat_testing"]'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;
