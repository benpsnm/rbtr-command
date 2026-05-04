# Stream 1 Summary — Atlas Cold Call Engine
**Completed: 5 May 2026**
**Branch: stream-1-atlas-cold-engine**

---

## What Was Built

Six documents that turn 205 dead cold leads into a working outbound sales operation for PSNM.

---

## Deliverables

### 1. COLD_CALL_PLAYBOOK.md
The master script. Contains:
- PSNM positioning narrative — who you are, what you offer, why you beat national operators
- 6 openers (busy MD, gatekeeper, warehouse manager, FD, logistics peer, email follow-up)
- 25 objection handlers with verbatim responses — price, location, trust, timing, process
- 5 voicemail scripts under 25 seconds
- 3 wrong-person pivots
- The 5-question qualification ladder

This is the document you have open every time you pick up the phone. No improvising objections. No blank moments. Everything is here.

---

### 2. INTELLIGENCE_BRIEF_TEMPLATE.md
A one-page fill-in template for any lead. Covers storage drivers, decision-maker profile, news hook, pallet potential estimate (T1/T2/T3), best call window, gatekeeper strategy, opener selection, and call history log.

Fill this in before you call anyone. Even 5 minutes of prep makes the call 3x better.

---

### 3. lead_intelligence_engine.sql
SQL migration (do not run directly — apply via Supabase migration pipeline) that:
- Adds an `intelligence_brief JSONB` column to `psnm_outreach_targets`
- Creates a GIN index for querying
- Seeds 20 complete intelligence briefs for the 20 highest-priority leads

The 20 seeded briefs cover: Autogreen, Newburgh Engineering, 4S Distribution, Sharp's Bedrooms, AESSEAL, Pricecheck Pharmaceuticals, Newell & Wright, Yorkshire Logistics, Bowker Transport, GW Engineering, Cranswick, Premier Quality Foods, Howarth Wholesale, AF Blakemore, Bestway Sheffield, R McDowell Transport, Stanton Logistics, Speedy Hire, Kepak, Wincanton.

**To apply:** Run as a new numbered Supabase migration (next in sequence after migration 44).

---

### 4. DAILY_QUEUE_LOGIC.md
The exact formula for who to call today and why. Covers:
- Daily Score = Base Score + Freshness Bonus + Urgency Modifier + Big Fish Premium
- Category definitions (Callbacks, Quote Opens, Fresh Leads, Warm Dormant, Big Fish, Dead-But-Not-Buried)
- The 8/4/4 pacing rule — 8 cold, 4 warm, 4 callbacks per day, hard cap 20 calls
- Morning 5-minute routine
- Status flow and when to declare a lead dead

Follow this every day without exception.

---

### 5. WEEK_1_TARGETS.md
50 specific leads from `psnm_outreach_targets`, tiered and scheduled across the working week of 5–9 May 2026. 12 calls per day, each with a specific name, opener variant, intelligence highlight, and expected outcome.

Top picks by day:
- **Monday:** Autogreen and Newburgh (same postcode, S66 8HS) — highest priority in the whole list
- **Tuesday:** Cranswick (FTSE food manufacturer) and AF Blakemore (Spar DC Doncaster)
- **Wednesday:** Email follow-ups and Bestway Sheffield
- **Thursday:** Kepak and Wincanton partnership call (Worksop)
- **Friday:** AESSEAL and first T4 corporate attempts

---

### 6. ATLAS_AUTOMATION_SPEC.md
Full build specification for the PSNM Cold Call Engine inside Atlas. Includes:
- Card-based queue UI (one lead visible at a time)
- Call log modal (outcome + notes in one tap)
- Full Brief and Opener Script panels
- Sidebar stats (today / this week / pipeline)
- Smart queue rules (callbacks always first, already-called leads removed)
- Filters (Rotherham only, T1 only, industry, etc.)
- Auto-log behaviour — what writes to `psnm_outreach_touches` and `psnm_outreach_targets`
- Acceptance criteria for the next build session

---

## What To Do With All of This

**Today (before any calls):**
1. Read COLD_CALL_PLAYBOOK.md in full. Know the openers and the top 10 objection handlers.
2. Apply `lead_intelligence_engine.sql` as the next Supabase migration.
3. Print or pull up WEEK_1_TARGETS.md — this is your Monday morning call sheet.

**Monday morning:**
1. Start with Autogreen (S66 8HS) — same postcode, call at 8am.
2. Follow the day-by-day schedule exactly. 12 calls. Log every one.

**Next build session:**
1. Build the Atlas Call Engine UI using ATLAS_AUTOMATION_SPEC.md as the brief.
2. The spec is complete enough to start coding without clarification.

---

## Priority Leads Summary (top 5 by daily score)

| Rank | Company | Location | Score | Why |
|------|---------|----------|-------|-----|
| 1 | Autogreen | S66 8HS | 127 | Same postcode. Tyre distribution = huge volumes. |
| 2 | Newburgh Engineering | S66 8HS | 105 | Same postcode. Neighbour. Walk-in if phone fails. |
| 3 | 4S Distribution | S60 1DJ | 97 | Rotherham. Storage company — gets the offer in 10 seconds. |
| 4 | Sharp's Bedrooms | S66 8XH | 94 | Same postcode area. Furniture = massive floor space. |
| 5 | Cranswick Country Foods | S70 1RZ | 88 | FTSE food manufacturer. T1 volume. Long game worth it. |

---

## One Thing

If nothing else gets done after this, the one action that matters most is calling Autogreen at 8am Monday. Same postcode. They have seen your gate. They store tyres — bulky, high volume, constant overflow. That is the first conversation.

Everything else follows.

---

*Stream 1 — PSNM Atlas Cold Call Engine*
*Delivered by Claude, branch: stream-1-atlas-cold-engine*
