-- 43_intelligence_prospects.sql
-- PSNM Prospect Intelligence Engine — companies house harvest table

CREATE TABLE IF NOT EXISTS psnm_intelligence_prospects (
  id                        uuid primary key default gen_random_uuid(),
  company_number            text not null unique,
  company_name              text,
  registered_address        text,
  postcode                  text,
  region                    text,
  sic_codes                 jsonb default '[]'::jsonb,
  incorporation_date        date,
  date_of_creation          date,
  accounts_last_filed       date,
  latest_turnover           numeric,
  turnover_growth_yoy       numeric,
  estimated_employee_count  integer,
  estimated_pallet_volume   text check (estimated_pallet_volume in ('5-49','50-149','150-300','300+','unknown')),
  ambient_likely            boolean default false,
  trigger_signals           jsonb default '[]'::jsonb,
  score_grade               text check (score_grade in ('A','B','C')),
  score_reasoning           text,
  outreach_hook             text,
  enriched_email            text,
  enriched_phone            text,
  enriched_website          text,
  enriched_linkedin         text,
  last_enrichment_attempt   timestamptz,
  created_at                timestamptz default now(),
  updated_at                timestamptz,
  atlas_dispatched          boolean default false,
  atlas_dispatched_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pip_score_grade      ON psnm_intelligence_prospects(score_grade);
CREATE INDEX IF NOT EXISTS idx_pip_atlas_dispatched ON psnm_intelligence_prospects(atlas_dispatched);
CREATE INDEX IF NOT EXISTS idx_pip_created_at       ON psnm_intelligence_prospects(created_at desc);
CREATE INDEX IF NOT EXISTS idx_pip_company_number   ON psnm_intelligence_prospects(company_number);

ALTER TABLE psnm_intelligence_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select" ON psnm_intelligence_prospects FOR SELECT USING (true);

COMMENT ON TABLE psnm_intelligence_prospects IS 'INTERNAL — PSNM intelligence engine harvest results.';
