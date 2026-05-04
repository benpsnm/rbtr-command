# Atlas Automation Spec — PSNM Cold Call Priority Engine
**Build specification for the next Atlas development session**
**Status: SPEC ONLY — no code in this session**

---

## What This Builds

The PSNM section of the Atlas portal gains a **Cold Call Engine** — a daily prioritised call queue that Ben can work through one card at a time. No spreadsheets. No digging through a CRM. Open Atlas, see who to call, make the call, log it, next.

---

## Core Behaviour

Every morning (auto-calculated on page load), Atlas:
1. Pulls all leads from `psnm_outreach_targets` with status NOT IN (`do_not_contact`, `converted`)
2. Calculates the **Daily Score** for each lead using the formula in `DAILY_QUEUE_LOGIC.md`
3. Sorts leads by Daily Score descending
4. Presents the top lead as a **Call Card** with everything Ben needs to make that call

Ben works through the queue. Each completed call logs to `psnm_outreach_touches`, updates the lead status, and the queue re-sorts.

---

## UI Layout

### Main View — `/psnm/calls`

```
┌─────────────────────────────────────────────────────────────┐
│  📞 PSNM Cold Call Engine          [Mon 5 May]  [12 calls]  │
│  Today's queue: 47 leads            ████████░░  8/20 done   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────── CALL #1 ─────────────────────────────────┐
│                                                              │
│  AUTOGREEN                              Score: 127  [T1]    │
│  Tyre Distribution & Wholesale                               │
│  Rotherham  ·  S66 8HS  ·  5 min from site                  │
│                                                              │
│  ┌── HOOK ──────────────────────────────────────────────┐   │
│  │  Same postcode as PSNM (S66 8HS vs S66 8HR).        │   │
│  │  "You might have driven past us."                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Use opener: [C — Warehouse Manager peer]                    │
│  Pallet potential: 80–200  ·  Est £480–£1,200/wk            │
│  Objection to expect: "We have existing supplier"           │
│                                                              │
│  Phone: 01709 XXX XXX    Email: —                           │
│  Last touched: Never                                         │
│                                                              │
│  [📋 Full Brief]  [📖 Opener Script]  [📞 Log Call]         │
└──────────────────────────────────────────────────────────────┘

┌─── NEXT 4 IN QUEUE ──────────────────────────────────────────┐
│  #2  Newburgh Engineering     S66 8HS   Score 105  T2        │
│  #3  4S Distribution          S60 1DJ   Score 97   T2        │
│  #4  Sharp's Bedrooms         S66 8XH   Score 94   T1        │
│  #5  Pricecheck Pharma        S63 7QY   Score 90   T2        │
└──────────────────────────────────────────────────────────────┘

[Skip This Lead]  [Mark Do Not Call]  [View Full Queue (47)]
```

---

### Call Log Modal — appears when [📞 Log Call] is tapped

```
┌─── LOG: AUTOGREEN ───────────────────────────────────────────┐
│                                                              │
│  What happened?                                              │
│  [No answer]  [Voicemail left]  [Wrong person]              │
│  [Spoke to decision-maker]  [Spoke to gatekeeper]           │
│                                                              │
│  Outcome:                                                    │
│  [Not interested]  [Interested — more info]                  │
│  [Callback booked]  [Quote requested]  [Declined]           │
│                                                              │
│  Notes (optional):                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Contact name captured: _________________________           │
│  Next call date: [DD/MM/YYYY]  or  [Not needed]            │
│                                                              │
│  [Save & Next Lead]                                          │
└──────────────────────────────────────────────────────────────┘
```

---

### Full Brief Panel — slides in from right when [📋 Full Brief] tapped

```
┌─── INTELLIGENCE BRIEF: AUTOGREEN ────────────────────────────┐
│                                                              │
│  COMPANY            Autogreen                                │
│  SECTOR             Tyre Distribution & Wholesale            │
│  LOCATION           Rotherham S66 8HS                        │
│  DISTANCE           Same industrial estate as PSNM           │
│                                                              │
│  STORAGE DRIVERS                                             │
│  • Seasonal tyre overflow (winter tyres Q3/Q4)              │
│  • Import container overflow                                 │
│  • High volume — tyres are bulky, low value-density         │
│                                                              │
│  PALLET POTENTIAL   T1  ·  80–200 pallets  ·  £840/wk avg  │
│                                                              │
│  GATEKEEPER PLAN    Same postcode. Ask for ops director      │
│                     or warehouse manager by role.            │
│                                                              │
│  OPENER VARIANT     C — Warehouse Manager peer               │
│  CUSTOMISATION      "Same estate. You might've driven past." │
│                                                              │
│  LIKELY OBJECTION   "We have existing supplier"              │
│  HANDLER            Playbook Obj #2                          │
│                                                              │
│  CALL HISTORY       (none yet)                               │
└──────────────────────────────────────────────────────────────┘
```

---

### Opener Script Panel — slides in when [📖 Opener Script] tapped

```
┌─── OPENER C: WAREHOUSE MANAGER ──────────────────────────────┐
│                                                              │
│  "Hi, [Name]? It's Ben from PSNM in Rotherham.              │
│  We run a 700-pallet site just off the M18 — six quid       │
│  a pallet per week, in and out whenever you need.           │
│                                                              │
│  I just wanted you to know we're here because half the      │
│  time when you suddenly need overflow space, you're          │
│  trying to find someone in a hurry.                          │
│                                                              │
│  Does that situation ever come up for you?"                  │
│                                                              │
│  FOR AUTOGREEN: Add "You might've driven past us —           │
│  we're literally on the same estate as you, S66."           │
│                                                              │
│  ─────── If they object: "We have existing supplier" ──────  │
│                                                              │
│  "Fair enough. Are they flexible on volumes, or do you       │
│  have a minimum commitment you're paying whether you         │
│  use it or not? We're rolling weekly — you only pay          │
│  for what you've got in."                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

### Sidebar Stats Block (always visible, right column)

```
┌─── TODAY ───────────────────────────────────────────────────┐
│  Called: 8   Answered: 3   Voicemail: 3   No answer: 2      │
│  Engaged: 1   Callbacks: 1   Declined: 0                    │
│  Pipeline adds today: 1                                      │
├─── THIS WEEK ───────────────────────────────────────────────┤
│  Called: 8 / 60 target   Engaged: 1 / 3 target             │
│  Quotes requested: 0 / 2 target                             │
│  Site visits booked: 0 / 1 target                           │
├─── PIPELINE ────────────────────────────────────────────────┤
│  Hot (engaged): 0                                            │
│  Warm (contacted): 0                                         │
│  Cold (not touched): 205                                     │
│  Converted: 0                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Auto-Log Behaviour

When Ben taps **[Save & Next Lead]** after logging a call:

1. **Insert** row into `psnm_outreach_touches`:
   - `target_id` = current lead UUID
   - `channel` = 'phone'
   - `direction` = 'outbound'
   - `touched_at` = NOW()
   - `outcome` = selected outcome
   - `notes` = notes field content

2. **Update** `psnm_outreach_targets`:
   - `last_touched_at` = NOW()
   - `next_touch_at` = selected next call date (if any)
   - `status` = derived from outcome (see mapping below)
   - `priority_score` = recalculate if contact name was captured or interest shown

3. **Re-sort** queue and show next lead card

### Outcome → Status Mapping

| Logged outcome | New status |
|----------------|------------|
| No answer | `contacted` (if first touch) / unchanged (if repeat) |
| Voicemail left | `contacted` |
| Wrong person | `contacted` |
| Spoke gatekeeper | `contacted` |
| Not interested | `contacted` |
| Interested — more info | `engaged` |
| Callback booked | `engaged` |
| Quote requested | `engaged` |
| Declined (explicit) | `declined` |
| Do not call (stated) | `do_not_contact` |

---

## Smart Queue Rules (Atlas-side logic)

These override the score-based order in specific conditions:

1. **Callback owed today** — leads with `next_touch_at` = today always appear first, regardless of score
2. **Quote open >2 days** — leads with `status = 'engaged'` and last touch >48hrs ago get +40 temporary bonus
3. **Already called today** — leads with a touch logged today are removed from today's queue entirely
4. **Do not contact** — never appears in queue
5. **No phone number AND no email** — grey out, append to end of queue with note "No contact info"

---

## Queue Filters (available in top bar)

Ben can filter the queue by:
- **All** (default — score-sorted)
- **Callbacks only** (next_touch_at = today)
- **Rotherham only** (postcode starts S66/S60/S63)
- **T1 big fish only** (intelligence_brief->>'pallet_tier' = 'T1')
- **Never touched** (status = 'not_contacted')
- **Industry** (dropdown from distinct industry values)

---

## Data Requirements (for next build session)

### New column needed (handled by `lead_intelligence_engine.sql`):
- `intelligence_brief JSONB` on `psnm_outreach_targets`

### Existing columns used:
- `priority_score INTEGER` — base score
- `status TEXT` — lead state
- `last_touched_at TIMESTAMPTZ` — freshness calculation
- `next_touch_at TIMESTAMPTZ` — callback detection
- `phone TEXT`, `email TEXT` — contact display
- `company`, `city`, `postcode`, `industry` — card display

### Computed daily (no new columns):
- Daily Score = formula from DAILY_QUEUE_LOGIC.md
- Calls today count = COUNT of touches WHERE DATE(touched_at) = today AND target_id = this lead

---

## What This Spec Does NOT Include (next session)

- Email integration (compose and send from card)
- WhatsApp integration
- LinkedIn profile link
- Auto-dialler integration
- Automated follow-up email sequences
- Analytics dashboard (trends over weeks)
- Multi-user (Ben is the only caller for now)

---

## Acceptance Criteria for Next Build Session

The feature is done when:
- [ ] `/psnm/calls` route exists and renders a sorted queue
- [ ] Top lead shows as a full Call Card with all fields populated
- [ ] Tapping [Log Call] opens the outcome modal
- [ ] Saving the log inserts to `psnm_outreach_touches` and updates `psnm_outreach_targets`
- [ ] Queue re-sorts after each save, showing next lead
- [ ] Callback leads always appear at the top if their `next_touch_at` = today
- [ ] Sidebar stats update in real time from today's touch log
- [ ] Mobile-responsive — Ben uses this on his phone while on site

---

*PSNM Atlas Cold Engine — Automation Spec v1.0*
