# Sons Portal — Design Principles

**Portal:** Hudson & Benson's Adventure Portal
**Audience:** Hudson (7 by expedition start) and Benson (3 by expedition start)
**Access device:** Shared family iPad, opened by Ben or Sarah
**Tone reference:** A good children's book narrator. Warm, certain, a little bit exciting.

---

## Core Philosophy

This is not an app. It is a place they come to.

The portal exists to make the expedition real for two small kids before it happens, and to hold the memory of it while it does. It should feel like opening a treasure chest, not loading a dashboard. Every design decision should pass one test: would a seven-year-old lean in, or lean back?

---

## Visual-First Design

Photos carry more weight than any copy. Every section leads with an image. Text supports the image — it does not replace it.

- **Photos over text.** When in doubt, make the photo bigger.
- **Big icons.** Navigation icons are recognisable at a glance from across a table. No tiny labels tucked under hairline icons.
- **Bold, warm colours.** Palette is earthy and adventurous — think sand, rust, forest green, sky blue. Not neon. Not pastel. Not the default iOS blue. These colours should feel like the places they're going.
- **Generous whitespace.** Content breathes. Nothing is crowded. A child's eye needs clear landing zones.
- **Rounded corners on everything.** Cards, photos, buttons. Nothing sharp.

The portal is not garish. It is not a game. It does not flash or pulse or animate for the sake of it. Animations are purposeful — a photo fading in, a map country highlighting, a voice message ripple.

---

## Hudson UI (age 7)

Hudson can read. He will read everything. Design for his curiosity.

- Full sentences are fine. He will read them.
- Map sections should show country borders and capital city names. He will want to find them.
- Facts should have a second sentence. He will ask follow-up questions and the fact should be rich enough to spark them.
- Tap targets can be normal size — he has good motor control.
- Include detail where it earns its place: the weight of the roof rack, the name of the desert, the animal that only lives in one country.
- He is the protagonist. Copy addresses him directly. "Hudson, this is your route."
- He can handle mild challenge: "This part of the journey is going to be hard. That's what makes it worth it."

Hudson mode is the default when the portal loads. It assumes literacy.

---

## Benson UI (age 3)

Benson needs pictures and his own name. Almost everything else is decoration to him at this age.

- **One idea per screen element.** One animal. One colour. One word.
- **Big tap targets.** Buttons and cards are finger-sized, not thumb-sized. His whole hand may land on the screen.
- **Voice-over option.** A speaker icon on any text element reads it aloud in a friendly voice. This is optional, not automatic — Ben or Sarah triggers it.
- **Simple labels.** "LION." "TRUCK." "BIG." These are captions, not sentences.
- **His name appears often.** "Benson's sleeping bag." "Benson, look at this!" Hearing his name (even reading it) anchors him.
- **Photos over maps.** He does not understand maps. He understands a camel. Show him the camel.

There is a Benson mode toggle. When active, the copy across all sections simplifies. The map section becomes a photo slideshow. Facts become one-word labels. The UI does not otherwise change — same colours, same structure, same warmth.

---

## Tone: Exciting but Calm

This is not a game. There are no points, no streaks, no notifications. It does not want anything from them.

The tone is the tone of a dad reading to his boys at bedtime — steady, warm, building towards something. There is wonder in it, but it is not frantic. The expedition is real. The portal reflects that reality without turning it into entertainment content.

Reference: the narrator voice from a good 1970s or 80s wildlife documentary made for children. Knowledgeable. Calm. Treating the child as genuinely intelligent.

What this rules out:
- Exclamation marks on every line
- "Amazing!!!" energy
- Gamification language ("Level up!", "You've unlocked Morocco!")
- Urgency ("Don't miss this!")

What this keeps in:
- One well-placed exclamation mark per section, when earned
- Genuine facts that respect the child's intelligence
- "We" language when it means the family; "you" language when it means the boy
- Occasional dry humour that Ben would actually say

---

## Navigation Structure

**Tabs for top-level sections.** Five or six tabs maximum. Icons + short labels. Fixed at the bottom of the screen (thumb reach on iPad).

Tab labels:
- Countdown
- The Truck
- Where We're Going
- Our Kit
- Memory Wall
- Adventure Log (locked until departure)

**Scroll within each section.** No nested tabs. No back-and-forth navigation. A child can scroll; a child cannot navigate a sitemap.

Tap a card → it expands in-place or opens a full-screen overlay. One tap in, one tap (or swipe) back out.

---

## Loading Screen

A full-bleed photo of the truck in its current build state.

Centred text, large, warm typeface (not bold weight — friendly weight):

> Your Adventure

Below it, smaller:

> Hudson and Benson

No spinner graphic. The photo is the loading experience. It fades in as soon as it loads. If the photo hasn't loaded yet, the background colour is the sand/rust tone from the palette.

The loading screen is not a splash screen that disappears in 2 seconds. It is the entry point. Ben or Sarah hands the iPad to the boys on this screen.

---

## No Notifications

The portal does not push anything to the boys.

No alerts. No badges. No "you haven't visited in a while." No email. No sound effects that auto-play on load.

The boys experience the portal when Ben or Sarah brings them to it. The experience is curated and intentional. This is by design.

---

## No Accounts for the Boys

Ben has an admin login (existing RBTR auth).
Sarah has edit access for Memory Wall.
The boys have no accounts. They do not log in.

The family iPad has the portal bookmarked. Ben or Sarah unlocks it with a 4-digit PIN. The boys are handed the device. They explore.

This removes all friction and all risk. There is nothing for a child to accidentally break.

---

## Typography

- **Headings:** Rounded sans-serif. Something in the family of Nunito, Poppins, or similar. Not a system font.
- **Body (Hudson mode):** Same family, regular weight, comfortable line height (1.6+). Minimum 18px.
- **Body (Benson mode):** Same family, bold weight, minimum 28px. Fewer words per line.
- **Numbers (countdown):** Display size. The countdown number is the biggest element on the screen.

---

## Accessibility Baseline

- All photos have alt text (Ben writes these when uploading — one sentence).
- Colour contrast meets WCAG AA at minimum.
- Voice-over labels on all interactive elements (for the iPad's built-in accessibility features).
- Tap targets minimum 44px × 44px (Apple's stated minimum; aim for 60px+ on child-facing elements).
