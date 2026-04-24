-- Migration 32a: Ben portal tables
-- Phase 1.6 Workstream A

CREATE TABLE IF NOT EXISTS ben_goals (
  id uuid primary key default gen_random_uuid(),
  tier text not null, -- 'today','week','month','life','rbtr'
  content text not null,
  due_date date,
  status text default 'open', -- 'open','done','cancelled'
  completed_at timestamptz,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ben_mood_log (
  date date primary key,
  mood int check (mood between 1 and 10),
  energy int check (energy between 1 and 10),
  sleep_hours numeric(4,1),
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ben_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ben_nate_conversations (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  topic text,
  insights text,
  actions_agreed text,
  next_scheduled date,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ben_colab_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  event_type text, -- 'letter_in','letter_out','call','payment','legal_update'
  description text,
  document_url text,
  amount numeric(10,2),
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ben_dro_status (
  id uuid primary key default gen_random_uuid(),
  stage text default 'not-started', -- 'not-started','in-progress','submitted','approved','denied'
  consultation_date date,
  notes text,
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS ben_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  portal text, -- 'psnm','house','rbtr','eternal','personal'
  priority int default 3, -- 1 (urgent) to 5 (someday)
  due_date date,
  status text default 'open', -- 'open','done','cancelled'
  source text default 'manual', -- 'manual','atlas','rocko'
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS family_sons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dob date not null,
  school text,
  gp_contact text,
  dentist_contact text,
  milestones jsonb default '[]',
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS family_sons_events (
  id uuid primary key default gen_random_uuid(),
  son_id uuid references family_sons(id) on delete cascade,
  event_type text, -- 'appointment','milestone','school_event','vaccine'
  date date not null,
  notes text,
  next_due_date date,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS family_peanut (
  key text primary key,
  value jsonb
);

CREATE TABLE IF NOT EXISTS family_peanut_events (
  id uuid primary key default gen_random_uuid(),
  event_type text, -- 'vet','vaccine','grooming','weight'
  date date not null,
  notes text,
  next_due_date date,
  created_at timestamptz default now()
);
