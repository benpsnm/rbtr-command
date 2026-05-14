-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 078: Rocko v2 Schema
-- Created: 2026-05-14
-- Author: Claude Sonnet 4.6 (via Yolo)
-- Purpose: Voice-first conversational AI backend — sessions, messages, integrations
-- ═══════════════════════════════════════════════════════════════════════════

-- Track all ElevenLabs Conversational AI sessions
create table if not exists rocko_v2_sessions (
  id text primary key, -- Changed from uuid to text for device IDs like 'rocko_1234567890'
  user_id text not null default 'ben',
  device text not null default 'unknown', -- 'desktop' | 'mobile-pwa' | 'workshop-earbuds'
  device_token text unique, -- Device authentication token (never expires)
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  duration_seconds int,
  message_count int default 0,
  tools_called text[] default '{}',
  estimated_cost_pence int default 0,
  metadata jsonb default '{}'::jsonb
);

-- Per-message log (more granular than rocko_conversations)
create table if not exists rocko_v2_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references rocko_v2_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text,
  tool_calls jsonb,
  tool_results jsonb,
  audio_url text, -- ElevenLabs audio URL for replays
  latency_ms int,
  tokens_input int,
  tokens_output int,
  created_at timestamptz not null default now()
);

-- Store OAuth tokens for Gmail/Calendar/Stripe/Claude Code
create table if not exists rocko_v2_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'ben',
  service text not null, -- 'google' | 'stripe' | 'claude-code'
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists rocko_v2_sessions_user_id_idx on rocko_v2_sessions(user_id);
create index if not exists rocko_v2_sessions_started_at_idx on rocko_v2_sessions(started_at desc);
create index if not exists rocko_v2_sessions_expires_at_idx on rocko_v2_sessions(expires_at);
create index if not exists rocko_v2_sessions_device_token_idx on rocko_v2_sessions(device_token) where device_token is not null;
create index if not exists rocko_v2_messages_session_id_idx on rocko_v2_messages(session_id);
create index if not exists rocko_v2_messages_created_at_idx on rocko_v2_messages(created_at desc);
create index if not exists rocko_v2_integrations_user_service_idx on rocko_v2_integrations(user_id, service);

-- RLS policies (service role bypass)
alter table rocko_v2_sessions enable row level security;
alter table rocko_v2_messages enable row level security;
alter table rocko_v2_integrations enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Service role full access" on rocko_v2_sessions;
drop policy if exists "Service role full access" on rocko_v2_messages;
drop policy if exists "Service role full access" on rocko_v2_integrations;

-- Service role has full access
create policy "Service role full access" on rocko_v2_sessions
  for all using (true) with check (true);

create policy "Service role full access" on rocko_v2_messages
  for all using (true) with check (true);

create policy "Service role full access" on rocko_v2_integrations
  for all using (true) with check (true);

-- Migration complete marker
comment on table rocko_v2_sessions is 'Rocko v2 conversation sessions — migration 078';
comment on table rocko_v2_messages is 'Rocko v2 per-message log — migration 078';
comment on table rocko_v2_integrations is 'Rocko v2 external service auth — migration 078';
