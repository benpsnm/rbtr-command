# Sarah's Portal — Design Principles

## What this is

This is Sarah's space. Not a shared space, not a family tool. Hers.

It functions as a personal OS — a quiet, private place where she can keep track of what matters to her, in whatever way feels right. Nothing here is mandatory. There are no correct answers, no minimum inputs, no completion percentages. The only question it ever asks is: *what do you want to put here?*

Think of it less like a dashboard and more like a well-designed notebook — the kind you keep because you want to, not because you have to.

It exists because she deserves a place that belongs entirely to her.

---

## What this is not

It is not a productivity tracker. There are no streaks to maintain, no tasks overdue, no weekly review to complete.

It is not something Ben checks. He cannot see her entries. He does not have access to this space by default, and it was built that way deliberately. This is not a window into her life — it is a room she can close the door on.

It is not a family planning tool. The family schedule, the expedition planning, the shared finances — those live elsewhere. This portal does not carry that weight.

It is not a place where she should feel any pressure to log correctly, write beautifully, or stay consistent. There is no correct way to use it.

---

## Privacy model

Sarah has her own authentication token, entirely separate from the main portal. Her login is hers alone.

All entries — journal, mood logs, dream records, body notes, friendship log — are encrypted at the row level in the database. They are not accessible via the admin role used for the main portal. They are not readable by any other user.

Ben's admin permissions explicitly exclude Sarah's portal tables. This was written into the access rules, not just assumed.

She can choose to share a specific entry with Ben using a "share with Ben" button that appears on individual entries. This is entirely her decision. It is never the default. Nothing surfaces to Ben unless she actively sends it.

---

## Aesthetic direction

The visual design should feel like a place she wants to return to, not a tool she has to open.

**Typography:** Soft serif — warm, readable, calm. Not clinical, not techy.

**Palette:** Muted and warm. Sage, stone, warm cream. Nothing cold. Nothing corporate.

**Reading mode:** Journal entries open in full-screen reading mode — generous margins, quiet background, no chrome.

**No RAG status anywhere.** No red, amber, green indicators. No urgency cues. That is Ben's world, not hers.

**No countdown clocks.** No runway metrics. No time pressure of any kind.

Navigation is minimal. The interface does not shout. It waits.
