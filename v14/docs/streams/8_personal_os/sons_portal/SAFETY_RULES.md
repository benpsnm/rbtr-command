# Sons Portal — Safety Rules

**Status:** Non-negotiable. These rules do not have exceptions.
**Owner:** Ben Greenwood
**Last reviewed:** May 2026

This document covers access control, data handling, content rules, and decommissioning. Every rule here exists because the portal contains photos and voice recordings of two children. That context governs every decision.

---

## Rule 1 — No Public Access

The portal is not public-facing. It cannot be accessed without a family PIN.

- **PIN format:** 4-digit numeric code
- **Set by:** Ben
- **Stored:** Hashed in Supabase auth — not in the codebase, not in any config file, not in any environment variable file committed to version control
- **PIN is not shared** with anyone outside the immediate family (Ben, Sarah)
- **The boys do not have the PIN.** They are handed the device already unlocked.
- If the PIN is forgotten, Ben resets it via the admin panel using his existing RBTR auth credentials

The portal URL itself is not linked from anywhere public. It is bookmarked on the family iPad. Security through obscurity is not the primary layer — the PIN is — but there is no reason to publicise the URL.

---

## Rule 2 — No Real Surnames

The boys are referred to as "Hudson" and "Benson" throughout the portal. No surname appears anywhere in the UI, in any caption, in any voice note transcription, or in any visible metadata.

- Admin panel: Ben's account uses his full name internally, but this is never surfaced to the kid-facing UI
- Sarah's upload credits show "Mum" — not her name
- Ben's voice note attribution shows "Dad" — not his name
- If Ben writes a caption in first person ("Dad welded the roof rack"), no surname is introduced

This rule applies to:
- All visible copy
- All photo captions
- All voice note transcription snippets
- All on-screen labels

---

## Rule 3 — No Live Location Data (Pre-Departure)

Until the expedition starts on 1 July 2027, no location information of any kind is displayed in the portal.

- The countdown shows days remaining — not departure airport, not planned route
- The route map in "Where We're Going" is illustrative and forward-looking — it shows where they are going, not where anyone currently is
- No GPS, no "current location," no IP-based location detection

**Rationale:** The boys' home location, school region, or daily routine should not be inferable from portal content.

---

## Rule 4 — Live Location During Expedition (Manual Only)

When the expedition is live, location updates are added manually by Ben or Sarah.

**Format:** "We are in [Country]."

That is the full extent of location data shown. No city. No coordinates. No road name. No "we're camping near X." Country only.

**Update mechanism:** Ben or Sarah logs in, selects the current country from a dropdown (the route country list), saves. This publishes to the Adventure Log header and the map section. It does not pull from a device GPS feed. It is never automatic.

**Why manual:** Automatic GPS sharing creates a live track of the family's location, which is not appropriate for a child-facing portal, regardless of the PIN protection. Manual updates share only what Ben chooses to share, when he chooses to share it.

---

## Rule 5 — No Social Sharing

There are no share buttons anywhere in the portal.

- No "share to Instagram" or "share to WhatsApp"
- No "copy link" that generates a shareable URL to a specific photo or entry
- No "invite a friend to view"
- No public permalink to any content item

If Ben or Sarah wants to share something from the portal with a grandparent or family friend, they do that outside the portal — they screenshot it and send it manually. This is a deliberate friction point. It means sharing is an intentional act, not an accidental tap.

---

## Rule 6 — Photo Content Rules

Every photo uploaded to the portal is checked against these rules before publishing. Ben or Sarah is responsible for checking. There is no automated moderation.

**Not allowed in any photo:**
- School uniform (on either boy or in the background)
- The house number or street name of the family home (visible in background, on post, on a label)
- The school building or any identifiable school signage
- Other children who are not Hudson or Benson (unless face is not visible — back of head is fine)
- Any document, letter, or screen that contains personal information

**Fine to include:**
- The warehouse (no address visible on the building exterior in any shot — Ben to check)
- The truck in build state
- The boys in normal clothes at home or outdoors
- Family members (no surnames in captions)

If a photo is borderline, it does not go in. There is always another photo.

---

## Rule 7 — Voice Notes: Family Only

Voice notes in the portal are recorded by Ben or Sarah only. No exceptions.

- No third-party narration
- No AI-generated voice
- No content recorded by anyone other than the boys' parents
- Grandparents, friends, or other family members cannot submit voice notes — if they want to send something, Ben or Sarah listens first and decides whether to upload it separately as a text-based memory wall entry

**Rationale:** The portal is a family record. It is not a community platform. The voice the boys hear should be one they trust immediately.

---

## Rule 8 — Access Log

The portal admin panel maintains a log of the last 10 logins.

**What is logged:**
- Date and time of login
- Session duration (optional — if simple to implement)

**What is NOT logged:**
- Which sections were viewed
- Which photos were tapped
- How long the boys spent on any item

The purpose of the log is to let Ben or Sarah verify that the portal is being accessed only by the family — not to monitor the boys' behaviour within it. The boys are not tracked.

The log is visible in the admin panel only. It is not surfaced anywhere in the kid-facing UI.

---

## Rule 9 — Data Separation

All sons portal content is stored in a dedicated Supabase schema: `sons_portal`.

**Tables in `sons_portal`:**
- `countdown_photo`
- `truck_photos`
- `route_countries`
- `packing_items`
- `memory_wall`
- `adventure_log`
- `access_log`

**Not in `sons_portal`:**
- Any business data (PSNM, Eternal, RBTR operations)
- Any client or customer data
- Sarah's personal data beyond her upload credentials
- Anything unrelated to the portal's six sections

Row-level security (RLS) policies on all `sons_portal` tables restrict read access to authenticated family sessions and write access based on role (Ben = full admin, Sarah = memory_wall only).

The `sons_portal` schema is never joined to business tables in any query. It is structurally isolated.

---

## Rule 10 — Decommissioning Protocol

If the portal is shut down for any reason — end of expedition, change in platform, or any other reason — the following sequence is followed before any cloud data is deleted:

1. **Export all content** to a local ZIP archive:
   - All photos (full resolution)
   - All voice note audio files
   - All text content (captions, facts, log entries) as a structured JSON or CSV export
   - The access log

2. **Verify the export** — open the ZIP, confirm files are uncorrupted and complete

3. **Store the ZIP** in at least two locations: one local drive and one offline backup (external hard drive, not a cloud service)

4. **Then delete from cloud** — remove the `sons_portal` schema from Supabase, revoke access credentials, and decommission any associated storage buckets

**This sequence is non-negotiable.** Deleting before exporting is not allowed, regardless of time pressure.

**Why:** The portal is a family record. The boys should be able to access it when they are adults. The content has archival value independent of its use as a live portal.

---

## Summary Table

| Rule | What it prohibits | Owner |
|------|-------------------|-------|
| 1 — No public access | Unauthenticated access | Ben |
| 2 — No surnames | Real surname in any UI element | Ben + Sarah |
| 3 — No live location (pre-departure) | GPS or location inference | Ben |
| 4 — Country-only location (expedition) | City, coordinates, or auto-GPS | Ben |
| 5 — No social sharing | Share buttons, public permalinks | Developer |
| 6 — Photo content rules | School uniform, home address, other children | Ben + Sarah |
| 7 — Family voice only | Third-party or AI-generated audio | Ben + Sarah |
| 8 — Access log | Behavioural tracking of boys | Developer |
| 9 — Data separation | Business data in `sons_portal` schema | Developer |
| 10 — Export before delete | Cloud deletion without local backup | Ben |
