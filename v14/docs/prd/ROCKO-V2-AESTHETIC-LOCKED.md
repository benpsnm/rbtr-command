# Rocko v2 PRD — Aesthetic Lock Addendum
Date locked: Thursday 14 May 2026, 14:35
Build target: Yolo Phase 5 (Mobile PWA) + Phase 6 (Desktop modal)
Approval: Ben locked v6 mockup after 6 iterations

---

## Design Direction
Sci-fi HUD meets Western operator. Iron-Man-style neural intelligence orb. Black + white + restrained blue/copper accents.

---

## Colour Tokens

```css
--bg-primary: #0a0a0a
--bg-surface: rgba(255,255,255,0.02)
--bg-elevated: rgba(255,255,255,0.06)
--text-primary: #ffffff
--text-secondary: #888888
--text-tertiary: #666666
--text-muted: #5a5a5a
--text-disabled: #444444
--accent-orb: #60a5fa
--accent-orb-bright: #bfdbfe
--accent-orb-deep: #1e3a8a
--accent-copper: #c87a3a /* URGENT/TENSION VALUES ONLY */
--accent-success: #22c55e
--border-default: rgba(255,255,255,0.12)
--border-emphasis: rgba(255,255,255,0.2)
--border-divider: rgba(255,255,255,0.08)
```

---

## Typography

- **Display:** Rye serif (R·O·C·K·O header, RBTR card)
- **Serif italic:** Playfair Display italic (Forge, Sarah card)
- **Body:** -apple-system, Inter (all UI)
- **Bold:** -apple-system bold (PSNM brand, Ben card — weight 700 NOT 900)
- **Mono:** SF Mono / Geist Mono (telemetry, mono caps)

---

## Layout

### Top Bar
- R·O·C·K·O header
- LIVE pill
- Timestamp

### Orb Zone (380px height)
- **Core orb:** Breathing 70px core, white-blue plasma
- **3 ripple waves:** 80→180px radius, 3s stagger
- **Outer radar ring:** 160px, 12 ticks, rotates 60s
- **Inner solid ring:** 92px, 3 markers, rotates 25s slow
- **20 dendrites** with travelling particles
- **20 synapse end nodes** pulsing
- **Drifting thought snippets** in SF Mono
- **NO counter-rotating dashed ring** (removed per Ben lock)

### Hold-to-Speak Button
- Small refined pill
- 9px 22px padding
- SF Mono 11px, letter-spacing 3px
- Green dot status indicator

---

## Five Brand Doors

### PSNM
- Bold sans + pallet drawing
- Hero: **BREAK-EVEN 412/827**

### Forge
- Playfair italic "forge"
- Hero: **LAUNCH IN 32d**

### RBTR
- Mountain arch + Rye "ROCK BOTTOM TO ROAMING"
- Hero: **DEPARTS IN 778d**

### Ben
- Bold sans weight 700
- Hero: **TODAY 3/7 done**

### Sarah
- Playfair italic "Sarah"
- Hero: **EQUITY £105k**

**Brand separation:** PSNM modal = PSNM identity, Forge modal = Forge identity, etc. NEVER cross-pollinate.

**Production:** Replace SVG approximations with actual PNGs at `v14/public/brand/`

---

## Modal Pattern

Triggered by: tap a door OR voice command

**Layout:**
- Centre overlay, 85% black opacity
- 560px modal, 0.5px border, drop shadow
- Brand identity at top (matches the door tapped)
- Voice commands: "Approve all", "Next", "Close"
- Dismiss: ESC / tap X / click outside / voice "close"

---

## Animation Summary

- **Core orb breath:** 66→76px, 2.8s
- **Inner core breath:** 36→42px, 2.0s
- **Ripple waves:** 80→180px, 3.0s stagger
- **Outer radar:** rotate 60s
- **Inner ring:** rotate 25s
- **Dendrite particles:** 2.1-3.6s travel
- **Synapse pulses:** 2.1-3.6s varied
- **Thought snippets:** 6s fade cycle
- **Modal in/out:** 250ms fade+scale

---

## Final Lock Statement

This is binding for Phase 5 (Mobile PWA) and Phase 6 (Desktop modal).

Reference actual logo PNGs at `v14/public/brand/` — don't redraw in SVG.

**If yolo finds conflict between this spec and visual interpretation: STOP and ask Ben.**
