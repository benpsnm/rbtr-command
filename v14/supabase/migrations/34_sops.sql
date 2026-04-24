-- Migration 34: SOPs library
-- Phase 1.6 Workstream D

CREATE TABLE IF NOT EXISTS sops (
  id uuid primary key default gen_random_uuid(),
  entity text not null, -- 'psnm','house','eternal','ben'
  category text,
  title text not null,
  description text,
  frequency text, -- 'daily','weekly','monthly','quarterly','annually','on_event'
  steps jsonb, -- array of {step_number, action, detail, estimated_mins}
  required_items text[],
  output_expected text,
  created_by text default 'Ben Greenwood',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS sop_executions (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid references sops(id),
  executed_by text default 'Ben Greenwood',
  started_at timestamptz default now(),
  completed_at timestamptz,
  steps_completed jsonb default '[]',
  notes text,
  issues_encountered text
);

-- ── PSNM SOPs (6) ────────────────────────────────────────────────────────────

INSERT INTO sops (entity, category, title, description, frequency, steps, required_items, output_expected) VALUES
(
  'psnm', 'safety', 'Daily Forklift Check',
  'Pre-shift inspection of the forklift. Non-negotiable before first use each day.',
  'daily',
  '[
    {"step_number":1,"action":"Visual inspection","detail":"Walk around the forklift. Check for visible damage — forks, mast, tyres, lights, seatbelt. Any damage: tag out, do not use, call supplier.","estimated_mins":2},
    {"step_number":2,"action":"Fluid levels","detail":"Check engine oil, hydraulic fluid, coolant, and LPG cylinder pressure (if applicable). Low fluid = add or call for service.","estimated_mins":3},
    {"step_number":3,"action":"Horn test","detail":"Sound horn three times. Must be audible across the warehouse floor.","estimated_mins":1},
    {"step_number":4,"action":"Brake test","detail":"Start engine, drive forward 2 metres, apply brakes firmly. Truck must stop cleanly with no pull to either side.","estimated_mins":2},
    {"step_number":5,"action":"Document completion","detail":"Sign the forklift check sheet with date, time, and initials. File in the yellow folder by the charging station.","estimated_mins":1}
  ]'::jsonb,
  '["Forklift check sheet","Pen","PPE (hi-vis + boots)"]',
  'Signed check sheet filed. Any faults logged and actioned.'
),
(
  'psnm', 'operations', 'Inbound Pallet Receipt',
  'Process for receiving pallets from a customer or supplier. Accuracy prevents billing disputes.',
  'on_event',
  '[
    {"step_number":1,"action":"Check paperwork","detail":"Delivery note must match customer name, pallet count, and goods description. If there is a discrepancy — stop. Do not sign until confirmed.","estimated_mins":3},
    {"step_number":2,"action":"Condition check","detail":"Inspect each pallet for damage — damaged shrink wrap, crushed cartons, split pallets. Photograph any damage before moving.","estimated_mins":3},
    {"step_number":3,"action":"Weigh if required","detail":"Weigh pallets over 800kg, or any pallet where contents look denser than declared. Log weight.","estimated_mins":2},
    {"step_number":4,"action":"Allocate to location","detail":"Assign a bay/row/position. Mark location on the paper location sheet and on the pallet tag.","estimated_mins":2},
    {"step_number":5,"action":"Log in system","detail":"Add to Supabase: company, pallet count, location, date received, any damage notes.","estimated_mins":3},
    {"step_number":6,"action":"Notify customer","detail":"Send WhatsApp or email to customer confirming receipt, location, and any damage notes. Template in RBTR command.","estimated_mins":2},
    {"step_number":7,"action":"File paperwork","detail":"Delivery note into the customer''s folder (filing cabinet, alphabetical by company name).","estimated_mins":1}
  ]'::jsonb,
  '["Delivery note","Camera/phone","Location sheet","Supabase access"]',
  'Customer notified. Pallets logged. Location confirmed. Paperwork filed.'
),
(
  'psnm', 'operations', 'Outbound Pallet Release',
  'Process for releasing pallets when a customer collects or arranges delivery.',
  'on_event',
  '[
    {"step_number":1,"action":"Verify release authorisation","detail":"Customer must have authorised the release via email or WhatsApp message. Never release on verbal request alone — need written confirmation.","estimated_mins":2},
    {"step_number":2,"action":"Locate pallets","detail":"Check location sheet for customer''s bay/row/position. Cross-reference pallet count with record.","estimated_mins":3},
    {"step_number":3,"action":"Load or assist with lift","detail":"Assist customer vehicle / delivery driver as required. Never rush a lift — pallets are heavy.","estimated_mins":10},
    {"step_number":4,"action":"Update system","detail":"Mark pallets as released in Supabase. Update occupancy count.","estimated_mins":2},
    {"step_number":5,"action":"Close out record","detail":"If customer has zero pallets remaining, archive their record. Note collection date.","estimated_mins":1}
  ]'::jsonb,
  '["Written release authorisation","Location sheet","Supabase access"]',
  'Pallets released. Record updated. Occupancy count accurate.'
),
(
  'psnm', 'operations', 'Monthly Stock Count',
  'Full physical count of all pallets. Identifies discrepancies before they become billing disputes.',
  'monthly',
  '[
    {"step_number":1,"action":"Print location list","detail":"Print current customer location list from Supabase. This is your walksheet.","estimated_mins":5},
    {"step_number":2,"action":"Walk and count","detail":"Work row by row, bay by bay. Count every pallet. Mark actual count next to expected count on sheet.","estimated_mins":90},
    {"step_number":3,"action":"Discrepancy investigation","detail":"Any difference of 5+ pallets: recount that bay before logging. Check for misplaced pallets in adjacent rows.","estimated_mins":15},
    {"step_number":4,"action":"Sign off","detail":"Sign completed sheet with date. Note total counted vs total in system.","estimated_mins":5},
    {"step_number":5,"action":"File and update","detail":"Update Supabase with final count. File paper sheet in monthly count folder. If significant discrepancy, call affected customer.","estimated_mins":5}
  ]'::jsonb,
  '["Location printout","Pen","Highlighter"]',
  'Signed count sheet filed. System updated. Any discrepancies resolved or logged.'
),
(
  'psnm', 'safety', 'Incident Report',
  'Process for reporting any accident, near-miss, or damage incident. Do not skip or delay — RIDDOR has time limits.',
  'on_event',
  '[
    {"step_number":1,"action":"Make area safe","detail":"Ensure the immediate area is safe. If anyone is injured, call 999 first. Do not move injured person unless in immediate danger.","estimated_mins":5},
    {"step_number":2,"action":"Call H&S contact","detail":"Notify your H&S contact (if designated). For serious incidents, this is immediate.","estimated_mins":5},
    {"step_number":3,"action":"Photograph","detail":"Photograph scene, equipment involved, and any injuries (with consent). Do not alter the scene until photos taken.","estimated_mins":5},
    {"step_number":4,"action":"Witness statement","detail":"Take a written statement from any witness. Name, date, time, what they saw.","estimated_mins":15},
    {"step_number":5,"action":"RIDDOR assessment","detail":"Is this RIDDOR reportable? Criteria: death, specified injury (fracture, amputation etc), over-7-day incapacitation, dangerous occurrence. If yes, report to HSE within required timescale.","estimated_mins":10},
    {"step_number":6,"action":"File incident report","detail":"Complete the RBTR incident report form. File in the safety folder with photos and witness statements.","estimated_mins":10},
    {"step_number":7,"action":"Notify insurer if needed","detail":"If property damage > £500 or personal injury involved, notify insurer within 24 hours.","estimated_mins":5}
  ]'::jsonb,
  '["Incident report form","Camera","Emergency contacts list"]',
  'Incident documented. RIDDOR assessed. Insurer notified if required.'
),
(
  'psnm', 'commercial', 'New Customer Onboarding',
  'End-to-end onboarding for a new storage customer. Gets them from signed quote to active account.',
  'on_event',
  '[
    {"step_number":1,"action":"Contract signed","detail":"Confirm signed storage agreement is on file. Digital PDF preferred. No pallets on site before contract is signed.","estimated_mins":2},
    {"step_number":2,"action":"Credit check","detail":"Basic credit check via Companies House / Creditsafe for new commercial accounts. Note any flags.","estimated_mins":5},
    {"step_number":3,"action":"Account code assigned","detail":"Assign a unique account code (e.g. CEPAC01). Used in all future references.","estimated_mins":2},
    {"step_number":4,"action":"Access codes issued","detail":"Assign 24/7 gate code and any door codes. Log in Supabase customer record. Email code to customer.","estimated_mins":3},
    {"step_number":5,"action":"Welcome email sent","detail":"Send Welcome template from PSNM templates. Include: address, access code, account code, invoice date, Ben''s number.","estimated_mins":3},
    {"step_number":6,"action":"First invoice scheduled","detail":"Note first invoice date in Supabase. Default: first of next month. 30-day terms.","estimated_mins":2},
    {"step_number":7,"action":"Customer file created","detail":"Physical folder (alphabetical) with: signed contract, credit check, onboarding checklist.","estimated_mins":5}
  ]'::jsonb,
  '["Signed contract","Account code list","Welcome email template"]',
  'Customer active. File complete. First invoice date set. Welcome sent.'
);

-- ── House SOPs (4) ───────────────────────────────────────────────────────────

INSERT INTO sops (entity, category, title, description, frequency, steps, required_items, output_expected) VALUES
(
  'house', 'operations', '3-Hour STR Turnover',
  'Full clean and reset between guest stays. 3-hour window from checkout to next check-in.',
  'on_event',
  '[
    {"step_number":1,"action":"Strip beds","detail":"All 3 bedrooms. Duvet covers, pillow cases, mattress protectors. Everything into laundry bags. Start washing machine immediately.","estimated_mins":15},
    {"step_number":2,"action":"Wash bedding","detail":"Full wash cycle. Use hypoallergenic detergent. Tumble dry if available — guests hate slightly-damp linen.","estimated_mins":60},
    {"step_number":3,"action":"Clean all 3 bathrooms","detail":"Toilet, sink, shower/bath — scrub and disinfect. Replace towels. Restock loo roll, soap, shower gel, shampoo. Check mirrors.","estimated_mins":30},
    {"step_number":4,"action":"Kitchen deep clean","detail":"Wipe all surfaces, inside microwave, hob rings, oven door. Empty and clean fridge of previous guest food. Reload dishwasher. Restock coffee, tea, milk, butter.","estimated_mins":25},
    {"step_number":5,"action":"Vacuum all floors","detail":"Lounge, bedrooms, stairs, hallway. Get under beds. Check for forgotten items.","estimated_mins":20},
    {"step_number":6,"action":"Mop hard floors","detail":"Kitchen, bathrooms, hallway.","estimated_mins":15},
    {"step_number":7,"action":"Restock consumables","detail":"Check inventory log. Restock tea bags, coffee, toilet roll, kitchen roll, dishwasher tabs. Log restocked items.","estimated_mins":10},
    {"step_number":8,"action":"Check for damage","detail":"Walk every room. Photograph anything broken or missing before next guest arrives.","estimated_mins":5},
    {"step_number":9,"action":"Photograph finished state","detail":"3-4 photos of made beds, cleaned kitchen, bathrooms. Timestamped. File in Google Photos album.","estimated_mins":5},
    {"step_number":10,"action":"Final check","detail":"Hot tub clear and clean. Lockbox code reset if needed. Guest welcome pack on counter. Lights off except entry hall. Heating set to 18°C.","estimated_mins":5}
  ]'::jsonb,
  '["Cleaning kit","Fresh linen set x3","Consumables stock","Phone for photos"]',
  'Property guest-ready. All rooms clean. Linen changed. Consumables restocked. Photographed.'
),
(
  'house', 'operations', 'Guest Arrival Check',
  'Pre-arrival preparation and arrival-day setup to guarantee a first impression that earns a 5-star review.',
  'on_event',
  '[
    {"step_number":1,"action":"Final walkthrough (3 days before)","detail":"Walk every room. Check everything is clean and working. Hot tub temperature check (should be 37-38°C). WiFi router working.","estimated_mins":15},
    {"step_number":2,"action":"Send pre-arrival message","detail":"3 days before, send pre-arrival template: lockbox code, WiFi, parking, check-in time.","estimated_mins":3},
    {"step_number":3,"action":"Arrival day — temperature set","detail":"Set heating to 20°C before arrival. Hot tub should be at 38°C.","estimated_mins":2},
    {"step_number":4,"action":"Arrival day — lights on","detail":"Leave hall light and kitchen light on. Creates a welcoming arrival.","estimated_mins":1},
    {"step_number":5,"action":"Arrival day — welcome message","detail":"On arrival day (2pm), send welcome message confirming they can check in from 3pm and wishing them a good stay.","estimated_mins":2},
    {"step_number":6,"action":"Phone standby","detail":"Be available by text on arrival day until 9pm. Respond to any access or issue messages within 10 minutes.","estimated_mins":0}
  ]'::jsonb,
  '["Phone (for messages)"]',
  'Guest arrived. Access smooth. Welcome message sent.'
),
(
  'house', 'operations', 'Guest Departure Checkout',
  'Checkout process to identify damage and ensure smooth transition to next booking.',
  'on_event',
  '[
    {"step_number":1,"action":"10am reminder message","detail":"Message guest at 10am on checkout day reminding checkout is 11am. Friendly, not chasing.","estimated_mins":1},
    {"step_number":2,"action":"11am walkthrough","detail":"Walk through property immediately after guest departure. Check for damage, missing items, cleanliness level.","estimated_mins":10},
    {"step_number":3,"action":"Photograph any issues","detail":"Photograph any damage or missing items immediately. Timestamped photo. Before asking guest anything.","estimated_mins":5},
    {"step_number":4,"action":"Log damage if any","detail":"Log any issues in House portal → Bookings. If damage warrants a claim, raise within 24 hours via platform.","estimated_mins":5},
    {"step_number":5,"action":"Leave review within 24hr","detail":"Leave a guest review on the platform within 24 hours while details are fresh.","estimated_mins":5}
  ]'::jsonb,
  '["Phone for photos","House portal access"]',
  'Walkthrough complete. Any damage photographed and logged. Review left.'
),
(
  'house', 'maintenance', 'Hot Tub Weekly Service',
  'Weekly hot tub maintenance to keep water safe and equipment running. Non-negotiable.',
  'weekly',
  '[
    {"step_number":1,"action":"Test water chemistry","detail":"Use test strips (or digital tester). Check: pH (target 7.2-7.6), Chlorine (3-5ppm), Alkalinity (80-120ppm).","estimated_mins":5},
    {"step_number":2,"action":"Adjust chemicals if needed","detail":"pH up or down as needed. Add chlorine granules if low. Never mix chemicals. Add separately, circulate for 30 mins between each.","estimated_mins":10},
    {"step_number":3,"action":"Clean filter","detail":"Remove filter cartridge. Rinse with hose. If greasy, spray with filter cleaner and leave 20 mins before rinsing.","estimated_mins":10},
    {"step_number":4,"action":"Wipe shell and cover","detail":"Wipe the tub shell above the waterline with a hot tub cleaner. Wipe the cover with cover conditioner.","estimated_mins":10},
    {"step_number":5,"action":"Full water change (if needed)","detail":"Change water every 3 months or if chemistry cannot be balanced. Drain, scrub, refill, re-dose.","estimated_mins":120},
    {"step_number":6,"action":"Log water change date","detail":"Log the last full water change date in House portal inventory.","estimated_mins":2}
  ]'::jsonb,
  '["Test strips","pH up/down","Chlorine granules","Filter cleaner","Cover conditioner"]',
  'Water tested and balanced. Filter cleaned. Date logged.'
);

-- ── Eternal SOPs (3) ─────────────────────────────────────────────────────────

INSERT INTO sops (entity, category, title, description, frequency, steps, required_items, output_expected) VALUES
(
  'eternal', 'admin', 'Weekly Hours Logging',
  'End-of-week hours consolidation. Do this every Friday afternoon before finishing.',
  'weekly',
  '[
    {"step_number":1,"action":"Review week hours","detail":"Open Eternal portal → Hours Log. Review every day this week. Are all sessions logged? Anything missing?","estimated_mins":5},
    {"step_number":2,"action":"Confirm billable vs non-billable","detail":"Check any non-billable hours (admin, internal, own-use). These should be rare but honest.","estimated_mins":3},
    {"step_number":3,"action":"Commit to system","detail":"Save any missing entries. Running total should match your sense of how much you worked.","estimated_mins":2},
    {"step_number":4,"action":"Notify Sam of unusual items","detail":"If any week has significantly more or fewer hours than usual, send Sam a quick message explaining why.","estimated_mins":2}
  ]'::jsonb,
  '["Eternal portal access"]',
  'All hours for week logged and confirmed as billable/non-billable.'
),
(
  'eternal', 'finance', 'Monthly Invoice Dispatch',
  'Generate and send the monthly invoice to Sam Moore. Do this on the 1st of each month.',
  'monthly',
  '[
    {"step_number":1,"action":"Lock hours for the period","detail":"Go to Eternal portal → Hours Log. Confirm all hours for the previous month are logged correctly.","estimated_mins":5},
    {"step_number":2,"action":"Generate invoice","detail":"Use Eternal portal → Invoices → Generate Monthly Invoice. Enter confirmed hours total. Invoice = £1,000 retainer + (hours × £40) for any hours above included hours.","estimated_mins":5},
    {"step_number":3,"action":"Create invoice PDF","detail":"Generate clean PDF with: RBTR Consulting / Eternal Kustoms Ltd / period / hours / amount / bank details / 14-day payment terms.","estimated_mins":5},
    {"step_number":4,"action":"Attach hours breakdown","detail":"Include a line-by-line hours log as an attachment. Sam likes to see what he is paying for.","estimated_mins":5},
    {"step_number":5,"action":"Email to Sam + Beth","detail":"Send invoice email with PDF and hours attachment to both Sam and Beth Moore.","estimated_mins":3},
    {"step_number":6,"action":"Log sent date","detail":"Update invoice status to ''sent'' in Eternal portal. Note expected payment date (14 days).","estimated_mins":2},
    {"step_number":7,"action":"Diary 14-day chase","detail":"If not paid by payment date, chase Sam with a brief email. Note any overdue invoices in the portal.","estimated_mins":1}
  ]'::jsonb,
  '["Invoice template","Hours log export","Bank details"]',
  'Invoice sent. Sent date logged. Chase date diarised.'
),
(
  'eternal', 'operations', 'Estimate Authorisation',
  'Process for reviewing and authorising quotes going out to EK customers under Ben''s remit.',
  'on_event',
  '[
    {"step_number":1,"action":"Review quote from team","detail":"Read the estimate in full. Understand what work is included and what is not.","estimated_mins":5},
    {"step_number":2,"action":"Check margin","detail":"Confirm the margin is in line with EK''s standard pricing. Flag anything that looks underpriced.","estimated_mins":3},
    {"step_number":3,"action":"Verify parts availability","detail":"Are the parts needed in stock, on order, or do they need to be sourced? Unrealistic timelines create problems.","estimated_mins":3},
    {"step_number":4,"action":"Verify lead time","detail":"Is the quoted timeline realistic given current workshop workload? Check with the team.","estimated_mins":3},
    {"step_number":5,"action":"Authorise in writing","detail":"Reply to the team thread or send an email: authorised, date, any conditions.","estimated_mins":2},
    {"step_number":6,"action":"Log in Eternal Estimates","detail":"Add to Eternal portal → Estimates with status ''authorised''.","estimated_mins":2}
  ]'::jsonb,
  '["Estimate document","EK pricing guide (if exists)","Eternal portal access"]',
  'Estimate authorised in writing. Logged in Eternal portal.'
);

-- ── Ben Personal SOPs (3) ─────────────────────────────────────────────────────

INSERT INTO sops (entity, category, title, description, frequency, steps, required_items, output_expected) VALUES
(
  'ben', 'daily', 'Morning Routine',
  'Ben''s daily morning protocol. Non-negotiable. Everything before 7am.',
  'daily',
  '[
    {"step_number":1,"action":"Wake 5am","detail":"No snooze. Phone out of reach if needed. First 30 seconds: feet on the floor.","estimated_mins":0},
    {"step_number":2,"action":"Hydrate","detail":"500ml water immediately. Cold if possible — signals the body to shift into gear.","estimated_mins":2},
    {"step_number":3,"action":"10-min mindset practice","detail":"Not meditation, not journalling — just 10 minutes of stillness with the question: what matters today and why? No phone.","estimated_mins":10},
    {"step_number":4,"action":"Read Master Plan","detail":"Read the one-page Master Plan (saved in Ben portal). Takes 2 minutes. Keeps direction visible daily.","estimated_mins":2},
    {"step_number":5,"action":"Check ROCKO brief","detail":"Open Ben portal → Today. Listen to or read the morning brief. Note anything unexpected.","estimated_mins":5},
    {"step_number":6,"action":"Set Top 3","detail":"Before touching anything else, set today''s Top 3 in Ben portal → Today. These are the three things that would make today count. Not tasks — outcomes.","estimated_mins":3},
    {"step_number":7,"action":"First deep-work block","detail":"7am–9am: first block of focused work, no calls, no WhatsApp. Most important task of the day first.","estimated_mins":120}
  ]'::jsonb,
  '["Phone silenced","Ben portal access"]',
  'Top 3 set. Brief reviewed. First deep-work block underway by 7am.'
),
(
  'ben', 'daily', 'Evening Reflection',
  'End-of-day review. Closes the day, sets tomorrow, preserves what was learned.',
  'daily',
  '[
    {"step_number":1,"action":"Wins today","detail":"List 1-3 wins from today. Not what was done — what was actually won. Could be small.","estimated_mins":3},
    {"step_number":2,"action":"Losses today","detail":"List 1-3 things that didn''t go right. Be honest, not harsh.","estimated_mins":3},
    {"step_number":3,"action":"Lessons","detail":"From wins and losses: what do I now know that I didn''t this morning? One sentence is enough.","estimated_mins":3},
    {"step_number":4,"action":"Tomorrow''s Top 3","detail":"Set tomorrow''s Top 3 in Ben portal tonight so the morning starts with direction, not decisions.","estimated_mins":2},
    {"step_number":5,"action":"Log mood/energy/sleep","detail":"Ben portal → Today → log mood (1-10), energy (1-10), planned sleep hours.","estimated_mins":2},
    {"step_number":6,"action":"Gratitude","detail":"One thing you''re grateful for today. Not a big thing — just something true.","estimated_mins":1}
  ]'::jsonb,
  '["Ben portal access"]',
  'Day reviewed. Tomorrow''s Top 3 set. Mood logged. Reflection filed.'
),
(
  'ben', 'finance', 'Weekly Money Meeting',
  'Sunday evening money alignment meeting with Sarah. 60 minutes. Non-negotiable.',
  'weekly',
  '[
    {"step_number":1,"action":"Review all entity balances","detail":"Open Financials portal. Confirm PSNM, personal, house, Eternal balances. Note anything surprising.","estimated_mins":10},
    {"step_number":2,"action":"Confirm upcoming bills","detail":"What bills land in the next 7 days? Any auto-payments coming out? Any invoices due? Check calendar.","estimated_mins":5},
    {"step_number":3,"action":"Flag any gaps","detail":"Is there anything where the money might not be there? Be honest. Better to name it Sunday than face it Tuesday.","estimated_mins":5},
    {"step_number":4,"action":"Confirm priorities for coming week","detail":"What are the 3 financial priorities for this week? (e.g. chase PSNM enquiry, send Eternal invoice, pay house supplier)","estimated_mins":5},
    {"step_number":5,"action":"Sarah alignment on family money","detail":"Confirm: Sarah''s view on this week''s family spend. Any big items coming for kids or house? Anything she''s worried about?","estimated_mins":15},
    {"step_number":6,"action":"Log decisions","detail":"Brief note in Ben portal → Notes of any decisions made. This prevents revisiting the same conversation next week.","estimated_mins":5}
  ]'::jsonb,
  '["Financials portal","Ben portal access","Sarah present"]',
  'Balances reviewed. Priorities set. Sarah aligned. Decisions logged.'
)
ON CONFLICT DO NOTHING;
