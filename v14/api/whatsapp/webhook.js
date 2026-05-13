// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Business Cloud API Webhook
// POST /api/whatsapp/webhook
// Receives inbound messages from WhatsApp Business Platform
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // Webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token matches what you set in Meta dashboard
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'rbtr-whatsapp-2026';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verified');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send('Forbidden');
    }
  }

  // Handle incoming messages (POST request)
  if (req.method === 'POST') {
    const body = req.body;

    // Log webhook payload for debugging
    console.log('[WhatsApp Webhook] Received:', JSON.stringify(body, null, 2));

    // Check if this is a message event
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach(entry => {
        const changes = entry.changes || [];

        changes.forEach(change => {
          if (change.field === 'messages') {
            const messages = change.value.messages || [];

            messages.forEach(async message => {
              const from = message.from; // Sender's phone number
              const messageId = message.id;
              const timestamp = message.timestamp;

              // Handle different message types
              if (message.type === 'text') {
                const text = message.text.body;
                console.log(`[WhatsApp] Message from ${from}: ${text}`);

                // TODO: Process message
                // - Store in database (psnm_whatsapp_messages table)
                // - Trigger automation (booking confirmation, payment reminder, etc)
                // - Send auto-reply if needed
              } else if (message.type === 'image') {
                const imageId = message.image.id;
                console.log(`[WhatsApp] Image from ${from}: ${imageId}`);

                // TODO: Handle image upload (e.g. insurance evidence)
              } else {
                console.log(`[WhatsApp] Unsupported message type: ${message.type}`);
              }
            });
          }
        });
      });

      return res.status(200).send('EVENT_RECEIVED');
    }

    return res.status(404).send('Not Found');
  }

  return res.status(405).send('Method Not Allowed');
}
