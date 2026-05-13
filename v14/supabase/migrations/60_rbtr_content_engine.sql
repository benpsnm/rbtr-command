-- ═══════════════════════════════════════════════════════════════════════════
-- 60 · RBTR Content Engine — three tables
-- rbtr_content_drafts   — platform-aware multi-format draft store
-- rbtr_content_calendar — planned vs actual publishing schedule
-- rbtr_content_published — live content with engagement metrics
--
-- Replaces: psnm_content_drafts (kept for backwards compat; new engine uses this)
-- Apply via: Supabase SQL editor → project mpxgyobotiqcawmqlhbf
-- ═══════════════════════════════════════════════════════════════════════════

-- ── rbtr_content_drafts ────────────────────────────────────────────────────
create table if not exists rbtr_content_drafts (
  id               uuid        primary key default gen_random_uuid(),

  -- Classification
  platform         text        not null check (platform in (
                                  'instagram', 'youtube', 'tiktok', 'podcast', 'pinterest'
                                )),
  content_type     text        not null,
  -- instagram: reel | carousel | story | post
  -- youtube:   vlog | short | sponsor-feature | qa | long-form
  -- tiktok:    short | trend
  -- podcast:   episode | clip
  -- pinterest: pin | board-desc

  vibe             text        check (vibe in (
                                  'build-progress',
                                  'behind-the-scenes',
                                  'sponsor-showcase',
                                  'family',
                                  'philosophy',
                                  'wellness',
                                  'route'
                                )),

  -- Content fields
  title            text,                          -- YT title, podcast ep title, pin title
  body             text        not null,           -- main caption / transcript / script body
  caption          text,                          -- short platform caption (IG, TikTok)
  hashtags         text[],                        -- parsed hashtag array
  voiceover        text,                          -- spoken word script for reels / vlogs
  description      text,                          -- YT description, podcast show notes
  thumbnail_brief  text,                          -- visual direction for thumbnail/cover

  -- Signal tracing
  source_signal    text        check (source_signal in (
                                  'daily_log', 'task_complete', 'voice_note', 'manual', 'week_generate'
                                )),
  source_id        uuid,                          -- FK to source row (nullable)
  source_summary   text,                          -- human-readable signal description

  -- Build tracking
  build_week       smallint    check (build_week between 1 and 60),
  week_date        date,                          -- Monday of the content week

  -- Workflow
  status           text        not null default 'draft' check (status in (
                                  'draft', 'approved', 'scheduled', 'posted', 'rejected'
                                )),
  approved_at      timestamptz,
  scheduled_at     timestamptz,
  posted_at        timestamptz,
  rejection_note   text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_rcd_status       on rbtr_content_drafts (status);
create index if not exists idx_rcd_platform     on rbtr_content_drafts (platform);
create index if not exists idx_rcd_week_date    on rbtr_content_drafts (week_date desc);
create index if not exists idx_rcd_build_week   on rbtr_content_drafts (build_week);
create index if not exists idx_rcd_created      on rbtr_content_drafts (created_at desc);

alter table rbtr_content_drafts enable row level security;
create policy "service_role_all_rcd"
  on rbtr_content_drafts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- auto-update updated_at
create or replace function rbtr_content_drafts_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_rcd_updated_at on rbtr_content_drafts;
create trigger trg_rcd_updated_at
  before update on rbtr_content_drafts
  for each row execute function rbtr_content_drafts_set_updated_at();


-- ── rbtr_content_calendar ──────────────────────────────────────────────────
create table if not exists rbtr_content_calendar (
  id             uuid        primary key default gen_random_uuid(),
  planned_date   date        not null,
  platform       text        not null,
  content_type   text        not null,
  vibe           text,
  title          text,
  slot_note      text,                            -- editorial note for this slot
  draft_id       uuid        references rbtr_content_drafts(id) on delete set null,
  status         text        not null default 'planned' check (status in (
                               'planned', 'drafted', 'approved', 'posted', 'skipped'
                             )),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_rcc_date     on rbtr_content_calendar (planned_date);
create index if not exists idx_rcc_status   on rbtr_content_calendar (status);
create index if not exists idx_rcc_platform on rbtr_content_calendar (platform);

alter table rbtr_content_calendar enable row level security;
create policy "service_role_all_rcc"
  on rbtr_content_calendar for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function rbtr_content_calendar_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_rcc_updated_at on rbtr_content_calendar;
create trigger trg_rcc_updated_at
  before update on rbtr_content_calendar
  for each row execute function rbtr_content_calendar_set_updated_at();


-- ── rbtr_content_published ─────────────────────────────────────────────────
create table if not exists rbtr_content_published (
  id                  uuid        primary key default gen_random_uuid(),
  draft_id            uuid        references rbtr_content_drafts(id) on delete set null,
  platform            text        not null,
  content_type        text        not null,
  published_url       text,
  platform_post_id    text,                       -- native ID from platform API

  -- Engagement (manual import until API integration)
  views               int         not null default 0,
  likes               int         not null default 0,
  comments            int         not null default 0,
  shares              int         not null default 0,
  saves               int         not null default 0,
  followers_gained    int         not null default 0,
  watch_time_seconds  int         not null default 0,   -- YouTube / TikTok
  metrics_updated_at  timestamptz,

  published_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists idx_rcp_platform     on rbtr_content_published (platform);
create index if not exists idx_rcp_published_at on rbtr_content_published (published_at desc);

alter table rbtr_content_published enable row level security;
create policy "service_role_all_rcp"
  on rbtr_content_published for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
