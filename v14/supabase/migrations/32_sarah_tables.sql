-- Migration 32e: Sarah portal tables
-- Phase 1.6 Workstream A

CREATE TABLE IF NOT EXISTS sarah_today_log (
  date date primary key,
  mood int check (mood between 1 and 10),
  energy int check (energy between 1 and 10),
  sleep_hours numeric(4,1),
  top3 text,
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS sarah_pilates_progress (
  module int primary key,
  study_hours numeric(5,1) default 0,
  practice_hours numeric(5,1) default 0,
  assignment_status text default 'not_started', -- 'not_started','in_progress','submitted','passed'
  tutor_notes text,
  updated_at timestamptz default now()
);

-- Seed 16 modules
INSERT INTO sarah_pilates_progress (module) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sarah_wellness_log (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default current_date,
  activity text, -- 'yoga','running','strength','pilates','walk'
  duration_mins int,
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS sarah_content_calendar (
  id uuid primary key default gen_random_uuid(),
  post_date date,
  platform text, -- 'instagram','youtube','tiktok'
  content_type text, -- 'reel','post','story','video'
  title text,
  status text default 'idea', -- 'idea','draft','filmed','editing','scheduled','published'
  created_at timestamptz default now()
);

-- sarah_goals already exists from migration 29 — extend if needed
-- ensure columns exist
ALTER TABLE sarah_goals ADD COLUMN IF NOT EXISTS tier text default 'week';
ALTER TABLE sarah_goals ADD COLUMN IF NOT EXISTS due_date date;
