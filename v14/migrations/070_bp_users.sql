-- Migration 070: Booking Proof Users (Magic Link Auth)
-- Created: 2026-05-14
-- Purpose: Customer-facing authentication for Booking Proof MVP

CREATE TABLE IF NOT EXISTS bp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  magic_link_token TEXT UNIQUE,
  token_expires TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  customer_id UUID REFERENCES bp_customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bp_users_email ON bp_users(email);
CREATE INDEX IF NOT EXISTS idx_bp_users_token ON bp_users(magic_link_token) WHERE magic_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bp_users_customer ON bp_users(customer_id) WHERE customer_id IS NOT NULL;

-- RLS Policies
ALTER TABLE bp_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY bp_users_select_own ON bp_users
  FOR SELECT
  USING (auth.uid() = id OR email = current_setting('request.jwt.claims', true)::json->>'email');

-- Updated timestamp trigger
CREATE TRIGGER bp_users_updated_at
  BEFORE UPDATE ON bp_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
