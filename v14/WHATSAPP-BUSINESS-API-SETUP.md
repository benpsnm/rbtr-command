# WhatsApp Business Cloud API Setup Guide
**Created:** 2026-05-14  
**Purpose:** Configure WhatsApp Business messaging for PSNM (07506 255033)

---

## Overview

WhatsApp Business Cloud API enables automated messaging for PSNM warehouse operations:
- **Booking confirmations** (when customer confirms storage)
- **Payment reminders** (invoice due notifications)
- **Insurance evidence requests** (chase missing certificates)
- **Pallet arrival notifications** (when delivery arrives at warehouse)
- **Two-way messaging** (customers can reply and ask questions)

**Current PSNM WhatsApp:** 07506 255033 (Ben's phone)  
**Migration Strategy:** Move to Business API while keeping same number

---

## Step 1: Create Meta for Developers App

1. **Go to:** https://developers.facebook.com/
2. **Login** with Facebook account (use business account, not personal)
3. **Click:** "Create App"
4. **Select:** "Business" app type
5. **App Name:** "PSNM Warehouse Automation"
6. **Contact Email:** beniproautobodies@gmail.com
7. **Business Account:** Create or select existing Meta Business Account
8. **Click:** Create App

---

## Step 2: Add WhatsApp Product

1. In App Dashboard → **Products** → Find "WhatsApp" → Click **Set Up**
2. **Business Portfolio:** Select or create (choose "Pallet Storage Near Me")
3. **WhatsApp Business Account:** Create new or select existing
4. **Phone Number:**
   - **Option A (Recommended):** Use new number from Meta (free test number)
   - **Option B (Production):** Migrate 07506 255033 (requires business verification)

**For testing (Option A):**
- Meta provides a free test phone number
- Use this for development before migrating real number

**For production (Option B):**
- Requires Meta Business Verification (1-2 weeks)
- Submit business documents (proof of address, company registration)
- Then request number migration from standard WhatsApp to Business API

---

## Step 3: Get API Credentials

1. In App Dashboard → **WhatsApp** → **API Setup**
2. Copy these values to `.env.production`:

```bash
WHATSAPP_ACCESS_TOKEN=<Temporary Access Token>
# Example: EAABsb...(long string)

WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID>
# Example: 123456789012345

WHATSAPP_BUSINESS_ACCOUNT_ID=<Business Account ID>
# Example: 987654321098765

WHATSAPP_VERIFY_TOKEN=rbtr-whatsapp-2026
# (You choose this - used for webhook verification)
```

**Note:** The Temporary Access Token expires in 24 hours. Generate a Permanent Access Token:
- Go to **System Users** in Meta Business Suite
- Create System User → Assign to App → Generate Token
- Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
- Copy permanent token to `.env.production`

---

## Step 4: Configure Webhook

1. In App Dashboard → **WhatsApp** → **Configuration**
2. **Webhook URL:** `https://rbtr-jarvis.vercel.app/api/whatsapp/webhook`
3. **Verify Token:** `rbtr-whatsapp-2026` (must match WHATSAPP_VERIFY_TOKEN in .env.production)
4. Click **Verify and Save**

**Webhook Events to Subscribe:**
- ✅ messages (inbound customer messages)
- ✅ message_echoes (outbound message confirmations)
- ✅ message_status (delivered/read receipts)

---

## Step 5: Test Message Send

Test endpoint: `POST /api/whatsapp/send`

```bash
curl -X POST https://rbtr-jarvis.vercel.app/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -d '{
    "to": "447506255033",
    "message": "Test message from PSNM WhatsApp Business API",
    "type": "text"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message_id": "wamid.HBgNNDQ3NTA2MjU1MDMzFQIAERgSN...",
  "whatsapp_response": {...}
}
```

**If error:** Check ACCESS_TOKEN, PHONE_NUMBER_ID, and that recipient number is registered in test mode

---

## Step 6: PSNM Use Cases

### Use Case 1: Booking Confirmation

**Trigger:** Customer status changes to `live` in `psnm_customers` table

**Message:**
```
Hi [Customer Name],

Your PSNM storage is now live! 🎉

📦 Pallets: [X] positions
📍 Location: Unit 3C, Hellaby S66 8HR
📞 Ben: 07506 255033

Deliveries can start arriving Monday-Friday 8am-4pm.

Reply to this message anytime.

PSNM
```

**Implementation:** Webhook in Supabase or cron that watches `psnm_customers.status`

---

### Use Case 2: Payment Reminder

**Trigger:** Invoice is 7 days overdue

**Message:**
```
Hi [Customer Name],

Friendly reminder: Invoice [#123] for £[amount] was due on [date].

Pay via bank transfer:
Sort: 04-00-04
Account: 77172917
Ref: [Invoice #]

Reply if you need an extension.

PSNM
```

**Implementation:** Daily cron checks `psnm_invoices.due_date`

---

### Use Case 3: Insurance Evidence Request

**Trigger:** Customer has no valid insurance certificate

**Message:**
```
Hi [Customer Name],

We need an updated insurance certificate for your stored goods.

📸 Reply with a photo of your certificate
📧 Or email to: beniproautobodies@gmail.com

Required coverage: £[X] public liability

PSNM
```

**Implementation:** Monthly check of `psnm_customers.insurance_expiry`

---

### Use Case 4: Pallet Arrival Notification

**Trigger:** New delivery logged in WMS

**Message:**
```
Hi [Customer Name],

[X] pallets arrived today at PSNM ✅

📦 Total stored: [Y] pallets
🏷️ Refs: [PO numbers]

Updated storage report in your account.

PSNM
```

**Implementation:** Triggered by `psnm_wms_movements` insert

---

## Step 7: Message Templates

WhatsApp requires pre-approved templates for first contact (24h window).

**Create templates in Meta dashboard:**

1. Go to **WhatsApp** → **Message Templates**
2. Click **Create Template**
3. Example template: `booking_confirmation`

```
Category: Account Update
Name: booking_confirmation
Language: English (UK)

Body:
Hi {{1}},

Your PSNM storage is now live! 🎉

📦 Pallets: {{2}} positions
📍 Location: Unit 3C, Hellaby S66 8HR
📞 Ben: 07506 255033

Deliveries can start arriving Monday-Friday 8am-4pm.

Reply to this message anytime.

PSNM
```

4. Submit for approval (usually approved within 1 hour)

**Use template in API:**

```javascript
await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '447506255033',
    type: 'template',
    message: {
      template_name: 'booking_confirmation',
      language: 'en_GB',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'John Smith' },  // {{1}}
            { type: 'text', text: '10' }            // {{2}}
          ]
        }
      ]
    }
  })
});
```

---

## Step 8: Inbound Message Handling

When customer replies, webhook receives POST to `/api/whatsapp/webhook`:

**Example payload:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": "447506255033",
          "id": "wamid.HBgNND...",
          "timestamp": "1715654400",
          "type": "text",
          "text": { "body": "Can I book 5 more pallets?" }
        }]
      }
    }]
  }]
}
```

**Recommended handling:**
1. Store message in `psnm_whatsapp_messages` table
2. Classify intent (question / booking / payment / complaint)
3. If urgent: Send Telegram notification to Ben
4. If routine: Auto-reply with standard answer
5. Log conversation for Ben to review in JARVIS

---

## Security & Compliance

- **Webhook verification:** Always verify Meta's signature (not implemented in scaffold - add before production)
- **Opt-out:** Include "Reply STOP to unsubscribe" in marketing messages
- **Data retention:** Store messages encrypted, delete after 90 days
- **Rate limits:** WhatsApp allows 1000 messages/day on free tier, more on paid tier
- **Business verification:** Required for production deployment (Meta reviews business legitimacy)

---

## Cost

- **Free tier:** 1000 conversations/month
- **Paid tier:** £0.002-0.01 per conversation (varies by country)
- **Conversation window:** 24 hours (customer can reply free within 24h of your last message)

**PSNM estimate:**
- 50 active customers × 2 messages/month = 100 conversations
- Cost: ~£0.20-1.00/month (well within free tier)

---

## Next Steps

1. ✅ Create Meta for Developers app
2. ✅ Add WhatsApp product
3. ✅ Get API credentials → Add to `.env.production`
4. ✅ Configure webhook URL
5. ✅ Test message send with `/api/whatsapp/send`
6. Create message templates for common use cases
7. Build automation triggers (Supabase webhooks or crons)
8. Test with 2-3 real customers before full rollout
9. Business verification for production number migration

---

**DON'T wire to live API until:**
- Meta app is verified
- Message templates approved
- Tested thoroughly with test number
- Ben has manually reviewed all auto-message logic

**Risk:** Accidental spam to customers = WhatsApp account suspension
