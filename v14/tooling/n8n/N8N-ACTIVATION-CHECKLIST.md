# n8n Workflow Activation Checklist
**Created:** 2026-05-14  
**Purpose:** Safe activation order for RBTR Command n8n workflows

---

## Activation Order (Important!)

Activate workflows in this order to ensure dependencies are met:

### 1. ✅ Setup Phase (Do First)

- [ ] All credentials configured (see N8N-CREDENTIAL-SETUP-DETAILED.md)
- [ ] n8n running and accessible at localhost:5678
- [ ] Migrations 066-069 applied in Supabase
- [ ] Test each credential individually (see credential guide)

### 2. 📊 Data Workflows (Activate Second)

**04-house-jobs-daily-digest.json**
- **Schedule:** Daily at 18:00 UK time
- **Purpose:** Query house_jobs table, send Telegram digest to Ben
- **Dependencies:** Supabase credential, Telegram credential, house_jobs table (migration 068)
- **Test:** Run manually first → Check Telegram message received
- **Activate:** Set to Active in n8n UI

**01-psnm-intel-enrichment.json** (if exists)
- **Schedule:** Varies (check workflow file)
- **Purpose:** PSNM intelligence pipeline enrichment
- **Dependencies:** Supabase, Anthropic, Companies House API
- **Test:** Run manually with single test prospect
- **Activate:** Only after confirming Anthropic budget

### 3. 🔍 Research Workflows (Activate Third)

**05-tech-scan-every-3-days.json**
- **Schedule:** Every 72 hours
- **Purpose:** AI market scan for new tools/tech, post to Telegram + Obsidian
- **Dependencies:** Anthropic credential, Telegram credential
- **Test:** Run manually first → Check AI response quality
- **Activate:** Set to Active in n8n UI
- **Monitor:** First 2-3 scans for relevance and token usage

### 4. 📧 Outreach Workflows (Activate Last - High Risk)

**02-rbtr-sponsor-drafter.json** (if exists)
- **Schedule:** Varies (check workflow file)
- **Purpose:** Generate + dispatch RBTR sponsor outreach emails
- **Dependencies:** Supabase, Anthropic, Gmail/SendGrid, rbtr_atlas_* tables (migration 069)
- **Test:** ⚠️ **CRITICAL** - Test with Ben's own email first
- **Activate:** Only after Ben manually reviews 5+ draft emails

**03-psnm-atlas-dispatch.json** (if exists)
- **Schedule:** Varies
- **Purpose:** PSNM Atlas v3 email dispatch
- **Dependencies:** Similar to 02-rbtr-sponsor-drafter
- **Test:** ⚠️ **CRITICAL** - Test with test prospect only
- **Activate:** Only after Ben approves draft quality

---

## Pre-Activation Tests

Run these tests BEFORE activating any workflow:

### Test 1: Supabase Connection
```
Workflow: Any
Node: HTTP Request
URL: https://mpxgyobotiqcawmqlhbf.supabase.co/rest/v1/rbtr_tasks?select=count
Headers: 
  - apikey: <SUPABASE_SERVICE_ROLE>
  - Authorization: Bearer <SUPABASE_SERVICE_ROLE>
Expected: {"count": <number>}
```

### Test 2: Telegram Message
```
Workflow: 04-house-jobs-daily-digest
Node: Telegram → Send Message
Chat ID: 8669062243
Message: "n8n test message from workflow activation"
Expected: Message appears in Ben's Telegram
```

### Test 3: Anthropic API
```
Workflow: 05-tech-scan-every-3-days
Node: HTTP Request
URL: https://api.anthropic.com/v1/messages
Body: {
  "model": "claude-sonnet-4-6",
  "max_tokens": 100,
  "messages": [{"role": "user", "content": "Say 'test successful'"}]
}
Expected: AI response "test successful"
```

### Test 4: Gmail OAuth
```
Workflow: 02-rbtr-sponsor-drafter (if exists)
Node: Gmail → Get Many
Filters: Recent 5 messages
Expected: List of recent emails from beniproautobodies@gmail.com
```

---

## Activation Steps Per Workflow

For each workflow in activation order:

1. **Import:** n8n → Workflows → Import from File → Select .json
2. **Review:** Open workflow → Check all nodes → Verify credentials assigned
3. **Manual Test:** Click "Execute Workflow" → Check output of each node
4. **Fix Errors:** If any node fails, check credential + API limits
5. **Dry Run:** Set workflow to inactive but with short interval (e.g. every 5 min) → Watch for 30 min
6. **Activate:** Set to Active → Monitor executions tab for first 24h
7. **Document:** Note activation date + any issues in this file

---

## Monitoring Post-Activation

### Daily (First Week)
- Check n8n Executions tab → Any failed workflows?
- Check Telegram → Receiving expected messages?
- Check Supabase → Data being written correctly?

### Weekly (After First Week)
- Review Anthropic API usage → Within budget?
- Check Gmail quota → Any rate limits hit?
- Spot-check output quality → AI responses still relevant?

---

## Deactivation (If Needed)

To pause a workflow:
1. n8n → Workflows → Click workflow name
2. Toggle "Active" switch to OFF
3. Document reason in this file
4. Check if other workflows depend on this one

---

## Common Issues & Fixes

**Issue:** Telegram messages not arriving  
**Fix:** Check bot token, verify chat ID, test with @BotFather

**Issue:** Anthropic 429 rate limit  
**Fix:** Reduce workflow frequency, check token usage in dashboard

**Issue:** Supabase 401 unauthorized  
**Fix:** Verify service role key, check RLS policies disabled for service role

**Issue:** Gmail OAuth expired  
**Fix:** Reconnect Gmail credential, re-authorize with Google

---

## Workflow Status Log

| Workflow | Activated | Status | Issues | Notes |
|---|---|---|---|---|
| 04-house-jobs-daily-digest | [date] | ⏳ Pending | - | - |
| 05-tech-scan-every-3-days | [date] | ⏳ Pending | - | - |
| 01-psnm-intel-enrichment | [date] | ⏳ Pending | - | - |
| 02-rbtr-sponsor-drafter | [date] | ⏳ Pending | - | - |
| 03-psnm-atlas-dispatch | [date] | ⏳ Pending | - | - |

_Ben: Update this table as you activate workflows_
