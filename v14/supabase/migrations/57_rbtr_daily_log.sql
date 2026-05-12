-- ═══════════════════════════════════════════════════════════════════════════
-- 57 · rbtr_daily_log
-- Manual win/event logging for Rocko brief daily continuity.
-- Apply via: Supabase SQL editor → project mpxgyobotiqcawmqlhbf
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists rbtr_daily_log (
  id              uuid primary key default gen_random_uuid(),
  log_date        date not null,
  event_type      text not null check (event_type in ('deploy', 'decision', 'win', 'milestone', 'cash')),
  description     text not null,
  related_project text,
  created_at      timestamptz default now()
);

create index if not exists idx_rbtr_daily_log_date on rbtr_daily_log(log_date desc);

alter table rbtr_daily_log enable row level security;

create policy "service_role_all_rbtr_daily_log"
  on rbtr_daily_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
