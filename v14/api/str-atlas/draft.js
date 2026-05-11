'use strict';

// ── STR ATLAS · Drafter ───────────────────────────────────────────────────────
// Generates outreach email drafts for The Forge, Blacker Hill B2B prospects.
// Analogous to _drafter_v2_2.js but for STR venue-hire outreach.
//
// Voice:  Sarah Jane Jones (host/operator). Under 150 words. One CTA.
// Model:  claude-sonnet-4-6 with prompt caching on the system prompt.
// Tables: str_atlas_prospects (source) → str_atlas_drafts (output)
//
// Usage:
//   POST /api/str-atlas/draft
//   Body: { prospect_id: "<uuid>", touch_number?: 1 }
//   Auth: x-rbtr-auth header

const fs = require('fs');
const path = require('path');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const RBTR_TOKEN    = process.env.RBTR_AUTH_TOKEN;
const MODEL         = 'claude-sonnet-4-6';

const SYSTEM_PROMPT_PATH = path.join(__dirname, '..', 'docs', '_str_atlas_system_prompt.md');
let _cachedPrompt = null;

function getSystemPrompt() {
  if (!_cachedPrompt) {
    try { _cachedPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8'); }
    catch { _cachedPrompt = ''; }
  }
  return _cachedPrompt;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

function sbHeaders(extra = {}) {
  const h = {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return { ...h, ...extra };
}

async function sbGet(table, qs = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, { headers: sbHeaders() });
    if (!r.ok) return null;
    return r.json();
  } catch { return null; }
}

async function sbInsert(table, row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify(row),
    });
    if (!r.ok) return { error: await r.text() };
    return r.json();
  } catch (e) { return { error: e.message }; }
}

async function sbUpdate(table, match, patch) {
  const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify(patch),
    });
    if (!r.ok) return { error: await r.text() };
    return r.json();
  } catch (e) { return { error: e.message }; }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function checkAuth(req) {
  const h = req.headers?.['x-rbtr-auth'];
  if (!h || !RBTR_TOKEN) return false;
  if (h.length !== RBTR_TOKEN.length) return false;
  return require('crypto').timingSafeEqual(Buffer.from(h), Buffer.from(RBTR_TOKEN));
}

// ── Claude call with prompt caching ──────────────────────────────────────────

async function callClaude(systemPrompt, userContent) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY not set');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Claude ${r.status}: ${err.slice(0, 300)}`);
  }

  const j = await r.json();
  const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

  // Parse JSON output from Claude
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude did not return JSON. Got: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]);
}

// ── Segment-specific enrichment block ────────────────────────────────────────

function buildProspectBlock(prospect, touchNumber, priorDraft) {
  const lines = [
    `## PROSPECT`,
    `Name: ${prospect.company_or_individual_name}`,
    `Segment: ${prospect.segment}`,
  ];

  if (prospect.contact_name) lines.push(`Contact: ${prospect.contact_name}`);
  if (prospect.instagram_handle) lines.push(`Instagram: ${prospect.instagram_handle}`);
  if (prospect.website_url) lines.push(`Website: ${prospect.website_url}`);
  if (prospect.typical_party_size) lines.push(`Typical party size: ${prospect.typical_party_size}`);
  if (prospect.notes) lines.push(`Background notes: ${prospect.notes}`);

  lines.push(`\n## TOUCH`);
  lines.push(`Touch number: ${touchNumber}`);

  if (touchNumber > 1 && priorDraft) {
    lines.push(`\n## PRIOR DRAFT (touch ${touchNumber - 1} — do not repeat, just reference)`);
    lines.push(`Subject was: ${priorDraft.subject}`);
    lines.push(`CTA was: ${priorDraft.cta_type || 'unknown'}`);
  }

  lines.push(`\n## TASK`);
  lines.push(`Write a ${touchNumber === 1 ? 'first-touch' : `follow-up (touch ${touchNumber})`} outreach for this prospect.`);
  lines.push(`Return the JSON format specified in the system prompt.`);
  lines.push(`Under 150 words. One CTA. British English. Sarah's voice.`);

  if (prospect.segment === 'wellness_operator') {
    lines.push(`\nHook: Lead with the circuit specifics — cold temperature, heat temperature, private access, equipment quality.`);
    if (prospect.notes && /pilates|yoga|facilitat/i.test(prospect.notes)) {
      lines.push(`Additional angle: Sarah is a Pilates instructor — mention as a facilitation option.`);
    }
  } else if (prospect.segment === 'fitness_team') {
    lines.push(`\nHook: Lead with sports recovery protocol. Contrast bathing. Exact temperatures. Proximity to their location.`);
  } else if (prospect.segment === 'content_creator') {
    lines.push(`\nHook: Lead with what they can photograph. Industrial steel aesthetic, ice bath contrast, outdoor kitchen, multiple looks.`);
    lines.push(`Mention day rate (£450–700). Keep it very short.`);
  } else if (prospect.segment === 'corporate_retreat') {
    lines.push(`\nHook: Wellness reset. No hotel interruptions. Private space. The ice bath as an optional "leadership through discomfort" moment.`);
  } else if (prospect.segment === 'wedding_planner') {
    lines.push(`\nHook: Intimate, exclusive, premium. Bridal party sleepover or pre-wedding wellness day. Not a party venue.`);
  } else if (prospect.segment === 'influencer') {
    lines.push(`\nHook: What they'll photograph first (ice bath + steam, outdoor kitchen at night, sauna haze). 50 words max for DMs.`);
  }

  return lines.join('\n');
}

// ── Validation ────────────────────────────────────────────────────────────────

const BANNED = [
  /leverage/i, /synergy/i, /partnership opportunity/i, /please do not hesitate/i,
  /I hope this (email |message )?finds you/i, /I wanted to reach out/i,
  /exciting opportunity/i, /world-class/i,
  /ben greenwood/i, /co-lab/i, /bankruptcy/i, /arocs/i, /psnm/i,
];

function validateDraft(draft) {
  const wordCount = draft.body.split(/\s+/).filter(Boolean).length;
  const bannedHit = BANNED.filter(re => re.test(draft.body + ' ' + draft.subject));
  const subjectLen = draft.subject.length;
  const passes = bannedHit.length === 0 && wordCount <= 160 && subjectLen <= 60;
  return {
    word_count: wordCount,
    subject_chars: subjectLen,
    banned_hits: bannedHit.map(r => r.toString()),
    passes,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  if (!checkAuth(req)) { res.status(401).json({ error: 'Unauthorised' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { prospect_id, touch_number = 1 } = body;

  if (!prospect_id) { res.status(400).json({ error: 'prospect_id required' }); return; }

  // Load prospect
  const prospects = await sbGet('str_atlas_prospects', `id=eq.${prospect_id}&limit=1`);
  if (!prospects || !prospects[0]) {
    res.status(404).json({ error: 'Prospect not found' });
    return;
  }
  const prospect = prospects[0];

  // Load prior draft if touch > 1
  let priorDraft = null;
  if (touch_number > 1) {
    const prior = await sbGet('str_atlas_drafts',
      `prospect_id=eq.${prospect_id}&touch_number=eq.${touch_number - 1}&order=created_at.desc&limit=1`);
    priorDraft = prior?.[0] || null;
  }

  try {
    const systemPrompt = getSystemPrompt();
    const userContent   = buildProspectBlock(prospect, touch_number, priorDraft);
    const draft         = await callClaude(systemPrompt, userContent);
    const validation    = validateDraft(draft);

    const channel = draft.channel || (
      prospect.instagram_handle && !prospect.contact_email ? 'instagram_dm' : 'email'
    );

    const row = {
      prospect_id,
      subject:      draft.subject,
      body:         draft.body,
      channel,
      touch_number,
      status:       validation.passes ? 'pending_review' : 'pending_review',
      sarah_approved: false,
      notes:        validation.passes ? null : `Validation warnings: ${JSON.stringify(validation)}`,
    };

    const saved = await sbInsert('str_atlas_drafts', row);

    // Update prospect contact_status to 'drafted' if still 'open'
    if (prospect.contact_status === 'open') {
      await sbUpdate('str_atlas_prospects', { id: prospect_id }, { contact_status: 'drafted' });
    }

    res.status(200).json({
      ok: true,
      draft_id: saved?.[0]?.id || null,
      subject: draft.subject,
      body: draft.body,
      channel,
      validation,
      cta_type: draft.cta_type,
    });

  } catch (err) {
    console.error('[str-atlas/draft] error', err);
    res.status(500).json({ error: err.message });
  }
};
