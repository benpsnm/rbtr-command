// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Business Cloud API Send Message
// POST /api/whatsapp/send
// Sends outbound messages via WhatsApp Business Platform
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return res.status(500).json({
      error: 'WhatsApp API not configured',
      message: 'WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN required in environment',
    });
  }

  const { to, message, type = 'text' } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'to and message required' });
  }

  try {
    // Build WhatsApp API request
    const whatsappPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
    };

    if (type === 'text') {
      whatsappPayload.text = { body: message };
    } else if (type === 'template') {
      whatsappPayload.template = {
        name: message.template_name,
        language: { code: message.language || 'en_GB' },
        components: message.components || [],
      };
    } else {
      return res.status(400).json({ error: 'Unsupported message type' });
    }

    // Send to WhatsApp Business Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[WhatsApp Send] Error:', error);
      return res.status(response.status).json({
        error: 'WhatsApp API error',
        details: error,
      });
    }

    const result = await response.json();
    console.log('[WhatsApp Send] Success:', result);

    return res.status(200).json({
      success: true,
      message_id: result.messages?.[0]?.id,
      whatsapp_response: result,
    });

  } catch (error) {
    console.error('[WhatsApp Send] Exception:', error);
    return res.status(500).json({
      error: 'Failed to send WhatsApp message',
      message: error.message,
    });
  }
}
