# PSNM Prospect Intelligence Engine — Architecture & Operations
# v1.0 — 2026-04-28

---

## Overview

Automated lead research system that harvests newly-incorporated UK companies from Companies House, scores them for warehousing need, enriches contact data via Claude web search, and dispatches A-tier prospects to the Atlas v2 approval queue.

**Data flow:**
```
Companies House Advanced Search API
         ↓ (harvest — filter by SIC, date, address)
psnm_intelligence_prospects (Supabase)
         ↓ (score — A/B/C grade + outreach hook)
Claude web search (enrich — website, email, phone, LinkedIn)
         ↓ (dispatch — A-tier with email → psnm_atlas_drafts)
Atlas Approval Queue (WMS Intelligence tab)
         ↓ (human reviews → approves → SendGrid dispatch)
```

---

## API Endpoints

All routed via `/api/atlas` with `x-rbtr-auth` header (or same-origin browser call).
Absorbed into atlas.js to stay within Vercel Hobby 12-function limit.

| Action (atlas?action=) | Method | Description |
|------------------------|--------|-------------|
| `intel_stats` | GET | Counts by grade + recent 20 prospects |
| `intel_harvest` | POST | Pull from Companies House, score, insert |
| `intel_enrich` | POST | Enrich missing contact data via Claude |
| `intel_dispatch` | POST | Create Atlas drafts for A-tier prospects |
| `intel_prospect` | GET + `&id=` | Full prospect detail |
| `intel_harvest_daily` | POST | Cron combined run (no auth required) |

**Harvest params:** `{ batch_size: 100, days_back: 365 }` (caps: 500/day max)
**Enrich params:** `{ limit: 50 }` (caps: 100/day max)
**Dispatch params:** `{ limit: 10 }` (caps: 50 at once)

---

## Scoring Logic

### Grade A — target 5-10/week
- Incorporated < 90 days
- Address is residential or accountant-registered
- SIC code on allowlist (ambient physical product)
- Hook: "You incorporated X days ago. Wherever you're trading from, it's not a warehouse. Hellaby is the geographic centre of GB — talk to me before you sign a lease."

### Grade B — target 20-30/week
- Incorporated 90-365 days
- Allowed SIC OR residential address signal
- Inner London B-grade gets reframed with national distribution angle
- Hook: "Coming up on your first year — our central GB location cuts cross-country dispatch by ~30%."

### Grade C — target 10-15/week
- Incorporated 1-3 years
- Established, no urgent signal
- Hook: "If you're reviewing warehousing for the year ahead — Hellaby is geographic centre of GB. 25-30% savings vs Midlands/South."

**Blocked (grade = null):**
- SIC code on blocklist (pharma, hazmat, food/chilled, financial, healthcare)
- Unclassified SIC code (default: block — safer to miss prospects than email pharma)
- Company name contains hazmat/pharma/chilled keywords

---

## SIC Code Allowlist Rationale

Three categories, all ambient physical-product businesses:
1. **Manufacturing (10xxx–33xxx)**: Product manufacturers needing stock storage
2. **Wholesale/Distribution (46xxx)**: Distributors and wholesale traders
3. **E-commerce/Retail (47xxx)**: Online retailers and physical retailers with stockholding

Notable inclusions: homewares, packaging, electronics, building products, clothing, garden goods.

Notable exclusions (blocklist overrides allowlist where there's overlap):
- 10110-10520: Food production → chilled/perishable risk
- 21100-21200: Pharmaceuticals → regulated storage
- 19100-20170: Hazmat/chemicals → regulated storage
- 56xxx: Hospitality/food service → not warehousing customers

If a SIC code appears in BOTH lists, the blocklist wins.

---

## Address Heuristics

### Residential detection (proxy for "not yet in warehouse")
Positive signals: flat/apartment prefixes, residential road pattern (number + street type), c/o notation, "registered agents" / "formation company"
Negative signals: industrial estate, business park, trading estate, warehouse, distribution

These are heuristics. False positives (residential-looking commercial) are low risk — they just get Grade A treatment they might not deserve. False negatives (commercial-looking residential) degrade to Grade B.

### Region assignment
Based on postcode prefix patterns. Used for display + filtering only, not scoring.
Covers: Midlands/North, North West/West Midlands, North East, London, South/South East, West/Wales, Scotland.

---

## Rate Limits

| API | Limit | Our behaviour |
|-----|-------|---------------|
| Companies House | 600 req/5 min | ~1.4 req/sec (700ms gap between calls), 3x retry with exponential backoff |
| Anthropic (enrichment) | 30k tokens/min | 2s sleep between enrichment calls, 50/day cap |
| Supabase | Effectively unlimited for our volume | No throttling needed |

Cron runs at 06:00 UK daily:
- Harvest: 100 records from last 48hrs
- Enrich: 50 A/B prospects
- Dispatch: 10 A-tier with email

**Feature flag:** set `PSNM_INTELLIGENCE_AUTORUN=false` in Vercel env to pause cron instantly without code change.

---

## Manual Override Procedures

### Force re-score a prospect
The scoring happens at harvest time. To re-score, delete the row from `psnm_intelligence_prospects` (via Supabase dashboard) and re-run harvest for the same company (it'll be skipped if incorporated > 365 days ago — use a manual insert if needed).

### Bulk harvest historical data
```bash
curl -X POST 'https://rbtr-jarvis.vercel.app/api/atlas?action=intel_harvest' \
  -H 'x-rbtr-auth: YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"batch_size": 500, "days_back": 365}'
```
This is a one-time slow run — ~350s for 500 records at 1.4/sec. Vercel's 300s timeout may cut it short. Run in batches of 100 if needed.

### Clear test data
```sql
DELETE FROM psnm_intelligence_prospects WHERE company_name LIKE 'Test%';
```

### Re-dispatch a previously dispatched prospect
```sql
UPDATE psnm_intelligence_prospects 
SET atlas_dispatched = false, atlas_dispatched_at = null
WHERE id = 'UUID';
```
Then click "Dispatch A-tier" from the WMS, or trigger via API.

---

## Failure Modes & Recovery

| Failure | Symptom | Recovery |
|---------|---------|---------|
| CH API key missing | harvest returns `{"ok":false,"error":"COMPANIES_HOUSE_API_KEY not set"}` | Add `COMPANIES_HOUSE_API_KEY` to Vercel env vars, redeploy |
| CH API 429 rate limit | harvest returns partial results with `errors` array | Wait 5 min, re-run with smaller batch_size |
| Anthropic 429 during enrich | enriched count lower than expected | Run enrich again after 2 min — unenriched records are re-processed each time |
| Supabase error on upsert | `errors` array in harvest response | Usually means a constraint violation — check error message. `company_number` is the upsert key; duplicates are updated not inserted |
| Atlas dispatch with no email | `dispatched: 0, message: "No undispatched A-tier prospects with email"` | Run enrich first to populate enriched_email |
| Cron silent failure | No new prospects despite harvest | Check Vercel Function logs for the `harvest_daily` invocation. Common cause: CH API key unset |

---

## Vercel Env Vars Required

| Var | Purpose | Status |
|-----|---------|--------|
| `COMPANIES_HOUSE_API_KEY` | Companies House API access | **Pending — add to Vercel** |
| `PSNM_INTELLIGENCE_AUTORUN` | Set to `false` to pause cron | Optional (absent = active) |
| `SUPABASE_URL` | Already set | ✅ |
| `SUPABASE_SERVICE_ROLE` | Already set | ✅ |
| `ANTHROPIC_API_KEY` | Already set | ✅ |

---

## WMS Intelligence Tab

The "🔍 Prospect Intelligence Engine" card loads stats on every Intelligence tab open.

**Buttons:**
- ⬇ Harvest — triggers `/api/atlas?action=intel_harvest` with batch_size=100, days_back=365
- 🔎 Enrich — triggers enrich on top 50 unenriched A/B prospects
- ▶ Dispatch A-tier — creates Atlas drafts for A-tier with email, marks dispatched

**Prospect drawer:** click any row → right-panel drawer with full CH data, SIC codes, trigger signals, outreach hook, enrichment data, and dispatch button.

After dispatch, drafts appear in the Atlas Approval Queue. Review → approve → SendGrid sends.

---

_Last updated: 2026-04-28. Maintained by: update whenever schema, scoring, or rate limits change._
