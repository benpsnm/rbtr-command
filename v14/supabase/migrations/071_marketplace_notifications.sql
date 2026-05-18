-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 071: Marketplace Lifecycle Notifications
-- Created: 2026-05-14 Evening
-- Purpose: Telegram notifications for listing events
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists marketplace_notification_subs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique,
  enabled boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists marketplace_notifications_log (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid, -- nullable for system events
  event_type text not null,
  payload jsonb,
  telegram_message_id text,
  status text not null, -- 'sent', 'failed', 'skipped'
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_marketplace_notif_log_listing
  on marketplace_notifications_log(listing_id);

create index if not exists idx_marketplace_notif_log_event
  on marketplace_notifications_log(event_type);

-- RLS policies (service role bypass)
alter table marketplace_notification_subs enable row level security;
alter table marketplace_notifications_log enable row level security;

drop policy if exists "Service role full access" on marketplace_notification_subs;
drop policy if exists "Service role full access" on marketplace_notifications_log;

create policy "Service role full access"
  on marketplace_notification_subs
  for all
  using (true) with check (true);

create policy "Service role full access"
  on marketplace_notifications_log
  for all
  using (true) with check (true);

-- Seed default notification subscriptions
insert into marketplace_notification_subs (event_type) values
  ('listing_published'),
  ('watcher_added'),
  ('question_asked'),
  ('sold'),
  ('payment_received')
on conflict (event_type) do nothing;

-- Migration complete marker
comment on table marketplace_notification_subs is 'Marketplace notification subscriptions — migration 071';
comment on table marketplace_notifications_log is 'Marketplace notification dispatch log — migration 071';
