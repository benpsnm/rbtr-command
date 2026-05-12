-- ═══════════════════════════════════════════════════════════════════════════
-- 58 · rbtr_week_goals
-- Weekly goal tracking for Rocko brief week-goal narrative section.
-- Apply via: Supabase SQL editor → project mpxgyobotiqcawmqlhbf
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists rbtr_week_goals (
  id              uuid primary key default gen_random_uuid(),
  week_iso        text not null,
  goal            text not null,
  target_outcome  text,
  status          text not null default 'open' check (status in ('open', 'in_progress', 'done', 'carried')),
  progress_pct    int not null default 0 check (progress_pct between 0 and 100),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_rbtr_week_goals_week on rbtr_week_goals(week_iso);

alter table rbtr_week_goals enable row level security;

create policy "service_role_all_rbtr_week_goals"
  on rbtr_week_goals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function rbtr_week_goals_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rbtr_week_goals_updated_at on rbtr_week_goals;
create trigger trg_rbtr_week_goals_updated_at
  before update on rbtr_week_goals
  for each row execute function rbtr_week_goals_set_updated_at();
