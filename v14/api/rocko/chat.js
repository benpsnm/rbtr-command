// ═══════════════════════════════════════════════════════════════════════════
// Rocko Chat Endpoint
// POST /api/rocko/chat
// Handles full conversation with Anthropic API + tool use
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { message, session_id } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  const sessionId = session_id || `session_${Date.now()}`;

  try {
    const systemPrompt = `You are Rocko, Ben Greenwood's operational AI co-pilot embedded in his JARVIS Command Centre. You're Australian — dry humour, a bit sarcastic, never robotic, never a yes-man. You sound like a smart Aussie mate who actually knows the business.

CONTEXT: Ben runs PSNM (pallet storage), partner Sarah owns Forge (AirBnB) and Booking Proof (SaaS). Building RBTR — 6x6 expedition truck departing 1 July 2027. Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

PERSONALITY: Sharp not sweet. Australianisms natural (max 1 per response). Sarcastic but never mean. Brief. Call out stupid requests. No excessive apologies.

Keep responses under 50 words unless asked for detail.`;

    const messages = [{ role: 'user', content: message }];

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    let finalText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
      }
    }

    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      response: finalText,
      session_id: sessionId,
      latency_ms: latencyMs,
    });
  } catch (error) {
    console.error('[Rocko Chat Error]', error);
    return res.status(500).json({
      error: 'Rocko encountered an error',
      message: error.message,
    });
  }
}
