-- Migration 35: Notifications
-- Phase 1.6 Workstream E

CREATE TABLE IF NOT EXISTS notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- 'hot_signal', 'quote_opened', 'low_cash', 'schedule_conflict', 'rocko_proactive'
  severity text default 'normal', -- 'critical', 'high', 'normal', 'low'
  title text,
  body text,
  data jsonb,
  read_at timestamptz,
  actioned_at timestamptz,
  channel_delivered text[] default '{}', -- ['telegram', 'portal', 'sms']
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications (type);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_at_idx ON notifications (read_at) WHERE read_at IS NULL;
