-- Rocko v2 Pairing Codes Table
-- Stores temporary pairing codes for device authentication
-- Created: 14 May 2026

create table if not exists rocko_v2_pairing_codes (
  id text primary key,
  code text not null unique,
  user_id text not null default 'ben',
  device_name text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Index for fast code lookup
create index if not exists idx_rocko_v2_pairing_codes_code
  on rocko_v2_pairing_codes(code);

-- Index for expiry cleanup
create index if not exists idx_rocko_v2_pairing_codes_expires_at
  on rocko_v2_pairing_codes(expires_at);

-- RLS policies (allow service role full access)
alter table rocko_v2_pairing_codes enable row level security;

drop policy if exists "Service role full access" on rocko_v2_pairing_codes;

create policy "Service role full access"
  on rocko_v2_pairing_codes
  for all
  using (true) with check (true);

-- Cleanup function for expired codes (run via cron)
create or replace function cleanup_expired_pairing_codes()
returns void as $$
begin
  delete from rocko_v2_pairing_codes
  where expires_at < now() - interval '1 hour';
end;
$$ language plpgsql security definer;
