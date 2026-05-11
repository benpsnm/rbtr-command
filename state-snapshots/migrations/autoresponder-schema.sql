-- PSNM Auto-Responder Schema Migration
-- Run this ONCE in the Supabase SQL Editor:
-- dashboard.supabase.com → project mpxgyobotiqcawmqlhbf → SQL Editor → New query → paste → Run

-- ── psnm_enquiry_drafts ───────────────────────────────────────────────────────
-- Stores AI-drafted responses awaiting Ben's approval. Never auto-sends.

CREATE TABLE IF NOT EXISTS public.psnm_enquiry_drafts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id         uuid,
  draft_subject      text NOT NULL,
  draft_body_text    text NOT NULL,
  draft_body_html    text,
  classification     jsonb,
  enrichment         jsonb,
  confidence_score   integer,
  status             text NOT NULL DEFAULT 'pending_approval',
  drafter_notes      text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  approved_at        timestamptz,
  sent_at            timestamptz,
  skipped_at         timestamptz
);

-- status check constraint
ALTER TABLE public.psnm_enquiry_drafts
  DROP CONSTRAINT IF EXISTS psnm_enquiry_drafts_status_check;
ALTER TABLE public.psnm_enquiry_drafts
  ADD CONSTRAINT psnm_enquiry_drafts_status_check
  CHECK (status IN ('pending_approval','approved','sent','skipped','no_response_needed'));

-- index for dashboard queries
CREATE INDEX IF NOT EXISTS psnm_enquiry_drafts_status_idx
  ON public.psnm_enquiry_drafts (status, created_at DESC);

-- RLS: enabled, no policies — service role bypasses automatically
ALTER TABLE public.psnm_enquiry_drafts ENABLE ROW LEVEL SECURITY;

-- ── psnm_autoresponse_log ─────────────────────────────────────────────────────
-- Audit trail. One row per enquiry processed by the auto-responder.

CREATE TABLE IF NOT EXISTS public.psnm_autoresponse_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id       uuid,
  decision         text NOT NULL,
  confidence_score integer,
  classification   jsonb,
  draft_id         uuid,
  decided_at       timestamptz NOT NULL DEFAULT now(),
  notes            text
);

ALTER TABLE public.psnm_autoresponse_log
  DROP CONSTRAINT IF EXISTS psnm_autoresponse_log_decision_check;
ALTER TABLE public.psnm_autoresponse_log
  ADD CONSTRAINT psnm_autoresponse_log_decision_check
  CHECK (decision IN ('drafted','no_response','error','low_confidence_skipped'));

CREATE INDEX IF NOT EXISTS psnm_autoresponse_log_enquiry_idx
  ON public.psnm_autoresponse_log (enquiry_id);

ALTER TABLE public.psnm_autoresponse_log ENABLE ROW LEVEL SECURITY;

-- ── supabase-proxy.js allowlist (add these two tables) ───────────────────────
-- Note: also add 'psnm_enquiry_drafts' and 'psnm_autoresponse_log'
-- to the ALLOWED_TABLES Set in v14/api/supabase-proxy.js
