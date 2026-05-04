# WMS Extensions — Toolkit Reference Specs

**These are reference specifications, not production code.**

Production code for all 8 modules lives in:
- `/v14/public/wms.html` — all UI as additional pane sections
- `/v14/api/` — all server-side endpoints
- `/v14/supabase/migrations/46_wms_extensions_phase1.sql` — all database schema

The files in this directory exist so that during Phases 2–8, the build process has a clear reference for the intended data model, feature set, and decision rules for each module. When a phase begins, read the relevant reference file first.

---

## Files

### `01-sales-crm.html`
Standalone localStorage CRM. Shows the full data model for `crm_prospects` + `crm_interactions` tables (migration 46). Includes a **Seed Top 20** button that loads the initial PSNM prospect list — 20 ambient pallet storage leads across Yorkshire/Midlands, ranked by likelihood and volume, with contact details, priority, source, and opening next-action. Use this to understand the field set and priority logic before building Phase 2 in wms.html.

### `02-pricing-calculator.html`
Customer-facing quote calculator in cream/gold editorial style. Implements the three volume tiers (£3.95 1–100, £3.50 101–500, £2.95 500+), movement fees at £3.50/movement, first-week-free on 12-week commit, and a lead capture form. The `submitLead()` function shows exactly what payload to POST to `/api/pricing-quote` → `pricing_quotes` table. Public-facing; separate file from wms.html.

### `03-email-sequencer.js`
Node.js script for paced cold email sending. Four adapters: `console` (default, safe), `sendgrid`, `postmark`, `smtp`. **DRY_RUN is on by default** — nothing sends unless `DRY_RUN=false` is set. CSV input. Templates for touch 1 (initial), touch 2 (follow_up_1, ~7 days), touch 3+ (follow_up_2). Full 16-touch sequence: read `TOUCH_SEQUENCE_16.md` from the `stream-3-sponsor-outreach` branch. Email templates for initial contacts: `FIRST_CONTACT_EMAILS/01–20_*.md` in same branch.

### `03-prospects-sample.csv`
Sample CSV input for `03-email-sequencer.js`. 10 rows from the Top 20 list with touch numbers 1–3.

### `03-env-example.txt`
All environment variables for `03-email-sequencer.js`. Copy to `.env` and fill in. Never commit a populated `.env`.

### `04-ww-triage.html`
WhichWarehouse enquiry triage tool. Paste a WW enquiry → auto-detect company, contact, email, postcode, pallet count, region → auto-verdict (RESPOND / CALL FIRST / DECLINE). Hard decline rules are encoded in JS: geography (SW/Wales/Scotland/NI postcodes + city names), service type (fulfilment, chilled, hazmat, lithium, COSHH, allergen-controlled), and sub-20-pallet volume. Shows the exact regex patterns and verdict logic that Phase 4 must implement in wms.html.

### `05-daily-dashboard.html`
Daily operations dashboard with localStorage. Shows day navigation, 7-day strip, 6 metrics tiles (calls/emails/linkedin/quotes/meetings/pallets_stored), and a task list. Three templates: **Daily Ops** (8 tasks), **Weekly Review** (8 tasks), **Monthly Close** (8 tasks). Task categories map to the `ops_task_category` enum in migration 46. Data model for `ops_tasks` + `ops_daily_metrics` tables.

### `06-cashflow-tracker.html`
PIN-gated cashflow tracker. PIN `1234` in ref spec; production uses a server-verified PIN. Shows live state inputs, break-even progress bar (target: 827 pallets at £3.95 = ~£3,269/week), RBTR fund progress (target: £142,990), monthly net/burn/runway tiles, stepped rent strip (current: £8,333/month), and monthly snapshots. Data model for `cashflow_state` + `cashflow_snapshots` tables.

### `07-ek-estimate-generator.html`
EK Engineering estimate generator. List view + form view. Auto-numbers estimates `EK-2026-XXXX` (sequential from last saved). Line items: materials (qty × rate), labour (hours × hourly rate), sublet (cost + markup %). Adjustments: complexity %, discount %, VAT 20%. Totals calculated live. Print-to-PDF via `window.print()` with `@media print` styles. Status pipeline: draft → sent → accepted/rejected → completed. Data model for `ek_estimates` table.

### `08-rbtr-sponsor-tracker.html`
RBTR sponsor pipeline. **Seed 53 Sponsors** button loads the full sponsor list across 15 categories (tyres, fuel/lubricants, recovery, navigation/comms, power, camp/comfort, tools, clothing/PPE, nutrition, medical, insurance/legal, media/content, truck/powertrain, charity, title). Tier tracking: Title / Gold / Silver / Bronze / Partner. 16-touch follow-up sequencer with auto-calculated next contact dates (intervals: 7, 7, 14, 14, 21, 21, 30×3, 60×4, 90×3 days). Table view + Kanban pipeline view. **For production Phase 8:** use `SPONSOR_TIER_RANKING.md` from `stream-3-sponsor-outreach` branch (55 authoritative sponsors) and cross-reference contact history from `FIRST_CONTACT_EMAILS/01–20_*.md`. Extends existing `sponsor_targets` + `sponsor_contacts` tables (migrations 13/20/22).

---

## Reading stream-3 data

The `stream-3-sponsor-outreach` branch is kept as a documentation-only reference (do not merge). To read files from it:

```bash
# List all files
git ls-tree --name-only -r origin/stream-3-sponsor-outreach -- docs/streams/3_sponsor_outreach/

# Read a specific file
git show stream-3-sponsor-outreach:docs/streams/3_sponsor_outreach/SPONSOR_TIER_RANKING.md
git show stream-3-sponsor-outreach:docs/streams/3_sponsor_outreach/TOUCH_SEQUENCE_16.md
git show stream-3-sponsor-outreach:docs/streams/3_sponsor_outreach/FIRST_CONTACT_EMAILS/01-20_initial_outreach.md
```
