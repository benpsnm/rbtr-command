-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 081: PSNM Customer Portal Sessions
-- Created: 2026-05-14 Evening
-- Purpose: Magic link authentication for customer self-service portal
-- ═══════════════════════════════════════════════════════════════════════════

-- Customer authentication sessions (magic links + JWT cookies)
create table if not exists psnm_customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references psnm_customers(id) on delete cascade,
  token text not null unique,
  token_expires timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  ip_address text,
  user_agent text
);

-- Indexes for fast token lookup and customer session queries
create index if not exists idx_psnm_customer_sessions_token
  on psnm_customer_sessions(token) where not used;

create index if not exists idx_psnm_customer_sessions_customer
  on psnm_customer_sessions(customer_id);

create index if not exists idx_psnm_customer_sessions_expires
  on psnm_customer_sessions(token_expires);

-- RLS policies (service role bypass for portal API)
alter table psnm_customer_sessions enable row level security;

drop policy if exists "Service role full access" on psnm_customer_sessions;

create policy "Service role full access"
  on psnm_customer_sessions
  for all
  using (true) with check (true);

-- Cleanup function for expired sessions (run via cron)
create or replace function cleanup_expired_customer_sessions()
returns void as $$
begin
  delete from psnm_customer_sessions
  where token_expires < now() - interval '7 days';
end;
$$ language plpgsql security definer;

-- Migration complete marker
comment on table psnm_customer_sessions is 'PSNM customer portal magic link sessions — migration 081';
