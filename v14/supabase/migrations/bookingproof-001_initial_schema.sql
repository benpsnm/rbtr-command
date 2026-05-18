-- Booking Proof Initial Schema Migration
-- Target project: fshaixacxcdkrvtolonp (bookingproof)
-- Date: 2026-05-18
-- Context: Dedicated Booking Proof Supabase project schema matching main project bp_* tables

-- ============================================================================
-- BOOKING PROOF CORE TABLES
-- ============================================================================

-- Customers
CREATE TABLE IF NOT EXISTS public.bp_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  company_name text,
  contact_name text,
  phone text,
  address text,
  postcode text,
  subscription_tier text DEFAULT 'starter', -- starter, professional, enterprise
  mrr_gbp numeric DEFAULT 0,
  status text DEFAULT 'trial', -- trial, active, paused, cancelled
  trial_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bp_customers_email ON public.bp_customers(email);
CREATE INDEX idx_bp_customers_status ON public.bp_customers(status);

-- Properties
CREATE TABLE IF NOT EXISTS public.bp_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.bp_customers(id) ON DELETE CASCADE,
  property_name text NOT NULL,
  address text NOT NULL,
  postcode text NOT NULL,
  property_type text, -- apartment, house, cottage, etc
  bedrooms int,
  bathrooms int,
  max_guests int,
  platform text, -- airbnb, booking.com, vrbo, direct
  platform_listing_id text,
  status text DEFAULT 'active', -- active, archived
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bp_properties_customer ON public.bp_properties(customer_id);
CREATE INDEX idx_bp_properties_status ON public.bp_properties(status);

-- Baselines (check-in photos + condition documentation)
CREATE TABLE IF NOT EXISTS public.bp_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.bp_properties(id) ON DELETE CASCADE,
  baseline_date date NOT NULL,
  photos jsonb, -- array of {url, room, notes}
  inventory jsonb, -- structured inventory list
  condition_notes text,
  created_by uuid, -- references auth.users (customer user)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bp_baselines_property ON public.bp_baselines(property_id);
CREATE INDEX idx_bp_baselines_date ON public.bp_baselines(baseline_date DESC);

-- Turnovers (changeover inspections)
CREATE TABLE IF NOT EXISTS public.bp_turnovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.bp_properties(id) ON DELETE CASCADE,
  turnover_date date NOT NULL,
  booking_ref text, -- platform booking reference
  guest_name text,
  check_in date,
  check_out date,
  photos jsonb, -- array of {url, room, notes}
  condition_score int CHECK (condition_score >= 1 AND condition_score <= 5), -- 1=poor, 5=excellent
  issues_found text,
  cleaner_notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bp_turnovers_property ON public.bp_turnovers(property_id);
CREATE INDEX idx_bp_turnovers_date ON public.bp_turnovers(turnover_date DESC);

-- Damages (flagged issues requiring action)
CREATE TABLE IF NOT EXISTS public.bp_damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.bp_properties(id) ON DELETE CASCADE,
  turnover_id uuid REFERENCES public.bp_turnovers(id) ON DELETE SET NULL,
  damage_date date NOT NULL,
  room text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe')),
  photos jsonb, -- array of {url, caption}
  estimated_cost_gbp numeric,
  status text DEFAULT 'reported' CHECK (status IN ('reported', 'reviewed', 'claimed', 'resolved', 'dismissed')),
  platform_claim_ref text,
  resolution_notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_bp_damages_property ON public.bp_damages(property_id);
CREATE INDEX idx_bp_damages_status ON public.bp_damages(status);
CREATE INDEX idx_bp_damages_severity ON public.bp_damages(severity);

-- Claims (formal claims to platform or guest)
CREATE TABLE IF NOT EXISTS public.bp_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.bp_customers(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.bp_properties(id) ON DELETE CASCADE,
  damage_ids uuid[], -- array of damage record IDs
  claim_date date NOT NULL,
  platform text NOT NULL, -- airbnb, booking.com, etc
  platform_claim_ref text,
  guest_name text,
  booking_ref text,
  claim_amount_gbp numeric NOT NULL,
  evidence_urls text[], -- photo URLs submitted as evidence
  claim_status text DEFAULT 'draft' CHECK (claim_status IN ('draft', 'submitted', 'under_review', 'approved', 'denied', 'settled')),
  outcome_amount_gbp numeric,
  outcome_notes text,
  submitted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bp_claims_customer ON public.bp_claims(customer_id);
CREATE INDEX idx_bp_claims_property ON public.bp_claims(property_id);
CREATE INDEX idx_bp_claims_status ON public.bp_claims(claim_status);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.bp_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.bp_customers(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text, -- billing, technical, damage_review, general
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  description text NOT NULL,
  created_by uuid,
  assigned_to uuid, -- internal staff user
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX idx_bp_support_customer ON public.bp_support_tickets(customer_id);
CREATE INDEX idx_bp_support_status ON public.bp_support_tickets(status);

-- Waitlist (pre-launch interest)
CREATE TABLE IF NOT EXISTS public.bp_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  company_name text,
  contact_name text,
  property_count int,
  platform text, -- main platform they use
  referral_source text,
  notes text,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'converted')),
  created_at timestamptz DEFAULT now(),
  invited_at timestamptz,
  converted_at timestamptz
);

CREATE INDEX idx_bp_waitlist_status ON public.bp_waitlist(status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.bp_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_turnovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bp_waitlist ENABLE ROW LEVEL SECURITY;

-- Owner-only policies (for now - customer-specific policies in future)
CREATE POLICY "Owners can do anything" ON public.bp_customers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_properties FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_baselines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_turnovers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_damages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_claims FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_support_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

CREATE POLICY "Owners can do anything" ON public.bp_waitlist FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('owner', 'partner'))
);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bp_customers_updated_at
  BEFORE UPDATE ON public.bp_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bp_properties_updated_at
  BEFORE UPDATE ON public.bp_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bp_support_tickets_updated_at
  BEFORE UPDATE ON public.bp_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
