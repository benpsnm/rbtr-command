-- ═══════════════════════════════════════════════════════════════════════════
-- JARVIS · Command Centre V14 tables
-- Run in Supabase SQL editor (or via `supabase db push`).
-- All tables prefixed `jarvis_` so they don't collide with existing schema.
-- ═══════════════════════════════════════════════════════════════════════════

-- GOALS (tiered)
create table if not exists jarvis_goals (
  id           bigint generated always as identity primary key,
  scope        text not null check (scope in ('day','week','month','life')),
  title        text not null,
  status       text not null default 'open' check (status in ('open','done','cancelled')),
  priority     smallint default 0,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  notes        text
);
create index if not exists idx_jarvis_goals_scope_status on jarvis_goals(scope, status);

-- ACCOMPLISHMENTS (wins wall — snapshot on completion)
create table if not exists jarvis_accomplishments (
  id           bigint generated always as identity primary key,
  title        text not null,
  description  text,
  category     text,
  achieved_at  timestamptz not null default now()
);

-- REFLECTIONS (morning / evening)
create table if not exists jarvis_reflections (
  id          bigint generated always as identity primary key,
  type        text not null check (type in ('morning','evening')),
  content     text not null,
  mood        smallint, -- 1-10 optional
  created_at  timestamptz not null default now()
);

-- LEARNING STREAKS (one row per subject)
create table if not exists jarvis_learning_streaks (
  subject          text primary key,
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_practiced   date,
  updated_at       timestamptz not null default now()
);

-- LEARNING SESSIONS (per-session log)
create table if not exists jarvis_learning_sessions (
  id           bigint generated always as identity primary key,
  subject      text not null,
  minutes      int not null,
  notes        text,
  completed_at timestamptz not null default now()
);
create index if not exists idx_jarvis_sessions_subject on jarvis_learning_sessions(subject, completed_at desc);

-- TOOL REGISTRY (every tool/agent/system built)
create table if not exists jarvis_tool_registry (
  id           bigint generated always as identity primary key,
  name         text not null,
  category     text,
  description  text,
  url          text,
  section_id   text,
  created_at   timestamptz not null default now()
);

-- SIGNALS (live feed items — leads, bookings, news, alerts)
create table if not exists jarvis_signals (
  id           bigint generated always as identity primary key,
  type         text not null, -- 'lead' | 'booking' | 'alert' | 'news' | 'ebay' | 'sponsor'
  payload      jsonb not null,
  seen         boolean default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_jarvis_signals_type_seen on jarvis_signals(type, seen, created_at desc);

-- CONVERSATIONS (JARVIS chat history — for memory + review)
create table if not exists jarvis_conversations (
  id            bigint generated always as identity primary key,
  user_msg      text not null,
  assistant_msg text not null,
  context       jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_jarvis_conv_created on jarvis_conversations(created_at desc);

-- BUILT DAD PROGRESS (single-row style)
create table if not exists jarvis_builtdad (
  id           int primary key default 1,
  day_number   int not null default 1,
  started_at   timestamptz not null default now(),
  last_marked  timestamptz,
  check (id = 1) -- singleton
);
insert into jarvis_builtdad (id, day_number) values (1, 1) on conflict (id) do nothing;

-- RLS: on by default for Supabase. For first pass we allow anon read/write;
-- tighten once the Netlify function uses service_role exclusively.
alter table jarvis_goals               enable row level security;
alter table jarvis_accomplishments     enable row level security;
alter table jarvis_reflections         enable row level security;
alter table jarvis_learning_streaks    enable row level security;
alter table jarvis_learning_sessions   enable row level security;
alter table jarvis_tool_registry       enable row level security;
alter table jarvis_signals             enable row level security;
alter table jarvis_conversations       enable row level security;
alter table jarvis_builtdad            enable row level security;

-- Service role policy — the Netlify function uses service_role key, which
-- bypasses RLS. No anon policy means the browser can't hit these directly —
-- it goes through the proxy. Exactly what we want.
