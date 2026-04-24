-- Migration 32b: RBTR Atlas tables
-- Phase 1.6 Workstream A

CREATE TABLE IF NOT EXISTS rbtr_guy_martin_pathway (
  id uuid primary key default gen_random_uuid(),
  current_stage int default 1,
  stage1_notes text,
  stage2_letter_draft text,
  stage3_followup_date date,
  stage4_response text,
  stage5_notes text,
  audience_milestone_met boolean default false,
  updated_at timestamptz default now()
);

-- Seed single row
INSERT INTO rbtr_guy_martin_pathway (current_stage) VALUES (1)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS rbtr_build_log (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default current_date,
  hours_worked numeric(4,1),
  tasks_done text,
  parts_fitted text,
  issues text,
  spend numeric(10,2),
  photo_urls text[],
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS rbtr_route_phases (
  id uuid primary key default gen_random_uuid(),
  phase_number int not null,
  name text not null,
  start_country text,
  end_country text,
  distance_km int,
  duration_weeks int,
  shipping_leg text,
  notes text
);

-- Seed 7 phases
INSERT INTO rbtr_route_phases (phase_number, name, start_country, end_country, distance_km, duration_weeks, shipping_leg, notes) VALUES
(1, 'UK to Turkey', 'United Kingdom', 'Turkey', 5000, 8, null, 'Drive across Europe via France, Switzerland, Austria, Hungary, Romania, Bulgaria'),
(2, 'Turkey to Central Asia', 'Turkey', 'Kyrgyzstan', 7000, 10, null, 'Georgia, Azerbaijan, ferry Caspian, Kazakhstan, Kyrgyzstan'),
(3, 'Central Asia to India', 'Kyrgyzstan', 'India', 4000, 8, 'Kyrgyzstan to Delhi (ship)', 'Ship truck from Osh to Delhi. Fly to meet it.'),
(4, 'India to East Africa', 'India', 'Kenya', 0, 2, 'Chennai to Mombasa (ship)', 'India overland Chennai, then ship to Mombasa'),
(5, 'East Africa to South Africa', 'Kenya', 'South Africa', 8000, 16, null, 'Drive through Tanzania, Zambia, Botswana, Namibia, RSA'),
(6, 'South Africa to SE Asia', 'South Africa', 'Singapore', 0, 2, 'Cape Town to Singapore (ship)', 'Ship from Cape Town'),
(7, 'SE Asia to Australia', 'Singapore', 'Australia', 5000, 12, null, 'Malaysia, Thailand, Darwin, Brisbane, Burleigh Heads QLD')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS rbtr_audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  youtube_subs int,
  instagram_followers int,
  tiktok_followers int,
  linkedin_followers int,
  email_subscribers int,
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS rbtr_account_resurrection (
  id uuid primary key default gen_random_uuid(),
  platform text not null, -- 'instagram','youtube'
  current_stage int default 1,
  followers_start int,
  followers_current int,
  started_at date,
  notes text,
  updated_at timestamptz default now()
);

INSERT INTO rbtr_account_resurrection (platform, current_stage) VALUES ('instagram', 1), ('youtube', 1)
ON CONFLICT DO NOTHING;
