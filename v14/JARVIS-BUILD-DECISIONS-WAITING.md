# JARVIS Build Decisions Waiting — Friday 15 May 2026

## Ben Friday Morning: Paste Rocko Migrations (1 min)

**Combined SQL file on clipboard** (138 lines)

Supabase SQL editor: https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new

1. Cmd+V to paste
2. Click "Run"  
3. Should see "Success" message

Creates 5 tables:
- rocko_v2_sessions (device auth + conversation tracking)
- rocko_v2_messages (per-message log)
- rocko_v2_integrations (OAuth tokens for Gmail/Calendar)
- rocko_v2_pairing_codes (temporary device pairing)
- cleanup_expired_pairing_codes() function

All idempotent (CREATE IF NOT EXISTS), safe to re-run.

---

## Optional: Google OAuth Setup for Rocko (5 min)

**Only needed if you want Gmail/Calendar tools in Rocko.**

1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Authorized redirect URIs: `https://rbtr-jarvis.vercel.app/api/rocko/oauth/callback`
4. Copy Client ID + Client Secret
5. Vercel → rbtr-jarvis project → Settings → Environment Variables:
   - `GOOGLE_CLIENT_ID` = [paste]
   - `GOOGLE_CLIENT_SECRET` = [paste]
6. Redeploy: `vercel --prod` from v14/

Then: Open Rocko mobile PWA → Tools menu → "Connect Google" → follow OAuth flow

---

## Atlas v3: No Migration Needed ✅

**Diagnosis complete:** Schema already correct in production. Yolo #2 script invented non-existent columns (company_number, employee_estimate, enrichment_source). Code never references them.

All 206 raw prospects ready for processing right now via JARVIS UI or API:
```bash
curl -X POST "https://rbtr-jarvis.vercel.app/api/atlas3?action=run_enrichment" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{"limit": 50}'
```

See /tmp/atlas-v3-schema-diff.md for full diagnosis.
