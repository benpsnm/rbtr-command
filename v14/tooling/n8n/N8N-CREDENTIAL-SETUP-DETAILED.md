# n8n Credential Setup Guide
**Created:** 2026-05-14  
**Purpose:** Step-by-step credential configuration for RBTR Command n8n workflows

---

## Prerequisites
- n8n running at `localhost:5678` (or cloud instance)
- Access to n8n UI

---

## Credential 1: Anthropic API (Claude)

**Used in workflows:** 01-psnm-intel-enrichment, 02-rbtr-sponsor-drafter, 04-house-jobs-daily-digest, 05-tech-scan-every-3-days

**Setup:**
1. In n8n: Credentials → Add Credential → Search "HTTP Request"
2. Name: `Anthropic Claude API`
3. Authentication: `Header Auth`
4. Header Name: `x-api-key`
5. Header Value: `sk-ant-api03-L5pWsjhhiCpWaBQh...` (from .env.production)
6. Additional Headers (JSON):
   ```json
   {
     "anthropic-version": "2023-06-01",
     "content-type": "application/json"
   }
   ```
7. Test: Save → Test workflow with HTTP Request node to `https://api.anthropic.com/v1/messages`

---

## Credential 2: Gmail OAuth2

**Used in workflows:** 02-rbtr-sponsor-drafter (reply checking), 05-tech-scan-every-3-days (notifications)

**Setup:**
1. **Google Cloud Console** → Create OAuth 2.0 Client
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: `Web application`
   - Authorized redirect URIs: `https://localhost:5678/rest/oauth2-credential/callback` (or your n8n URL)
   - Copy Client ID + Client Secret

2. **Enable Gmail API**
   - Go to: https://console.cloud.google.com/apis/library
   - Search "Gmail API" → Enable

3. **In n8n:**
   - Credentials → Add Credential → Gmail OAuth2
   - Name: `Ben Gmail (beniproautobodies@gmail.com)`
   - Client ID: `<from step 1>`
   - Client Secret: `<from step 1>`
   - Click "Connect my account" → Authorize with Google
   - Test: Use Gmail node to fetch recent emails

---

## Credential 3: Supabase

**Used in workflows:** All workflows (database reads/writes)

**Setup:**
1. In n8n: Credentials → Add Credential → Supabase
2. Name: `RBTR Command Supabase`
3. Host: `mpxgyobotiqcawmqlhbf.supabase.co`
4. Service Role Key: `[REDACTED_SUPABASE_KEY]` (from .env.production)
5. Test: HTTP Request node → GET `https://mpxgyobotiqcawmqlhbf.supabase.co/rest/v1/rbtr_tasks?select=count`

---

## Credential 4: Telegram Bot

**Used in workflows:** 04-house-jobs-daily-digest, 05-tech-scan-every-3-days

**Setup:**
1. **Create Telegram Bot** (if not exists):
   - Message @BotFather on Telegram: `/newbot`
   - Follow prompts → Get Bot Token
   - Save token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

2. **Get Chat ID**:
   - Start a chat with your new bot
   - Send any message
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find `"chat":{"id":123456789}` in response

3. **In n8n:**
   - Credentials → Add Credential → Telegram
   - Name: `RBTR Telegram Bot`
   - Access Token: `<bot token from step 1>`
   - Base URL: Leave default
   - Test: Send test message to Ben's chat ID `8669062243`

---

## Credential 5: SendGrid (Email Sending)

**Used in workflows:** 01-psnm-intel-enrichment (optional), 02-rbtr-sponsor-drafter (dispatch)

**Setup:**
1. In n8n: Credentials → Add Credential → SendGrid
2. Name: `PSNM SendGrid`
3. API Key: `[REDACTED_SENDGRID_KEY]` (from .env.production)
4. Test: Send test email node → verify receipt

---

## Testing All Credentials

Once all credentials are configured:

1. **Anthropic:** Execute workflow 05-tech-scan → Should return AI-generated report
2. **Gmail:** Execute workflow 02-rbtr-sponsor-drafter → Should check for replies
3. **Supabase:** Execute workflow 04-house-jobs → Should query house_jobs table
4. **Telegram:** Execute workflow 04-house-jobs → Should send digest to Ben
5. **SendGrid:** Execute workflow 02-rbtr-sponsor-drafter → Send test sponsor email

---

## Security Notes

- **Never commit credentials to git**
- n8n stores credentials encrypted in its database
- Rotate API keys quarterly
- Use separate Gmail account for automation if possible
- Test in development before activating production workflows

---

## Next Steps

Once credentials are set up:
1. Import workflows from `tooling/n8n/workflows/`
2. Activate each workflow one at a time
3. Monitor first 2-3 executions for errors
4. Check N8N-ACTIVATION-CHECKLIST.md for activation order
