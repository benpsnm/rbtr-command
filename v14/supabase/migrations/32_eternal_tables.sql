-- Migration 32c: Eternal Kustoms tables
-- Phase 1.6 Workstream A

CREATE TABLE IF NOT EXISTS eternal_hours_log (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default current_date,
  hours numeric(4,1) not null,
  task text,
  client text default 'Sam Moore',
  billable boolean default true,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS eternal_estimates (
  id uuid primary key default gen_random_uuid(),
  customer text not null,
  job text,
  amount numeric(10,2),
  authorised_at timestamptz,
  signed_at timestamptz,
  status text default 'draft', -- 'draft','authorised','sent','signed','declined'
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS eternal_invoices (
  id uuid primary key default gen_random_uuid(),
  period_start date,
  period_end date,
  hours_total numeric(6,1),
  amount_total numeric(10,2),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS eternal_builds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer text,
  status text default 'planned', -- 'planned','in_progress','complete','on_hold'
  started_at date,
  completed_at date,
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS eternal_shareholder_payments (
  id uuid primary key default gen_random_uuid(),
  month_number int not null, -- 1-20
  payment_date date,
  amount numeric(10,2) default 2500.00,
  paid boolean default false,
  created_at timestamptz default now()
);

-- Seed 20-month schedule (months 1-20 from July 2026)
INSERT INTO eternal_shareholder_payments (month_number, payment_date, paid) VALUES
(1, '2026-07-01', false),(2, '2026-08-01', false),(3, '2026-09-01', false),
(4, '2026-10-01', false),(5, '2026-11-01', false),(6, '2026-12-01', false),
(7, '2027-01-01', false),(8, '2027-02-01', false),(9, '2027-03-01', false),
(10, '2027-04-01', false),(11, '2027-05-01', false),(12, '2027-06-01', false),
(13, '2027-07-01', false),(14, '2027-08-01', false),(15, '2027-09-01', false),
(16, '2027-10-01', false),(17, '2027-11-01', false),(18, '2027-12-01', false),
(19, '2028-01-01', false),(20, '2028-02-01', false)
ON CONFLICT DO NOTHING;
