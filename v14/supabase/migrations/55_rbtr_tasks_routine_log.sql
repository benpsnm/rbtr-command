-- ═══════════════════════════════════════════════════════════════════════════
-- 55 · rbtr_tasks + rbtr_routine_log
-- Task management + morning-routine adherence tracking
-- Run in Supabase SQL editor: supabase.com → project mpxgyobotiqcawmqlhbf → SQL editor
-- ═══════════════════════════════════════════════════════════════════════════

-- TASKS (persistent, roll-over until done or skipped)
create table if not exists rbtr_tasks (
  id              uuid primary key default gen_random_uuid(),
  description     text not null,
  priority        int  not null default 3 check (priority between 1 and 5),
  status          text not null default 'open'
                    check (status in ('open','in_progress','complete','skipped','blocked')),
  source          text not null,
  source_detail   text,
  project         text,
  blocked_reason  text,
  due_date        date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  completed_at    timestamptz
);

create index if not exists idx_rbtr_tasks_status          on rbtr_tasks (status);
create index if not exists idx_rbtr_tasks_priority        on rbtr_tasks (priority);
create index if not exists idx_rbtr_tasks_project         on rbtr_tasks (project);
create index if not exists idx_rbtr_tasks_due_date        on rbtr_tasks (due_date);

alter table rbtr_tasks enable row level security;

-- Service-role full access only (no anon/authenticated policies)
create policy "service_role_all_rbtr_tasks"
  on rbtr_tasks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Auto-update updated_at
create or replace function rbtr_tasks_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rbtr_tasks_updated_at on rbtr_tasks;
create trigger trg_rbtr_tasks_updated_at
  before update on rbtr_tasks
  for each row execute function rbtr_tasks_set_updated_at();


-- ROUTINE LOG (morning-routine adherence — awaits Ben's "switch on")
create table if not exists rbtr_routine_log (
  id                      uuid primary key default gen_random_uuid(),
  date                    date not null unique,
  wake_time               time,
  training_done           bool default false,
  training_type           text,
  training_duration_min   int,
  deep_work_done          bool default false,
  deep_work_topic         text,
  deep_work_duration_min  int,
  mindset_notes           text,
  created_at              timestamptz default now()
);

create index if not exists idx_rbtr_routine_log_date on rbtr_routine_log (date);

alter table rbtr_routine_log enable row level security;

create policy "service_role_all_rbtr_routine_log"
  on rbtr_routine_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
