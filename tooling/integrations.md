# RBTR Tooling Integrations

**Status:** Placeholder for future integration patterns  
**Last updated:** 13 May 2026

---

## Overview

This document will capture integration patterns between:
- n8n workflows
- Granola (meeting transcription)
- WisprFlow (voice dictation)
- Existing RBTR stack (Obsidian, Supabase, v14 API, Claude Code)

**Current state:** n8n + Granola + WisprFlow just installed. Integration patterns will emerge organically over next 2-4 weeks of usage.

---

## Planned Integration Patterns

### Pattern 1: Granola → Obsidian → Claude → Tasks

**Trigger:** After meeting, Granola generates structured summary  
**Flow:**
1. Ben copies Granola summary to Obsidian: `~/Documents/RBTR-Brain/03-Meetings/[Name]-[Date].md`
2. Ben prompts Claude: "Read meeting summary at [path], extract action items, create tasks"
3. Claude reads file, creates tasks in rbtr_tasks table
4. Ben gets Telegram alerts for new tasks

**Future automation (n8n workflow 4?):**
- Granola API webhook → new meeting summary available
- n8n fetches summary via API
- n8n calls Claude API to extract action items
- n8n inserts tasks directly to Supabase rbtr_tasks
- Ben gets single Telegram alert: "5 new tasks from [Meeting Name]"

**Requires:**
- Granola Pro (API access)
- Claude API integration in n8n (already available)
- Task creation endpoint in v14 API (already exists: `/api/tasks`)

---

### Pattern 2: WisprFlow → Claude Code Prompts

**Current:**
- Ben types prompts in Claude Code terminal
- WisprFlow can dictate mid-prompt (press shortcut, speak, continue typing)

**Enhancement opportunity:**
- WisprFlow custom voice commands: "Hey Claude, [prompt]"
- WisprFlow auto-opens Claude Code terminal and inserts prompt
- Requires: WisprFlow shortcuts configuration + AppleScript integration

**Not yet implemented** — explore in June 2026 once WisprFlow usage patterns established.

---

### Pattern 3: Voice Memo → WisprFlow Transcription (Replacement)

**Current:**
- Voice memos land in `~/Documents/VoiceMemos-Workshop/`
- watcher.js triggers transcription via existing script
- Transcription saved to Obsidian Inbox

**Proposed enhancement:**
- Replace existing transcription with WisprFlow API (higher accuracy)
- watcher.js triggers WisprFlow API instead of current script
- Transcription + WisprFlow's punctuation → cleaner Obsidian notes

**Benefit:**
- Better accuracy (Whisper AI vs current transcription model)
- Automatic punctuation and formatting
- Faster processing

**Requires:**
- WisprFlow Pro (API access)
- Update watcher.js to call WisprFlow API
- Cost: included in £15/mo WisprFlow Pro subscription

**Not yet implemented** — wait for WisprFlow Pro upgrade decision.

---

### Pattern 4: n8n Workflow → Granola Meeting Webhook

**Trigger:** Granola finishes processing a meeting  
**Flow:**
1. Granola webhook fires to n8n (when Pro subscription active)
2. n8n receives meeting metadata: attendees, duration, summary preview
3. n8n checks if specific keywords present (e.g. "Amine", "sponsor", "legal")
4. If important meeting:
   - n8n creates task in rbtr_tasks: "Review Granola meeting summary [Name]"
   - n8n sends Telegram alert with meeting summary preview
5. Ben reviews in Granola app, copies to Obsidian if needed

**Benefit:**
- Never forget to review important meeting summaries
- Automatic task creation for follow-ups

**Requires:**
- Granola Pro
- n8n webhook node (already available)
- Task creation workflow

**Not yet implemented** — future enhancement.

---

## API Access Requirements

| Tool | API Available? | Tier Required | Cost | Use Case |
|------|----------------|---------------|------|----------|
| **Granola** | Yes | Pro (£18/mo) | £18/mo | Webhook for meeting summaries, programmatic access |
| **WisprFlow** | Yes | Pro (£15/mo) | £15/mo | Replace voice memo transcription, custom voice commands |
| **n8n** | Yes (self-hosted) | Free | £0 local, £4/mo VPS | All workflow automation |
| **Anthropic Claude** | Yes | Pay-per-use | Variable | Already integrated, n8n workflows use this |
| **Supabase** | Yes | Free tier | £0 | Already integrated, all workflows use this |

**Total cost for full integration stack:** £33/mo (Granola Pro + WisprFlow Pro)  
**Current cost:** £0/mo (all on free tiers)

**Decision point:** Upgrade to Pro tiers after 1 month of usage validation (late June 2026).

---

## Integration Ideas (Not Yet Prioritized)

1. **Granola + Claude Code session summary:**
   - After long Claude Code session, use Granola to record verbal debrief
   - "What we built today, decisions made, blockers hit"
   - Granola generates structured summary
   - Append to SESSION-CLOSE log in Obsidian

2. **WisprFlow + Telegram voice messages:**
   - Dictate Telegram messages via WisprFlow instead of typing
   - Faster than phone keyboard, more accurate than Telegram voice-to-text

3. **n8n + Granola + sponsor call pipeline:**
   - Granola records sponsor call (Guy Martin, equipment partners)
   - n8n fetches summary via API
   - Claude extracts: sponsor name, offer details, next steps, deadlines
   - n8n creates tasks in rbtr_tasks
   - n8n sends summary to Obsidian via file write
   - Ben gets single Telegram alert: "Sponsor call summary saved, 3 tasks created"

4. **WisprFlow + Obsidian daily note voice dump:**
   - End-of-day: open Obsidian daily note
   - Hit WisprFlow shortcut
   - Speak continuously for 5-10 minutes (brain dump)
   - WisprFlow transcribes in real-time
   - Quick manual edit for clarity
   - Save

5. **n8n + Supabase + weekly digest:**
   - n8n workflow triggers every Monday 08:00
   - Queries Supabase for: tasks completed last week, new prospects, outreach replies, WW enquiries
   - Formats as weekly digest
   - Sends to Telegram
   - Saved to Obsidian: `~/Documents/RBTR-Brain/02-Weekly/Week-[N]-Digest.md`

---

## Documentation Policy

**When adding new integration pattern:**
1. Document in this file under relevant section
2. Include: trigger, flow steps, benefits, requirements, cost
3. Mark as "Not yet implemented" if still planned
4. Update to "Implemented [date]" once live
5. Link to relevant n8n workflow JSON or script file

**When deprecating integration:**
1. Mark as "Deprecated [date]" with reason
2. Document replacement (if any)
3. Move to "Archive" section at bottom of this file

---

## Next Steps

1. **Validate base tooling** (n8n, Granola, WisprFlow) for 2-4 weeks
2. **Identify friction points** in daily usage (what's manual that could be automated?)
3. **Document organic patterns** that emerge (what sequences repeat daily?)
4. **Prioritize automation** based on time-saved vs implementation effort
5. **Build incremental** (one integration per week, validate before adding next)

---

**Last updated:** 13 May 2026  
**Next review:** 27 May 2026 (after 2 weeks of tooling usage)
