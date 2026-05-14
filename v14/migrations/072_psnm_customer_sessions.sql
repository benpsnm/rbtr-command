-- Migration 072: PSNM Customer Sessions (Magic Link Auth)
-- Created: 2026-05-14
-- Purpose: Customer portal authentication

CREATE TABLE IF NOT EXISTS psnm_customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES psnm_customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_expires TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_psnm_customer_sessions_token ON psnm_customer_sessions(token) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_psnm_customer_sessions_customer ON psnm_customer_sessions(customer_id);

-- RLS Policies
ALTER TABLE psnm_customer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY psnm_customer_sessions_select_own ON psnm_customer_sessions
  FOR SELECT
  USING (true); -- Allow all to read (needed for token validation)
