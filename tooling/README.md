# RBTR Tooling Stack

**Status:** Initial setup complete (13 May 2026)  
**n8n Version:** 2.20.7 (npm install)  
**Local URL:** http://localhost:5678  
**Credentials:** admin / (see N8N_BASIC_AUTH_PASSWORD in scripts/.env)

---

## What is n8n?

n8n is an open-source workflow automation platform — think Zapier or Make.com, but self-hosted, infinitely customizable, and with proper local debugging.

**Why n8n over alternatives:**
- **Self-hosted**: Your data never leaves your infrastructure (critical for PSNM customer data, GDPR compliance)
- **Local development**: Build and test workflows on your Mac before deploying to production
- **No per-execution costs**: Zapier charges per task; n8n is flat hosting cost regardless of volume
- **Full control**: Access to all workflow JSON, easy to version control, backup, migrate
- **Rich ecosystem**: 400+ pre-built nodes (Gmail, Supabase, Anthropic, Telegram, HTTP, etc.)
- **Visual debugging**: See exactly what data passes between nodes, test individual steps

**Cost comparison:**
- Zapier Pro: $49/mo (750 tasks)
- Make.com: $10-$29/mo (10K-40K operations)
- n8n self-hosted: £4/mo (Hetzner VPS) + unlimited executions

---

## Current Architecture

**Local Install (npm-based):**
- n8n installed globally via npm
- Data directory: `~/.n8n-rbtr/`
- Startup script: `tooling/n8n/start-n8n.sh`
- Runs on: http://localhost:5678
- Credentials sourced from: `scripts/.env`

**Docker Setup (ready for VPS migration):**
- `docker-compose.yml` present in `tooling/n8n/`
- When you install Docker Desktop, replace npm install with: `cd tooling/n8n && docker compose up -d`
- Same config, cleaner isolation, easier VPS migration

---

## Workflow Architecture

### How n8n Workflows Integrate with Existing Stack

n8n workflows **complement** existing cron scripts during transition — they don't replace them immediately. Here's the coexistence strategy:

**Phase 1 (Current):** Parallel operation
- Old cron scripts continue running in `scripts/` (check-ww-enquiries.js, check-outreach-replies.js, etc.)
- New n8n workflows run alongside them
- Both systems write to same Supabase tables
- Deduplication handled by unique constraints (email_id, thread_id)

**Phase 2 (After 2 weeks validation):** Gradual deprecation
- Disable old cron one at a time
- Monitor n8n workflow execution logs for 48 hours
- If stable, delete old cron script
- If issues, re-enable old cron and debug n8n workflow

**Phase 3 (Target: end of May 2026):** Full n8n operation
- All email automation runs via n8n
- Old cron scripts archived to `archive/scripts-deprecated/`
- Morning brief generation remains hybrid (n8n triggers, v14 API endpoint does the work)

### Interaction with v14 Production API

n8n workflows **call** v14 API endpoints — they don't replace them. Example:

- **Morning Brief Workflow:** n8n schedules the trigger at 06:30, makes HTTP request to `/api/morning-brief`, receives JSON response, converts to audio, sends via Telegram
- **v14 API Endpoint:** `/api/morning-brief` still does the heavy lifting (queries Supabase, generates brief content, returns JSON)

This keeps business logic centralized in v14 codebase (where it's version-controlled, deployed, tested) and lets n8n handle orchestration (scheduling, delivery, branching logic).

---

## Three Starter Workflows

### 1. WW Enquiry Auto-Process (`01-ww-enquiry-auto-process.json`)

**Purpose:** Replaces `scripts/check-ww-enquiries.js`

**Trigger:** Every 15 minutes  
**Flow:**
1. Search Gmail (palletstoragenearme@gmail.com) for unread emails
2. Claude Sonnet 4.5 classifies each as FULL_FIT / PARTIAL_FIT / WRONG_FIT
3. If FULL_FIT or PARTIAL_FIT:
   - Draft personalized reply using PSNM rate card
   - Save to Supabase `psnm_ww_enquiries` table (status: draft_ready)
   - Create Gmail draft (doesn't auto-send)
   - Telegram alert to Ben
4. If WRONG_FIT: log silently, no alert
5. Mark email as read

**Benefits over old cron:**
- Visual debugging of classification logic
- Easy A/B testing of different Claude prompts
- Richer Telegram alerts (can include inline buttons, formatted text)
- No need to restart Node process to update logic

### 2. PSNM Outreach Reply Intent Classifier (`02-outreach-reply-intent.json`)

**Purpose:** Replaces `scripts/check-outreach-replies.js`

**Trigger:** Every 10 minutes  
**Flow:**
1. Search Gmail for unread replies (subject contains "Re:")
2. Claude classifies intent: INTERESTED / NOT_NOW / WRONG_CONTACT / UNSUBSCRIBE / ASKING_QUESTION
3. Update Supabase `psnm_prospects` table based on intent:
   - **INTERESTED:** promote to "hot", Telegram alert with reply preview
   - **NOT_NOW:** set follow-up date +60 days, no alert
   - **WRONG_CONTACT:** flag for LinkedIn hunt, Telegram alert
   - **UNSUBSCRIBE:** mark dead, never email again
   - **ASKING_QUESTION:** draft answer, save as Gmail draft, Telegram alert
4. Log reply to `psnm_outreach_replies` table
5. Mark email as read

**Benefits over old cron:**
- More sophisticated branching (old cron had basic if/else)
- Per-intent Telegram alerts (can customize emoji, tone, urgency per path)
- Easier to add new intents (e.g. "COMPETITOR_INTEL", "PRICING_QUESTION")

### 3. Rocko Morning Brief Generator (`03-rocko-morning-brief.json`)

**Purpose:** Enhances existing `api/morning-brief.js` with audio generation

**Trigger:** Daily at 06:30 Europe/London  
**Flow:**
1. HTTP request to `/api/morning-brief` (existing v14 endpoint)
2. Receive brief JSON (text + metadata)
3. **[OPTIONAL]** ElevenLabs Text-to-Speech: convert to MP3 using Ben's voice clone
4. **[OPTIONAL]** Upload MP3 to Supabase Storage bucket `rbtr-briefs/`
5. Telegram: send brief (audio + text, or text-only if audio disabled)
6. Log event to `rbtr_daily_log` table

**Current state:** Text-only mode active (ElevenLabs nodes present but disconnected — see workflow notes). Once Ben confirms his voice clone is tested and working, reconnect the audio path.

**Benefits over old cron:**
- Audio generation without modifying v14 API code
- Fallback path if ElevenLabs API down
- Easy to add alternative TTS providers (Google Cloud TTS, Azure Speech, etc.)

---

## Credential Management

**CRITICAL RULE:** Never hardcode credentials in workflow JSON. Always use n8n's credentials manager.

### How to Add Credentials in n8n

1. Open http://localhost:5678
2. Click **Settings** (gear icon, bottom-left)
3. Click **Credentials** → **Add Credential**
4. Select credential type (e.g. "Anthropic API", "Supabase API", "Gmail OAuth2")
5. Fill in values (read from `scripts/.env` or Ben's password manager)
6. Save with a descriptive name (e.g. "PSNM Gmail OAuth2", "Supabase API")

### Required Credentials for Starter Workflows

| Credential Type | Name in n8n | Source | Used By |
|----------------|-------------|--------|---------|
| Anthropic API | `anthropic-api` | `scripts/.env` → ANTHROPIC_API_KEY | Workflows 1, 2 |
| Supabase API | `supabase-api` | `scripts/.env` → SUPABASE_URL + SUPABASE_SERVICE_ROLE | All workflows |
| Gmail OAuth2 | `psnm-gmail-oauth` | Ben's Google Account (palletstoragenearme@gmail.com) | Workflows 1, 2 |
| Telegram Bot | `telegram-bot` | `scripts/.env` → TELEGRAM_BOT_TOKEN | All workflows |
| ElevenLabs API | `elevenlabs-api` | `scripts/.env` → ELEVENLABS_API_KEY | Workflow 3 (when audio enabled) |

**Note on Gmail OAuth2:**  
The Gmail nodes require OAuth2 (not App Password). When you add the credential, n8n will open a Google sign-in window. Sign in as `palletstoragenearme@gmail.com`, grant permissions. n8n stores the refresh token locally — you won't need to re-authenticate unless you revoke permissions.

**Missing credentials:**  
- `PSNM_GMAIL_APP_PASSWORD` is empty in `scripts/.env` — not needed for n8n (uses OAuth2 instead)
- `TELEGRAM_CHAT_ID` is empty — get it by sending `/start` to your bot, then forward the message to @userinfobot

---

## VPS Migration Path (Future)

When ready to deploy to Hetzner VPS (recommended after 2-4 weeks local validation):

### Hetzner Cloud Setup

**Server specs:**
- Plan: CX11 (1 vCPU, 2GB RAM, 20GB SSD) — £3.79/mo
- Location: Falkenstein, Germany (closest to UK)
- Image: Ubuntu 24.04 LTS
- Backups: Enable (adds £0.76/mo)

**DNS:**
- Point subdomain `n8n.rbtr.app` (or `automation.psnm.uk`) to VPS IP
- Use Cloudflare for SSL termination (free)

### Migration Steps

1. **Install Docker on VPS:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Copy docker-compose.yml to VPS:**
   ```bash
   scp -r tooling/n8n/ user@vps-ip:/opt/n8n/
   ```

3. **Update docker-compose.yml environment variables:**
   - Change `N8N_HOST` to `n8n.rbtr.app` (or your chosen domain)
   - Change `N8N_PROTOCOL` to `https`
   - Change `WEBHOOK_URL` to `https://n8n.rbtr.app/`
   - Add `N8N_ENCRYPTION_KEY` (generate with `openssl rand -base64 32`)

4. **Start n8n on VPS:**
   ```bash
   cd /opt/n8n
   docker compose up -d
   ```

5. **Export workflows from local n8n:**
   - In local n8n UI: click each workflow → **Download** (saves JSON)
   - Already done: workflows are in `tooling/n8n/workflows/`

6. **Import workflows to VPS n8n:**
   - Open VPS n8n UI: https://n8n.rbtr.app
   - Click **Import from File** → upload each JSON
   - Re-add credentials (they don't export for security reasons)
   - Test each workflow manually before activating

7. **Verify webhooks work:**
   - Some workflows may use webhooks (future extension)
   - Test webhook URLs resolve correctly: `https://n8n.rbtr.app/webhook/...`

8. **Set up backups:**
   - n8n data is in Docker volume `n8n_data`
   - Backup strategy: daily cron on VPS exports workflow JSONs to S3/Backblaze
   - Or use Hetzner Volume Backups (automated snapshots)

9. **Disable local n8n:**
   - Stop local n8n: `kill <PID>` (or `docker compose down` if Docker)
   - Keep `tooling/` directory for version control, but workflows now run on VPS

**Database upgrade (optional but recommended for VPS):**  
Local n8n uses SQLite. For VPS (multi-user, higher volume), switch to Postgres:
- Add Postgres container to `docker-compose.yml`
- Set `DB_TYPE=postgresdb` in n8n environment variables
- n8n will auto-migrate on first start

---

## Workflow Development Tips

### Testing Workflows Locally

1. **Manual trigger:** Every workflow can be manually triggered (click "Execute Workflow" button)
2. **Mock data:** Use the "Set" node to inject test data without hitting real APIs
3. **Breakpoints:** Click any node connection → "Add Note" to document expected data shape
4. **Execution logs:** Every workflow run is logged (see "Executions" sidebar)

### Common n8n Patterns

**Error handling:**
- Add an "Error Trigger" node at the end of the workflow
- Connect it to a Telegram alert node that notifies Ben of failures
- Include: workflow name, failed node, error message, timestamp

**Deduplication:**
- Use Supabase `INSERT ... ON CONFLICT DO NOTHING` to avoid duplicate entries
- Or add a "Filter" node that checks if record already exists before proceeding

**Rate limiting (for external APIs):**
- Add a "Wait" node between API calls (e.g. 1 second delay)
- Or use n8n's built-in "HTTP Request" node with batch size limits

**Conditional branching:**
- "IF" node for simple true/false logic
- "Switch" node for multiple cases (like Workflow 2's intent classifier)

**Data transformation:**
- "Code" node for complex JavaScript transformations
- "Set" node for simple field mapping

### Debugging Claude Classification

If Claude's classification is wrong (e.g. marks a good enquiry as WRONG_FIT):

1. Go to workflow executions → find the failed run
2. Click the "Claude: Classify Enquiry" node
3. See the exact prompt sent and response received
4. Copy the prompt, test it in Claude.ai chat to iterate
5. Update the prompt in the workflow node
6. Re-run the execution with same input data to verify fix

This is **much faster** than debugging a Node.js script with console.logs.

---

## Backup Strategy

**Workflow JSON exports:**
- All workflows in `tooling/n8n/workflows/` are committed to git
- When you edit a workflow in n8n UI, export it again and overwrite the JSON file
- Commit with message like: `chore: update ww-enquiry workflow — improved classification prompt`

**n8n database backup:**
- Local: `~/.n8n-rbtr/database.sqlite` (backup via Time Machine or manual copy)
- VPS: n8n Docker volume `n8n_data` (backup via Hetzner snapshots or rsync to S3)

**Credentials backup:**
- Credentials are encrypted in n8n database using `N8N_ENCRYPTION_KEY`
- DO NOT commit credentials to git
- Document which credentials exist in `tooling/n8n/CREDENTIALS.md` (credential names only, not values)
- Store actual secrets in Ben's password manager (1Password, Bitwarden, etc.)

---

## Monitoring & Alerts

**Workflow failure alerts:**
- Add an "Error Trigger" node to each workflow
- Connect to Telegram node: "⚠️ Workflow failed: [name]. Error: [message]. Check http://localhost:5678/executions"

**Success metrics:**
- n8n tracks execution count, success/failure rate per workflow
- Export to Supabase `n8n_workflow_metrics` table (future enhancement)
- Daily Rocko brief can include: "Yesterday: 12 WW enquiries processed, 3 draft replies created, 8 wrong-fit filtered"

**Email delivery monitoring:**
- Gmail API returns message ID after creating draft
- Log to Supabase for audit trail
- If Gmail API returns 429 (rate limit), add exponential backoff + Telegram alert

---

## Next Steps for Ben

1. **Install Docker Desktop** (if you want cleaner setup):
   - Download: https://www.docker.com/products/docker-desktop
   - Install → restart Mac
   - Run: `cd ~/Desktop/rbtr-command/tooling/n8n && docker compose up -d`
   - Stop npm-based n8n if running

2. **Add Gmail OAuth2 credential:**
   - Open http://localhost:5678 → Settings → Credentials
   - Add "Gmail OAuth2" credential
   - Sign in as `palletstoragenearme@gmail.com`
   - Test by manually running Workflow 1

3. **Get Telegram Chat ID:**
   - Send `/start` to your RBTR Telegram bot
   - Forward the bot's reply to @userinfobot
   - Copy your chat ID (a number like `123456789`)
   - Add to `scripts/.env` as `TELEGRAM_CHAT_ID=123456789`

4. **Test Workflow 3 text-only mode:**
   - Open Workflow 3 in n8n
   - Ensure only the "Text Only" path is connected (ElevenLabs path should be disconnected)
   - Click "Execute Workflow"
   - Check Telegram for morning brief delivery

5. **Set up ElevenLabs voice (optional):**
   - Test your voice clone at https://elevenlabs.io/speech-synthesis
   - Confirm `ELEVENLABS_VOICE_ID` in `scripts/.env` produces good audio
   - If yes: reconnect Workflow 3's audio path (delete Text Only path)
   - If no: keep text-only mode until voice clone improved

6. **Create Supabase tables** (if not already present):
   - `psnm_ww_enquiries` (for Workflow 1)
   - `psnm_outreach_replies` (for Workflow 2)
   - `rbtr_daily_log` (for Workflow 3)
   - SQL migrations: `v14/supabase/migrations/` (add new migration file if tables missing)

7. **Review migration checklist:**
   - See `tooling/MIGRATION-CHECKLIST.md`
   - Decide which old cron scripts to deprecate first
   - Plan 2-week validation period per workflow

---

## Troubleshooting

**n8n won't start:**
- Check if port 5678 already in use: `lsof -i :5678`
- Check n8n logs: `tail -f ~/Desktop/rbtr-command/tooling/n8n/n8n.log`
- Try manual start: `cd tooling/n8n && ./start-n8n.sh`

**Workflow execution fails:**
- Check execution log in n8n UI
- Most common causes:
  - Missing credential (add it in Settings → Credentials)
  - Wrong node configuration (e.g. table name typo)
  - API rate limit (add Wait node or reduce frequency)
  - Supabase table doesn't exist (create migration)

**Gmail OAuth2 token expired:**
- Re-authenticate: n8n UI → Settings → Credentials → "PSNM Gmail OAuth2" → Re-authenticate

**Claude returns malformed JSON:**
- Check the prompt in the Claude node
- Add explicit instruction: "Output valid JSON only, no markdown fences, no explanation"
- Increase temperature from 0.2 to 0.3 if too rigid

**Telegram not receiving messages:**
- Verify `TELEGRAM_CHAT_ID` is set in `scripts/.env`
- Check bot token is correct: `TELEGRAM_BOT_TOKEN`
- Test bot manually: send a message to it, check it responds

---

## Resources

- **n8n Official Docs:** https://docs.n8n.io/
- **n8n Community Forum:** https://community.n8n.io/
- **Workflow Templates:** https://n8n.io/workflows/ (1000+ pre-built workflows)
- **Anthropic API Docs:** https://docs.anthropic.com/
- **Supabase API Docs:** https://supabase.com/docs/reference/javascript/introduction

---

**Last updated:** 13 May 2026  
**Maintained by:** Claude Code + Ben Greenwood  
**Questions:** Raise in rbtr-command repo issues or Telegram @ben
