-- ═══════════════════════════════════════════════════════════════════════════
-- JARVIS Phase 3 Tables
-- Created: 2026-05-13
-- Purpose: Support JARVIS cockpit full functionality + Rocko conversation memory
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Rocko Conversations ────────────────────────────────────────────────────
-- Stores all voice/text interactions with Rocko for context + history
CREATE TABLE IF NOT EXISTS rocko_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'ben', -- future: support multiple users
  session_id UUID NOT NULL, -- groups related exchanges in one session
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_input TEXT NOT NULL,
  rocko_response TEXT NOT NULL,
  tools_called JSONB DEFAULT '[]'::jsonb, -- array of {tool_name, input, result}
  latency_ms INTEGER, -- time from input to first response
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rocko_conversations_session ON rocko_conversations(session_id, timestamp DESC);
CREATE INDEX idx_rocko_conversations_user_date ON rocko_conversations(user_id, DATE(timestamp));

-- ── General Notes ──────────────────────────────────────────────────────────
-- Quick notes from cockpit + Note button
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  category TEXT, -- 'personal', 'psnm', 'rbtr', 'forge', etc
  tags TEXT[], -- flexible tagging
  pinned BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL DEFAULT 'ben',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_category ON notes(category) WHERE category IS NOT NULL;
CREATE INDEX idx_notes_pinned ON notes(pinned) WHERE pinned = TRUE;

-- ── Command Centre Build Progress ──────────────────────────────────────────
-- Truck build stage tracking (replaces spreadsheet)
CREATE TABLE IF NOT EXISTS cc_build_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_name TEXT NOT NULL, -- 'Chassis Prep', 'Subframe Install', etc
  stage_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'complete', 'blocked'
  target_week INTEGER, -- week number in 60-week plan
  actual_week INTEGER, -- when actually completed
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(stage_number)
);

CREATE INDEX idx_cc_build_progress_status ON cc_build_progress(status, stage_number);

-- ── Command Centre Build Expenses ──────────────────────────────────────────
-- Track all truck build expenses
CREATE TABLE IF NOT EXISTS cc_build_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL, -- 'materials', 'labour', 'equipment', 'shipping', etc
  supplier TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_gbp DECIMAL(10,2) NOT NULL,
  invoice_ref TEXT,
  stage_id UUID REFERENCES cc_build_progress(id), -- link to build stage
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cc_build_expenses_date ON cc_build_expenses(date DESC);
CREATE INDEX idx_cc_build_expenses_category ON cc_build_expenses(category);
CREATE INDEX idx_cc_build_expenses_stage ON cc_build_expenses(stage_id) WHERE stage_id IS NOT NULL;

-- ── RBTR Habits Log (Ben) ──────────────────────────────────────────────────
-- Daily habit tracking for Ben
CREATE TABLE IF NOT EXISTS rbtr_habits_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id TEXT NOT NULL DEFAULT 'ben',
  habit_name TEXT NOT NULL, -- 'morning_exercise', 'protein_target', 'no_alcohol', etc
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, user_id, habit_name)
);

CREATE INDEX idx_rbtr_habits_log_user_date ON rbtr_habits_log(user_id, date DESC);
CREATE INDEX idx_rbtr_habits_log_habit ON rbtr_habits_log(habit_name, date DESC);

-- ── Sarah Habits Log ───────────────────────────────────────────────────────
-- Daily habit tracking for Sarah (separate table for data isolation)
CREATE TABLE IF NOT EXISTS sarah_habits_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  habit_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, habit_name)
);

CREATE INDEX idx_sarah_habits_log_date ON sarah_habits_log(date DESC);

-- ── RBTR Mood Log ──────────────────────────────────────────────────────────
-- Mood and energy tracking
CREATE TABLE IF NOT EXISTS rbtr_mood_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id TEXT NOT NULL DEFAULT 'ben',
  time_of_day TEXT NOT NULL, -- 'morning', 'midday', 'evening'
  mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
  energy_score INTEGER NOT NULL CHECK (energy_score >= 1 AND energy_score <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, user_id, time_of_day)
);

CREATE INDEX idx_rbtr_mood_log_user_date ON rbtr_mood_log(user_id, date DESC);

-- ── Wellness Log ───────────────────────────────────────────────────────────
-- Workout, supplement, sleep tracking
CREATE TABLE IF NOT EXISTS wellness_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id TEXT NOT NULL DEFAULT 'ben',
  log_type TEXT NOT NULL, -- 'workout', 'supplement', 'sleep'
  details JSONB NOT NULL, -- flexible schema for different log types
  -- workout: {type, duration_mins, intensity}
  -- supplement: {name, dosage, time}
  -- sleep: {hours, quality_score, notes}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wellness_log_user_date ON wellness_log(user_id, date DESC);
CREATE INDEX idx_wellness_log_type ON wellness_log(log_type, date DESC);

-- ── Sarah's Plan ───────────────────────────────────────────────────────────
-- Sarah's goals, plans, notes (separate from Ben's for data isolation)
CREATE TABLE IF NOT EXISTS sarah_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'business', 'personal', 'forge', 'booking_proof'
  title TEXT NOT NULL,
  content TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'complete', 'archived'
  priority INTEGER DEFAULT 3, -- 1=high, 2=medium, 3=low
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sarah_plan_category ON sarah_plan(category, status);
CREATE INDEX idx_sarah_plan_status ON sarah_plan(status, priority);

-- ── Cleaner Jobs (Forge) ───────────────────────────────────────────────────
-- Track cleaner jobs for 4 Woodhead Mews
CREATE TABLE IF NOT EXISTS cleaner_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID, -- optional link to str_bookings if exists
  scheduled_date DATE NOT NULL,
  cleaner_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'complete', 'issue'
  deep_clean BOOLEAN DEFAULT FALSE, -- vs standard clean
  notes TEXT,
  duration_mins INTEGER,
  cost_gbp DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_cleaner_jobs_date ON cleaner_jobs(scheduled_date DESC);
CREATE INDEX idx_cleaner_jobs_status ON cleaner_jobs(status);

-- ── RBTR Sponsors ──────────────────────────────────────────────────────────
-- Sponsor pipeline tracking
CREATE TABLE IF NOT EXISTS rbtr_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  sponsor_type TEXT NOT NULL, -- 'product', 'cash', 'service'
  value_estimate_gbp DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'target', -- 'target', 'contacted', 'replied', 'negotiating', 'signed', 'declined'
  pitch_sent_date DATE,
  reply_date DATE,
  signed_date DATE,
  package_details TEXT, -- what they're providing
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rbtr_sponsors_status ON rbtr_sponsors(status);
CREATE INDEX idx_rbtr_sponsors_value ON rbtr_sponsors(value_estimate_gbp DESC NULLS LAST);

-- ── Events (Shared Calendar) ───────────────────────────────────────────────
-- Shared calendar events for Ben + Sarah
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  location TEXT,
  event_type TEXT NOT NULL, -- 'personal', 'psnm', 'forge', 'rbtr', 'family', 'shared'
  attendees TEXT[], -- array of names
  all_day BOOLEAN DEFAULT FALSE,
  reminder_mins INTEGER, -- minutes before event to remind
  created_by TEXT NOT NULL DEFAULT 'ben',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_start ON events(start_datetime);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_by ON events(created_by);

-- ═══════════════════════════════════════════════════════════════════════════
-- END JARVIS Phase 3 Tables
-- ═══════════════════════════════════════════════════════════════════════════
