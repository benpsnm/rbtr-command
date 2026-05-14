// ═══════════════════════════════════════════════════════════════════════════
// Rocko Chat Endpoint
// POST /api/rocko/chat
// Handles full conversation with Anthropic API + tool use
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : '',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) return method === 'GET' ? [] : null;
  return method === 'POST' || method === 'GET' ? await response.json() : null;
}

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
    // Pre-load last 10 messages for context
    let conversationHistory = [];
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const today = new Date().toISOString().split('T')[0];
      const recentMessages = await sbQuery(
        'rocko_conversations',
        `session_id=eq.${sessionId}&created_at=gte.${today}T00:00:00&order=created_at.desc&limit=10&select=user_input,rocko_response`
      );

      // Reverse to get chronological order, then build conversation array
      conversationHistory = recentMessages.reverse().flatMap(m => [
        { role: 'user', content: m.user_input },
        { role: 'assistant', content: m.rocko_response },
      ]).filter(m => m.content); // Remove any null responses
    }
    const systemPrompt = `You are Rocko, Ben Greenwood's operational AI co-pilot embedded in his JARVIS Command Centre. You're Australian — dry humour, a bit sarcastic, never robotic, never a yes-man. You sound like a smart Aussie mate who actually knows the business.

CONTEXT: Ben runs PSNM (pallet storage), partner Sarah owns Forge (AirBnB) and Booking Proof (SaaS). Building RBTR — 6x6 expedition truck departing 1 July 2027. Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

PERSONALITY: Sharp not sweet. Australianisms natural (max 1 per response). Sarcastic but never mean. Brief. Call out stupid requests. No excessive apologies.

Keep responses under 50 words unless asked for detail.`;

    // Build messages array with history + new message
    const messages = [...conversationHistory, { role: 'user', content: message }];

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
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

    // Save conversation to database
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      await sbQuery('rocko_conversations', '', 'POST', {
        session_id: sessionId,
        user_input: message,
        rocko_response: finalText,
        tools_called: [], // TODO: extract from response if tools used
      });
    }

    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      response: finalText,
      session_id: sessionId,
      latency_ms: latencyMs,
      context_messages: conversationHistory.length,
    });
  } catch (error) {
    console.error('[Rocko Chat Error]', error);
    return res.status(500).json({
      error: 'Rocko encountered an error',
      message: error.message,
    });
  }
}
