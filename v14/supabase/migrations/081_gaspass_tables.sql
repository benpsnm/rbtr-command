-- Migration 081: GasPass portal schema
-- Date: 2026-05-18
-- Context: v3.3 Phase 4 — GasPass compliance management portal

-- ============================================================================
-- GASPASS TABLES
-- ============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS public.gp_customers (
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

CREATE INDEX idx_gp_customers_email ON public.gp_customers(email);
CREATE INDEX idx_gp_customers_status ON public.gp_customers(status);

-- Engineers (Gas Safe registered engineers)
CREATE TABLE IF NOT EXISTS public.gp_engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.gp_customers(id) ON DELETE CASCADE,
  engineer_name text NOT NULL,
  gas_safe_reg_number text NOT NULL,
  email text,
  phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gp_engineers_customer ON public.gp_engineers(customer_id);
CREATE INDEX idx_gp_engineers_gas_safe ON public.gp_engineers(gas_safe_reg_number);

-- Assessments (property gas safety assessments)
CREATE TABLE IF NOT EXISTS public.gp_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.gp_customers(id) ON DELETE CASCADE,
  engineer_id uuid REFERENCES public.gp_engineers(id) ON DELETE SET NULL,
  property_address text NOT NULL,
  postcode text NOT NULL,
  assessment_date date NOT NULL,
  cert_issued_date date,
  cert_number text,
  cert_pdf_url text,
  appliances_checked int,
  issues_found int,
  pass_fail text CHECK (pass_fail IN ('pass', 'fail', 'advisory')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gp_assessments_customer ON public.gp_assessments(customer_id);
CREATE INDEX idx_gp_assessments_date ON public.gp_assessments(assessment_date DESC);
CREATE INDEX idx_gp_assessments_pass_fail ON public.gp_assessments(pass_fail);

-- Compliance Checks (individual appliance/item checks within assessment)
CREATE TABLE IF NOT EXISTS public.gp_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.gp_assessments(id) ON DELETE CASCADE,
  appliance_type text NOT NULL, -- boiler, cooker, fire, etc
  location text, -- kitchen, living room, etc
  make text,
  model text,
  check_result text CHECK (check_result IN ('pass', 'fail', 'advisory', 'not_tested')),
  check_notes text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gp_compliance_assessment ON public.gp_compliance_checks(assessment_id);
CREATE INDEX idx_gp_compliance_result ON public.gp_compliance_checks(check_result);

-- IV Calculations (Installation Volume calculations for ventilation compliance)
CREATE TABLE IF NOT EXISTS public.gp_iv_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.gp_assessments(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  room_length_m numeric NOT NULL,
  room_width_m numeric NOT NULL,
  room_height_m numeric NOT NULL,
  volume_m3 numeric GENERATED ALWAYS AS (room_length_m * room_width_m * room_height_m) STORED,
  appliance_type text NOT NULL,
  appliance_rating_kw numeric NOT NULL,
  required_volume_m3 numeric NOT NULL, -- from Gas Safe guidelines
  compliant boolean GENERATED ALWAYS AS (room_length_m * room_width_m * room_height_m >= required_volume_m3) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gp_iv_assessment ON public.gp_iv_calculations(assessment_id);
CREATE INDEX idx_gp_iv_compliant ON public.gp_iv_calculations(compliant);

-- Pricing Tiers
CREATE TABLE IF NOT EXISTS public.gp_pricing_tiers (
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

ALTER TABLE public.gp_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_iv_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gp_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (customer-specific policies in future)
CREATE POLICY "Owners can do anything" ON public.gp_customers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.gp_engineers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.gp_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.gp_compliance_checks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.gp_iv_calculations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.gp_pricing_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

-- Public can read pricing tiers
CREATE POLICY "Public can read pricing" ON public.gp_pricing_tiers FOR SELECT USING (active = true);

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO public.gp_pricing_tiers (tier_name, monthly_price_gbp, annual_price_gbp, max_assessments_per_month, max_engineers, features)
VALUES
  ('starter', 29, 290, 50, 2, '["cp12_generation", "digital_storage", "email_reminders"]'::jsonb),
  ('professional', 79, 790, 200, 10, '["cp12_generation", "digital_storage", "email_reminders", "iv_calculator", "custom_branding", "priority_support"]'::jsonb),
  ('enterprise', 199, 1990, 999, 999, '["cp12_generation", "digital_storage", "email_reminders", "iv_calculator", "custom_branding", "priority_support", "api_access", "white_label"]'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;
