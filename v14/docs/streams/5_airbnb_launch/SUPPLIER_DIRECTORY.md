# Supplier Directory — 4 Woodhead Mews STR
**Last updated:** 2026-05-04
**Owner:** Sarah
**Database table:** `house_suppliers` (synced where data available)

---

## HOW TO USE THIS DIRECTORY

This is the single-source-of-truth for all suppliers used in managing the property. Update it every time a supplier is used. The goal: when something breaks, you or your house manager can have someone on-site within an hour without making calls you haven't made before.

**Priority levels:**
- P1 — Contact within 1 hour (hot tub down during guest stay, boiler failure, lockout)
- P2 — Contact within 4 hours (cleaning rebook, minor maintenance before next booking)
- P3 — Plan and schedule (routine maintenance, garden, non-urgent work)

---

## CLEANER

| Field | Detail |
|---|---|
| **Name** | [Cleaner name — to be filled] |
| **Company** | [Company if applicable] |
| **Phone** | [Number] |
| **Email** | [Email] |
| **Day rate / turn rate** | £[XX] per turn (standard 2hr clean) / £[XX] per day (deep clean) |
| **Lead time** | [Same day / 24hr / 48hr] |
| **Availability** | [Days of week / note if they do same-day emergency cleans] |
| **Last used** | [Date] |
| **Rating** | [1–5 / notes] |
| **Notes** | Has key? Yes/No. Trained on hot tub protocol? Yes/No. Knows property layout? Yes/No. |
| **Priority** | P1 — cleaning rebooks are time-critical against check-in |

**CLEANING CHECKLIST (leave with cleaner):**
- Strip all beds, remake with fresh linen
- Wash used towels; replace with fresh set at each bathroom, sauna, and by ice bath
- Hot tub surround — clear, wipe, replace cover after checking tub visually
- Sauna bench — wipe down, ladle and bucket returned to correct position
- Ice bath — check water level and clarity; report to Sarah if anything looks off
- Fire pit — remove ash if excessive, ensure area is tidy
- Outdoor kitchen — wipe all surfaces, check for anything left by guests
- Restock: toilet roll (min 4 per bathroom), hand soap, dish soap, washing tabs
- Check attic — especially if guests were up there
- Final walkthrough photo to Sarah on completion

---

## HOT TUB SERVICE / MAINTENANCE

| Field | Detail |
|---|---|
| **Name** | [Engineer/company name] |
| **Phone** | [Number — must be saved in Sarah's phone as "HOT TUB"] |
| **Email** | [Email] |
| **Callout rate** | £[XX] / Day rate: £[XX] |
| **Lead time** | [Emergency: same-day? / Standard: 24–48hr] |
| **Service contract** | [Yes/No — if yes, schedule and what's covered] |
| **Last service** | [Date] |
| **Last used (fault)** | [Date and what the fault was] |
| **Notes** | Water treatment product used: [brand/spec]. Chemical test strips location: [where kept at property]. |
| **Priority** | P1 — hot tub fault during guest stay requires same-day response |

**BETWEEN-STAY HOT TUB PROTOCOL:**
1. Test water with strips — pH 7.2–7.8, chlorine 3–5 ppm
2. Add chemicals as needed; run jets for 15 mins
3. Wipe surround, replace cover
4. Confirm temperature is reaching [target °C] before check-in
5. Any cloudiness, foam, or chemical smell: call supplier before guest arrives

---

## PLUMBER

| Field | Detail |
|---|---|
| **Name** | [Plumber name] |
| **Company** | [Company if applicable] |
| **Phone** | [Number] |
| **Email** | [Email] |
| **Day rate** | £[XX] / Callout: £[XX] |
| **Lead time** | [Emergency: same day? / Standard: 48hr] |
| **Gas safe registered** | Yes/No — Gas Safe number: [number] |
| **Last used** | [Date — what for] |
| **Rating** | [Notes] |
| **Priority** | P1 for boiler/hot water failure; P3 for routine |

---

## ELECTRICIAN

| Field | Detail |
|---|---|
| **Name** | [Electrician name] |
| **Company** | [Company if applicable] |
| **Phone** | [Number] |
| **Email** | [Email] |
| **Day rate** | £[XX] / Callout: £[XX] |
| **Lead time** | Emergency same-day: [Yes/No] |
| **Qualifications** | Part P registered? [Yes/No]. NICEIC / NAPIT number: [number] |
| **Last used** | [Date — what for] |
| **Notes** | Smart lock maintenance / troubleshooting: confirm they've worked with smart entry systems before if calling for lock issues |
| **Priority** | P1 for total power failure; P2 for appliance/circuit issues |

---

## GARDENER / GROUNDS

| Field | Detail |
|---|---|
| **Name** | [Gardener name] |
| **Phone** | [Number] |
| **Email** | [Email] |
| **Day rate** | £[XX] / Visit rate: £[XX] per scheduled visit |
| **Schedule** | [Frequency — e.g. fortnightly in summer, monthly Oct–Mar] |
| **Next visit** | [Date] |
| **Last used** | [Date] |
| **Scope** | Lawn, borders, terrace area, fire pit area clearance |
| **Notes** | Does not touch wellness circuit area — Sarah or hot tub supplier responsible for that zone |
| **Priority** | P3 — planned, not emergency |

---

## LOCKSMITH / SMART LOCK

| Field | Detail |
|---|---|
| **Name** | [Locksmith name] |
| **Phone** | [Number] |
| **Email** | [Email] |
| **Callout rate** | £[XX] |
| **Lead time** | Emergency: [time] |
| **Smart lock model** | [Model / manufacturer] |
| **Smart lock admin login** | Stored in: [password manager / Sarah's phone — NOT in this document] |
| **Last used** | [Date] |
| **Notes** | For guest lockouts, try code reset via app first. If app fails, call locksmith. |
| **Priority** | P1 if guest is locked out |

**LOCKOUT PROTOCOL:**
1. Send guest PR-12 message (see 100_GUEST_MESSAGES.md)
2. Try resetting code via smart lock app remotely
3. If app fails — call locksmith
4. Keep guest updated every 10 minutes until resolved

---

## LINEN SERVICE

| Field | Detail |
|---|---|
| **Name** | [Linen service provider / laundry] |
| **Phone** | [Number] |
| **Email** | [Email] |
| **Rate** | £[XX] per full set (beds + bath) / £[XX] per item |
| **Turnaround** | [24hr / 48hr] |
| **Collection / drop-off** | [Collection from property: Yes/No / Drop to laundry: address] |
| **What's included** | Duvet covers, pillowcases, fitted sheets, bath towels, hand towels, tea towels, sauna towels |
| **Last used** | [Date] |
| **Current stock count** | [X sets of linen — should have minimum 3 full sets: one on beds, one in wash, one spare] |
| **Notes** | Sarah manages linen supply; cleaner collects used and delivers fresh on turn day if arrangement in place |
| **Priority** | P2 — must be resolved before next check-in |

**LINEN INVENTORY (minimum recommended):**
- Fitted sheets: 6 (3 sets × 2 beds)
- Duvet covers: 6
- Pillowcases: 12
- Bath towels: 12 (minimum 2 per guest per stay)
- Hand towels: 8
- Sauna/wellness towels: 8 (keep separate from bathroom set)
- Tea towels: 6
- Spare: 1 complete set as emergency backup

---

## EMERGENCY CONTACTS (non-supplier)

| Role | Name | Number | Notes |
|---|---|---|---|
| Sarah (host) | Sarah | [Sarah's number] | Guest direct contact |
| House manager / keyholder | [Name if applicable] | [Number] | If Sarah unavailable |
| Neighbours (emergency awareness) | [If on good terms and relevant] | [Number] | Only for genuine emergencies |
| Airbnb host support | — | +44 [AirBnB UK number] | For platform issues, booking disputes |

---

## MAINTENANCE LOG

*Record any work done on the property here. One line per event.*

| Date | Supplier | Work done | Cost | Notes |
|---|---|---|---|---|
| [Date] | [Name] | [Description] | £[XX] | [Any warranty / follow-up needed] |
| | | | | |
| | | | | |

---

## DATABASE SYNC NOTE

The `house_suppliers` table in Supabase holds the core contact data. This document is the operational version — it includes protocols, linen inventory, and maintenance logs that are too long for a database field. Keep both in sync: when a supplier is added or updated here, update the database record too.
