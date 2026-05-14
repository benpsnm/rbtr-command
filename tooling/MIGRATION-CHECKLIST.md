# n8n Migration Checklist

**Status:** Planning phase (13 May 2026)  
**Strategy:** Parallel operation → gradual validation → selective deprecation

---

## Migration Principles

1. **Parallel first, deprecate later**: Run old cron + new n8n workflow side-by-side for 2 weeks minimum
2. **Validate with data**: Compare output quality, error rates, execution time
3. **One at a time**: Don't disable multiple crons in same day — stagger by 48 hours minimum
4. **Rollback ready**: Keep old cron scripts working (don't delete, just disable) for 1 month after migration
5. **Not everything migrates**: Some scripts are better left as Node.js (complex business logic, heavy computation)

---

## Scripts Inventory

| Script | Location | Current Trigger | Purpose | Migration Decision | Priority | Notes |
|--------|----------|-----------------|---------|-------------------|----------|-------|
| **check-ww-enquiries.js** | `scripts/` | Cron? | WhichWarehouse enquiry checking + classification | **MIGRATE** | P1 | → Workflow 1 (already built) |
| **check-outreach-replies.js** | `scripts/` | Cron? | PSNM outreach reply intent classification | **MIGRATE** | P1 | → Workflow 2 (already built) |
| **cron-morning-brief.js** | `v14/api/` | Vercel cron (06:00, 21:00) | Generates daily brief JSON | **HYBRID** | P2 | API stays, n8n adds audio (Workflow 3) |
| **cron-backup.js** | `v14/api/` | Vercel cron (03:00) | Database backup to S3/Backblaze | **KEEP AS IS** | — | Core infrastructure, no benefit from n8n |
| **cron-atlas3.js** | `v14/api/` | Vercel cron | Atlas intelligence pipeline trigger | **KEEP AS IS** | — | Complex business logic, better in v14 API |
| **cron-tech-scan-check.js** | `v14/api/` | Vercel cron (every 3 days) | Checks if tech scan due, prompts Ben | **MIGRATE** | P3 | n8n can handle date math + Telegram prompt |
| **voice-memo-process.js** | `scripts/` | Watcher.js (file watcher) | Transcribes voice memos → Obsidian | **KEEP AS IS** | — | Local file watcher, no cloud trigger needed |
| **watcher.js** | `scripts/` | Runs continuously | Watches ~/Documents/VoiceMemos-Workshop/ | **KEEP AS IS** | — | Filesystem watcher, not a workflow |
| **parse-leadinfo.js** | `scripts/` | Manual? | Parses LeadInfo data | **KEEP AS IS** | — | Likely one-off script, check with Ben |

---

## Migration Details

### P1: Email Automation (Workflows 1 & 2)

**Target date:** 20 May 2026 (1 week validation)

**check-ww-enquiries.js → Workflow 1**
- **Current state:** Old cron disabled? Or still running?
- **Action plan:**
  1. Check if old cron is running: `crontab -l | grep ww-enquiries`
  2. If yes, document schedule and last run time
  3. Activate Workflow 1 in n8n (set to run every 15 mins)
  4. Run both for 1 week
  5. Compare results in Supabase `psnm_ww_enquiries` table:
     - Are both systems catching the same enquiries?
     - Is Claude classification consistent?
     - Any duplicate drafts being created?
  6. If n8n workflow stable, disable old cron
  7. Keep old script in `scripts/` for 1 month (rollback safety)

**check-outreach-replies.js → Workflow 2**
- **Current state:** Old cron disabled? Or still running?
- **Action plan:**
  1. Same process as Workflow 1
  2. Activate Workflow 2 (every 10 mins)
  3. Monitor `psnm_outreach_replies` table for duplicates
  4. Validate intent classification accuracy (manual spot-check of 10 replies)
  5. If stable after 1 week, disable old cron

**Validation checklist:**
- [ ] No duplicate entries in Supabase (check by `email_id`)
- [ ] n8n workflow never missed an email that old cron caught
- [ ] Claude classification quality equal or better
- [ ] Telegram alerts arriving consistently
- [ ] Gmail drafts being created without errors
- [ ] No Gmail API rate limit errors (429 responses)

**Rollback trigger:**
- n8n workflow misses >1 email in 24 hours → re-enable old cron immediately
- Classification quality drops (>20% wrong classifications) → investigate, fix prompt, keep old cron running
- Gmail API errors >3 in 24 hours → investigate rate limits, may need to reduce n8n frequency

---

### P2: Morning Brief Audio Enhancement (Workflow 3)

**Target date:** 27 May 2026 (after P1 stable)

**cron-morning-brief.js → Hybrid approach**
- **Keep:** v14 API endpoint `/api/morning-brief` (Vercel cron triggers at 06:00 and 21:00)
- **Add:** n8n Workflow 3 to enhance with audio generation
- **Reason:** Morning brief business logic is complex (queries multiple Supabase tables, constructs narrative, applies formatting). Better to keep in v14 API (version-controlled, deployed, tested) and let n8n handle audio conversion + delivery.

**Action plan:**
1. **Phase 2a (text-only mode):**
   - Disable Vercel cron trigger for morning-brief temporarily (or keep running, n8n will be redundant but harmless)
   - Activate Workflow 3 text-only path (06:30 trigger)
   - Verify Ben receives Telegram brief at 06:30 daily
   - Run for 3 days
   - If stable, disable Vercel cron 06:00 trigger (keep 21:00 trigger for evening brief if Ben wants it)

2. **Phase 2b (audio mode):**
   - Ben confirms ElevenLabs voice clone tested and sounds good
   - Reconnect Workflow 3 audio path (delete text-only path)
   - Test manually: trigger workflow, check MP3 quality, Telegram delivery
   - Activate for daily 06:30 delivery
   - Run for 1 week
   - If stable, this becomes permanent morning brief delivery method

**Validation checklist:**
- [ ] Brief content quality unchanged (compare v14 API output vs Telegram delivery)
- [ ] Audio generation works (MP3 clear, no cutoffs, correct voice)
- [ ] Supabase storage bucket `rbtr-briefs/` receiving files
- [ ] Telegram sends both audio + text preview
- [ ] `rbtr_daily_log` table recording events correctly

**Rollback trigger:**
- Morning brief fails to deliver 2 days in a row → re-enable Vercel cron immediately
- Audio quality poor (robotic, wrong voice, cut-off) → switch back to text-only mode, fix ElevenLabs config

---

### P3: Tech Scan Reminder (Future n8n Workflow)

**Target date:** June 2026 (after P1 and P2 stable)

**cron-tech-scan-check.js → New n8n workflow**
- **Current logic:** Checks `~/Documents/RBTR-Brain/00-Inbox/LAST-TECH-SCAN.md` for last scan date, calculates days since, prompts Ben via Telegram if >3 days
- **Why migrate:** Simple date math + file read + Telegram alert = perfect n8n use case
- **Benefits:** Visual debugging, easy to adjust prompt frequency (change 3 days to 5 days without code change)

**Action plan:**
1. Read `cron-tech-scan-check.js` to understand exact logic
2. Build Workflow 4: "Tech Scan Reminder"
   - Trigger: Daily at 09:00
   - Node 1: Read file node (n8n can read local files)
   - Node 2: Extract last scan date
   - Node 3: Calculate days since
   - Node 4: IF >3 days → Telegram alert
   - Node 5: Log to Supabase (optional)
3. Test locally for 1 week
4. Disable old cron-tech-scan-check.js
5. Archive to `archive/scripts-deprecated/`

**Not yet built** — waiting for P1 and P2 validation first.

---

### Keep As Is (No Migration Needed)

**cron-backup.js**
- **Why keep:** Core infrastructure, runs at 03:00 when system idle, heavy database operations
- **No n8n benefit:** n8n would just add latency (HTTP request to trigger backup API)
- **Decision:** Leave as Vercel cron

**cron-atlas3.js**
- **Why keep:** Complex multi-step intelligence pipeline (enricher → reasoner → drafter → critic)
- **Current architecture:** All business logic in v14 API, well-tested, deployed
- **No n8n benefit:** Would just be "schedule → HTTP request to /api/cron-atlas3" — no value add
- **Decision:** Leave as Vercel cron, or keep as-is if manual trigger

**voice-memo-process.js + watcher.js**
- **Why keep:** Local filesystem watcher, not a scheduled task
- **Architecture:** watcher.js uses `chokidar` to watch ~/Documents/VoiceMemos-Workshop/, triggers voice-memo-process.js on new file
- **No n8n benefit:** n8n can't watch local filesystems (it's a cloud-first tool)
- **Decision:** Keep running locally, separate concern from n8n workflows

**parse-leadinfo.js**
- **Why keep (probably):** Likely a one-off data import script
- **Action needed:** Confirm with Ben if still in use
- **If obsolete:** Move to `archive/scripts-deprecated/`
- **If active:** Document purpose and keep as-is

---

## Deprecation Timeline

**Week 1 (13-20 May 2026):**
- ✅ n8n installed locally
- ✅ Workflows 1, 2, 3 built and documented
- 🔄 Ben adds Gmail OAuth2 credential
- 🔄 Ben tests Workflow 1 and 2 manually
- 🔄 Activate Workflows 1 & 2 (parallel with old crons if they exist)

**Week 2 (20-27 May 2026):**
- Validate Workflow 1 & 2 output quality
- Compare old cron vs n8n execution logs
- If stable: disable old crons for check-ww-enquiries.js and check-outreach-replies.js
- Archive old crons to `archive/scripts-deprecated/`

**Week 3 (27 May - 3 June 2026):**
- Activate Workflow 3 text-only mode
- Ben confirms ElevenLabs voice clone ready
- Switch to audio mode
- Disable Vercel cron for morning-brief (or adjust to 21:00 only)

**Week 4+ (June 2026):**
- Consider Workflow 4 (tech scan reminder)
- Evaluate other automation opportunities (see "Future Workflows" below)
- VPS migration planning (if Ben decides to move n8n to Hetzner)

---

## Success Metrics

**Email automation (Workflows 1 & 2):**
- **Reliability:** 99%+ execution success rate (track in n8n execution logs)
- **Quality:** Claude classification accuracy ≥95% (manual spot-check weekly)
- **Speed:** Emails processed within 15 mins of arrival (n8n schedule frequency)
- **Cost:** Zero incremental cost (n8n runs locally)

**Morning brief (Workflow 3):**
- **Reliability:** 100% delivery rate (7/7 days per week)
- **Audio quality:** Ben subjective assessment (clear, correct voice, no cutoffs)
- **Latency:** Brief delivered by 06:35 latest (5-minute generation buffer)

**Overall n8n adoption:**
- **Time saved:** Estimate 2-3 hours/week (no more manual email triage)
- **Error reduction:** Fewer missed enquiries, faster response times
- **Flexibility:** Non-technical changes (adjust Claude prompts, change Telegram alert format) without code deploys

---

## Future Workflows (Ideas for June+ 2026)

These are **not in scope** for initial migration, but good candidates for future n8n workflows:

1. **LinkedIn prospect enrichment**
   - Trigger: New prospect added to Supabase `psnm_prospects`
   - Flow: Call Proxycurl API → enrich with LinkedIn data → update Supabase
   - Benefit: Automated enrichment without manual LinkedIn hunts

2. **Invoice reminder automation**
   - Trigger: Weekly check of Supabase `invoices` table
   - Flow: Find overdue invoices → send reminder email via SendGrid → log to Supabase
   - Benefit: Never forget to chase payment

3. **WhichWarehouse lead sync**
   - Trigger: Webhook from WhichWarehouse (if they support it)
   - Flow: Receive new lead → parse → Claude classify → save to Supabase → Telegram alert
   - Benefit: Real-time lead processing (vs 15-min polling)

4. **Social media content scheduler**
   - Trigger: Scheduled daily at 18:00
   - Flow: Read content queue from Supabase → post to LinkedIn/Twitter → mark as posted
   - Benefit: Consistent PSNM social media presence without manual posting

5. **Competitor price monitoring**
   - Trigger: Weekly on Monday 09:00
   - Flow: Scrape competitor websites → extract pallet storage rates → compare to PSNM rates → Telegram report
   - Benefit: Stay competitive without manual research

6. **Customer satisfaction survey**
   - Trigger: 7 days after service delivery
   - Flow: Read completed jobs from Supabase → send survey email via SendGrid → collect responses → log to Supabase
   - Benefit: Automated feedback collection for service quality improvement

**Prioritization:** Discuss with Ben in June after P1-P3 workflows proven stable.

---

## Archive Strategy

**When to archive old scripts:**
- After 1 month of stable n8n workflow operation
- Old cron has been disabled for 1 month
- No rollback triggered in that period

**Where to archive:**
```
archive/
  scripts-deprecated/
    check-ww-enquiries.js
    check-outreach-replies.js
    [others as they get deprecated]
  README.md  # explains why archived, date deprecated, replaced by what
```

**What to keep in archive:**
- Original script file
- Last known working config
- Date deprecated
- Replacement workflow name
- Reason for deprecation

**What to delete permanently:**
- Nothing for first 6 months
- After 6 months: if Ben confirms never rolling back, can delete archive

---

## Rollback Procedures

**If n8n workflow fails catastrophically:**

1. **Stop the failing workflow immediately:**
   - Open n8n UI → find workflow → toggle "Active" to OFF

2. **Re-enable old cron script:**
   - If Vercel cron: no action needed (still running)
   - If local cron: `crontab -e` → uncomment the line
   - If manual script: restart with `node scripts/[name].js &`

3. **Diagnose the failure:**
   - Check n8n execution logs
   - Check Supabase for incomplete records
   - Check Telegram for error alerts
   - Check Gmail for stuck drafts

4. **Fix and test:**
   - Fix the workflow node causing failure
   - Test manually with recent real data
   - Re-activate with monitoring for 24 hours

5. **Document the incident:**
   - Add entry to `tooling/n8n/INCIDENTS.md` (create if not exists)
   - Include: date, workflow name, failure mode, root cause, fix applied

**Rollback is not failure** — it's intelligent risk management. Better to rollback fast and fix properly than let a broken workflow run.

---

## Questions for Ben

Before finalizing migration:

1. **Are check-ww-enquiries.js and check-outreach-replies.js currently running?**
   - If yes: what's the cron schedule?
   - If no: when were they last active? Any reason they were disabled?

2. **Is parse-leadinfo.js still in use?**
   - If yes: what's the workflow? Manual trigger or scheduled?
   - If no: safe to archive?

3. **ElevenLabs voice clone status?**
   - Have you tested it recently?
   - Happy with the voice quality?
   - Ready to use in production morning briefs?

4. **Docker Desktop install preference?**
   - Want to install Docker now, or stick with npm-based n8n for now?
   - Docker gives cleaner setup and easier VPS migration later

5. **VPS migration timeline?**
   - Happy to run n8n locally indefinitely?
   - Or planning VPS migration in next 1-3 months?
   - Affects whether we optimize for local-first or cloud-first

---

**Last updated:** 13 May 2026  
**Next review:** 20 May 2026 (after 1 week of P1 workflows running)
