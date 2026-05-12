-- ── PSNM WW Enquiries Table ──────────────────────────────────────────────────
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- Created: 2026-05-12

CREATE TABLE IF NOT EXISTS psnm_ww_enquiries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id      TEXT,                          -- dedup key
  gmail_thread_id       TEXT,                          -- Gmail thread (null for IMAP)
  received_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_email            TEXT,
  from_name             TEXT,
  subject               TEXT,
  raw_email_body        TEXT,                          -- full body preview (2000 chars)
  extracted_data        JSONB DEFAULT '{}',            -- structured extract from Claude
  classification        TEXT NOT NULL DEFAULT 'UNCLEAR', -- FULL_FIT | PARTIAL_FIT | WRONG_FIT_KEEP_DOOR_OPEN | WRONG_FIT_DECLINE | UNCLEAR
  confidence            INTEGER DEFAULT 0,             -- 0-100
  classification_reason TEXT,                          -- one-sentence reason
  draft_subject         TEXT,                          -- Claude-drafted reply subject
  draft_body            TEXT,                          -- Claude-drafted reply body
  draft_next_step       TEXT,                          -- call_back | email_back | no_action | needs_info
  drafter_notes         TEXT,                          -- flags for Ben
  draft_gmail_message_id TEXT,                         -- Gmail draft ID if manually created
  ben_status            TEXT NOT NULL DEFAULT 'pending_review', -- pending_review | sent | archived | declined
  ben_responded_at      TIMESTAMPTZ,
  won_lost              TEXT,                          -- won | lost | pending (fill in after outcome)
  notes                 TEXT,                          -- Ben's manual notes
  source                TEXT DEFAULT 'ww_auto',
  detection_type        TEXT,                          -- definite | possible
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS psnm_ww_enquiries_gmail_message_id_key
  ON psnm_ww_enquiries (gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS psnm_ww_enquiries_classification_idx
  ON psnm_ww_enquiries (classification);

CREATE INDEX IF NOT EXISTS psnm_ww_enquiries_ben_status_idx
  ON psnm_ww_enquiries (ben_status);

CREATE INDEX IF NOT EXISTS psnm_ww_enquiries_received_at_idx
  ON psnm_ww_enquiries (received_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS psnm_ww_enquiries_updated_at ON psnm_ww_enquiries;
CREATE TRIGGER psnm_ww_enquiries_updated_at
  BEFORE UPDATE ON psnm_ww_enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── PSNM Atlas Prospects Table ────────────────────────────────────────────────
-- Stores Leadinfo + manual seed prospects scored for PSNM relevance.

CREATE TABLE IF NOT EXISTS psnm_atlas_prospects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      TEXT NOT NULL,
  postcode          TEXT,
  country           TEXT DEFAULT 'GB',
  sector            TEXT,
  contact_name      TEXT,
  contact_email     TEXT,
  website           TEXT,
  phone             TEXT,
  employees         INTEGER,
  sic_code          TEXT,
  linkedin_url      TEXT,
  psnm_score        INTEGER DEFAULT 0,                 -- 0-100 relevance score
  status            TEXT NOT NULL DEFAULT 'ready_for_enrichment', -- ready_for_enrichment | nurture_long_tail | noise | outreach_sent | converted | declined
  source            TEXT,                              -- leadinfo_may12_manual_seed | leadinfo_may12_csv | etc
  notes             TEXT,
  rbtr_overlap      BOOLEAN DEFAULT FALSE,             -- TRUE = also a RBTR sponsor target — do not cold-email
  raw_data          JSONB,                             -- original CSV row
  outreach_sent_at  TIMESTAMPTZ,
  outreach_email_id TEXT,
  reply_received_at TIMESTAMPTZ,
  reply_status      TEXT,
  added_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS psnm_atlas_prospects_score_idx
  ON psnm_atlas_prospects (psnm_score DESC);

CREATE INDEX IF NOT EXISTS psnm_atlas_prospects_status_idx
  ON psnm_atlas_prospects (status);

CREATE INDEX IF NOT EXISTS psnm_atlas_prospects_source_idx
  ON psnm_atlas_prospects (source);

-- Prevent exact company_name + postcode duplicates
CREATE UNIQUE INDEX IF NOT EXISTS psnm_atlas_prospects_company_postcode_key
  ON psnm_atlas_prospects (company_name, postcode)
  WHERE postcode IS NOT NULL AND postcode != '';

-- Auto-update updated_at
DROP TRIGGER IF EXISTS psnm_atlas_prospects_updated_at ON psnm_atlas_prospects;
CREATE TRIGGER psnm_atlas_prospects_updated_at
  BEFORE UPDATE ON psnm_atlas_prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Backfill: Today's Peterborough WW enquiry (12 May 2026) ──────────────────
-- Ben replied manually. This seeds the first real row in psnm_ww_enquiries.

INSERT INTO psnm_ww_enquiries (
  gmail_message_id,
  received_at,
  from_email,
  subject,
  raw_email_body,
  extracted_data,
  classification,
  confidence,
  classification_reason,
  draft_subject,
  draft_body,
  draft_next_step,
  drafter_notes,
  ben_status,
  ben_responded_at,
  notes,
  source,
  detection_type
) VALUES (
  'peterborough-ww-backfill-20260512',
  '2026-05-12T00:00:00Z',
  'whichwarehouse-notification@whichwarehouse.co.uk',
  'WhichWarehouse enquiry — Peterborough storage',
  'WW enquiry: Peterborough area, 3 pallets, frozen food storage required. Client seeking ambient/cold storage near Peterborough.',
  '{"location": "Peterborough", "pallet_count": 3, "product_type": "frozen food", "frozen_needed": true, "chilled_needed": false, "hazmat_flag": false, "distance_from_s66_miles": 85, "special_requirements": "frozen food storage", "contact_name": null, "contact_company": null, "urgency": "unknown"}'::jsonb,
  'WRONG_FIT_KEEP_DOOR_OPEN',
  90,
  'Frozen food = hard exclusion. PSNM is ambient only. Peterborough also 85+ miles. Friendly decline, stay on WW radar.',
  'Re: WhichWarehouse enquiry — Peterborough storage',
  E'Thanks for the forward. Bit of a tricky one for us — the frozen food requirement is a hard no, we''re ambient storage only at Hellaby. We can''t touch temp-controlled goods.\n\nWorth keeping PSNM on your list for future ambient enquiries in Yorkshire though — that''s our wheelhouse.\n\nCheers\nBen\nPallet Storage Near Me\n07506 255033',
  'no_action',
  'Ben replied manually on 12 May 2026 — this row is a backfill for the first WW enquiry through the new system.',
  'ben_responded_manually',
  '2026-05-12T12:00:00Z',
  'First WW enquiry through system — Ben handled manually. Frozen food + Peterborough = wrong fit. Test case validated.',
  'ww_backfill_manual',
  'definite'
) ON CONFLICT (gmail_message_id) DO NOTHING;
