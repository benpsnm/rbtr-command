-- ═══════════════════════════════════════════════════════════════════════════
-- 59 · Atlas v3 — unified prospect + outreach schema
-- Apply in Supabase SQL editor → project mpxgyobotiqcawmqlhbf
-- Safe to re-run (all CREATE IF NOT EXISTS)
-- Old tables (psnm_outreach_targets, psnm_atlas_drafts, etc.) are UNCHANGED.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── prospects (canonical unified record) ─────────────────────────────────────
create table if not exists prospects (
  id                   uuid primary key default gen_random_uuid(),

  -- Source tracking
  source               text not null,                        -- 'psnm_outreach', 'ww_inbound', 'str_manual', 'linkedin', 'manual'
  source_ref           uuid,                                 -- FK into old table (psnm_outreach_targets.id etc)
  prospect_type        text not null default 'psnm'          -- 'psnm' | 'str' | 'ww_inbound'
                         check (prospect_type in ('psnm','str','ww_inbound')),

  -- Identity
  company              text not null,
  domain               text,
  email                text,
  decision_maker_name  text,
  decision_maker_email text,
  decision_maker_role  text,
  phone                text,
  city                 text,
  postcode             text,
  country              text default 'GB',

  -- Classification
  industry             text,
  sic_codes            text[],
  pallet_estimate      int,
  fit_score            int check (fit_score between 0 and 100),
  exclusion_flags      text[],                               -- 'hazmat','chilled','food','pharma','3pl','residential'

  -- Pipeline
  pipeline_stage       text not null default 'raw'
                         check (pipeline_stage in ('raw','enriched','classified','drafted','dispatched','replied','hot','customer','dead')),
  status               text not null default 'active'
                         check (status in ('active','do_not_contact','unsubscribed','customer','dead')),

  -- Enrichment cache (denormalised for query speed)
  enrichment_data      jsonb,
  enriched_at          timestamptz,
  enrichment_quality   int,                                  -- 0-100

  -- Engagement
  last_touched_at      timestamptz,
  touch_count          int not null default 0,
  hot_flag             bool not null default false,
  hot_since            timestamptz,
  last_reply_intent    text,                                 -- most recent intent classification

  notes                text,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_prospects_stage          on prospects(pipeline_stage);
create index if not exists idx_prospects_type           on prospects(prospect_type);
create index if not exists idx_prospects_hot            on prospects(hot_flag) where hot_flag = true;
create index if not exists idx_prospects_domain         on prospects(domain);
create index if not exists idx_prospects_email          on prospects(email);
create index if not exists idx_prospects_source_ref     on prospects(source_ref);
create index if not exists idx_prospects_created        on prospects(created_at desc);

alter table prospects enable row level security;
create policy "service_role_all_prospects" on prospects
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- updated_at trigger
create or replace function prospects_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_prospects_updated_at on prospects;
create trigger trg_prospects_updated_at
  before update on prospects for each row execute function prospects_set_updated_at();


-- ── prospect_drafts (unified — replaces psnm_atlas_drafts + str_atlas_drafts) ─
create table if not exists prospect_drafts (
  id                   uuid primary key default gen_random_uuid(),
  prospect_id          uuid not null references prospects(id) on delete cascade,
  prospect_type        text not null default 'psnm',         -- mirrors prospects.prospect_type

  -- Content
  touch_number         int not null default 1,
  subject              text not null,
  body                 text not null,
  channel              text not null default 'email'
                         check (channel in ('email','instagram_dm','linkedin_dm','sms')),

  -- Pipeline
  status               text not null default 'pending_critic'
                         check (status in ('pending_critic','pending_approval','approved','sent','rejected','failed','superseded','needs_revision')),
  source               text,                                 -- 'v3_drafter', 'manual', 'autoresponder'

  -- Intelligence metadata
  angle_brief          jsonb,
  critic_log           jsonb,                                -- array of { attempt, verdict, checks, critique }
  critic_iterations    int not null default 0,
  confidence_score     int,
  claim_verdict        text,
  framework            text,

  -- Dispatch tracking
  sg_message_id        text,
  sent_at              timestamptz,
  approved_at          timestamptz,
  approved_by          text default 'ben',

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_prospect_drafts_prospect  on prospect_drafts(prospect_id);
create index if not exists idx_prospect_drafts_status    on prospect_drafts(status);
create index if not exists idx_prospect_drafts_created   on prospect_drafts(created_at desc);

alter table prospect_drafts enable row level security;
create policy "service_role_all_prospect_drafts" on prospect_drafts
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop trigger if exists trg_prospect_drafts_updated_at on prospect_drafts;
create or replace function prospect_drafts_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_prospect_drafts_updated_at
  before update on prospect_drafts for each row execute function prospect_drafts_set_updated_at();


-- ── prospect_replies (with intent classification) ─────────────────────────────
create table if not exists prospect_replies (
  id                   uuid primary key default gen_random_uuid(),
  prospect_id          uuid references prospects(id) on delete set null,
  draft_id             uuid references prospect_drafts(id) on delete set null,

  -- Email data
  from_email           text not null,
  from_name            text,
  subject              text,
  body_text            text,
  message_id           text,
  in_reply_to          text,

  -- Intent classification
  intent               text
                         check (intent in ('interested','not_now','wrong_contact','unsubscribe','asking_question','complaint','auto_reply','unknown')),
  intent_confidence    int check (intent_confidence between 0 and 100),
  intent_reasoning     text,
  next_action          text,                                 -- 'call_now','send_quote','draft_reply','mark_dead','unsubscribe','no_action'

  -- Response tracking
  ben_responded        bool not null default false,
  responded_at         timestamptz,

  received_at          timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

create index if not exists idx_prospect_replies_prospect   on prospect_replies(prospect_id);
create index if not exists idx_prospect_replies_intent     on prospect_replies(intent);
create index if not exists idx_prospect_replies_responded  on prospect_replies(ben_responded) where ben_responded = false;
create index if not exists idx_prospect_replies_received   on prospect_replies(received_at desc);

alter table prospect_replies enable row level security;
create policy "service_role_all_prospect_replies" on prospect_replies
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');


-- ── prospect_status_log (audit trail) ─────────────────────────────────────────
create table if not exists prospect_status_log (
  id                   uuid primary key default gen_random_uuid(),
  prospect_id          uuid not null references prospects(id) on delete cascade,
  from_stage           text,
  to_stage             text not null,
  triggered_by         text not null,                       -- agent name or 'manual'
  notes                text,
  created_at           timestamptz not null default now()
);

create index if not exists idx_prospect_status_log_prospect on prospect_status_log(prospect_id);
create index if not exists idx_prospect_status_log_created  on prospect_status_log(created_at desc);

alter table prospect_status_log enable row level security;
create policy "service_role_all_prospect_status_log" on prospect_status_log
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');


-- ── atlas_v3_run_log (orchestrator audit) ─────────────────────────────────────
create table if not exists atlas_v3_run_log (
  id                   uuid primary key default gen_random_uuid(),
  run_at               timestamptz not null default now(),
  triggered_by         text not null default 'cron',
  decision             text not null,                       -- which agent was selected to run
  agent_run            text,                                -- agent name
  prospects_processed  int default 0,
  actions_taken        int default 0,
  errors               text[],
  duration_ms          int,
  notes                text
);

create index if not exists idx_atlas_v3_run_log_run_at on atlas_v3_run_log(run_at desc);

alter table atlas_v3_run_log enable row level security;
create policy "service_role_all_atlas_v3_run_log" on atlas_v3_run_log
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
