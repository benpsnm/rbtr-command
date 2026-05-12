create table if not exists rbtr_auto_diagnosis_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  triggered_by text not null,
  build_summary text,
  shipped_count int default 0,
  auto_fixed_count int default 0,
  ben_needed_count int default 0,
  top_ben_task text,
  full_findings jsonb,
  full_report_path text
);

create index rbtr_diag_created_idx on rbtr_auto_diagnosis_log(created_at desc);
alter table rbtr_auto_diagnosis_log enable row level security;
