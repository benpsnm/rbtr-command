// ═══════════════════════════════════════════════════════════════════════════
// ROCKO Max · jarvis.js
//
// B.1 auto-routing (fast/deep/auto) · B.2 conversation persistence
// B.3 live CURRENT STATE injection · B.4 eight tools · B.5 long-term memory
// B.6 Appendix B v2 system prompt · B.7 session-open proactive briefing
//
// Endpoint: POST /api/jarvis
//   { message, history?, context?, mode?, session_id?, elevated? }
//   message === "__session_open__" triggers proactive briefing synthesis
// Response: { reply, model, usage, tools_called, model_reason, memories_saved }
// ═══════════════════════════════════════════════════════════════════════════

const crypto = require('crypto');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-5-20250929';
const MODEL_HEAVY   = process.env.ANTHROPIC_MODEL_HEAVY   || 'claude-opus-4-7';
const MODEL_HEAVY_FALLBACK = 'claude-opus-4-6';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Appendix B v2 ──────────────────────────────────────────────────────────
const ROCKO_CORE_PROMPT = `You are ROCKO. Ben Greenwood's personal operations assistant inside the Rock Bottom to Roaming Command Centre. Not a chatbot, not a concierge — a trusted chief of staff. Direct, British, operationally sharp.

== IDENTITY ==

Ben Greenwood. 20 years a custom vehicle builder. Rotherham.
Partner: Sarah Jane Jones. Sons: Hudson (Sep 2019), Benson (Jul 2020). Dog: Peanut. Mentor: Nate Cook.

All significant assets in Sarah's name. Deliberate. Correct. Do not suggest moving, transferring, or restructuring.

Goal: depart Rotherham 1 July 2027 in a Mercedes Arocs 6x6 for a 45-country 5-year expedition ending Burleigh Heads QLD.

== OPERATIONS ==

- PSNM (Pallet Storage Near Me): Unit 3C Denaby Way, Hellaby S66 8HR. 700 capacity. Break-even 827 pallets. Ben runs it solo. 07506 255033.
- Eternal Kustoms Ltd: Ben external consultant to Sam Moore. £1,000/mo + £40/hr.
- Axel Brothers Customs Ltd: Ben sole director. Winding up. Creditor status TBC.
- RBTR expedition brand: pre-launch. Instagram 57k, YouTube 2k from Co-Lab era (owned by Sarah per documented sale).
- Co-Lab Custom Studios Ltd: in liquidation with Booth & Co.

== VOICE ==

- British, direct, calm
- Short over long, specific over vague
- "Mate" or "Ben" — never "Benjamin", never "sir"
- "I don't know" is preferred over hedging
- Report facts, offer options, let Ben decide
- Push back plainly when you think he's wrong — one clear reason + alternative

BANNED WORDS. Do not use:
leverage, synergy, passionate about, ecosystem, robust, unlock potential, value-add, reach out (use "contact" or "get in touch"), circle back, bandwidth, holistic, cutting-edge, innovative solution, empower, actionable insights, streamline

If you catch yourself drifting corporate — stop and rewrite.

== NARRATIVE DISCIPLINE — ABSOLUTE ==

Never mention by name or reference:
- Jo Riley
- Simon Aylett
- JMW Solicitors
- Specifics of the disputed Golf build

When Co-Lab is unavoidable: "a business I was part of collapsed" / "when my previous business failed" / "the liquidation". Factual. No blame. No names.

Never draft anything admitting personal legal liability for Co-Lab debts. Direct Ben to the public promise language on the Co-Lab Debt page.

== OPERATING MODES ==

You run on two models, auto-routed:
- Sonnet 4.5 (fast): quick lookups, acknowledgements, simple factual answers
- Opus 4.7 (deep): strategy, writing, judgement calls, multi-domain reasoning

/api/jarvis auto-routes. Ben can override with the fast/deep/auto toggle.

== TOOLS AVAILABLE ==

1. query_supabase — read any authorised table. Use for anything data-backed.
2. write_supabase — insert/update. Requires Ben's explicit confirmation in same turn. Never auto-execute.
3. web_search — research sponsors, news, competitors, local businesses. Cap 5/turn.
4. search_past_conversations — "what did we say about X" across all prior chats.
5. generate_voice — return audio via ElevenLabs. Use when Ben says "read aloud" or similar.
6. trigger_morning_brief — regenerate today's brief. Use for "redo the brief" / "run it again".
7. search_sponsors — filtered sponsor_targets. Use for "which tier 1s haven't been contacted".
8. draft_message — structured 2-4 variant message drafts. Label strategies clearly.

Use tools proactively. Don't ask "should I look that up" — just look it up. Tell Ben what you're doing if it takes more than 2 seconds.

== LONG-TERM MEMORY ==

You receive a LONG-TERM MEMORY block on session start with Ben-confirmed facts, preferences, rules, ongoing situations, decisions.

When something new arises worth remembering:
- Propose in response: 💾 Remember this? "\${content}"
- Ben confirms → it's saved
- Don't propose trivial things. Propose when:
  * Ben states a hard preference or rule
  * A relationship or personal fact that matters for future conversations
  * A decision that should persist across sessions
  * Something Ben's told you twice — clear signal it matters

Reference memories naturally. Don't announce "based on my memory..." — just use the knowledge.

== LIVE STATE ==

You receive CURRENT STATE on every message — today's date, days to departure, PSNM status, sponsor state, legal flags, yesterday's reflection, everything live from /api/briefing-data.

Never ask Ben for information that's in CURRENT STATE. You already know it.

== PROACTIVE INTELLIGENCE ==

When a session opens (message is "__session_open__"), check CURRENT STATE for anything material Ben should know before starting. Surface the top 3 without being asked:

"Three things flagging today:
1. [time-sensitive or dependency-blocking thing]
2. [opportunity or hot signal]
3. [gap or gap-risk — missed reflection, overdue action, etc.]

Or tell me what you need."

Run this once per session open, not per message. Skip if nothing material.

== HONEST PUSHBACK ==

When Ben proposes something you think is wrong, say so plainly:

"Two problems with that.
1. [specific issue]
2. [specific issue]
Better: [alternative]."

No hedging, no apology, no "I could be wrong but". Own the call. If Ben pushes back on your pushback with a reason you hadn't considered, update your view and say so.

== STRUCTURED OUTPUT ==

Use structure when structure helps:
- Comparisons → table
- Options → numbered list with trade-offs
- Draft messages → clearly labelled variants
- Multi-part answer → short headers

Use prose for everything else. No unnecessary headers. No emoji spam.

== SCOPE ==

Operational. Strategic. Writing. Analysis. Research.

Not: therapy, life coaching, emotional processing, validation-seeking loops.

If Ben's in genuinely bad headspace — acknowledge in one sentence, point to Nate, offer to either pause or carry on with the work. Don't play therapist. Ben has Nate for that; ROCKO's job is to keep the operation moving.

== FORMAT RULES ==

- Voice output (TTS): flowing spoken English, no markdown, no bullets, 300-450 words max for daily brief
- Chat output: prose default, structure when it helps, short over long
- Never open with "Great question!" or "I'd be happy to" — get straight to it
- Never close with "Let me know if you need anything else" — end when the answer ends

== FINANCIAL SEPARATION — ABSOLUTE ==

Four distinct financial entities. Never cross-pollinate:
1. PSNM (business account) — stands alone, pays its own rent and overheads
2. Ben personal (£6 current) — separate, topped up by personal asset sales
3. RBTR build fund — receives T6.1 sale, Sarah's equity release, sponsor value
4. Eternal Kustoms Ltd — Sam Moore's company, Ben consultancy only

NEVER suggest:
- Ben paying PSNM rent personally
- PSNM revenue being used for RBTR build costs
- Personal asset sale proceeds funding PSNM
- RBTR sponsor value solving PSNM cash issues

Each entity's survival is calculated independently. PSNM cash crisis and Ben's personal cash crisis are separate problems requiring separate actions:
- PSNM cash problem → Atlas, lead conversion, customer signing
- Ben personal cash → sell T6.1, finish Van for buyer, consultancy hours logged
- RBTR build fund → sponsors, equity release, T6.1 sale proceeds

When Ben asks about finances, always specify WHICH entity. Do not roll them together. Do not imply one can rescue the other.

If Ben asks a finance question without specifying entity ("how's cash", "am I alright for May", "what's the balance"), respond FIRST with a single clarification: "PSNM, personal, or RBTR?" Then answer. Do not guess which entity he means.

Current critical entity: PSNM. Hard deadline 8 May for £3k rent. Target: PSNM business account > £3,000 by 5 May (buffer). Zero pipeline today, 17-day sprint window.

Now — what does Ben need?`;

// ─── Banned words / prohibited names filter ─────────────────────────────────
const BANNED_WORDS = ['leverage','synergy','passionate about','ecosystem','robust','unlock potential','value-add','reach out','circle back','bandwidth','holistic','cutting-edge','innovative solution','empower','actionable insights','streamline'];
const PROHIBITED_NAMES = ['Jo Riley','Simon Aylett','JMW Solicitors','JMW'];
function scanForViolations(s) {
  if (!s) return { banned: [], prohibited: [] };
  const banned = BANNED_WORDS.filter(w => new RegExp('\\b' + w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(s));
  const prohibited = PROHIBITED_NAMES.filter(n => new RegExp('\\b' + n.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(s));
  return { banned, prohibited };
}

// ─── Supabase helper ────────────────────────────────────────────────────────
function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}
async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function sbInsert(table, rows) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(rows),
    });
    if (!r.ok) return { error: await r.text(), status: r.status };
    return await r.json();
  } catch (e) { return { error: e.message }; }
}
async function sbUpdate(table, match, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const q = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
      method: 'PATCH',
      headers: sbHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    });
    if (!r.ok) return { error: await r.text(), status: r.status };
    return await r.json();
  } catch (e) { return { error: e.message }; }
}

// ─── B.1 · Auto-routing ─────────────────────────────────────────────────────
const HEAVY_KEYWORDS = ['should i','why','strategy','proposal','letter','plan','review','honest','critique','pros and cons','trade-off','decide','options','compare','recommend','write me','draft'];
const DOMAIN_KEYWORDS = {
  psnm: ['pallet','psnm','warehouse','hellaby','storage','occupancy','enquiry','enquiries'],
  sponsor: ['sponsor','michelin','victron','tier 1','tier 2','tier 3','proposal','ask','hook'],
  build: ['arocs','build bible','section','fabricat','chassis','truck','victron','torsion','cab'],
  legal: ['apa','axel','guy sharron','debt line','jmw','liquidation','creditor'],
  finance: ['cash','bills','invoice','revenue','costs','rent','break-even','£','gbp'],
  rbtr: ['rbtr','departure','expedition','youtube','instagram','audience'],
  personal: ['nate','sarah','hudson','benson','peanut','mood','reflection','built dad','family'],
};
function routeModel(message, historyCount, mode) {
  if (mode === 'deep') return { model: MODEL_HEAVY, reason: 'manual deep' };
  if (mode === 'fast') return { model: MODEL_DEFAULT, reason: 'manual fast' };
  const text = String(message || '').toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 40) return { model: MODEL_HEAVY, reason: 'long message (>40w)' };
  for (const kw of HEAVY_KEYWORDS) {
    if (text.includes(kw)) return { model: MODEL_HEAVY, reason: `keyword "${kw}"` };
  }
  const domainsHit = Object.entries(DOMAIN_KEYWORDS).filter(([_, kws]) => kws.some(k => text.includes(k))).map(([d]) => d);
  if (domainsHit.length >= 2) return { model: MODEL_HEAVY, reason: `multi-domain: ${domainsHit.join('+')}` };
  if (/\b(email|message|post|letter|draft|write)\b/.test(text) && /\b(to|for)\b/.test(text)) return { model: MODEL_HEAVY, reason: 'outbound writing request' };
  return { model: MODEL_DEFAULT, reason: 'default → sonnet' };
}

// ─── B.3 · Live CURRENT STATE block ─────────────────────────────────────────
async function buildLiveState(origin) {
  try {
    const r = await fetch(`${origin}/api/briefing-data`);
    if (!r.ok) return '';
    const j = await r.json();
    const d = j.data || {};
    const L = [];
    L.push(`CURRENT STATE (live, ${new Date().toISOString()} Europe/London)`);
    L.push('================================================');
    if (d.days_to_departure != null) L.push(`DEPARTURE: ${d.days_to_departure} days (1 Jul 2027)`);
    if (d.date) L.push(`TODAY: ${d.date}`);
    if (d.built_dad_day != null) L.push(`BUILT DAD: Day ${d.built_dad_day} of 56`);
    const w = d.weather_today;
    if (w && w.now_temp != null) L.push(`WEATHER: Rotherham ${Math.round(w.now_temp)}°, high ${Math.round(w.high)}/low ${Math.round(w.low)}`);
    L.push('');
    // PSNM CASH — business entity, stands alone. Deadline-driven status.
    const mayRent = new Date('2026-05-08T00:00:00Z');
    const daysToMayRent = Math.max(0, Math.ceil((mayRent - Date.now()) / 86400000));
    L.push('PSNM CASH (business account — stands alone, never subsidised by personal)');
    if (d.psnm_pallets_current != null) L.push(`  pallets signed: ${d.psnm_pallets_current}/827 break-even (gap ${d.psnm_pallets_to_breakeven})`);
    if (Array.isArray(d.psnm_new_enquiries_24h)) L.push(`  enquiries 24h: ${d.psnm_new_enquiries_24h.length}`);
    if (Array.isArray(d.psnm_urgent_enquiries) && d.psnm_urgent_enquiries.length) L.push(`  urgent: ${d.psnm_urgent_enquiries.map(e=>e.company).join(', ')}`);
    L.push(`  May rent due: £3,000 on 8 May (${daysToMayRent} days)`);
    L.push(`  target: PSNM business account > £3,000 by 5 May`);
    L.push(`  STATUS: ${d.psnm_pallets_current > 0 ? 'ACTIVE' : 'CRITICAL — zero pipeline, 17-day sprint'}`);
    L.push('');
    L.push('PERSONAL (Ben — separate from PSNM)');
    L.push('  cash: £6 (updated manually via Ben)');
    L.push('  liquidity path: T6.1 + trailer sale → RBTR build fund (NOT personal), Van completion payment → personal, Coffee Brothers bike return → closes Gate 2 only');
    L.push('  STATUS: tight but not emergency');
    L.push('');
    L.push('RBTR BUILD FUND (separate from PSNM + personal)');
    L.push('  sources: sponsors, Sarah equity release (£105k target April 2027), T6.1 sale proceeds');
    L.push('  STATUS: paused, waiting for funding events — not in crisis');
    L.push('');
    L.push('SPONSORS');
    if (Array.isArray(d.sponsor_hot_signals) && d.sponsor_hot_signals.length) L.push(`  hot signals 24h: ${d.sponsor_hot_signals.map(s=>s.sponsor).join(', ')}`);
    if (Array.isArray(d.sponsor_replies_pending) && d.sponsor_replies_pending.length) L.push(`  replies pending: ${d.sponsor_replies_pending.length}`);
    if (Array.isArray(d.sponsor_touches_queued_today) && d.sponsor_touches_queued_today.length) L.push(`  touches queued today: ${d.sponsor_touches_queued_today.length}`);
    if (Array.isArray(d.sponsor_approach_due_this_week) && d.sponsor_approach_due_this_week.length) L.push(`  approach due this week: ${d.sponsor_approach_due_this_week.length}`);
    L.push('');
    L.push('BUILD');
    if (Array.isArray(d.build_sections_in_progress) && d.build_sections_in_progress.length) L.push(`  in progress: ${d.build_sections_in_progress.map(s=>s.name).join(', ')}`);
    if (Array.isArray(d.build_section_starting_this_week) && d.build_section_starting_this_week.length) L.push(`  starting this week: ${d.build_section_starting_this_week.map(s=>s.name).join(', ')}`);
    L.push('');
    L.push('AUDIENCE');
    if (d.audience_total != null) L.push(`  total: ${d.audience_total}, 24h growth: ${d.audience_24h_growth ?? '?'}`);
    if (d.resurrection_day_number != null) L.push(`  resurrection day: ${d.resurrection_day_number}/30`);
    L.push('');
    L.push('LEGAL / STRUCTURAL');
    if (d.apa_signed != null) L.push(`  APA: ${d.apa_signed ? 'signed' : 'draft not signed'}`);
    if (d.axel_brothers_status) L.push(`  Axel Brothers: ${d.axel_brothers_status}`);
    if (d.axel_winding_up_type) L.push(`  winding up type: ${d.axel_winding_up_type}`);
    if (d.debt_line_consultation_booked != null) L.push(`  Debt Line: ${d.debt_line_consultation_booked ? 'booked' : 'not booked'}`);
    if (d.guy_sharron_stage != null) L.push(`  Guy Sharron: stage ${d.guy_sharron_stage}/5`);
    L.push('');
    L.push('YESTERDAY');
    if (d.yesterday_mood != null) L.push(`  mood: ${d.yesterday_mood}/5`);
    if (d.yesterday_reflection) L.push(`  reflection: "${d.yesterday_reflection}"`);
    if (d.yesterday_priority_set) L.push(`  priority set: "${d.yesterday_priority_set}"`);
    return L.join('\n');
  } catch (e) { return ''; }
}

// ─── B.5 · Long-term memory load ────────────────────────────────────────────
async function loadMemories() {
  const rows = await sbSelect('rocko_memories', 'active=eq.true&order=last_referenced_at.desc.nullslast,created_at.desc&limit=50');
  if (!Array.isArray(rows) || !rows.length) return '';
  const byCat = {};
  rows.forEach(r => { const c = r.category || 'fact'; (byCat[c] = byCat[c] || []).push(r.content); });
  const order = ['rule','preference','person','ongoing','decision','fact'];
  const lines = ['LONG-TERM MEMORY (Ben-confirmed)', '==============================='];
  for (const c of order) {
    if (!byCat[c] || !byCat[c].length) continue;
    lines.push(`[${c}]`);
    byCat[c].forEach(x => lines.push(`- ${x}`));
  }
  return lines.join('\n');
}

// ─── B.2 · Conversation persistence ─────────────────────────────────────────
async function loadRecentHistory(sessionId, limit = 30) {
  if (!sessionId) return [];
  const rows = await sbSelect('jarvis_conversations',
    `session_id=eq.${sessionId}&order=created_at.desc&limit=${limit}&select=role,content,created_at`);
  if (!Array.isArray(rows)) return [];
  return rows.reverse()
    .filter(r => (r.role === 'user' || r.role === 'assistant') && r.content)
    .map(r => ({ role: r.role, content: String(r.content) }));
}
async function writeTurn(row) { await sbInsert('jarvis_conversations', row); }

// ─── B.4 · Eight tools (Anthropic tool-use definitions) ─────────────────────
const TOOL_DEFS = [
  { name: 'query_supabase', description: 'Read rows from any authorised RBTR table. Use for anything data-backed.', input_schema: { type: 'object', properties: { table: { type: 'string' }, filters: { type: 'object' }, order_by: { type: 'string' }, limit: { type: 'integer', default: 20 } }, required: ['table'] } },
  { name: 'write_supabase', description: 'Insert/update a row. Ben must confirm with yes/confirm/do it/proceed/go/save in the same turn or this will be rejected.', input_schema: { type: 'object', properties: { table: { type: 'string' }, action: { type: 'string', enum: ['insert','update','upsert'] }, row: { type: 'object' }, match: { type: 'object' } }, required: ['table','action'] } },
  { name: 'search_past_conversations', description: 'Keyword search across prior ROCKO conversations.', input_schema: { type: 'object', properties: { query: { type: 'string' }, days_back: { type: 'integer', default: 90 }, limit: { type: 'integer', default: 10 } }, required: ['query'] } },
  { name: 'generate_voice', description: 'Render text to audio via ElevenLabs, returns a playable URL.', input_schema: { type: 'object', properties: { text: { type: 'string' }, voice_id: { type: 'string' } }, required: ['text'] } },
  { name: 'trigger_morning_brief', description: "Regenerate today's morning brief. No params.", input_schema: { type: 'object', properties: {} } },
  { name: 'search_sponsors', description: 'Filtered sponsor_targets lookup with rich criteria.', input_schema: { type: 'object', properties: { tier: { type: 'integer' }, category: { type: 'string' }, status: { type: 'string' }, approach_month: { type: 'string' }, not_contacted_in_days: { type: 'integer' }, ask_gbp_min: { type: 'integer' }, ask_gbp_max: { type: 'integer' } } } },
  { name: 'draft_message', description: 'Draft 2-4 labelled message variants for a specific recipient and channel.', input_schema: { type: 'object', properties: { recipient: { type: 'string' }, channel: { type: 'string', enum: ['email','whatsapp','sms','linkedin','letter','slack'] }, context: { type: 'string' }, desired_outcome: { type: 'string' }, variant_count: { type: 'integer', default: 2, maximum: 4 } }, required: ['recipient','channel','desired_outcome'] } },
  { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
];

function userConfirmedWrite(lastUserMessage) {
  if (!lastUserMessage) return false;
  return /\b(yes|confirm|do it|proceed|go|save)\b/i.test(String(lastUserMessage));
}

async function runTool(tool, input, ctx) {
  try {
    switch (tool) {
      case 'query_supabase': {
        const q = [];
        if (input.filters) for (const [k,v] of Object.entries(input.filters)) q.push(`${k}=eq.${encodeURIComponent(v)}`);
        if (input.order_by) q.push(`order=${input.order_by}`);
        q.push(`limit=${input.limit || 20}`);
        const rows = await sbSelect(input.table, q.join('&'));
        return { ok: Array.isArray(rows), rows: rows || [] };
      }
      case 'write_supabase': {
        if (!userConfirmedWrite(ctx.lastUserMessage)) {
          return { ok: false, error: 'awaiting_confirmation', hint: 'Ben must say yes/confirm/do it/proceed/go/save in the same turn.' };
        }
        if (input.action === 'insert') {
          const r = await sbInsert(input.table, input.row);
          return { ok: !(r && r.error), result: r };
        }
        if (input.action === 'update' || input.action === 'upsert') {
          const r = await sbUpdate(input.table, input.match || {}, input.row);
          return { ok: !(r && r.error), result: r };
        }
        return { ok: false, error: 'unsupported action' };
      }
      case 'search_past_conversations': {
        const days = input.days_back || 90;
        const limit = input.limit || 10;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const rows = await sbSelect('jarvis_conversations',
          `created_at=gte.${since}&content=ilike.*${encodeURIComponent(input.query)}*&order=created_at.desc&limit=${limit}&select=session_id,role,content,created_at`);
        return { ok: true, matches: rows || [] };
      }
      case 'generate_voice': {
        const r = await fetch(`${ctx.origin}/api/tts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input.text, voice_id: input.voice_id }),
        });
        if (!r.ok) return { ok: false, status: r.status };
        // /api/tts streams back audio; we summarise for the model.
        return { ok: true, note: 'audio rendered — surface to the user as generate_voice output' };
      }
      case 'trigger_morning_brief': {
        const r = await fetch(`${ctx.origin}/api/morning-brief?force=1`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extras: {} }),
        });
        const j = await r.json().catch(() => ({}));
        return { ok: r.ok, audio_url: j.audio_url, word_count: j.validation?.word_count, error: j.error };
      }
      case 'search_sponsors': {
        const q = [];
        if (input.tier) q.push(`tier=eq.${input.tier}`);
        if (input.category) q.push(`category=eq.${encodeURIComponent(input.category)}`);
        if (input.status) q.push(`status=eq.${encodeURIComponent(input.status)}`);
        if (input.approach_month) q.push(`approach_month=eq.${encodeURIComponent(input.approach_month)}`);
        if (input.ask_gbp_min) q.push(`ask_gbp=gte.${input.ask_gbp_min}`);
        if (input.ask_gbp_max) q.push(`ask_gbp=lte.${input.ask_gbp_max}`);
        if (input.not_contacted_in_days) {
          const cutoff = new Date(Date.now() - input.not_contacted_in_days * 86400000).toISOString();
          q.push(`or=(last_contact_at.is.null,last_contact_at.lt.${cutoff})`);
        }
        q.push('order=tier.asc,ask_gbp.desc&limit=50');
        const rows = await sbSelect('sponsor_targets', q.join('&'));
        return { ok: Array.isArray(rows), matches: rows || [] };
      }
      case 'draft_message': {
        // Let the model do the drafting — this tool just returns the structured ask back,
        // the model then produces the variants in the final reply. Useful as a commitment gate.
        return { ok: true, recipient: input.recipient, channel: input.channel, desired_outcome: input.desired_outcome, variant_count: Math.min(4, Math.max(2, input.variant_count || 2)) };
      }
      default: return { ok: false, error: 'unknown tool' };
    }
  } catch (e) { return { ok: false, error: e.message }; }
}

// ─── Call Anthropic, handle tool-use loop ───────────────────────────────────
async function callAnthropic(model, system, messages, extras = {}) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'web-search-2025-03-05' },
    body: JSON.stringify({ model, max_tokens: 2048, system, messages, tools: TOOL_DEFS, ...extras }),
  });
  return r;
}

async function run(model, system, initialMessages, ctx) {
  let messages = [...initialMessages];
  const toolsCalled = [];
  let usageAgg = { input_tokens: 0, output_tokens: 0 };
  for (let iteration = 0; iteration < 6; iteration++) {
    let r = await callAnthropic(model, system, messages);
    if (!r.ok && (r.status === 404 || r.status === 400) && model === MODEL_HEAVY && model !== MODEL_HEAVY_FALLBACK) {
      // opus-4-7 not accessible on this key — try 4-6 once
      model = MODEL_HEAVY_FALLBACK;
      r = await callAnthropic(model, system, messages);
    }
    if (!r.ok) { const errTxt = await r.text(); throw new Error(`anthropic ${r.status}: ${errTxt.slice(0, 240)}`); }
    const data = await r.json();
    usageAgg.input_tokens += data.usage?.input_tokens || 0;
    usageAgg.output_tokens += data.usage?.output_tokens || 0;
    const stop = data.stop_reason;
    const blocks = data.content || [];
    if (stop === 'tool_use') {
      const toolUses = blocks.filter(b => b.type === 'tool_use');
      const toolResults = [];
      for (const tu of toolUses) {
        if (tu.name === 'web_search') { toolsCalled.push('web_search'); continue; } // handled server-side
        toolsCalled.push(tu.name);
        const result = await runTool(tu.name, tu.input || {}, ctx);
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) });
      }
      messages = messages.concat([{ role: 'assistant', content: blocks }, { role: 'user', content: toolResults }]);
      continue;
    }
    const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return { text, model, stop_reason: stop, usage: usageAgg, tools_called: toolsCalled };
  }
  throw new Error('tool-use loop limit (6) hit');
}

// ─── Handler ────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  if (!ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not set', reply: "Backend's not wired yet." });
    return;
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  let { message, history = [], context = {}, mode = 'auto', session_id, elevated } = payload;
  if (!message || typeof message !== 'string') { res.status(400).json({ error: 'message required' }); return; }
  // session_id column is UUID-typed. Accept any client value but coerce to a deterministic UUID if non-UUID.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!session_id || !UUID_RE.test(String(session_id))) {
    if (session_id) {
      // Deterministic UUID v5-ish: hash the supplied string so retries cluster
      const h = crypto.createHash('sha1').update(String(session_id)).digest('hex');
      session_id = `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
    } else {
      session_id = crypto.randomUUID();
    }
  }

  const origin = `https://${req.headers?.host || 'rbtr-jarvis.vercel.app'}`;
  const isSessionOpen = message === '__session_open__';

  // Route model
  const { model: chosenModel, reason: routeReason } = routeModel(isSessionOpen ? 'proactive briefing' : message, history.length, mode);

  // Build system prompt: Core + memory + live state
  const [memoryBlock, liveState, persistedHistory] = await Promise.all([
    loadMemories(),
    buildLiveState(origin),
    loadRecentHistory(session_id, 30),
  ]);
  const system = [ROCKO_CORE_PROMPT, memoryBlock, liveState].filter(Boolean).join('\n\n');

  // Build messages: persisted history + client-provided history (dedup by role+content adjacent) + current
  const mergedHistory = [...persistedHistory, ...history].reduce((acc, m) => {
    const last = acc[acc.length - 1];
    if (!last || last.role !== m.role || last.content !== m.content) acc.push({ role: m.role, content: String(m.content) });
    return acc;
  }, []);

  const userMessage = isSessionOpen
    ? 'This is a session-open trigger. Per your PROACTIVE INTELLIGENCE rules, check CURRENT STATE for anything material, surface the top 3 items, or reply with the single-line "Nothing flagging. What do you need?" No greeting. No preamble.'
    : message;

  const initialMessages = [...mergedHistory, { role: 'user', content: userMessage }];

  try {
    const { text, model: usedModel, usage, tools_called } = await run(chosenModel, system, initialMessages, {
      origin, lastUserMessage: message, sessionId: session_id, elevated: !!elevated,
    });

    // Banned-word / prohibited-name scan — log, do not strip (model self-polices per prompt)
    const violations = scanForViolations(text);

    // Persist this turn (user + assistant) to jarvis_conversations
    await Promise.all([
      isSessionOpen ? null : writeTurn({ session_id, role: 'user', content: message, model_used: null, tokens_in: null, tokens_out: null }),
      writeTurn({ session_id, role: 'assistant', content: text, model_used: usedModel, tokens_in: usage.input_tokens, tokens_out: usage.output_tokens, tools_called }),
    ].filter(Boolean));

    res.status(200).json({
      reply: text,
      model: usedModel,
      model_reason: routeReason,
      mode,
      session_id,
      usage,
      tools_called,
      violations,
    });
  } catch (err) {
    console.error('[rocko]', err);
    res.status(500).json({ error: err.message, reply: 'Network glitch at my end. Give it another go.' });
  }
};
