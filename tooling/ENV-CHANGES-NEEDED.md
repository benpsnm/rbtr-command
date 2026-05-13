# .env Changes Required

**File:** `~/Desktop/rbtr-command/scripts/.env`

These lines were added during n8n setup and need to be applied manually (since .env is gitignored):

```bash
# ── n8n Configuration (local install) ─────────────────────────────────────────
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=5bVJT6cHmza4Mo91qT0R6vjJk30p4X7gJ2FvtqeBZ7w=
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
```

**Status:** ✅ Already applied during installation.

**Action:** No action needed unless you reset your .env file or pull from another machine.

---

## Missing Values in .env (Need Ben's Input)

These were empty before and remain empty:

```bash
# PSNM Gmail App Password (line 25)
PSNM_GMAIL_APP_PASSWORD=

# Telegram Chat ID (line 34)
TELEGRAM_CHAT_ID=
```

**Action required:**
1. **PSNM_GMAIL_APP_PASSWORD**: Only needed if old cron scripts still running. n8n uses OAuth2 instead.
2. **TELEGRAM_CHAT_ID**: Required for n8n workflows. Get it by:
   - Send `/start` to your RBTR Telegram bot
   - Forward bot reply to @userinfobot
   - Copy Chat ID (number like `123456789`)
   - Add to .env: `TELEGRAM_CHAT_ID=123456789`

See `N8N-LOCAL-SETUP.md` for detailed instructions.
