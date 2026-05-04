# Sons Portal — Sections

**Portal:** Hudson & Benson's Adventure Portal
**Status:** Pre-departure build (content scaffolded; Adventure Log locked until 1 Jul 2027)
**Last updated:** May 2026

---

## Section 1 — Countdown to Expedition

**Purpose:** Make the departure date feel real and tangible. A child can understand a number; they cannot understand a date.

### What the screen shows

- **Giant number:** Days until 1 July 2027. This is the hero element — the largest text on the screen. Display weight. Warm rust or sand colour.
- **Background:** A full-bleed photo of the truck in its current build state. This photo is updated whenever a major milestone is hit (not automatically — Ben uploads it manually).
- **Primary line (large, friendly font):** "Hudson and Benson, your adventure starts in [N] days!"
- **Secondary line (smaller, below):** A contextual translation of the number into something a child understands. Examples:
  - "That's about 4 school terms away."
  - "That's about 60 weekends."
  - "That's about [N] sleeps." (used when N < 100)
  - "Dad's still building the truck." (used when N > 300)
- The contextual translation updates automatically based on the remaining day count. The logic is simple — a handful of threshold rules.

### Data
- Departure date hardcoded: **1 July 2027**
- Photo: manually uploaded by Ben (stored in Supabase, `sons_portal.countdown_photo`)
- Countdown calculated client-side from today's date — no server call needed for the number

### Benson mode
- Same layout
- Primary line simplifies to: "Benson! [N] more sleeps!"
- Secondary line hidden
- Photo remains

---

## Section 2 — Truck Progress Photos

**Purpose:** The truck is being built at the warehouse right now. The boys should be able to watch it take shape week by week.

### What the screen shows

- **Scrolling gallery, latest at top.** Portrait or landscape — the image determines the aspect ratio; the card adapts.
- **Each card shows:**
  - The photo (full-width card, rounded corners)
  - A date stamp (small, below the photo — "Friday 3 April 2026")
  - A one-line caption in kid language ("We put the roof rack on today — it took all afternoon.")
- **Tap a card:** Photo expands to full screen. Caption shown below in larger text. Tap anywhere to return.

### Content rules
- Ben adds one photo every Friday from the warehouse. This is the minimum cadence.
- Captions are written by Ben. No polish required. First-thought captions are often better.
- Caption maximum: two sentences. One is better.
- No technical jargon in captions — but technical words are fine if they're explained in the same sentence ("We fitted the second leisure battery — that's the one that runs the fridge while we're parked up.")

### Data model
```
sons_portal.truck_photos
  id, created_at, photo_url, caption, display_date
```

### Benson mode
- Same gallery
- Caption simplifies to a 3–5 word version: "LOOK! THE ROOF RACK!"
- Caps used deliberately for Benson — he responds to emphasis

---

## Section 3 — Where We're Going

**Purpose:** Make the route real. Give each place a face and a fact. Build anticipation for specific countries.

### What the screen shows

- **A stylised map of the route.** Not Google Maps. Illustrated or semi-illustrated — think a children's atlas aesthetic. The route is drawn as a line from the UK south through Europe and into Africa.
- **Route countries are highlighted** as dots or named regions on the map.
- **Tap a country → opens a country card:**
  - Full-bleed photo of that country (landscape, nature, or culture — no political imagery)
  - Country name in large text
  - One amazing fact (calibrated to age 7 in Hudson mode)
  - A small "fact from Dad" attribution if the fact was written by Ben personally (most should be)

### Route countries (placeholder — Ben to confirm exact route)

Scaffold built for approximately 15 countries. Suggested scaffold based on a UK-to-West-Africa overland route:

1. France
2. Spain
3. Morocco
4. Western Sahara
5. Mauritania
6. Senegal
7. The Gambia
8. Guinea-Bissau
9. Guinea
10. Sierra Leone
11. Liberia
12. Ivory Coast (Côte d'Ivoire)
13. Ghana
14. Togo
15. Benin

Ben to confirm, trim, or extend this list. Each country needs: one photo, one kid-language fact.

### Hudson mode — country card
- Borders and capital city name visible on the map
- Fact is 2–3 sentences, rich enough to spark questions
- Example: "Morocco is where the Sahara begins. The desert is so enormous that if you drove across it without stopping, it would take three days. We're going to camp right in the middle of it."

### Benson mode — country card
- Map simplifies — just the photo, no borders
- Fact becomes a single word: the most exciting animal, colour, or object associated with that country
- Format: "[WORD]. [Photo of that thing]"
- Examples: "CAMEL." / "LION." / "DRUM."

### "New country unlocked" state
- When Ben adds a country's photo and fact for the first time, that country card gets a subtle animation — a warm glow or a brief card-flip reveal
- This is a card, not a game mechanic. No points. No unlock sound. Just a visual moment.
- Countries with no content yet show as greyed-out dots on the map with "Coming soon" on tap

---

## Section 4 — Their Packing List

**Purpose:** Make the expedition tangible through objects they know and can touch. Their own kit, their own adventure.

### What the screen shows

- **Two tabs within the section:** "Hudson's Kit" and "Benson's Kit"
- **Each item shown as a card:**
  - Photo of the item (or a clean product-style photo if the actual item hasn't been purchased yet)
  - Item name in large friendly text
  - One-line note about the item (optional — Ben or Sarah writes this when adding the item)
  - A tick circle on the right — tappable

### Tick mechanic
- Tapping the tick marks the item as packed with a satisfying visual (fill + checkmark)
- **This is not tracked or stored.** It resets on each session. It is purely visual satisfaction — like ticking a paper list.
- The tick state is not synced to Supabase. It lives in local component state only.

### Suggested items — Hudson's kit

| Item | Note |
|------|------|
| Headtorch | Red light mode for when you don't want to wake anyone up |
| Sleeping bag | Rated to -5°C |
| Penknife (age-appropriate) | For carving sticks and cutting rope |
| Notebook and pen | For the things he'll want to write down |
| His own flag | To plant when we reach the furthest point |
| Binoculars | For animals and mountain passes |
| Rain jacket | Africa gets wet too — especially the coast |
| Water bottle | His name on it |
| Compass | Old school. He'll learn to use it. |
| Book (chosen by Hudson) | One book. Not a Kindle. |

### Suggested items — Benson's kit

| Item | Note |
|------|------|
| Sleeping bag | Blue. His favourite colour. |
| Headtorch | The yellow one. His. |
| Stuffed animal | Comes everywhere |
| Rain boots | For puddles in every country |
| Snack bag | His own supply of crackers |
| Sunhat | The wide one. No negotiation. |
| Water bottle | His name on it. With animals on it. |
| Backpack | Red. Small enough to actually carry. |

Ben and Sarah to expand and confirm — these are scaffolded starting points.

### Data model
```
sons_portal.packing_items
  id, child (hudson|benson), item_name, item_note, photo_url, sort_order
```

### Benson mode
- Item names in caps: "SLEEPING BAG" / "HEADTORCH"
- Notes hidden (too many words)
- Photos take up more of the card

---

## Section 5 — Memory Wall

**Purpose:** A running record of the lead-up to the expedition. Drawings, photos, voice notes. Their contribution to the story.

### What the screen shows

- **Mixed-media wall, most recent at top.** No strict grid — a masonry-style layout. Cards vary in size based on content type.
- **Three content types:**

**1. Drawings**
  - Sarah photographs the boys' drawings and uploads them
  - Displayed with a slight tilt (random 1–3° rotation) — like it's pinned to a corkboard
  - Caption: who drew it and when ("Hudson, March 2026")
  - No other text

**2. Photos**
  - Ben or Sarah uploads photos of the boys from the lead-up period
  - Same corkboard aesthetic
  - Caption optional — one line if used
  - No location metadata visible in the UI

**3. Voice messages**
  - Ben (or Sarah) records a voice note at the warehouse or at home
  - Displayed as a card with: a waveform graphic, Ben's name, the date, and a large circular play button
  - Plays in-browser — no download required
  - Example voice note context: "Hey boys, it's Friday, I'm at the warehouse…"
  - Duration displayed (e.g., "2 min 14 sec")

### Access rules
- Ben has full upload access to all three content types
- Sarah has upload access to drawings and photos only (not voice notes — hers is optional, not a workflow requirement)
- There is no public upload. Only authenticated family members.

### Data model
```
sons_portal.memory_wall
  id, created_at, type (drawing|photo|voice), file_url, caption, uploaded_by, duration_seconds (voice only)
```

---

## Section 6 — Adventure Log

**Purpose:** The section that fills during the expedition. Scaffolded now so the structure is ready. Locked until departure.

### Pre-departure state

The section tab is visible. Tapping it shows:

- A full-bleed teaser image (a dramatic landscape — the Sahara, or the truck at a scenic viewpoint)
- Overlaid text: "The story starts on 1 July 2027."
- Sub-text: "Check back when we hit the road. This is where the real story goes."
- A lock icon, minimal — not playful, not punishing. Just honest.

The countdown from Section 1 is referenced here: "Opens in [N] days."

### Post-departure state (live from 1 Jul 2027)

Each log entry contains:
- **Date and country:** "Day 4 — Morocco"
- **One photo:** taken that day
- **One fact:** something they learned or saw ("We saw a carpet shop with 400 rugs stacked to the ceiling.")
- **One feeling:** written by Ben or Sarah ("Tired but we saw stars last night that I've never seen before.")
- **Kid-language narrative:** 3–6 sentences. Written by Ben or Sarah. Not edited. Not polished. Real.

Entries are added manually by Ben or Sarah. There is no automated content. There is no AI-generated text in the Adventure Log. These are Ben's actual words from the actual days.

### Data model
```
sons_portal.adventure_log
  id, entry_date, country, photo_url, fact_text, feeling_text, narrative_text, published (bool)
```

`published = false` means Ben drafted it but hasn't released it yet (useful for writing ahead and releasing later if connection is poor).

### Benson mode
- Narrative hidden
- Fact simplified to one sentence
- Photo takes up 80% of the card
- Country name in large caps: "MOROCCO"
