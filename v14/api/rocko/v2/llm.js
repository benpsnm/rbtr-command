// ═══════════════════════════════════════════════════════════════════════════
// Rocko v2 Custom LLM Proxy
// POST /api/rocko/v2/llm
// Translates ElevenLabs OpenAI-style requests → Anthropic Claude API
// Streams responses back in OpenAI Chat Completions format
// Logs all messages to rocko_v2_messages + rocko_v2_sessions
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';
import { ROCKO_V2_SYSTEM_PROMPT } from './_constants.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

// ── Translate OpenAI → Anthropic ─────────────────────────────────────────────
function translateMessages(openaiMessages) {
  // OpenAI: [{role: 'user'|'assistant'|'tool', content: '...', tool_calls: [...]}]
  // Anthropic: [{role: 'user'|'assistant', content: [...blocks]}]

  return openaiMessages.map(msg => {
    if (msg.role === 'tool') {
      // Tool results in Anthropic format
      return {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: msg.tool_call_id,
          content: msg.content
        }]
      };
    }

    if (msg.tool_calls) {
      // Assistant message with tool calls
      const content = [];
      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }
      msg.tool_calls.forEach(tc => {
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments
        });
      });
      return { role: 'assistant', content };
    }

    // Simple text message
    return {
      role: msg.role,
      content: typeof msg.content === 'string'
        ? [{ type: 'text', text: msg.content }]
        : msg.content
    };
  });
}

function translateTools(openaiTools) {
  // OpenAI: [{type: 'function', function: {name, description, parameters}}]
  // Anthropic: [{name, description, input_schema}]

  if (!openaiTools) return [];

  return openaiTools.map(tool => ({
    name: tool.function?.name || tool.name,
    description: tool.function?.description || tool.description,
    input_schema: tool.function?.parameters || tool.input_schema
  }));
}

// ── Stream in OpenAI format ──────────────────────────────────────────────────
function streamOpenAIFormat(anthropicStream, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let textBuffer = '';
  let toolCallsBuffer = [];

  const streamId = `chatcmpl-${Date.now()}`;

  // Send initial chunk
  res.write(`data: ${JSON.stringify({
    id: streamId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'claude-sonnet-4-6',
    choices: [{
      index: 0,
      delta: { role: 'assistant' },
      finish_reason: null
    }]
  })}\n\n`);

  return new Promise((resolve, reject) => {
    anthropicStream.on('text', (text) => {
      textBuffer += text;
      res.write(`data: ${JSON.stringify({
        id: streamId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'claude-sonnet-4-6',
        choices: [{
          index: 0,
          delta: { content: text },
          finish_reason: null
        }]
      })}\n\n`);
    });

    anthropicStream.on('content_block_start', (block) => {
      if (block.content_block?.type === 'tool_use') {
        toolCallsBuffer.push({
          id: block.content_block.id,
          type: 'function',
          function: {
            name: block.content_block.name,
            arguments: ''
          }
        });
      }
    });

    anthropicStream.on('content_block_delta', (delta) => {
      if (delta.delta?.type === 'input_json_delta') {
        const lastTool = toolCallsBuffer[toolCallsBuffer.length - 1];
        if (lastTool) {
          lastTool.function.arguments += delta.delta.partial_json;
        }
      }
    });

    anthropicStream.on('message_stop', () => {
      // Send final chunk
      res.write(`data: ${JSON.stringify({
        id: streamId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'claude-sonnet-4-6',
        choices: [{
          index: 0,
          delta: {},
          finish_reason: toolCallsBuffer.length > 0 ? 'tool_calls' : 'stop'
        }]
      })}\n\n`);

      res.write('data: [DONE]\n\n');
      res.end();

      resolve({
        text: textBuffer,
        tool_calls: toolCallsBuffer
      });
    });

    anthropicStream.on('error', (error) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
      reject(error);
    });
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { messages, tools, temperature = 1.0, max_tokens = 1024 } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    // Translate to Anthropic format
    const anthropicMessages = translateMessages(messages);
    const anthropicTools = translateTools(tools);

    // Get or create session
    const sessionId = req.headers['x-session-id'] || `session_${Date.now()}`;
    const device = req.headers['x-device'] || 'unknown';

    // Create session record if doesn't exist
    const sessionCheck = await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_sessions?id=eq.${sessionId}&limit=1`, {
      headers: sbHeaders()
    }).catch(() => null);

    if (!sessionCheck || sessionCheck.status === 404) {
      // Create new session
      await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_sessions`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify({
          id: sessionId,
          user_id: 'ben',
          device,
          started_at: new Date().toISOString()
        })
      }).catch(err => console.log('Session create failed:', err.message));
    }

    // Call Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens,
      temperature,
      system: ROCKO_V2_SYSTEM_PROMPT,
      messages: anthropicMessages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined
    });

    // Stream response back in OpenAI format
    const result = await streamOpenAIFormat(stream, res);

    // Log conversation to Supabase
    const latencyMs = Date.now() - startTime;
    const inputTokens = JSON.stringify(messages).length / 4; // rough estimate
    const outputTokens = result.text.length / 4;

    // Log user message
    const userMsg = messages[messages.length - 1];
    if (userMsg && userMsg.role === 'user') {
      await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_messages`, {
        method: 'POST',
        headers: sbHeaders(),
        body: JSON.stringify({
          session_id: sessionId,
          role: 'user',
          content: typeof userMsg.content === 'string' ? userMsg.content : JSON.stringify(userMsg.content),
          created_at: new Date().toISOString()
        })
      }).catch(() => {});
    }

    // Log assistant response
    await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_messages`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({
        session_id: sessionId,
        role: 'assistant',
        content: result.text,
        tool_calls: result.tool_calls.length > 0 ? result.tool_calls : null,
        latency_ms: latencyMs,
        tokens_input: Math.round(inputTokens),
        tokens_output: Math.round(outputTokens),
        created_at: new Date().toISOString()
      })
    }).catch(() => {});

    // Update session
    await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_sessions?id=eq.${sessionId}`, {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify({
        message_count: (await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_messages?session_id=eq.${sessionId}&select=count`, {
          headers: sbHeaders()
        }).then(r => r.json()).catch(() => [{ count: 0 }]))[0].count || 0,
        tools_called: result.tool_calls.map(tc => tc.function.name)
      })
    }).catch(() => {});

  } catch (error) {
    console.error('LLM proxy error:', error);
    return res.status(500).json({
      error: 'LLM proxy failed',
      message: error.message
    });
  }
}
