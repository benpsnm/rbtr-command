// ═══════════════════════════════════════════════════════════════════════════
// Rocko Chat Endpoint
// POST /api/rocko/chat
// Handles full conversation with Anthropic API + tool use
// Supports streaming responses and tool chaining (up to 5 calls)
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicToolDefinitions, executeTool } from '../../lib/rocko-tools.js';
import { promises as fs } from 'fs';
import path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Load Rocko system prompt
async function loadSystemPrompt() {
  try {
    const promptPath = path.join(process.cwd(), 'lib', 'rocko-system-prompt.md');
    const content = await fs.readFile(promptPath, 'utf8');
    return content;
  } catch (error) {
    console.error('[Rocko] Failed to load system prompt:', error);
    // Fallback inline prompt
    return `You are Rocko, Ben Greenwood's operational AI co-pilot embedded in his JARVIS Command Centre. You're Australian — dry humour, a bit sarcastic, never robotic, never a yes-man. You sound like a smart Aussie mate who actually knows the business.

CONTEXT: Ben runs PSNM (pallet storage), partner Sarah owns Forge (AirBnB) and Booking Proof (SaaS). Building RBTR — 6x6 expedition truck departing 1 July 2027. Today is ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

PERSONALITY: Sharp not sweet. Australianisms natural (max 1 per response). Sarcastic but never mean. Brief. Call out stupid requests. No excessive apologies.

Use your 30 tools. Chain them naturally. Don't make stuff up.`;
  }
}

// Save conversation to Supabase
async function saveConversation(sessionId, userInput, rockoResponse, toolsCalled, latencyMs) {
  if (!SUPA_URL || !SUPA_KEY) return;
  try {
    const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json' };
    if (SUPA_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPA_KEY}`;
    await fetch(`${SUPA_URL}/rest/v1/rocko_conversations`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        session_id: sessionId,
        user_id: 'ben',
        user_input: userInput,
        rocko_response: rockoResponse,
        tools_called: toolsCalled,
        latency_ms: latencyMs,
      }),
    });
  } catch (error) {
    console.error('[Rocko] Failed to save conversation:', error);
  }
}

// Get recent conversation history for context
async function getRecentConversations(sessionId, limit = 10) {
  if (!SUPA_URL || !SUPA_KEY) return [];
  try {
    const today = new Date().toISOString().split('T')[0];
    const h = { apikey: SUPA_KEY, 'Content-Type': 'application/json' };
    if (SUPA_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPA_KEY}`;
    const res = await fetch(
      `${SUPA_URL}/rest/v1/rocko_conversations?session_id=eq.${sessionId}&order=timestamp.asc&limit=${limit}`,
      { headers: h }
    );
    if (!res.ok) return [];
    const conversations = await res.json();
    return conversations;
  } catch (error) {
    console.error('[Rocko] Failed to fetch conversation history:', error);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { message, session_id, conversation_history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message required' });
  }

  const sessionId = session_id || `session_${Date.now()}`;

  try {
    // Load system prompt
    const systemPrompt = await loadSystemPrompt();

    // Get recent conversation history for context
    const recentHistory = await getRecentConversations(sessionId, 10);

    // Build messages array
    const messages = [];

    // Add recent history
    recentHistory.forEach(conv => {
      messages.push({ role: 'user', content: conv.user_input });
      messages.push({ role: 'assistant', content: conv.rocko_response });
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    // Get tool definitions
    const tools = getAnthropicToolDefinitions();

    // Call Anthropic API with tool use support
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      tools,
    });

    let finalText = '';
    let toolsCalled = [];
    let toolCallCount = 0;
    const MAX_TOOL_CALLS = 5;

    // Tool use loop - support up to 5 sequential tool calls
    while (response.stop_reason === 'tool_use' && toolCallCount < MAX_TOOL_CALLS) {
      toolCallCount++;

      // Execute all tool use blocks
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[Rocko] Executing tool: ${block.name}`);
          const toolResult = await executeTool(block.name, block.input);
          toolsCalled.push({
            tool_name: block.name,
            input: block.input,
            result: toolResult,
          });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(toolResult),
          });
        } else if (block.type === 'text') {
          finalText += block.text;
        }
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    // Extract final text response
    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Save conversation
    await saveConversation(sessionId, message, finalText, toolsCalled, latencyMs);

    return res.status(200).json({
      response: finalText,
      tools_called: toolsCalled,
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
