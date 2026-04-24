-- Migration 32f: PSNM Atlas templates, call scripts, touch sequencing
-- Phase 1.6 Workstream B

-- Warm leads (touch sequencing support)
CREATE TABLE IF NOT EXISTS psnm_warm_leads (
  id uuid primary key default gen_random_uuid(),
  company text,
  contact_name text,
  phone text,
  email text,
  pallets_count int,
  temperature text default 'cold', -- 'hot','warm','cold','dead'
  tier int default 3, -- 1=500+ pallets, 2=100-500, 3=<100
  source text, -- 'whichwarehouse','direct','referral','cold_outreach'
  status text default 'not_contacted',
  last_contact_date date,
  last_contact_type text, -- 'call','email','site_visit','voicemail'
  next_contact_date date,
  quote_sent_at timestamptz,
  quote_amount numeric(10,2),
  notes text,
  score int default 0, -- priority engine computed score
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Email templates
CREATE TABLE IF NOT EXISTS psnm_email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text, -- 'cold','follow_up','quote','welcome','renewal'
  subject text not null,
  body text not null,
  variables jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Call scripts
CREATE TABLE IF NOT EXISTS psnm_call_scripts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text, -- 'cold_first','warm_followup','voicemail_1','voicemail_2','incoming_enquiry','site_visit_followup'
  script_body text not null,
  objection_handlers jsonb default '[]',
  created_at timestamptz default now()
);

-- Touch scheduling
CREATE TABLE IF NOT EXISTS psnm_touch_schedule (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  lead_type text, -- 'warm_lead','outreach_target'
  touch_number int,
  scheduled_for timestamptz,
  status text default 'pending', -- 'pending','completed','skipped'
  outcome text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ── Seed 5 email templates ────────────────────────────────────────────────────

INSERT INTO psnm_email_templates (name, category, subject, body, variables) VALUES
(
  'Cold Outreach First',
  'cold',
  'Pallet storage in Rotherham — {{company}}',
  'Hi {{first_name}},

Ben here from Pallet Storage Near Me, Hellaby Industrial Estate in Rotherham. We run a 700-pallet warehouse and I noticed {{company}} might have storage needs based on {{reason_for_contact}}.

We''re £6/pallet/week all-in, 24/7 access for customers, secure, and we don''t tie you to long contracts.

If storage is ever a problem for you, worth a quick 5-min chat — I can tell you what we charge and what we don''t, and you can decide if it''s worth a site visit.

Happy for you to call me direct on 07506 255033 or reply here.

Ben
{{sender_name}} | Pallet Storage Near Me
palletstoragenearme.co.uk',
  '["{{first_name}}","{{company}}","{{reason_for_contact}}","{{sender_name}}"]'::jsonb
),
(
  'Quote Follow-Up',
  'follow_up',
  'Your quote — {{company}}',
  '{{first_name}},

Quick follow-up on the quote I sent for {{pallets}} pallets at £{{quote_amount}}/week.

Two questions:
1. Any changes needed to the quote?
2. What''s your timeline if the numbers work?

If it''s useful, happy to book you in for a 15-min site visit this week — seeing the facility usually answers the remaining questions.

07506 255033 whenever works for you.

Ben',
  '["{{first_name}}","{{company}}","{{pallets}}","{{quote_amount}}"]'::jsonb
),
(
  'Site Visit Invite',
  'follow_up',
  'Site visit — Hellaby, Rotherham',
  '{{first_name}},

Good to speak earlier. As agreed, come and see the facility — always easier to commit once you''ve walked it.

Address: Unit 3C Denaby Way, Hellaby Industrial Estate, Rotherham S66 8HR
When: {{proposed_date}} at {{proposed_time}}
Duration: 20 mins max

Text me on 07506 255033 when you''re 10 mins out and I''ll meet you at the gate.

Ben',
  '["{{first_name}}","{{proposed_date}}","{{proposed_time}}"]'::jsonb
),
(
  'New Customer Welcome',
  'welcome',
  'Welcome to PSNM — first steps',
  '{{first_name}},

Great to have {{company}} on board. Here''s what happens this week:

1. Your pallets arrive at: Unit 3C Denaby Way, Rotherham S66 8HR
2. 24/7 access code: {{access_code}}
3. Your account manager: Ben on 07506 255033
4. First invoice: {{invoice_date}} — 30-day terms
5. Your pallet locations will be emailed after receipt

Anything unclear or urgent — call me directly.

Ben',
  '["{{first_name}}","{{company}}","{{access_code}}","{{invoice_date}}"]'::jsonb
),
(
  'Renewal Reminder',
  'renewal',
  '{{company}} renewal — quick chat?',
  '{{first_name}},

Your current storage agreement renews {{renewal_date}} ({{days}} days).

Pallet rates are rising across the industry next quarter. I''d rather lock your rate in early than see it drift. Happy to run the numbers — 5 mins on the phone usually covers it.

07506 255033 — or reply with a time that works.

Ben',
  '["{{first_name}}","{{company}}","{{renewal_date}}","{{days}}"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ── Seed 6 call scripts ───────────────────────────────────────────────────────

INSERT INTO psnm_call_scripts (name, category, script_body, objection_handlers) VALUES
(
  'Cold Outreach First Call',
  'cold_first',
  'Hi, is that {{contact_name}}?

Good. My name''s Ben, I''m calling from Pallet Storage Near Me in Rotherham — we''ve got a 700-pallet secure warehouse at Hellaby, and I noticed {{company}} does {{reason_for_contact}}.

I won''t take long — one question: is pallet storage something that comes up for you, or is that handled completely in-house?

[If yes] Perfect. Can I get 5 minutes with you this week to run through the numbers — I can tell you the rate and what''s included, and you can tell me whether it''s worth a site visit.

[If not now] No problem. When''s a better time to call — morning or afternoon tends to be easier for most people.',
  '[{"objection":"We have our own warehouse","response":"Understood. We get that a lot — a lot of our customers use us as overflow when their own space fills up. Worth knowing we''re here for when that happens."},{"objection":"Too busy right now","response":"No problem — is it better to call you back in a week, or would email be easier to start with?"},{"objection":"Not interested","response":"That''s fine. I''ll leave my number in case it ever comes up. 07506 255033 — ask for Ben."}]'::jsonb
),
(
  'Warm Follow-Up After Quote',
  'warm_followup',
  'Hi {{contact_name}}, it''s Ben from Pallet Storage Near Me — I sent you a quote last week for {{pallets}} pallets at {{quote_amount}}/week.

Did you get a chance to look at it?

[If yes — any questions]
The two things people usually ask about: access hours (it''s 24/7 with a code) and the minimum period (we don''t tie you in, but practically most people start with 4 weeks).

[If timeline question]
What would need to happen on your end for this to go ahead?',
  '[{"objection":"Still comparing options","response":"Makes sense. What are the other options you''re looking at — is it other warehouses, or keeping it in-house?"},{"objection":"Price is too high","response":"What are you paying now, or what were you hoping for? I might be able to do something on volume if you can commit to a number."},{"objection":"Need to speak to boss / finance","response":"Understood. What does that conversation look like — is it a quick yes/no, or does it need a formal proposal?"}]'::jsonb
),
(
  'Voicemail 1st Attempt',
  'voicemail_1',
  'Hi {{contact_name}}, this is Ben from Pallet Storage Near Me in Rotherham. I''m calling about storage at Hellaby — we''ve got capacity now and I wanted to see if it was something worth a chat about. I''ll try you again, or you can call me back on 07506 255033. Thanks.',
  '[]'::jsonb
),
(
  'Voicemail 2nd Attempt',
  'voicemail_2',
  'Hi {{contact_name}}, Ben again from Pallet Storage Near Me — I called last week but didn''t catch you. One thing I should have mentioned: we''re at £6/pallet/week all-in, no minimum contract, and 24/7 access. If that''s useful to know, give me a call on 07506 255033 or reply to my email. I won''t keep calling after this — I just wanted to make sure you had the number.',
  '[]'::jsonb
),
(
  'Incoming Enquiry Discovery',
  'incoming_enquiry',
  'Thanks for getting in touch. A few quick questions to make sure I quote you properly:

1. How many pallets are you looking to store — and is that a fixed number, or does it vary?
2. What are you storing — standard pallets, racked goods, anything awkward?
3. How often do you need access — daily, weekly, monthly?
4. What''s the timeline — when would you need space from?
5. Do you have a budget in mind, or do you want me to give you a number first?

[Then] Based on that, I can get you a quote within the hour and if the numbers work, get you in for a site visit this week.',
  '[{"objection":"Just looking for a rough price","response":"Rough price: £6/pallet/week, 24/7 access, no minimum. If that''s in the ballpark, give me the pallet count and I''ll confirm exact."},{"objection":"We''re just exploring options","response":"That''s fine. What would make you choose one warehouse over another — price, location, access hours, something else?"}]'::jsonb
),
(
  'Site Visit Follow-Up',
  'site_visit_followup',
  'Hi {{contact_name}}, Ben here from Pallet Storage Near Me. Good to meet you yesterday — hope the visit was useful.

Did it answer the questions you had?

[If yes] Good. What''s the next step on your end — is there a decision to make, or does someone else need to sign off?

[If more questions] What''s still outstanding — I might be able to answer it now.

The key thing I want to make sure: do the numbers work for you? Because if they do, I can have space confirmed today and give you an access code.',
  '[{"objection":"Need to think about it","response":"Understood. What''s the main thing to think through — the price, the timing, or something else?"},{"objection":"Need to get sign-off","response":"Who''s the decision maker — is that something you can email them while I''m on the phone, or do you need to go back to them first?"}]'::jsonb
)
ON CONFLICT DO NOTHING;
