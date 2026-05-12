# PSNM Inbound Auto-Responder — Spec v1.0
*Written 2026-05-08 — Shadow mode: classify, enrich, draft, queue. NEVER auto-send.*

## Purpose
Every enquiry email that hits PSNM gets classified, the sender enriched, and a response drafted in Ben's voice — all within seconds of the email landing. Ben approves or skips in his morning brief. Response only leaves when Ben approves.

## Shadow Mode Contract
- NEVER sends email without Ben's explicit approval
- NEVER modifies or deletes existing sendgrid_inbound.js behaviour
- On any failure: log it, return 200, do not interfere with inbound capture

## Data Flow
```
Email → SendGrid Inbound Parse
      → sendgrid_inbound.js (existing capture → psnm_inbound_replies)
      → async: POST /api/autorespond/orchestrate (fire-and-forget)
                 ↓
               classify (Claude API, cached prompt)
                 ↓
               enrich (Companies House + domain history + geo)
                 ↓
               draft (Claude API, cached Ben voice prompt)
                 ↓
               psnm_enquiry_drafts (status='pending_approval')
               psnm_autoresponse_log (audit trail)
```

## Endpoints
All require x-rbtr-auth header or valid psnm_session cookie. Orchestrate also accepts CRON_SECRET.

| Endpoint | Description |
|----------|-------------|
| POST /api/autorespond/classify | Classify enquiry text via Claude |
| POST /api/autorespond/enrich | Enrich sender (CH + domain history + geo) |
| POST /api/autorespond/draft | Generate draft in Ben's voice |
| POST /api/autorespond/orchestrate | Internal: chains classify→enrich→draft |

## Tables

### psnm_enquiry_drafts
Stores draft responses awaiting Ben's approval.
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
enquiry_id uuid                    -- FK → psnm_inbound_replies.id (nullable if source is web form)
draft_subject text NOT NULL
draft_body_text text NOT NULL
draft_body_html text
classification jsonb               -- full classify output
enrichment jsonb                   -- full enrich output
confidence_score integer           -- 0-100 from classifier
status text DEFAULT 'pending_approval'
  -- pending_approval | approved | sent | skipped | no_response_needed
drafter_notes text                 -- Claude's own notes about why it wrote what it wrote
created_at timestamptz DEFAULT now()
approved_at timestamptz
sent_at timestamptz
skipped_at timestamptz
```

### psnm_autoresponse_log
Audit trail — one row per enquiry processed.
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
enquiry_id uuid
decision text                      -- 'drafted' | 'no_response' | 'error' | 'low_confidence_skipped'
confidence_score integer
classification jsonb
draft_id uuid                      -- FK → psnm_enquiry_drafts.id
decided_at timestamptz DEFAULT now()
notes text
```

## Classifier Output Schema
```json
{
  "type": "storage_enquiry|quote_request|price_check|spam|existing_customer|job_application|press|complaint|other",
  "pallet_count": 50,
  "duration_weeks": 12,
  "goods_type": "ambient packaged goods",
  "hazmat_flag": false,
  "chilled_flag": false,
  "urgency": "immediate|this_week|within_month|planning|unknown",
  "red_flags": [],
  "confidence": 87,
  "summary": "One-sentence summary"
}
```

## Enrichment Output Schema
```json
{
  "companies_house": { "company_name": "...", "company_number": "...", "status": "active", ... },
  "domain_history": { "previous_enquiries": 0, "first_seen": null, "known_customer": false },
  "distance": { "postcode": "LS1 2AB", "miles": 40, "label": "~40 miles (~45min drive)" },
  "enriched_at": "2026-05-08T09:00:00Z"
}
```

## Draft Output Schema
```json
{
  "subject": "Re: Pallet storage enquiry",
  "body_text": "plain text version",
  "body_html": "<p>html version</p>",
  "next_step": "call_back|email_back|site_visit|no_action",
  "drafter_notes": "Low confidence — only 20 pallets mentioned, worth a call to check if they need more"
}
```

## Ben's Voice Rules
- South Yorkshire: direct, honest, short sentences
- "Right" not "Okay". "Sorted" not "Completed"
- Never: "please don't hesitate", "I hope this email finds you well", "as per our conversation"
- Sign-off: "Cheers\nBen\nPallet Storage Near Me\n07506 255033"
- British English throughout
- Never quote exact rates unless specifically asked — refer to the quote process
- Always gather if unknown: pallet count, goods type, urgency, postcode
- Ambient only: politely decline hazmat/chilled immediately
- PSNM facts only — never invent drive times, rates, or capacity figures

## Confidence Thresholds
- ≥ 70: draft it, queue for approval
- 40-69: draft it, flag in drafter_notes
- < 40: log as 'low_confidence_skipped', no draft

## Rate Table (for drafter reference — never in email unless asked)
- 1-100 pallets: £3.95/pallet/week
- 101-500 pallets: £3.50/pallet/week
- 500+: £2.95/pallet/week
- Handling: £3.50/pallet movement
- Minimum: 12 weeks, then 30-day notice
