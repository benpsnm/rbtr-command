# Daily Queue Logic — Who Do I Call Today and Why
**PSNM Atlas Cold Engine — Prioritisation Formula**

---

## The Core Principle

You have 205 leads and limited hours. Every morning the queue tells you exactly who to call, in what order, and why. You don't agonise — you follow the list, log the outcome, move on.

---

## The Ranking Formula

Every lead in `psnm_outreach_targets` gets a **Daily Score** calculated each morning. The lead at the top of the list is call #1.

### Daily Score = Base Score + Freshness Bonus + Urgency Modifier + Big Fish Premium

---

### Component 1: Base Score (from `priority_score` column, 0–100)

This is the static intelligence score set when you first research a lead:

| Factor | Points |
|--------|--------|
| Within 10 miles of S66 8HR | +20 |
| 10–30 miles | +10 |
| 30+ miles | +0 |
| High-volume storage industry (food, FMCG, logistics, construction materials) | +20 |
| Medium-volume (manufacturing, engineering, pharma distribution) | +10 |
| Low-volume (services, technology, small firms) | +0 |
| Company size Large (250+) | +20 |
| Company size Mid (50–249) | +15 |
| Company size Small (10–49) | +5 |
| News hook identified | +10 |
| Direct contact name/email known | +10 |
| Mutual connection identified | +10 |

**Range: 0–100. Recalculate when new intel arrives.**

---

### Component 2: Freshness Bonus (dynamic, resets on each touch)

| Lead state | Bonus |
|------------|-------|
| Never contacted (`not_contacted`) | +15 |
| Queued but not yet touched today | +10 |
| Last touched 7+ days ago (gone cold) | +8 |
| Last touched 3–6 days ago | +5 |
| Last touched 1–2 days ago | +0 |
| Touched today already | −50 (do not call again today) |

---

### Component 3: Urgency Modifier (event-driven, expires)

Apply these bonuses only if the event is live today:

| Event | Bonus | Duration |
|-------|-------|----------|
| Callback promised by lead ("call me Thursday") | +40 | Expires if you miss it |
| Lead opened a quote email (email tracking) | +35 | Drops to +10 after 3 days |
| Lead replied to any contact with a question | +30 | Resolve within 24hrs |
| Lead went warm (asked for info, said "ring back") and is now 5+ days dormant | +25 | Rises +5/day after day 5 |
| It's been exactly 1 week since first contact (follow-up timing) | +20 | Window: day 6–8 |
| Lead is at the quote stage but hasn't accepted | +15 | Active until resolved |
| Inbound enquiry from same industry appeared today (sector momentum) | +10 | Same day only |

---

### Component 4: Big Fish Premium

For leads estimated at T1 (100+ pallets, £600+/week), apply a flat premium:

| Tier | Premium |
|------|---------|
| T1 — 100+ pallets | +20 |
| T2 — 30–99 pallets | +5 |
| T3 — under 30 pallets | +0 |

**Rationale:** One T1 customer is worth 20 T3 customers. They get more of your time even if the base score is similar.

---

### Final Score Calculation Example

Autogreen, Rotherham S66 8HS (same postcode):
- Base score: 92
- Never contacted: +15
- T1 estimate: +20
- No urgent event: +0
- **Daily Score: 127** → Call #1 today.

Stanton Logistics, Derbyshire:
- Base score: 65
- Last touched 3 days ago: +5
- T2: +5
- No event: +0
- **Daily Score: 75** → Mid-queue.

---

## Lead Category Definitions

### Category A — Callbacks Owed
Leads who explicitly asked you to call back. **Non-negotiable — always call first.** A missed callback is a broken promise. Set reminders. Do not let these slide.

### Category B — Quote Opens, No Reply
Lead received a quote, email tracking shows it was opened, but no response after 2+ days. High-intent signal. Call while they're still thinking about it.

### Category C — Fresh Leads (never contacted)
First-time calls. Score-ordered. Call the highest scores first. Aim for 6–8 of these per day.

### Category D — Warm but Dormant
Leads who showed interest 7–30 days ago but went quiet. Needs a different angle — brief, non-pushy, just poking the fire. "Just checking if anything's changed."

### Category E — Big Fish Long Game
T1 companies that will take multiple touches and may need a proper proposal. Don't burn these with clumsy cold calls. Each touch should add value — relevant news, specific numbers, a site visit offer.

### Category F — Dead but Not Buried
Leads that said "not right now" 30–60 days ago. Quarterly light-touch: a quick call or email to stay on the radar. Do not write these off unless they've explicitly said no forever.

---

## The Pacing Rule

**Don't burn through the list in one morning.** You'll lose your voice, your sharpness, and you'll start rushing conversations.

### Daily Call Budget

| Session | Time | Type | Target |
|---------|------|------|--------|
| Morning run | 8:00–10:00 | Cold (Cat C/D) | 6–8 calls |
| Late morning | 10:00–12:00 | Warm (Cat B/D) + Big Fish (Cat E) | 4–5 calls |
| Afternoon | 13:00–15:00 | Callbacks (Cat A) + Admin | 3–4 calls |
| Catch-up | 15:00–16:30 | Whatever remains + voicemails | 3–4 calls |

**Hard daily limit: 20 calls. After 20 your delivery drops.**

### The 8/4/4 Rule
On any given day, your mix should be approximately:
- 8 cold contacts (Cat C — never been touched)
- 4 warm-ups (Cat B/D — some prior signal)
- 4 callbacks / follow-ups (Cat A — promised call back)

This keeps the pipeline healthy at all stages. Too many cold calls and you burn leads without converting. Too many callbacks and you're not expanding the top of the funnel.

---

## Morning Routine (5 minutes, before first call)

1. Check `next_touch_at` in queue — any callbacks owed? These go to the top of the list.
2. Check email tracking — any quote opens overnight? Promote these above cold calls.
3. Pull today's sorted list from Atlas (score DESC, status NOT 'contacted', NOT 'do_not_contact')
4. Glance at the intelligence brief for calls 1–5. Know the hook before you dial.
5. Have the playbook open. Don't improvise objections from memory.

---

## End-of-Day Logging Rule

Every call gets logged before you finish for the day. Minimum data:
- `outcome` field: `no_answer | voicemail | spoke_wrong_person | spoke_decision_maker | interested | not_interested | requested_quote | declined`
- `notes` field: one line of what was said or why
- `next_touch_at`: set the next date if applicable
- `status`: update if the lead has moved state

**A call that isn't logged didn't happen.**

---

## Status Flow

```
not_contacted → queued → contacted → engaged → converted
                                   ↘ declined
                                   ↘ do_not_contact
```

| Status | Meaning | Next action |
|--------|---------|-------------|
| `not_contacted` | Never touched | Queue for first call |
| `queued` | On today's list | Call today |
| `contacted` | Had at least one touch, no engagement yet | Re-queue per pacing rules |
| `engaged` | Showed genuine interest, quote stage | Daily priority until resolved |
| `converted` | Became an enquiry (`psnm_enquiries`) | Hand off to customer flow |
| `declined` | Said no — clearly | Move to quarterly light-touch unless "do not call" |
| `do_not_contact` | Explicit "do not call" | Remove from all queues |

---

## When to Declare a Lead Dead

A cold lead is dead (move to `declined`) when ALL of the following are true:
- 5+ contact attempts across at least 2 channels
- No engagement at any point
- No voicemail call-back
- No email open
- More than 60 days since first contact

Even then — don't delete. Quarter-end light-touch costs nothing.

---

*PSNM Atlas Cold Engine — Daily Queue Logic v1.0*
