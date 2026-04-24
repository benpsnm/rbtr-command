-- Migration 33: Contacts CRM
-- Phase 1.6 Workstream C

CREATE TABLE IF NOT EXISTS contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  company text,
  title text,
  emails text[] default '{}',
  phones text[] default '{}',
  linkedin_url text,
  address text,
  notes text,
  tags text[] default '{}',
  entities text[] default '{}', -- ['psnm','house','eternal','rbtr','personal','family']
  relationship_type text, -- 'customer','prospect','supplier','trade','mentor','friend','family','medical','vet','school','legal','accountant','advisor'
  last_contact_at timestamptz,
  next_contact_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS contacts_entities_idx ON contacts USING GIN(entities);
CREATE INDEX IF NOT EXISTS contacts_tags_idx ON contacts USING GIN(tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS contacts_search_idx ON contacts USING GIN (
  to_tsvector('english',
    coalesce(first_name,'') || ' ' ||
    coalesce(last_name,'') || ' ' ||
    coalesce(company,'') || ' ' ||
    coalesce(title,'') || ' ' ||
    coalesce(notes,'')
  )
);

CREATE TABLE IF NOT EXISTS contact_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  interaction_type text, -- 'call','email','meeting','text','whatsapp','note'
  direction text, -- 'in','out'
  subject text,
  summary text,
  occurred_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ── Seed known contacts ──────────────────────────────────────────────────────

INSERT INTO contacts (first_name, last_name, company, relationship_type, entities, notes) VALUES
('Nate', NULL, NULL, 'mentor', '{"personal"}', 'Ben''s primary mentor. Monthly check-ins. Key "big calls" logged in Ben portal Nate Log section.'),
('Sam', 'Moore', 'Eternal Kustoms Ltd', 'partner', '{"eternal"}', 'Owner/operator of EK. Ben reports to Sam as external consultant.'),
('Beth', 'Moore', 'Eternal Kustoms Ltd', 'partner', '{"eternal"}', 'Sam''s partner / co-director at EK.'),
('Sam', 'Shaw', 'Eternal Kustoms Ltd', 'partner', '{"eternal"}', 'Incoming shareholder — shares transfer on repayment completion.'),
('Michael', 'Whitaker', 'Eternal Kustoms Ltd', 'partner', '{"eternal"}', 'Incoming shareholder — shares transfer on repayment completion.'),
('Dale', NULL, NULL, 'friend', '{"personal"}', 'Ben''s close friend.'),
('Sarah', NULL, NULL, 'family', '{"family"}', 'Ben''s oldest sister.')
ON CONFLICT DO NOTHING;
