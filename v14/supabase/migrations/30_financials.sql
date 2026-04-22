-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 30 · Phase 2.6 WS4 · Financials — cross-entity transactions
--
-- Builds on migration 28's {psnm,personal,rbtr,ek}_cash_log (point-in-time
-- balances) by adding per-transaction ledger for forecasting + timeline chart.
--
-- Adds:
--   financial_transactions   — line-item ledger (income/expense/transfer)
--   bank_connections         — TrueLayer/Plaid OAuth (LEGAL_SENSITIVE, stubbed)
--   house_cash_log           — 5th entity cash log (migration 28 only did 4)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL CHECK (entity IN ('psnm','ben_personal','rbtr','ek','house')),
  transaction_date DATE NOT NULL,
  amount_gbp NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('income','expense','transfer')),
  category TEXT,
  description TEXT,
  counterparty TEXT,
  source TEXT CHECK (source IN ('manual','csv','bank_feed','stripe')),
  csv_batch_id UUID,
  stripe_payment_intent_id TEXT,
  transfer_pair_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE financial_transactions IS 'CLASSIFICATION: INTERNAL';
CREATE INDEX IF NOT EXISTS idx_ft_entity_date ON financial_transactions (entity, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ft_stripe ON financial_transactions (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL CHECK (entity IN ('psnm','ben_personal','rbtr','ek','house')),
  provider TEXT CHECK (provider IN ('truelayer','plaid','gocardless','monzo','starling','manual')),
  account_name TEXT,
  account_last_4 TEXT,
  oauth_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','expired','revoked','error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE bank_connections IS 'CLASSIFICATION: LEGAL_SENSITIVE';

CREATE TABLE IF NOT EXISTS house_cash_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  balance_gbp NUMERIC NOT NULL,
  source TEXT CHECK (source IN ('manual','bank_feed','csv')),
  note TEXT
);
COMMENT ON TABLE house_cash_log IS 'CLASSIFICATION: INTERNAL';

-- ── RLS ────────────────────────────────────────────────────────────────────
-- financial_transactions: Ben all entities, Sarah only 'house' + 'ben_personal'
-- bank_connections: Ben only (LEGAL_SENSITIVE)
-- house_cash_log: Ben + Sarah (shared)
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_connections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_cash_log         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ft_ben ON financial_transactions;
CREATE POLICY ft_ben ON financial_transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'ben'));

DROP POLICY IF EXISTS ft_sarah ON financial_transactions;
CREATE POLICY ft_sarah ON financial_transactions FOR SELECT TO authenticated
  USING (
    entity IN ('house','ben_personal')
    AND EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'sarah')
  );

DROP POLICY IF EXISTS ft_service ON financial_transactions;
CREATE POLICY ft_service ON financial_transactions FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS bc_ben ON bank_connections;
CREATE POLICY bc_ben ON bank_connections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'ben'));

DROP POLICY IF EXISTS bc_service ON bank_connections;
CREATE POLICY bc_service ON bank_connections FOR ALL TO public USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS hcl_shared ON house_cash_log;
CREATE POLICY hcl_shared ON house_cash_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('ben','sarah')));

DROP POLICY IF EXISTS hcl_service ON house_cash_log;
CREATE POLICY hcl_service ON house_cash_log FOR ALL TO public USING (auth.role() = 'service_role');

-- Audit
INSERT INTO reconciliation_audit (action, table_name, details)
VALUES ('phase_2_6_ws4_financials_schema', NULL,
        jsonb_build_object('migration','30','tables_added', 3, 'phase','2.6'));

COMMIT;

-- Verification
SELECT tablename FROM pg_tables
WHERE schemaname='public' AND tablename IN ('financial_transactions','bank_connections','house_cash_log')
ORDER BY tablename;
