-- Migration 32d: House portal tables
-- Phase 1.6 Workstream A

-- house_jobs already exists from migration 28 — skip if so
CREATE TABLE IF NOT EXISTS house_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text, -- 'builder','electrician','plumber','decorator','tiler','roofer'
  phone text,
  email text,
  day_rate numeric(8,2),
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS house_job_supplier_assignments (
  job_id uuid,
  supplier_id uuid references house_suppliers(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (job_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS house_costs (
  id uuid primary key default gen_random_uuid(),
  category text, -- 'Blue','Pink','Attic','Garage','Compliance','Launch'
  supplier_id uuid references house_suppliers(id),
  amount numeric(10,2) not null,
  date date not null default current_date,
  description text,
  receipt_url text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS house_bookings (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  arrive_date date not null,
  depart_date date not null,
  nights int generated always as (depart_date - arrive_date) stored,
  total_paid numeric(10,2),
  platform text default 'airbnb', -- 'airbnb','booking_com','direct'
  notes text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS house_inventory (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  stock_level int default 0,
  reorder_level int default 2,
  last_restocked date,
  created_at timestamptz default now()
);

-- Seed consumables
INSERT INTO house_inventory (item, stock_level, reorder_level) VALUES
('Tea bags (box)', 2, 1),('Coffee pods', 12, 6),('Toilet roll (4-pack)', 3, 2),
('Kitchen roll', 2, 1),('Dishwasher tabs', 20, 5),('Laundry detergent (caps)', 15, 5),
('Hand soap', 3, 2),('Shower gel', 2, 1),('Shampoo', 2, 1)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS house_compliance (
  id uuid primary key default gen_random_uuid(),
  cert_type text not null, -- 'gas_safety','eicr','fire_risk','pat','co_detectors','fire_alarms','legionella'
  issue_date date,
  expiry_date date,
  document_url text,
  notes text,
  created_at timestamptz default now()
);

-- Seed compliance items
INSERT INTO house_compliance (cert_type) VALUES
('gas_safety'),('eicr'),('fire_risk'),('pat'),('co_detectors'),('fire_alarms'),('legionella')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS house_message_templates (
  id uuid primary key default gen_random_uuid(),
  stage text not null, -- 'booking_confirm','pre_arrival','arrival_day','during_stay','post_stay','problem'
  subject text,
  body text not null,
  variables jsonb default '[]',
  created_at timestamptz default now()
);

-- Seed message templates
INSERT INTO house_message_templates (stage, subject, body) VALUES
('booking_confirm', 'Booking confirmed — 4 Woodhead Mews', 'Hi {{guest_name}},

Your booking is confirmed for {{arrive_date}} to {{depart_date}} ({{nights}} nights).

Address: 4 Woodhead Mews, Blacker Hill, Barnsley S74 0RH

I''ll message you 3 days before arrival with full access details. Any questions before then, just reply here.

Ben'),
('pre_arrival', 'Arrival info — 4 Woodhead Mews', 'Hi {{guest_name}},

You''re arriving in 3 days — here''s everything you need:

Access: Key lockbox on front door. Code: {{lockbox_code}}
Wi-Fi: Network {{wifi_name}} / Password {{wifi_pass}}
Parking: Driveway + street (no permit needed)
Check-in: From 3pm. Check-out: 11am

Hot tub is heated and ready. Instructions on the unit.

Any issues on arrival, text me on {{host_phone}}.

Ben'),
('arrival_day', 'Welcome! You''re all set', 'Hi {{guest_name}},

Hope you had a good journey. Milk and basics are in the fridge.

Everything you need is in the Welcome folder on the kitchen counter — including local restaurants, takeaways, and things to do nearby.

Text me on {{host_phone}} if anything isn''t right.

Enjoy.

Ben'),
('post_stay', 'Thanks for staying — hope to see you again', 'Hi {{guest_name}},

Thanks for staying at 4 Woodhead Mews — hope you had a great time.

If you have 2 minutes, a review would mean a lot: {{review_link}}

And if you''re ever back in Barnsley, you''re always welcome.

Ben'),
('problem', 'Sorting it now — {{issue}}', 'Hi {{guest_name}},

Thanks for letting me know about {{issue}} — I''m on it now.

{{resolution_plan}}

Sorry for the inconvenience. I''ll follow up shortly.

Ben')
ON CONFLICT DO NOTHING;
