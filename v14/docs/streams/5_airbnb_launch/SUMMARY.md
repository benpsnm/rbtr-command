# Stream 5 — AirBnB Launch Sprint: Summary
**Property:** 4 Woodhead Mews, Blacker Hill, Barnsley S74 0RH
**Owner:** Sarah
**Stream date:** 2026-05-04
**Branch:** stream-5-airbnb-launch

---

## What was produced

| File | Description |
|---|---|
| `LISTING_COPY_3_VARIANTS.md` | Three full listing copies: Dark Luxury Retreat (A), Wellness Sanctuary Yorkshire (B), Couples Hideaway (C). Each with 50-char title, 150-char short description, 1000+ word long description, house rules, amenities checklist. |
| `PHOTOGRAPHY_SHOT_LIST.md` | 50 specific shots with composition, lighting time, props, and what to exclude. Wellness circuit shots are priority-flagged. Includes shoot day schedule and prop list. |
| `DYNAMIC_PRICING_2026.md` | Full pricing rules + day-by-day CSV from May–December 2026. Covers weekends, bank holidays, Sheffield Utd/Wed home games, half-terms, Christmas week (+75%), NYE (£400 flat), and last-minute discounts. |
| `100_GUEST_MESSAGES.md` | 100 message templates in Sarah's voice: booking confirmation (3), pre-arrival sequence (3 days, 2 days, 1 day), arrival day, mid-stay, departure, post-stay review request (3), problem-solving (12 scenarios), special occasions (4), operational (10). |
| `SUPPLIER_DIRECTORY.md` | Full supplier directory template: cleaner, hot tub service, plumber, electrician, gardener, locksmith, linen service. Schema pulled from `house_suppliers` DB table. Includes protocols and maintenance log. |
| `LAUNCH_WEEK_PLAYBOOK.md` | Day-by-day 7-day plan: Day 1 photoshoot schedule, Day 2 Airbnb build, Day 3 Booking.com + VRBO, Day 4 direct setup + calendar sync, Day 5 test booking + 10-person soft launch, Day 6 review + social, Day 7 public launch. First 30 days guidance included. |
| `LISTINGS_FOR_SECONDARY_PLATFORMS.md` | Platform-specific copy for Booking.com, VRBO, Plum Guide (positioning notes + how to respond if approached), and a direct website structure with copy. |

---

## Revenue model summary

| Scenario | Rate | Frequency |
|---|---|---|
| Weekday standard | £110/night | Sun–Thu non-event |
| Weekend | £143/night | Fri–Sat (+30%) |
| Bank holidays | £165/night | +50%, 3-night min |
| Sheffield United home game | £132 weekday / £172 weekend | +20% overlay |
| Sheffield Wednesday home game | £127 weekday / £165 weekend | +15% overlay |
| Christmas week (23–28 Dec) | £193/night | +75%, 5-night min |
| New Year's Eve | £400 flat | 2-night min |
| Last-minute (unsold, within 7 days) | -15% off applicable rate | |
| Half-term weekdays (May/Oct) | £99/night | -10% to fill weekdays |

**At 70% occupancy (May–Dec 2026):** ~£2,310/month average, ~£13,860 for 8 months.
Christmas week and NYE significantly uplift Q4 beyond this baseline.

---

## Key decisions made in this sprint

1. **Variant A (Dark Luxury Retreat) as the primary Airbnb listing.** It is the most distinctive and positions the property highest. A/B test Variant B (Wellness Sanctuary) after first 30 days if conversion rate is below target.

2. **Soft launch to 10 contacts before public listing.** The first 3–5 reviews are disproportionately valuable. Better to give a friends rate, get genuine reviews, and launch with social proof than go public into silence.

3. **Manual pricing at launch, not smart pricing tools.** Airbnb's smart pricing chronically underprices distinctive properties. The manual CSV rules protect the rate and can be revisited after 90 days of data.

4. **Direct website: Option A (simple landing page) at launch.** Direct booking engine (Lodgify/Guesty) is the right call after the listing has reviews. Premature to build full direct booking infrastructure before the property has proven demand.

5. **Plum Guide positioning:** Woodhead Mews genuinely qualifies. The wellness circuit + design intent is exactly what their editorial team looks for. Sarah should use the response script in LISTINGS_FOR_SECONDARY_PLATFORMS.md if contacted, and should start tagging #PlumGuide on Instagram posts once live.

---

## What still needs to happen (human action required)

| Action | Owner | Priority |
|---|---|---|
| Fill in all [to be filled] supplier details in SUPPLIER_DIRECTORY.md | Sarah | Before launch |
| Confirm attic conversion completion date and which areas are photoshoot-ready | Sarah / Contractor | Before Day 1 |
| Book photographer — agree shoot day (recommend the week before platform go-live) | Sarah | Immediately |
| Confirm exact bedroom/bathroom count and max guest numbers for all listings | Sarah | Before Day 2 |
| Set up dedicated property email account (e.g. woodheadmews@gmail.com) | Sarah | Before Day 2 |
| Verify Sheffield United and Sheffield Wednesday home fixture list for summer/autumn and update pricing CSV | Sarah / Ben | Monthly |
| Decide on 10 soft-launch contacts and personalise messages | Sarah | Before Day 5 |
| Confirm cancellation policy decision (Moderate recommended; Flexible for first 10 bookings to get reviews faster) | Sarah | Before Day 2 |
| Bank account and VAT registration (if turnover will exceed VAT threshold) | Sarah / Accountant | Before first payout |

---

## Suggested 30-day A/B test plan

After 30 days of Airbnb data, run:
- **Variant A** (Dark Luxury Retreat) on Airbnb
- **Variant B** (Wellness Sanctuary) on Booking.com
- Compare: click-through rate, enquiry rate, booking rate, and review language (what do guests say about the property?)

Switch to the variant that produces the best combined rate × booking frequency. Rollout the winning variant across all platforms at Day 60.

---

## Commit
Branch: `stream-5-airbnb-launch`
All 8 files created in `/docs/streams/5_airbnb_launch/`
