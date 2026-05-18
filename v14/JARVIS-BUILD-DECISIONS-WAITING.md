# JARVIS Build Decisions Waiting

## Rocko v2 Phase 1 — Migration Blocker (14 May 2026, 12:45)

**Issue:** Cannot apply migration 078_rocko_v2_schema.sql programmatically
- psql not available
- pg module connection failing  
- Supabase CLI not installed

**Migration SQL:** `v14/supabase/migrations/078_rocko_v2_schema.sql`

**Ben action (2 min):**
1. https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new
2. Paste migration SQL
3. Run
4. Verify: rocko_v2_sessions, rocko_v2_messages, rocko_v2_integrations

**Status:** Proceeding with Phase 1 build. Tables needed before self-test.

---

## Rocko v2 Production Hardening — Google OAuth Credentials (14 May 2026, 23:00)

**Issue:** GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not found in .env.local or second brain

**Required for:** Gmail + Calendar tools (gmail_search, gmail_read, gmail_draft, calendar_check, calendar_suggest_time)

**Ben action (5 min):**

1. **Create OAuth Client in Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Click: "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Rocko v2"
   - Authorized redirect URIs: `https://rbtr-jarvis.vercel.app/api/rocko/v2/google/auth/callback`
   - Click "Create"

2. **Copy credentials**
   - Copy Client ID (starts with something like `123456789012-abc...apps.googleusercontent.com`)
   - Copy Client secret (starts with something like `GOCSPX-...`)

3. **Add to Vercel production env vars**
   ```bash
   cd /Users/bengreenwood/Desktop/rbtr-command/v14
   vercel env add GOOGLE_CLIENT_ID production
   # Paste Client ID when prompted
   
   vercel env add GOOGLE_CLIENT_SECRET production
   # Paste Client secret when prompted
   ```

4. **Redeploy to pick up env vars**
   ```bash
   vercel --prod --yes
   ```

**Enable APIs:**
- Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com
- Calendar API: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
(Click "Enable" for both)

**Test after setup:**
```bash
# Run OAuth flow (grants Rocko access to your Gmail + Calendar)
open https://rbtr-jarvis.vercel.app/api/rocko/v2/google/auth/init
```

**Status:** Continuing with other phases. Gmail/Calendar tools will work once Ben completes this.

---

## Rocko v2 Production Hardening — Database Migrations (14 May 2026, 23:15)

**Issue:** Migrations 078 + 079 need manual execution in production Supabase

**What:** 4 tables for Rocko v2:
- `rocko_v2_sessions` — Session tracking + device tokens
- `rocko_v2_messages` — Per-message log
- `rocko_v2_integrations` — OAuth tokens (Google Gmail/Calendar)
- `rocko_v2_pairing_codes` — Temporary device pairing codes

**Ben action (1 click, 30 seconds):**

1. **Open Supabase SQL editor:**
   https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new

2. **Paste combined migration SQL** (already on your clipboard)
   - Cmd+V to paste
   - Click "Run" button

3. **Verify 4 tables created:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name LIKE 'rocko_v2%';
   ```
   Should show: rocko_v2_sessions, rocko_v2_messages, rocko_v2_integrations, rocko_v2_pairing_codes

**Schema changes from original 078:**
- Changed `rocko_v2_sessions.id` from uuid to text (for device IDs like 'rocko_1234567890')
- Added `device_token` field to `rocko_v2_sessions` (for device auth)
- Updated `rocko_v2_integrations` schema (removed `enabled`, added `user_id` and `scopes`)
- All policies set to allow service role full access

**Status:** SQL on clipboard. Ready for Ben's 1-click paste + run.
