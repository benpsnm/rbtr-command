-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 070: Marketplace eBay Comparables Cache
-- Created: 2026-05-14 Evening
-- Purpose: Cache sold comparables from eBay for pricing suggestions
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists marketplace_comparables_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  item_title text,
  category_id text,
  sample_size integer,
  suggested_low decimal,
  suggested_median decimal,
  suggested_high decimal,
  raw_results jsonb,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_marketplace_comparables_key
  on marketplace_comparables_cache(cache_key);

create index if not exists idx_marketplace_comparables_expires
  on marketplace_comparables_cache(expires_at);

-- RLS policies (service role bypass)
alter table marketplace_comparables_cache enable row level security;

drop policy if exists "Service role full access" on marketplace_comparables_cache;

create policy "Service role full access"
  on marketplace_comparables_cache
  for all
  using (true) with check (true);

-- Cleanup function for expired cache entries
create or replace function cleanup_expired_comparables()
returns void as $$
begin
  delete from marketplace_comparables_cache
  where expires_at < now();
end;
$$ language plpgsql security definer;

-- Migration complete marker
comment on table marketplace_comparables_cache is 'eBay sold comparables cache — migration 070';
