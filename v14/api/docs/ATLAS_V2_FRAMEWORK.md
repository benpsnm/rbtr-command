# Atlas v2 — Six-Framework Outreach Engine
# Created: 2026-04-27
# This is the strategic framework document, rendered in the WMS Strategy tab.

---

## What Atlas v2 Is

Atlas v2 is the outreach engine for PSNM. It generates framework-driven cold emails for every qualified prospect in psnm_outreach_targets, presenting them to Ben for review and approval before any send. It replaces manual outreach with a systematic, high-quality, human-verified process.

**Key principle**: Quality at scale. Every email reads like Ben wrote it personally. Atlas generates the draft; Ben approves it; Atlas sends it. Nothing fires automatically.

---

## The Six Frameworks — Why Each One

### 1. Hormozi Value Equation
**Source**: Alex Hormozi — *$100M Offers*

Value = (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort & Sacrifice)

The PSNM offer is engineered to score maximum on this equation:
- Dream outcome: overflow stock managed, accessible 24/7, off premises and off headcount
- Perceived likelihood: first week free on 12-week commitment (proof before commitment; "1 in 4 convert in the trial week")
- Time delay: onboarding typically 3-5 working days from contract signed; we arrange collection
- Effort & sacrifice: no contract beyond initial 12 weeks, no paperwork, we collect

Every Atlas email leads with the value equation, not the price.

### 2. Miller StoryBrand
**Source**: Donald Miller — *Building a StoryBrand*

The prospect is the hero. PSNM is the guide. This reframes every email from "here's what we do" to "here's how we solve your problem."

The seven-part structure applied in every email:
1. Character (hero): the prospect — probably running out of space, paying for space they don't always need, or stressed about peak season
2. Problem: external (space), internal (distraction, anxiety), philosophical (variable needs, fixed cost solutions don't fit)
3. Guide (us): experience, proof, empathy
4. Plan: 3 simple steps — contact, we collect, access anytime
5. Call to action: one clear ask
6. Success vision: what resolved looks like
7. Failure to avoid: what happens if they don't solve this

### 3. Brunson Hook / Story / Offer
**Source**: Russell Brunson — *DotCom Secrets, Expert Secrets*

Every email has a hook (earns the read), a story (builds trust), and an offer (irresistible proposition).

- Hook: specific to the company or industry — not generic
- Story: why PSNM exists, or a specific proof point
- Offer: the Grand Slam Offer, framed as a specific proposition

### 4. Kennedy Direct Response
**Source**: Dan Kennedy — *The Ultimate Sales Letter*

Cold email is direct response. Direct response has rules:
- One call to action, not multiple
- Urgency that is real (Hellaby fills up; peak season is coming)
- Specificity beats vagueness (a date, a number, a time)
- Make replying easy — contact details, low barrier ask

### 5. Cardone Follow-Up Intensity
**Source**: Grant Cardone — *Sell or Be Sold*

Most sales are lost because of insufficient follow-up, not poor product. Atlas v2 implements a 5-touch sequence per prospect across 6 weeks. Touch 1 (the email) sets the professional, persistent tone. The email signals there will be a follow-up — this is not a one-shot.

The Cardone frame: you believe in your offer. You're not asking for a favour. You're giving them access to something genuinely valuable.

### 6. Holmes Dream 100
**Source**: Chet Holmes — *The Ultimate Sales Machine*

Not every prospect is equal. The Dream 100 are the 100 companies that, if converted, would transform the business. Every Dream 100 contact is treated with elevated respect and specificity. The email to Gripple Ltd is not the same email sent to a generic manufacturer.

Atlas v2 uses priority_score and is_dream20 to calibrate tone and specificity.

---

## The Generation Pipeline

```
1. Pull offer from psnm_offer_config (live pricing, no hard-coding)
2. Pull psnm_atlas_config (tone, territory filter, daily limit, paused flag)
3. Query psnm_outreach_targets: top N by priority_score, exclude last-touched < 14 days
4. For each prospect:
   a. Substitute variables into _atlas_system_prompt.md
   b. Call claude-sonnet-4-6 via Anthropic API
   c. Parse JSON response
   d. Insert into psnm_atlas_drafts with status='pending_approval'
5. Return draft IDs + summary
```

---

## The Approval Gate

Ben reviews every draft in the WMS Intelligence tab → Outreach Queue.

For each draft:
- Read the subject and body
- Review framework annotations (what each framework contributed)
- Check confidence score (>80 = send, 60-79 = probably send with edits, <60 = review carefully)
- Click ✓ Approve, ✗ Reject, or ✏️ Edit inline
- When ready: "Dispatch Approved Now" sends all approved drafts via SendGrid

**Nothing sends without Ben's approval.**

---

## What's Deferred to Week 2

- Touch 2–5 (LinkedIn DM, phone, follow-up email, decision call)
- Reply inbox monitoring + reply drafts
- Drip sequence automation
- Multi-channel (LinkedIn, WhatsApp) via Make.com

---

## Performance Targets

- Touch 1 open rate target: 35%+ (achievable with framework-driven subjects)
- Reply rate target: 8–12% (cold email benchmark; 15%+ = excellent)
- Conversion target: 2–5% of contacted prospects book a site visit
- Site visit to close rate: 40%+ (warm prospect by the time they visit)

At 205 prospects, 5% reply rate = ~10 hot conversations from first batch alone.
