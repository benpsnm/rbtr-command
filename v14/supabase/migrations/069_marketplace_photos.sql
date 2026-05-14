-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 069: Marketplace Photo Processing
-- Created: 2026-05-14 Evening
-- Purpose: Photo storage and processing metadata for eBay listings
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists marketplace_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid, -- references marketplace_listings(id) when created
  original_filename text,
  size_bytes integer,
  full_url text not null,
  preview_url text not null,
  thumb_url text not null,
  watermarked boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketplace_photos_listing
  on marketplace_photos(listing_id);

-- RLS policies (service role bypass)
alter table marketplace_photos enable row level security;

drop policy if exists "Service role full access" on marketplace_photos;

create policy "Service role full access"
  on marketplace_photos
  for all
  using (true) with check (true);

-- Migration complete marker
comment on table marketplace_photos is 'Marketplace photo processing metadata — migration 069';
