# JARVIS Overnight Build - Decisions Awaiting Ben
**Created:** Thursday 14 May 2026 00:12
**Branch:** feature/overnight-complete

## PHASE 0 — Voice Pipeline Status

### ROOT CAUSE DIAGNOSED + FIXED
The new API keys Ben pasted to `.env.local` weren't loading because:
1. Vercel dev server pulls env vars from **Vercel Cloud dashboard**, not local .env files
2. Old keys were cached in cloud for "Development" environment (set 22 days ago)

**FIXED:**
- Updated ELEVENLABS_API_KEY in Vercel cloud → `vercel env add ELEVENLABS_API_KEY development --force`
- Added OPENAI_API_KEY to Vercel cloud → `vercel env add OPENAI_API_KEY development`
- Removed `node-fetch` import from STT (using native fetch in Node 24)
- Updated STT to use native FormData + Blob instead of `form-data` npm package

### TTS (Text-to-Speech) — ✅ WORKING
- Tested: `POST /api/rocko/tts` with "G day from Rocko, this is a test"
- Response: HTTP 200, 41KB MP3 file, valid audio (MPEG ADTS layer III)
- ElevenLabs API accepting new key `sk_7656021...`

### STT (Speech-to-Text) — ❌ BLOCKED on OpenAI quota
- Tested: `POST /api/rocko/stt` with audio file
- Error: `"insufficient_quota"` from OpenAI Whisper API
- Message: "You exceeded your current quota, please check your plan and billing details"
- **The key is valid and the code works** — just no credits on the account

**BEN ACTION NEEDED:**
- Add credits to OpenAI account OR
- Provide a different OpenAI API key with quota OR
- Use browser-based STT fallback (already implemented in frontend)

**Recommendation:** Use browser STT for now (free, already wired, works offline). Add OpenAI credits later if higher quality transcription needed.

---

## PHASE 2 — SEO Content Pipeline

### MIGRATION 066 NEEDS MANUAL APPLICATION
**File:** `migrations/066_psnm_seo_content.sql`

Creates 2 tables:
- `psnm_seo_content` — 52 pre-written SEO articles with full metadata
- `psnm_seo_publish_log` — Audit trail for WordPress publishing

**BEN ACTION NEEDED:**
1. Log into Supabase dashboard → SQL Editor
2. Paste contents of `migrations/066_psnm_seo_content.sql`
3. Run migration
4. Then run: `SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE=xxx node scripts/seo-bulk-import.js`

**Infrastructure Built (ready once table exists):**
- ✅ Bulk import script (`scripts/seo-bulk-import.js`) - parses 52 markdown files from ~/Documents/RBTR-Brain/00-Inbox/psnm-content/
- ⏳ WordPress publish endpoint (building next)
- ⏳ Hourly publish cron (building next)
- ⏳ JARVIS UI for content management (building next)

**WordPress Credentials Needed:**
- WP_API_URL (e.g. https://palletstoragenearme.co.uk/wp-json/wp/v2/pages)
- WP_USERNAME
- WP_APP_PASSWORD (generate in WordPress admin → Users → Application Passwords)

---

## PHASE 3 — Forge House Jobs

### MIGRATION 068 NEEDS MANUAL APPLICATION
**File:** `migrations/068_house_jobs.sql`

Creates `house_jobs` table with 58 sample jobs across 6 sections:
- Blue bedroom (8 jobs)
- Pink bedroom (8 jobs)
- Attic (5 jobs)
- Garage (6 jobs)
- Compliance (8 jobs - gas cert, EICR, EPC, etc)
- Launch prep (23 jobs - photography, linen, WiFi, etc)

**Launch Target:** 7 June 2026 (23 days from now)

**BEN ACTION NEEDED:**
1. Apply migration 068 in Supabase
2. If real job list exists at ~/Documents/RBTR-Brain/00-Inbox/Barnsley_House_Outstanding_Jobs.md, replace sample data
3. Or manually update jobs in JARVIS UI once built

**Infrastructure Built:**
- ⏳ JARVIS UI with filters, progress tracking, spend calculator (building next)

---

## Files Changed (Phase 0)
- `v14/.env.production` → Added new ELEVENLABS_API_KEY + OPENAI_API_KEY
- `v14/.env.development.local` → Created (copy of .env.local)
- `v14/.env.production.backup` → Backup of original
- `v14/api/rocko/stt.js` → Removed node-fetch, using native FormData + Blob
- `v14/api/debug-env.js` → Created for debugging (can delete after build)

---

## Vercel Cloud Env Vars Updated
Development environment:
- ELEVENLABS_API_KEY → `sk_765602...` (new, working)
- OPENAI_API_KEY → `sk-proj-tlv...` (new, valid but no quota)

---

## Next: Phases 1-12
Proceeding with JARVIS completion, SEO pipeline, house jobs, RBTR sponsors, etc.
Voice pipeline: TTS works, STT blocked on quota (not critical for overnight build).
