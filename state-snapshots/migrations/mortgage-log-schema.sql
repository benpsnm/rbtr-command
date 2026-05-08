-- Mortgage Log Schema Migration
-- Paste into Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new

CREATE TABLE IF NOT EXISTS public.psnm_mortgage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL DEFAULT CURRENT_DATE,
  lender_contact  text,
  status          text,
  amount_owed     numeric(10,2),
  amount_paid     numeric(10,2),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS psnm_mortgage_log_date_idx
  ON public.psnm_mortgage_log (date DESC);

ALTER TABLE public.psnm_mortgage_log ENABLE ROW LEVEL SECURITY;
