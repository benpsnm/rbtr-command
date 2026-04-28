// ═══════════════════════════════════════════════════════════════════════════
// Atlas v2 · PSNM survival engine · multi-action endpoint
//
// Actions:
//   POST /api/atlas?action=seed_day1        — populate today's queue from top targets
//   POST /api/atlas?action=complete_action  — mark action done + auto-schedule follow-up
//   POST /api/atlas?action=log_cash         — log PSNM/personal/RBTR balance
//   POST /api/atlas?action=send_email       — SendGrid (active when SENDGRID_API_KEY set)
//   POST /api/atlas?action=rank_targets     — DEFERRED (needs web_search budget approval)
//   GET  /api/atlas?action=queue            — return today's queue for UI render
//   GET  /api/atlas?action=scorecard        — pipeline + performance metrics
//
// Requires x-rbtr-auth header OR same-origin browser call (per supabase-proxy
// perimeter pattern).
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RBTR_AUTH_TOKEN = process.env.RBTR_AUTH_TOKEN;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'sales@palletstoragenearme.co.uk';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Ben @ Pallet Storage Near Me';
const calcQuote = require('./_quote_calc');

function sbHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) h['Authorization'] = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function sbSelect(table, query = '') {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, { headers: sbHeaders() });
  if (!r.ok) return null;
  return await r.json();
}
async function sbInsert(table, rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return await r.json();
}
async function sbUpdate(table, match, row) {
  const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method: 'PATCH',
    headers: sbHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) return { error: await r.text(), status: r.status };
  return await r.json();
}

function today() { return new Date().toISOString().slice(0, 10); }

// ── Auth perimeter (matches supabase-proxy pattern) ─────────────────────────
function checkAuth(req) {
  if (!RBTR_AUTH_TOKEN) return { ok: true };
  const supplied = req.headers?.['x-rbtr-auth'];
  const origin = req.headers?.origin || '';
  const referer = req.headers?.referer || '';
  const host = req.headers?.host || '';
  const isSameOrigin = host && (origin.includes(host) || referer.includes(host)) &&
    (host === 'rbtr-jarvis.vercel.app' || host.endsWith('.vercel.app') || host.startsWith('localhost'));
  if (supplied === RBTR_AUTH_TOKEN || isSameOrigin) return { ok: true };
  return { ok: false, error: 'x-rbtr-auth header missing or invalid' };
}

// ── seed_day1 · populate today's queue from top priority_score targets ─────
async function seedDay1(body) {
  // Skip if today already seeded
  const existing = await sbSelect('atlas_daily_actions', `action_date=eq.${today()}&limit=1`);
  if (Array.isArray(existing) && existing.length > 0) {
    return { ok: true, skipped: true, reason: 'already seeded for today', existing: existing.length };
  }

  // Pick top targets — prefer Dream 20, then top by priority_score, filter out rejected/signed/lost
  const top = await sbSelect('psnm_outreach_targets',
    `status=not.in.(rejected,signed,lost)` +
    `&order=is_dream20.desc.nullslast,priority_score.desc.nullslast,created_at.desc&limit=10` +
    `&select=id,company,email,phone,industry,city,is_dream20,priority_score,ranking_reason,decision_maker_name,decision_maker_role,current_touch_count`
  );

  if (!Array.isArray(top) || top.length === 0) {
    return { ok: false, error: 'no targets available to seed' };
  }

  // Pull the default script cues for tier
  const scriptsStd = await sbSelect('psnm_call_scripts', `script_type=eq.cold_call_first&tier=eq.standard&active=eq.true&limit=1`);
  const scriptsD20 = await sbSelect('psnm_call_scripts', `script_type=eq.cold_call_first&tier=eq.dream20&active=eq.true&limit=1`);
  const scriptStd = scriptsStd?.[0] || {};
  const scriptD20 = scriptsD20?.[0] || {};

  // Seed actions: one "make_call" per target (Day 1 is call-first — email layer deferred until Mailgun configured)
  const rows = top.map((t, idx) => {
    const isD20 = !!t.is_dream20;
    const script = isD20 ? scriptD20 : scriptStd;
    const contactName = t.decision_maker_name || t.company;
    return {
      action_date: today(),
      action_order: idx + 1,
      target_id: t.id,
      action_type: 'make_call',
      action_label: `Call ${contactName} — ${t.company}`,
      action_payload: {
        phone_number: t.phone || '(no number on file — find before calling)',
        contact_name: contactName,
        contact_role: t.decision_maker_role || null,
        company: t.company,
        industry: t.industry || null,
        city: t.city || null,
        tier: isD20 ? 'dream20' : 'standard',
        priority_score: t.priority_score,
        ranking_reason: t.ranking_reason || (isD20 ? 'Dream 20 prospect' : 'Top-ranked standard prospect'),
        call_window: '09:30–11:00 best',
        script_cues: script.script_cues || [],
        objection_handlers: script.objection_handlers || [],
        closing_question: script.closing_question || 'When are you free to pop over to Hellaby this week?',
        log_buttons: [
          'no_answer','voicemail','gatekeeper',
          'spoke_not_interested','spoke_interested',
          'site_visit_booked','quote_requested'
        ],
      },
      estimated_minutes: isD20 ? 10 : 7,
      priority_rank: idx + 1,
      status: 'pending',
    };
  });

  const inserted = await sbInsert('atlas_daily_actions', rows);
  if (inserted?.error) return { ok: false, error: 'insert failed', detail: inserted };
  return { ok: true, seeded: inserted.length, top_target: top[0].company };
}

// ── complete_action · mark done + auto-schedule follow-up ───────────────────
async function completeAction(body) {
  const { action_id, outcome, outcome_notes } = body || {};
  if (!action_id) return { ok: false, error: 'action_id required' };

  // Mark the action done
  const upd = await sbUpdate('atlas_daily_actions', { id: action_id }, {
    status: 'done',
    completed_at: new Date().toISOString(),
    outcome_notes: [outcome, outcome_notes].filter(Boolean).join(' — '),
  });
  if (upd?.error) return { ok: false, error: 'mark done failed', detail: upd };
  const row = Array.isArray(upd) ? upd[0] : null;
  if (!row) return { ok: false, error: 'update returned no row' };

  // Write to psnm_outreach_touches for trail
  if (row.target_id) {
    await sbInsert('psnm_outreach_touches', {
      target_id: row.target_id,
      touch_type: row.action_type === 'make_call' ? 'phone' : 'email',
      sent_at: new Date().toISOString(),
      outcome: outcome || 'logged',
      notes: outcome_notes || null,
    });
    // Increment target.current_touch_count + map outcome to next scheduled touch
    const target = (await sbSelect('psnm_outreach_targets', `id=eq.${row.target_id}&select=current_touch_count,hot_flag`))?.[0];
    const nextTouchPatch = { current_touch_count: (target?.current_touch_count || 0) + 1 };
    if (outcome === 'spoke_interested' || outcome === 'site_visit_booked' || outcome === 'quote_requested') {
      nextTouchPatch.hot_flag = true;
      nextTouchPatch.hot_flag_reason = outcome;
      nextTouchPatch.status = outcome === 'site_visit_booked' ? 'site_visit_booked'
        : outcome === 'quote_requested' ? 'quoted' : 'contacted';
    } else if (outcome === 'no_answer' || outcome === 'voicemail' || outcome === 'gatekeeper') {
      // next call attempt in 2-3 days
      const next = new Date(Date.now() + 2.5 * 86400000).toISOString();
      nextTouchPatch.next_touch_at = next;
    } else if (outcome === 'spoke_not_interested') {
      nextTouchPatch.status = 'lost';
    }
    await sbUpdate('psnm_outreach_targets', { id: row.target_id }, nextTouchPatch);
  }

  return { ok: true, action_id, outcome, target_id: row.target_id };
}

// ── log_cash · one of PSNM / personal / RBTR ────────────────────────────────
async function logCash(body) {
  const { entity, balance_gbp, note } = body || {};
  if (!['psnm', 'personal', 'rbtr'].includes(entity)) return { ok: false, error: 'entity must be psnm|personal|rbtr' };
  if (balance_gbp == null || isNaN(Number(balance_gbp))) return { ok: false, error: 'balance_gbp numeric required' };
  const table = entity === 'psnm' ? 'psnm_cash_log' : entity === 'personal' ? 'personal_cash_log' : 'rbtr_fund_log';
  const ins = await sbInsert(table, [{ balance_gbp: Number(balance_gbp), source: 'manual', note: note || null }]);
  if (ins?.error) return { ok: false, error: 'insert failed', detail: ins };
  return { ok: true, entity, balance_gbp: Number(balance_gbp), logged_at: ins[0]?.logged_at };
}

// ── rank_one_target · server-side Sonnet + web_search triage for a single row ─
// Sonnet used (not Opus) because Opus 4.7 has a 30k input tokens/min rate limit
// that makes bulk triage impractical. Sonnet quality is fine for "find phone + DM".
async function rankOneTarget(body) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const MODEL = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-5-20250929';
  const MODEL_FALLBACK = 'claude-sonnet-4-5-20250929';
  if (!ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
  const targetId = body?.target_id;
  if (!targetId) return { ok: false, error: 'target_id required' };
  const rows = await sbSelect('psnm_outreach_targets',
    `id=eq.${targetId}&select=id,company,industry,city,postcode,website,email,phone,estimated_pallet_need,notes`);
  if (!Array.isArray(rows) || !rows.length) return { ok: false, error: 'target not found' };
  const t = rows[0];

  const prompt = `You are researching a potential PSNM (Pallet Storage Near Me) customer.

PSNM is a pallet-storage warehouse at Unit 3C Denaby Way, Hellaby, Rotherham S66 8HR. 1,602 spaces, 24/7 access. Targeting local businesses within 20 miles who might need overflow pallet storage.

BUSINESS TO RESEARCH:
Company: ${t.company}
Industry: ${t.industry || 'unknown'}
City: ${t.city || 'unknown'}
Postcode: ${t.postcode || 'unknown'}
Website: ${t.website || 'unknown'}
Existing notes: ${t.notes || 'none'}

USE web_search to find:
- Main contact phone number (published on website or LinkedIn)
- Named decision maker (operations manager, logistics director, warehouse manager, or MD of small company) with role + LinkedIn URL if visible
- Recent growth signals (expansion, hiring, new contracts, seasonal overflow pressure)
- Whether company still trades

Then score 0-100 likelihood they sign a PSNM contract in next 30 days. Consider: distance from Hellaby S66 8HR (S Yorkshire/DN postcodes = strong positive), business type fit (3PL/distributor/manufacturer with stock/ecommerce fulfilment/builders merchant = high; pure retail, food, pharma, hazmat, temperature-sensitive = exclude with score 0), company size (20-200 employees = sweet spot), named DM present, overflow signals. Do NOT boost score based on pallet volume — all sizes are equally welcome at 1,602-pallet capacity. Score 0 if business handles food, pharmaceuticals, hazardous goods, or temperature-sensitive products.

Return ONLY this JSON, no preamble:
{
  "phone": "main office phone or null",
  "decision_maker_name": "full name or null",
  "decision_maker_role": "role title or null",
  "decision_maker_linkedin": "linkedin url or null",
  "quality_score": 0,
  "priority_score": 0,
  "ranking_reason": "one sentence why this score",
  "still_trading": true,
  "signals": ["recent signal 1", "signal 2"]
}

Score 90-100 = ideal fit + decision maker found + overflow signals. 70-89 = strong fit + named contact. 50-69 = probable fit, info thin. 30-49 = weaker fit or too far. <30 = reject candidate.`;

  async function callModel(model) {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      }),
    });
  }
  let r = await callModel(MODEL);
  if (!r.ok && (r.status === 404 || r.status === 400) && MODEL !== MODEL_FALLBACK) {
    r = await callModel(MODEL_FALLBACK);
  }
  if (!r.ok) { const tx = await r.text(); return { ok: false, error: `anthropic ${r.status}`, detail: tx.slice(0, 240) }; }
  const data = await r.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  let parsed = null;
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  } catch { /* fall through */ }
  if (!parsed) return { ok: false, error: 'json parse failed', sample: text.slice(0, 300) };

  const patch = {};
  if (parsed.phone) patch.phone = parsed.phone;
  if (parsed.decision_maker_name) patch.decision_maker_name = parsed.decision_maker_name;
  if (parsed.decision_maker_role) patch.decision_maker_role = parsed.decision_maker_role;
  if (parsed.decision_maker_linkedin) patch.decision_maker_linkedin = parsed.decision_maker_linkedin;
  if (typeof parsed.quality_score === 'number') patch.quality_score = parsed.quality_score;
  if (typeof parsed.priority_score === 'number') patch.priority_score = parsed.priority_score;
  if (parsed.ranking_reason) patch.ranking_reason = parsed.ranking_reason;
  patch.research_notes = { signals: parsed.signals || [], still_trading: parsed.still_trading !== false };
  if (parsed.still_trading === false || (typeof parsed.priority_score === 'number' && parsed.priority_score < 30)) {
    patch.status = 'rejected';
  }
  const upd = await sbUpdate('psnm_outreach_targets', { id: targetId }, patch);
  if (upd?.error) return { ok: false, error: 'patch failed', detail: upd };
  return {
    ok: true,
    target_id: targetId,
    company: t.company,
    priority_score: parsed.priority_score,
    phone: parsed.phone,
    decision_maker: parsed.decision_maker_name,
    usage: data.usage,
    rejected: patch.status === 'rejected',
  };
}

// ── send_email · SendGrid REST API (no npm dependency) ───────────────────────
async function sendEmail(body) {
  if (!SENDGRID_API_KEY) {
    return {
      ok: false,
      stub: true,
      error: 'SENDGRID_API_KEY not configured',
      hint: 'Set SENDGRID_API_KEY in Vercel env. See BEN_TODO.md for SendGrid setup steps.',
    };
  }
  const { to, subject, text, html, from, from_name } = body || {};
  if (!to || !subject || !(text || html)) return { ok: false, error: 'to + subject + text|html required' };
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: from || EMAIL_FROM, name: from_name || EMAIL_FROM_NAME },
    subject,
    content: [],
  };
  if (text) payload.content.push({ type: 'text/plain', value: text });
  if (html) payload.content.push({ type: 'text/html', value: html });
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const t = await r.text(); return { ok: false, error: 'sendgrid failed', status: r.status, detail: t.slice(0, 300) }; }
  return { ok: true, message_id: r.headers.get('X-Message-Id') };
}

// ── sendBookingConfirmation · customer email for quote widget bookings ────────
async function sendBookingConfirmation({ to, company, contact_name, pallets, duration_weeks, tierLabel, totalPeriod, enquiryId }) {
  return sendEmail({
    to,
    subject: `Your PSNM storage booking — ref ${enquiryId.slice(0, 8).toUpperCase()}`,
    html: `<p>Hi ${contact_name || 'there'},</p>
<p>Thanks for your booking request at <strong>Pallet Storage Near Me</strong>.</p>
<table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
  <tr><td style="padding:4px 12px 4px 0;color:#666">Company</td><td style="padding:4px 0"><strong>${company}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Pallets</td><td style="padding:4px 0">${pallets} (${tierLabel})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Duration</td><td style="padding:4px 0">${duration_weeks} weeks</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Estimated total</td><td style="padding:4px 0"><strong>£${totalPeriod.toFixed(2)}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Reference</td><td style="padding:4px 0"><code>${enquiryId.slice(0, 8).toUpperCase()}</code></td></tr>
</table>
<p>Ben will be in touch within one working day to confirm your start date and arrange access.</p>
<p>Questions? Call or WhatsApp: <a href="tel:+447506255033">07506 255033</a></p>
<p style="color:#666;font-size:12px">Pallet Storage Near Me · Unit 3C Hellaby Industrial Estate · Rotherham S66 8HR</p>`,
    text: `Hi ${contact_name || 'there'},\n\nThanks for your booking request at Pallet Storage Near Me.\n\nCompany: ${company}\nPallets: ${pallets} (${tierLabel})\nDuration: ${duration_weeks} weeks\nEstimated total: £${totalPeriod.toFixed(2)}\nReference: ${enquiryId.slice(0, 8).toUpperCase()}\n\nBen will be in touch within one working day.\n\nQuestions? 07506 255033\n\nPallet Storage Near Me · Unit 3C Hellaby Industrial Estate · Rotherham S66 8HR`,
  });
}

// ── queue · today's actions for UI render ───────────────────────────────────
async function getQueue() {
  const rows = await sbSelect('atlas_daily_actions',
    `action_date=eq.${today()}&order=priority_rank.asc&select=id,action_order,action_type,action_label,action_payload,estimated_minutes,priority_rank,status,completed_at,outcome_notes,target_id`);
  return { ok: true, queue: rows || [], count: (rows || []).length };
}

// ── scorecard · pipeline + weekly performance ───────────────────────────────
async function getScorecard() {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [touches, targets, psnmCash, quotes, customers] = await Promise.all([
    sbSelect('psnm_outreach_touches', `sent_at=gte.${weekAgo}&select=touch_type,outcome`),
    sbSelect('psnm_outreach_targets', 'select=status,is_dream20,hot_flag'),
    sbSelect('psnm_cash_log', 'select=balance_gbp,logged_at&order=logged_at.desc&limit=1'),
    sbSelect('psnm_quotes', 'status=neq.expired&select=total_gbp,status'),
    sbSelect('psnm_customers', 'status=eq.active&select=monthly_revenue_gbp'),
  ]);
  const touchCounts = (touches || []).reduce((acc, t) => {
    const k = t.touch_type || 'other'; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const statusCounts = (targets || []).reduce((acc, t) => {
    const k = t.status || 'cold'; acc[k] = (acc[k] || 0) + 1; return acc;
  }, {});
  const dream20Count = (targets || []).filter(t => t.is_dream20).length;
  const hotCount = (targets || []).filter(t => t.hot_flag).length;
  const quoteValue = (quotes || []).reduce((s, q) => s + (Number(q.total_gbp) || 0), 0);
  const mrr = (customers || []).reduce((s, c) => s + (Number(c.monthly_revenue_gbp) || 0), 0);
  const balance = psnmCash?.[0]?.balance_gbp ?? null;
  const MAY_RENT = 3000;
  const mayRentDate = new Date('2026-05-08T00:00:00Z');
  const daysToMayRent = Math.max(0, Math.ceil((mayRentDate - Date.now()) / 86400000));
  return {
    ok: true,
    cash_clock: {
      psnm_balance_gbp: balance,
      may_rent_gbp: MAY_RENT,
      gap_gbp: balance != null ? Math.max(0, MAY_RENT - Number(balance)) : null,
      days_to_may_rent: daysToMayRent,
    },
    week: { touches: touches?.length || 0, by_type: touchCounts },
    pipeline: { by_status: statusCounts, dream20: dream20Count, hot: hotCount },
    quotes_value_gbp: quoteValue,
    mrr_gbp: mrr,
    generated_at: new Date().toISOString(),
  };
}

// ── getOfferConfig · public pricing read ────────────────────────────────────
async function getOfferConfig() {
  const rows = await sbSelect('psnm_offer_config', 'active=eq.true&limit=1');
  if (!rows || !rows.length) return { ok: false, error: 'no active offer config' };
  return { ok: true, offer: rows[0].offer_json, version: rows[0].version };
}

// ── bookEnquiry · self-serve quote widget submission ─────────────────────────
// Uses psnm_enquiries (source='self_serve_quote') — no separate bookings table needed.
// Email confirmation stub: sends Telegram to Ben, logs email_sent:false until Mailgun configured.
async function bookEnquiry(body) {
  const { pallets, duration_weeks, in_per_year, out_per_year, company, contact_name, email, phone, goods_description, tc_self_insurance, tc_fire_separation } = body || {};
  if (!company || !email) return { ok: false, error: 'company and email required' };
  if (!tc_self_insurance || !tc_fire_separation) return { ok: false, error: 'both T&C acknowledgements required' };
  if (!pallets || pallets < 5) return { ok: false, error: 'minimum 5 pallets' };
  if (!duration_weeks || duration_weeks < 4) return { ok: false, error: 'minimum 4 weeks' };

  const cfgRows = await sbSelect('psnm_offer_config', 'active=eq.true&limit=1');
  const offer = cfgRows?.[0]?.offer_json || {};
  const tiers = offer.rate_tiers || [];
  const handlingIn = Number(offer.handling_in_rate) || 3.50;
  const handlingOut = Number(offer.handling_out_rate) || 3.50;
  const waiverAt = Number(offer.onboarding_waiver_threshold) || 50;
  const onboardingFee = Number(offer.onboarding_fee) || 50;

  let storageRate = tiers.length ? tiers[tiers.length - 1].rate_per_pallet_week : 3.95;
  let tierLabel = '';
  for (const t of tiers) {
    if (t.range_max === null || pallets <= t.range_max) { storageRate = Number(t.rate_per_pallet_week); tierLabel = t.label || ''; break; }
  }
  const frac = duration_weeks / 52;
  const inMoves = Math.ceil((in_per_year || 0) * frac);
  const outMoves = Math.ceil((out_per_year || 0) * frac);
  const storagePeriod = pallets * storageRate * duration_weeks;
  const handlingPeriod = (inMoves * handlingIn) + (outMoves * handlingOut);
  const onboarding = pallets >= waiverAt ? 0 : onboardingFee;
  const totalPeriod = storagePeriod + handlingPeriod + onboarding;
  const monthlyEstimate = (storagePeriod / duration_weeks) * 4.33;

  const enquiry = await sbInsert('psnm_enquiries', [{
    company, contact_name, contact_email: email, contact_phone: phone || null,
    source: 'self_serve_quote', pallets, duration_weeks,
    notes: JSON.stringify({ in_per_year, out_per_year, goods_description, tc_self_insurance: true, tc_fire_separation: true, storage_rate: storageRate, tier: tierLabel, handling_period: handlingPeriod, onboarding, total_period: totalPeriod, monthly_estimate: monthlyEstimate }),
    status: 'new', priority_score: 80,
  }]);
  if (enquiry?.error) return { ok: false, error: 'enquiry insert failed', detail: enquiry };
  const enquiryId = Array.isArray(enquiry) ? enquiry[0]?.id : enquiry?.id;

  const nameParts = (contact_name || '').trim().split(' ');
  await sbInsert('contacts', [{ first_name: nameParts[0] || null, last_name: nameParts.slice(1).join(' ') || null, company, emails: email ? [email] : [], phones: phone ? [phone] : [], entities: ['psnm'], relationship_type: 'prospect', notes: `Self-serve quote. ${pallets} pallets, ${duration_weeks} wks. ${goods_description||''}`.trim() }]).catch(() => null);

  let tgOk = false;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (process.env.TELEGRAM_BOT_TOKEN && chatId) {
    try {
      const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const msg = `🚨 <b>NEW BOOKING REQUEST</b>\n<b>${esc(company)}</b> — ${esc(contact_name)||'no name'}\n📧 ${esc(email)}${phone?' · 📞 '+esc(phone):''}\n📦 ${pallets} pallets · ${duration_weeks} wks · ${esc(tierLabel)}\n💷 Period: £${totalPeriod.toFixed(2)} · Monthly: £${monthlyEstimate.toFixed(2)}\nGoods: ${esc(goods_description)||'not specified'}\nStatus: pending_review`;
      const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chat_id:chatId, text:msg, parse_mode:'HTML' }) });
      tgOk = (await tg.json()).ok;
    } catch(e) {}
  }

  let emailOk = false, emailNote = 'SENDGRID_API_KEY not set — add to Vercel env (see BEN_TODO.md)';
  if (SENDGRID_API_KEY) {
    try {
      const er = await sendBookingConfirmation({ to: email, company, contact_name, pallets, duration_weeks, tierLabel, totalPeriod, enquiryId });
      emailOk = er.ok;
      if (!er.ok) emailNote = er.error || 'sendgrid error';
    } catch(e) { emailNote = 'sendgrid exception: ' + e.message; }
  }
  return { ok: true, enquiry_id: enquiryId, quote: { total_period: parseFloat(totalPeriod.toFixed(2)), monthly_estimate: parseFloat(monthlyEstimate.toFixed(2)), tier: tierLabel, storage_rate: storageRate, onboarding }, telegram_sent: tgOk, email_sent: emailOk, email_note: emailOk ? null : emailNote };
}

// ── Atlas v2 · generate_drafts ───────────────────────────────────────────────
// POST /api/atlas?action=generate_drafts
// Pulls top prospects, calls Anthropic for each, inserts psnm_atlas_drafts rows.
const fs = require('fs');
const path = require('path');

async function getAtlasConfig() {
  const rows = await sbSelect('psnm_atlas_config', 'id=eq.main&limit=1');
  return rows?.[0] || { daily_send_limit: 50, paused: false, tone_mix: 'balanced', framework_weights: {} };
}

async function generateDrafts(body) {
  const batchSize = Math.min(Number(body?.batch_size) || 5, 20);
  const prospectIds = body?.prospect_ids || null;

  const cfg = await getAtlasConfig();
  if (cfg.paused) return { ok: false, error: 'Atlas is paused — toggle in Settings to resume' };

  const offerRows = await sbSelect('psnm_offer_config', 'active=eq.true&limit=1');
  if (!offerRows?.length) return { ok: false, error: 'No active offer config' };
  const offer = offerRows[0].offer_json;

  const tiers = offer.rate_tiers || [];
  const rateSmall = tiers.find(t => t.range_min === 1)?.rate_per_pallet_week || 3.95;
  const rateMid   = tiers.find(t => t.range_min === 50)?.rate_per_pallet_week || 3.45;
  const rateBulk  = tiers.find(t => t.range_min === 150)?.rate_per_pallet_week || 2.95;

  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString();
  let prospectQuery;
  if (prospectIds?.length) {
    prospectQuery = `id=in.(${prospectIds.join(',')})&select=id,company,city,industry,priority_score,is_dream20,decision_maker_name,decision_maker_role,estimated_pallet_need,current_touch_count,status&limit=${batchSize}`;
  } else {
    prospectQuery = `select=id,company,city,industry,priority_score,is_dream20,decision_maker_name,decision_maker_role,estimated_pallet_need,current_touch_count,status&order=priority_score.desc&limit=${batchSize}&or=(last_touched_at.is.null,last_touched_at.lt.${cutoff})&status=not.eq.do_not_contact`;
  }

  const prospects = await sbSelect('psnm_outreach_targets', prospectQuery);
  if (!prospects?.length) return { ok: true, generated: 0, draft_ids: [], reason: 'No eligible prospects found' };

  const promptTemplate = (() => {
    try { return fs.readFileSync(path.join(__dirname, 'docs/_atlas_system_prompt.md'), 'utf8'); }
    catch { return null; }
  })();
  if (!promptTemplate) return { ok: false, error: '_atlas_system_prompt.md not found' };

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const draftIds = [];
  const errors = [];

  for (const p of prospects) {
    try {
      const firstName = (p.decision_maker_name || p.company || '').split(' ')[0];
      const prompt = promptTemplate
        .replace(/\{\{company\}\}/g, p.company || 'the company')
        .replace(/\{\{contact_name\}\}/g, p.decision_maker_name || 'the team')
        .replace(/\{\{contact_first_name\}\}/g, firstName)
        .replace(/\{\{industry\}\}/g, p.industry || 'manufacturing/distribution')
        .replace(/\{\{city\}\}/g, p.city || 'South Yorkshire')
        .replace(/\{\{estimated_pallet_need\}\}/g, p.estimated_pallet_need || '10–50')
        .replace(/\{\{priority_score\}\}/g, p.priority_score || 70)
        .replace(/\{\{dream_outcome\}\}/g, offer.dream_outcome || '')
        .replace(/\{\{perceived_likelihood\}\}/g, offer.perceived_likelihood || '')
        .replace(/\{\{time_effort\}\}/g, offer.time_effort || '')
        .replace(/\{\{risk_reversal\}\}/g, offer.risk_reversal || '')
        .replace(/\{\{rate_small\}\}/g, rateSmall)
        .replace(/\{\{rate_mid\}\}/g, rateMid)
        .replace(/\{\{rate_bulk\}\}/g, rateBulk)
        .replace(/\{\{headline\}\}/g, offer.headline || '')
        .replace(/\{\{touch_number\}\}/g, (p.current_touch_count || 0) + 1)
        .replace(/\{\{tone_mix\}\}/g, cfg.tone_mix || 'balanced');

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: prompt,
          messages: [{ role: 'user', content: `Generate a cold outreach email for ${p.company} (${p.industry || 'manufacturer/distributor'}) in ${p.city || 'South Yorkshire'}. Apply all six frameworks. Return only valid JSON as specified.` }],
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        errors.push({ prospect_id: p.id, company: p.company, error: `Anthropic ${aiRes.status}: ${errText.slice(0,200)}` });
        continue;
      }

      const aiJson = await aiRes.json();
      const rawContent = aiJson?.content?.[0]?.text || '';

      let parsed;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] || rawContent);
      } catch (e) {
        errors.push({ prospect_id: p.id, company: p.company, error: 'JSON parse failed: ' + rawContent.slice(0, 200) });
        continue;
      }

      if (!parsed.subject || !parsed.body) {
        errors.push({ prospect_id: p.id, company: p.company, error: 'Missing subject or body in AI response' });
        continue;
      }

      const touchNum = (p.current_touch_count || 0) + 1;
      const inserted = await sbInsert('psnm_atlas_drafts', [{
        prospect_id: p.id,
        touch_number: touchNum,
        subject: parsed.subject,
        body: parsed.body,
        framework_annotations: parsed.framework_annotations || [],
        confidence_score: parsed.confidence_score || null,
        status: 'pending_approval',
      }]);

      if (inserted?.error || !Array.isArray(inserted)) {
        errors.push({ prospect_id: p.id, company: p.company, error: 'DB insert failed: ' + JSON.stringify(inserted).slice(0,200) });
        continue;
      }

      draftIds.push({ id: inserted[0]?.id, company: p.company, subject: parsed.subject, confidence: parsed.confidence_score });
    } catch (e) {
      errors.push({ prospect_id: p.id, company: p.company || 'unknown', error: e.message });
    }
  }

  return {
    ok: true,
    generated: draftIds.length,
    draft_ids: draftIds,
    errors,
    batch_size: batchSize,
    prospects_queried: prospects.length,
  };
}

// ── Atlas v2 · dispatch_approved ─────────────────────────────────────────────
// POST /api/atlas?action=dispatch_approved
async function dispatchApproved(body) {
  const cfg = await getAtlasConfig();
  if (cfg.paused) return { ok: false, error: 'Atlas is paused — toggle in Settings to resume' };

  const approved = await sbSelect('psnm_atlas_drafts',
    'status=eq.approved&select=id,prospect_id,touch_number,subject,body&order=approved_at.asc&limit=50');
  if (!approved?.length) return { ok: true, sent: 0, failed: 0, message: 'No approved drafts to send' };

  const dailyLimit = cfg.daily_send_limit || 50;
  const toSend = approved.slice(0, dailyLimit);

  const sentCount = [], failedCount = [];

  for (const draft of toSend) {
    try {
      const prospect = await sbSelect('psnm_outreach_targets',
        `id=eq.${draft.prospect_id}&select=company,decision_maker_name,email&limit=1`);
      const p = prospect?.[0];
      if (!p?.email) {
        failedCount.push({ id: draft.id, error: 'No email on prospect record' });
        await sbUpdate('psnm_atlas_drafts', { id: draft.id }, { status: 'failed', send_result: { error: 'no_email', at: new Date().toISOString() } });
        continue;
      }

      let sendOk = false, sendResult = {};
      if (SENDGRID_API_KEY) {
        const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: p.email, name: p.decision_maker_name || p.company }] }],
            from: { email: EMAIL_FROM, name: EMAIL_FROM_NAME },
            subject: draft.subject,
            content: [{ type: 'text/plain', value: draft.body }],
          }),
        });
        sendOk = sgRes.status === 202;
        sendResult = { status: sgRes.status, at: new Date().toISOString() };
        if (!sendOk) sendResult.error = await sgRes.text().catch(() => 'unknown');
      } else {
        sendOk = false;
        sendResult = { error: 'SENDGRID_API_KEY not set', at: new Date().toISOString() };
      }

      const now = new Date().toISOString();
      if (sendOk) {
        await sbUpdate('psnm_atlas_drafts', { id: draft.id }, { status: 'sent', sent_at: now, send_result: sendResult });
        await sbInsert('psnm_outreach_touches', [{
          target_id: draft.prospect_id,
          channel: 'email',
          direction: 'outbound',
          touched_at: now,
          template: `atlas_v2_touch_${draft.touch_number}`,
          subject: draft.subject,
          body_excerpt: draft.body.slice(0, 200),
          outcome: 'sent',
          notes: `Atlas v2 Touch ${draft.touch_number}`,
        }]);
        await sbUpdate('psnm_outreach_targets', { id: draft.prospect_id }, {
          last_touched_at: now,
          current_touch_count: (await sbSelect('psnm_outreach_targets', `id=eq.${draft.prospect_id}&select=current_touch_count`))?.[0]?.current_touch_count + 1 || 1,
        });
        sentCount.push({ id: draft.id, company: p.company });
      } else {
        await sbUpdate('psnm_atlas_drafts', { id: draft.id }, { status: 'failed', send_result: sendResult });
        failedCount.push({ id: draft.id, company: p.company, error: sendResult.error });
      }
    } catch (e) {
      failedCount.push({ id: draft.id, error: e.message });
      await sbUpdate('psnm_atlas_drafts', { id: draft.id }, { status: 'failed', send_result: { error: e.message, at: new Date().toISOString() } }).catch(() => null);
    }
  }

  const queued = approved.length - toSend.length;
  return {
    ok: true,
    sent: sentCount.length,
    failed: failedCount.length,
    queued_for_tomorrow: queued,
    results: { sent: sentCount, failed: failedCount },
  };
}

// ── Atlas v2 · update_draft ─────────────────────────────────────────────────
// POST /api/atlas?action=update_draft  { id, status, subject, body, approved_by }
async function updateDraft(body) {
  const { id, status, subject, body: emailBody, approved_by } = body || {};
  if (!id) return { ok: false, error: 'id required' };
  const patch = {};
  if (status) patch.status = status;
  if (subject) patch.subject = subject;
  if (emailBody) patch.body = emailBody;
  if (status === 'approved') {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = approved_by || 'ben';
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_atlas_drafts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) return { ok: false, error: await r.text() };
  return { ok: true, updated: (await r.json())?.[0] };
}

// ── Atlas v2 · get_drafts ────────────────────────────────────────────────────
// GET /api/atlas?action=get_drafts&status=pending_approval
async function getDrafts(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const status = url.searchParams.get('status') || 'pending_approval';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const rows = await sbSelect('psnm_atlas_drafts',
    `status=eq.${status}&order=created_at.desc&limit=${limit}&select=id,prospect_id,touch_number,subject,body,framework_annotations,confidence_score,status,created_at,approved_at,sent_at`);
  const counts = await Promise.all(['pending_approval','approved','rejected','sent','failed'].map(async s => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_atlas_drafts?status=eq.${s}&select=id`, {
      headers: { ...sbHeaders(), Prefer: 'count=exact' },
      method: 'HEAD',
    });
    const cr = r.headers.get('content-range') || '';
    return [s, parseInt(cr.split('/')[1]) || 0];
  }));
  return { ok: true, drafts: rows || [], counts: Object.fromEntries(counts) };
}

// ── Atlas v2 · get_config / update_config ───────────────────────────────────
async function updateAtlasConfig(body) {
  const allowed = ['daily_send_limit','paused','tone_mix','territory_filter','service_excludes','framework_weights'];
  const patch = {};
  for (const k of allowed) if (body?.[k] !== undefined) patch[k] = body[k];
  patch.updated_at = new Date().toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_atlas_config?id=eq.main`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) return { ok: false, error: await r.text() };
  return { ok: true, config: (await r.json())?.[0] };
}

// ── social posts · manual trigger + Make.com webhook target ─────────────────
// GET  /api/atlas?action=social_due  — returns posts scheduled for today (status=scheduled)
// POST /api/atlas?action=social_post — marks a post as posted (Make.com calls this after posting)
// Make.com scenario: GET social_due → iterate rows → post to LinkedIn/IG/FB → POST social_post with id + post_url
async function getSocialDue() {
  const today = new Date().toISOString().split('T')[0];
  const rows = await sbSelect('psnm_social_posts',
    `scheduled_for=gte.${today}T00:00:00Z&scheduled_for=lte.${today}T23:59:59Z&status=eq.scheduled&order=scheduled_for.asc`);
  return { ok: true, posts: rows || [], count: rows ? rows.length : 0, date: today };
}

async function triggerSocialPost(body) {
  const { id, post_url, status, error_detail } = body || {};
  if (!id) return { ok: false, error: 'id required' };
  const newStatus = status || (post_url ? 'posted' : 'failed');
  const patch = { status: newStatus };
  if (post_url) patch.post_url = post_url;
  if (newStatus === 'posted') patch.posted_at = new Date().toISOString();
  if (error_detail) patch.error_detail = error_detail;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_social_posts?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!r.ok) { const t = await r.text(); return { ok: false, error: t.slice(0, 200) }; }
  const rows = await r.json();
  return { ok: true, updated: rows?.[0] || patch };
}

// ── Strategy Doc (absorbed from strategy-doc.js to stay within 12-fn limit) ─
const STRATEGY_DOC_MAP = {
  locked_plan:   path.join(__dirname, 'docs/PSNM_LOCKED_PLAN_v1.md'),
  atlas_v2:      path.join(__dirname, 'docs/ATLAS_V2_FRAMEWORK.md'),
  system_prompt: path.join(__dirname, 'docs/_atlas_system_prompt.md'),
};
async function getStrategyDoc(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const name = url.searchParams.get('name');
  if (!name || !STRATEGY_DOC_MAP[name]) return { ok: false, error: 'name must be one of: ' + Object.keys(STRATEGY_DOC_MAP).join(', ') };
  try {
    const content = fs.readFileSync(STRATEGY_DOC_MAP[name], 'utf8');
    return { ok: true, name, content };
  } catch (e) {
    return { ok: false, error: `Doc not found: ${name}`, detail: e.message };
  }
}

// ── enrich_email · find email for a named prospect via Claude + web_search ───
async function enrichEmail(body) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const MODEL = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-5-20250929';
  const MODEL_FALLBACK = 'claude-sonnet-4-5-20250929';
  if (!ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const targetId = body?.target_id;
  if (!targetId) return { ok: false, error: 'target_id required' };

  const rows = await sbSelect('psnm_outreach_targets',
    `id=eq.${targetId}&select=id,company,decision_maker_name,decision_maker_role,website,city,research_notes`);
  if (!Array.isArray(rows) || !rows.length) return { ok: false, error: 'target not found' };
  const t = rows[0];
  if (!t.decision_maker_name) return { ok: false, error: 'no DM name — cannot enrich email', skipped: true };

  const dmFirst = t.decision_maker_name.split(/\s+/)[0];
  const dmLast  = t.decision_maker_name.split(/\s+/).slice(1).join(' ');
  const domain  = t.website ? t.website.replace(/^https?:\/\//,'').replace(/\/.*/,'') : null;

  const prompt = `Find the business email address for ${t.decision_maker_name} (${t.decision_maker_role || 'senior manager'}) at ${t.company}, based in ${t.city || 'UK'}.${domain ? ` Company website: ${domain}` : ''}

Use web_search to:
1. Search "${t.decision_maker_name} ${t.company} email" and check LinkedIn, company website contact pages, business directories (Companies House, Kompass, Dun & Bradstreet), press releases, conference speaker lists.
2. If you find an email directly, report it as verified.
3. If you can't find ${t.decision_maker_name}'s email but find a pattern from another employee (e.g. another person at the company has firstname.lastname@${domain || 'company.com'}), apply the same pattern and report as inferred.
4. If you find no email and no pattern, say so.

Return ONLY this JSON, no preamble:
{
  "found": true|false,
  "email": "email@domain.com or null",
  "confidence": "verified"|"inferred"|"none",
  "source": "where you found it or how you inferred it",
  "email_pattern": "e.g. firstname.lastname@domain.com or null"
}`;

  async function callModel(model) {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }],
      }),
    });
  }

  let r = await callModel(MODEL);
  if (!r.ok && (r.status === 404 || r.status === 400) && MODEL !== MODEL_FALLBACK) {
    r = await callModel(MODEL_FALLBACK);
  }
  if (!r.ok) { const tx = await r.text(); return { ok: false, error: `anthropic ${r.status}`, detail: tx.slice(0, 240) }; }
  const data = await r.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  let parsed = null;
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  } catch { /* fall through */ }
  if (!parsed) return { ok: false, error: 'json parse failed', raw: text.slice(0, 300) };

  const existingNotes = t.research_notes || {};
  const patch = {
    research_notes: {
      ...existingNotes,
      email_enrichment: {
        attempted_at: new Date().toISOString(),
        confidence: parsed.confidence,
        source: parsed.source,
        email_pattern: parsed.email_pattern || null,
      },
    },
  };
  if (parsed.found && parsed.email && parsed.confidence !== 'none') {
    patch.email = parsed.email;
  }
  await sbUpdate('psnm_outreach_targets', { id: targetId }, patch);

  return {
    ok: true,
    target_id: targetId,
    company: t.company,
    dm: t.decision_maker_name,
    found: parsed.found,
    email: parsed.email,
    confidence: parsed.confidence,
    source: parsed.source,
  };
}

// ── WhichWarehouse inbound lead integration ──────────────────────────────────
// HTML-escape helper (shared with General's Brief in cron-morning-brief.js)
function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseWWEmail(subject, textBody) {
  const t = (textBody || '').replace(/\r\n/g, '\n');
  const extract = (...patterns) => {
    for (const p of patterns) { const m = t.match(p); if (m?.[1]) return m[1].trim(); }
    return null;
  };
  const emailMatch = t.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = t.match(/(\+?[\d][\d\s\-().]{8,15}\d)/);
  return {
    company:       extract(/company[:\s]+(.+)/i, /business[:\s]+(.+)/i, /organisation[:\s]+(.+)/i),
    contact_name:  extract(/contact(?:\s+name)?[:\s]+(.+)/i, /name[:\s]+(.+)/i),
    contact_email: extract(/e[- ]?mail[:\s]+(.+)/i) || emailMatch?.[1] || null,
    contact_phone: extract(/(?:phone|tel(?:ephone)?|mobile)[:\s]+(.+)/i) || phoneMatch?.[1] || null,
    pallet_count:  (() => { const m = t.match(/pallets?[^:\d]*:\s*(\d+)/i) || t.match(/(\d+)[^\S\n]+pallets?/i); return m ? parseInt(m[1]) : null; })(),
    location:      extract(/location[:\s]+(.+)/i, /postcode[:\s]+(.+)/i, /area[:\s]+(.+)/i, /city[:\s]+(.+)/i, /town[:\s]+(.+)/i),
    goods_type:    extract(/goods(?:\s+type)?[:\s]+(.+)/i, /product[s]?[:\s]+(.+)/i, /storage(?:\s+type)?[:\s]+(.+)/i, /items?[:\s]+(.+)/i),
    start_date:    extract(/start(?:\s+date)?[:\s]+(.+)/i, /required(?:\s+from)?[:\s]+(.+)/i, /needed(?:\s+from)?[:\s]+(.+)/i),
  };
}

// ── WAM format parser (WhichWarehouse Active Member digest emails) ────────────
// Detects & extracts structured WW lead fields from the WAM email format.
// WAM emails have "WW-XXXXX" reference and "whichwarehouse member" string.
function parseWAMEmail(subject, textBody) {
  const t = (textBody || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Flexible label extractor for "Label: value" or "Label\nvalue" formats
  const field = (...patterns) => {
    for (const pat of patterns) {
      const re = new RegExp(`${pat}[:\\s]+([^\\n]{1,300})`, 'i');
      const m = t.match(re);
      if (m?.[1]) return m[1].trim().replace(/^[:\s]+/, '');
    }
    return null;
  };

  // WW reference number
  const refMatch = t.match(/\b(WW-\d{4,6})\b/i);
  const ww_reference = refMatch?.[1]?.toUpperCase() || null;

  // Opportunity tier from "Opportunity: V.SML / Start-up / Storage / Oxfordshire"
  const oppRaw = field('Opportunity');
  const tierMatch = (oppRaw || '').match(/\b(V\.SML|V\.LRG|SML|MED|LRG)\b/i);
  const opportunity_tier = tierMatch?.[1]?.toUpperCase() || null;

  // Preferred location
  const preferred_location = field('Preferred warehouse [Ll]ocation', 'Location preference', 'Preferred location');

  // Volume / pallet count — handle "5 pallets minimum", "5-10 pallets", "around 5", "50 sqft"
  const volumeRaw = field('Volume in pallets[^:]*', 'Volume', 'Pallet[s]? [Rr]equir', 'Storage [Rr]equir');
  let pallet_count = null;
  let pallet_count_exact = true;
  if (volumeRaw) {
    // Range: take the lower bound
    const rangeM = volumeRaw.match(/(\d+)\s*[-–to]+\s*\d+\s*pallets?/i);
    const singleM = volumeRaw.match(/(?:around|approx|approximately|about|minimum|min|max|up\s+to|upto)?\s*(\d+)\s*pallets?/i)
      || volumeRaw.match(/(\d+)\s*pallets?/i);
    if (rangeM) {
      pallet_count = parseInt(rangeM[1]);
      pallet_count_exact = false;
    } else if (singleM) {
      pallet_count = parseInt(singleM[1]);
      pallet_count_exact = !/around|approx|approximately|about|minimum|min|max|up\s+to|upto/i.test(volumeRaw);
    }
  }

  // Product nature — canonical values
  const natureRaw = field('Nature of product', 'Product nature', 'Type of storage', 'Storage type') || '';
  const NATURES = ['hazardous', 'chilled', 'bonded', 'alcohol', 'ambient', 'other'];
  const product_nature = NATURES.find(n => natureRaw.toLowerCase().includes(n))
    || (natureRaw.split(/[,\/\s]/)[0] || '').toLowerCase().trim() || null;

  // Product type (free text description)
  const product_type = field('Product type', 'Product[s]?(?! nature| type is)', 'Goods type', 'Item[s]?');

  // Storage only vs fulfilment
  const logisticsRaw = (field('Logistics services[^:]*', 'Logistics') || '').toLowerCase();
  const storage_only = logisticsRaw === '' || /just\s+storage|storage\s+only/i.test(logisticsRaw);

  // Duration
  const durationRaw = field('Temporary or long.term', 'Duration', 'Contract length') || '';
  const duration_type = /long[- ]?term|permanent|ongoing|open[- ]?ended/i.test(durationRaw) ? 'long-term' : 'temporary';
  const duration_weeks_default = duration_type === 'long-term' ? 26 : 8;

  // Preferred start date
  const preferred_start_date = field('Preferred start date', 'Start date', 'Required from', 'When[^:]*required');

  // Brief overview — keep in full, this has the real intent
  const brief_overview = field('Brief overview[^:]*', 'Additional info[^:]*', 'Other detail[s]?[^:]*', 'Notes?[^:]*(from|for)?') || null;

  // Weight from "weight =4762.00kg" or "Weight: 4762 kg"
  const weightM = t.match(/weight\s*[=:]\s*([\d.]+)\s*kg/i);
  const pallet_weight_kg = weightM ? parseFloat(weightM[1]) : null;

  // Volume in m³ from "Volume 10.01 CM" (WW mislabels m³ as CM)
  const volM3 = t.match(/(?:volume|vol)\s+([\d.]+)\s*(?:CM|m[³3]|cbm|cubic)/i);
  const pallet_volume_m3 = volM3 ? parseFloat(volM3[1]) : null;

  // UK import port mentions
  const PORTS = ['Felixstowe', 'Southampton', 'Tilbury', 'Liverpool', 'Immingham', 'Hull', 'Grimsby', 'Bristol', 'Teesport'];
  const origin_port = PORTS.find(p => new RegExp(`\\b${p}\\b`, 'i').test(t)) || null;

  // Amazon / FBA mention
  const amazon_mention = /\b(?:fba|amazon|fulfil(?:ment)?\s+by\s+amazon|amazon\s+seller)\b/i.test(t);

  // Parse confidence + flags
  const parse_flags = [];
  if (!ww_reference)          parse_flags.push('no_ww_reference');
  if (!pallet_count)          parse_flags.push('pallet_count_missing');
  if (!pallet_count_exact)    parse_flags.push('pallet_count_approximate');
  if (!product_nature)        parse_flags.push('product_nature_missing');
  if (!preferred_location)    parse_flags.push('location_missing');
  if (!preferred_start_date)  parse_flags.push('start_date_missing');
  if (origin_port)            parse_flags.push(`port_detected:${origin_port}`);
  if (amazon_mention)         parse_flags.push('amazon_mention');

  let parse_confidence = 100;
  if (parse_flags.includes('no_ww_reference'))       parse_confidence -= 20;
  if (parse_flags.includes('pallet_count_missing'))  parse_confidence -= 25;
  if (parse_flags.includes('pallet_count_approximate')) parse_confidence -= 10;
  if (parse_flags.includes('product_nature_missing')) parse_confidence -= 15;
  if (parse_flags.includes('location_missing'))       parse_confidence -= 15;

  return {
    ww_reference, opportunity_tier, preferred_location,
    pallet_count, pallet_count_exact,
    product_nature, product_type,
    storage_only, duration_type, duration_weeks_default,
    preferred_start_date, brief_overview,
    pallet_weight_kg, pallet_volume_m3,
    origin_port, amazon_mention,
    parse_confidence, parse_flags,
  };
}

// Distance heuristic — keywords → rough proximity to Hellaby S66 8HR
function isDistantLocation(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  const LOCAL = ['yorkshire', 'sheffield', 'rotherham', 'barnsley', 'doncaster', 'hull',
    'wakefield', 'leeds', 'bradford', 'huddersfield', 'lincoln', 'nottingham', 'derby',
    'leicester', 'mansfield', 'worksop', 'chesterfield', 'scunthorpe', 'grimsby',
    'gainsborough', 'pontefract', 'castleford', 'harrogate', 'goole', 'humber',
    's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13', 'dn', 'ng', 'le', 'de'];
  const DISTANT = ['london', 'oxfordshire', 'oxford', 'cambridge', 'norfolk', 'suffolk',
    'essex', 'kent', 'sussex', 'surrey', 'hampshire', 'bristol', 'wales', 'cardiff',
    'scotland', 'edinburgh', 'glasgow', 'manchester', 'liverpool', 'birmingham',
    'coventry', 'brighton', 'exeter', 'cornwall', 'devon', 'somerset', 'dorset',
    'wiltshire', 'berkshire', 'hertfordshire', 'buckinghamshire', 'berkshire',
    'midlands', 'north west', 'south west', 'south east', 'east anglia'];
  if (DISTANT.some(k => loc.includes(k))) return true;
  if (LOCAL.some(k => loc.includes(k))) return false;
  return false; // unknown — don't assume distant
}

// POST /api/atlas?action=inbound_email — SendGrid Inbound Parse webhook target.
// Auth: SENDGRID_INBOUND_SECRET query param (bypasses x-rbtr-auth since SG has no custom headers).
async function inboundEmail(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const secret = process.env.SENDGRID_INBOUND_SECRET;
  if (secret && url.searchParams.get('secret') !== secret) return { ok: false, error: 'invalid webhook secret' };

  const body = req.body || {};
  const from = String(body.from || '');
  const subject = String(body.subject || '').slice(0, 500);
  const rawText = String(body.text || '').replace(/<[^>]+>/g, ' ');
  const rawHtml = String(body.html || '');
  const text = rawText || rawHtml.replace(/<[^>]+>/g, ' ');

  // Detect WAM (WhichWarehouse Active Member) format
  const isWAM = /\bWW-\d{4,}/i.test(text) && /whichwarehouse\s+member/i.test(text);

  if (isWAM) {
    return inboundWAM({ from, subject, text });
  }

  // ── Direct enquiry (existing WhichWarehouse forensics / other inbound) ──
  const parsed = parseWWEmail(subject, text);

  const source = /whichwarehouse/i.test(from) ? 'whichwarehouse'
    : /storageseek|storagenet|easystore/i.test(from) ? 'storage_portal'
    : 'email_inbound';

  const row = {
    source,
    company:          parsed.company,
    contact_name:     parsed.contact_name,
    contact_email:    parsed.contact_email || (from.match(/<([^>]+)>/)?.[1] || from.split(/\s/)[0] || null),
    contact_phone:    parsed.contact_phone,
    pallet_count:     parsed.pallet_count,
    location:         parsed.location,
    goods_type:       parsed.goods_type,
    start_date:       parsed.start_date,
    notes:            text.slice(0, 2000),
    raw_subject:      subject,
    raw_body:         text.slice(0, 5000),
    status:           'new',
  };

  const inserted = await sbInsert('psnm_ww_leads', [row]);
  const leadId = inserted?.[0]?.id;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  let telegramOk = false;
  if (token && chatId) {
    const lines = [
      `🔔 <b>NEW ${source === 'whichwarehouse' ? 'WW' : 'INBOUND'} LEAD</b>`,
      parsed.company      ? `<b>${escHtml(parsed.company)}</b>` : '(company not parsed)',
      parsed.contact_name ? `Contact: ${escHtml(parsed.contact_name)}` : null,
      parsed.pallet_count ? `Pallets: <b>${parsed.pallet_count}</b>` : null,
      parsed.location     ? `Location: ${escHtml(parsed.location)}` : null,
      parsed.goods_type   ? `Goods: ${escHtml(parsed.goods_type)}` : null,
      parsed.start_date   ? `Start: ${escHtml(parsed.start_date)}` : null,
      ``,
      `📧 Subject: ${escHtml(subject.slice(0, 80))}`,
      ``,
      `Review + respond: <i>rbtr-jarvis.vercel.app/wms.html</i> → Intelligence → WW Leads`,
    ].filter(Boolean).join('\n');
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    telegramOk = (await tg.json().catch(() => ({}))).ok;
    if (telegramOk && leadId) {
      await sbUpdate('psnm_ww_leads', { id: leadId }, { telegram_alerted: true }).catch(() => null);
    }
  }

  return { ok: true, lead_id: leadId, source, parsed, telegram_alerted: telegramOk };
}

// ── WAM inbound handler ───────────────────────────────────────────────────────
async function inboundWAM({ from, subject, text }) {
  const wam = parseWAMEmail(subject, text);

  // Run quote calculator immediately
  const offerCfg = await getOfferConfig();
  const offer = offerCfg?.offer || null;
  const quote = calcQuote({
    pallet_count:    wam.pallet_count,
    duration_weeks:  wam.duration_weeks_default,
    product_nature:  wam.product_nature,
    offer,
  });

  // Build notes JSON (all WAM-specific structured data lives here)
  const notesObj = {
    wam: true,
    ww_reference:       wam.ww_reference,
    opportunity_tier:   wam.opportunity_tier,
    product_nature:     wam.product_nature,
    storage_only:       wam.storage_only,
    duration_type:      wam.duration_type,
    duration_weeks:     wam.duration_weeks_default,
    brief_overview:     wam.brief_overview,
    pallet_weight_kg:   wam.pallet_weight_kg,
    pallet_volume_m3:   wam.pallet_volume_m3,
    origin_port:        wam.origin_port,
    amazon_mention:     wam.amazon_mention,
    parse_confidence:   wam.parse_confidence,
    parse_flags:        wam.parse_flags,
    pallet_count_exact: wam.pallet_count_exact,
    quote,
  };

  const row = {
    source:      'whichwarehouse_wam',
    company:     wam.ww_reference || 'WW Enquiry',
    pallet_count: wam.pallet_count,
    location:    wam.preferred_location,
    goods_type:  wam.product_type,
    start_date:  wam.preferred_start_date,
    notes:       JSON.stringify(notesObj),
    raw_subject: subject,
    raw_body:    text.slice(0, 5000),
    status:      'new',
  };

  const inserted = await sbInsert('psnm_ww_leads', [row]);
  const leadId = inserted?.[0]?.id;

  // Telegram alert — WAM-specific format
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  let telegramOk = false;
  if (token && chatId) {
    const tierLabel = wam.opportunity_tier ? ` [${wam.opportunity_tier}]` : '';
    const qLine = quote.blocked
      ? `⚠️ Quote: BLOCKED — ${escHtml(quote.reason)}`
      : `💷 Quote: £${quote.all_in} all-in (${wam.pallet_count}p × ${wam.duration_weeks_default}wk) · deposit £${quote.deposit}`;
    const flagsLine = wam.parse_flags.length ? `🚩 Flags: ${escHtml(wam.parse_flags.join(', '))}` : null;
    const lines = [
      `📋 <b>NEW WAM LEAD${tierLabel}</b>${wam.ww_reference ? ' · ' + escHtml(wam.ww_reference) : ''}`,
      wam.pallet_count   ? `Pallets: <b>${wam.pallet_count}${wam.pallet_count_exact ? '' : '+'}</b>` : `Pallets: <b>?</b>`,
      wam.preferred_location ? `Location: ${escHtml(wam.preferred_location)}` : null,
      wam.product_type   ? `Goods: ${escHtml(wam.product_type)}` : null,
      wam.product_nature ? `Nature: ${escHtml(wam.product_nature)}` : null,
      wam.origin_port    ? `🚢 Port: ${escHtml(wam.origin_port)}` : null,
      wam.amazon_mention ? `📦 Amazon/FBA mention` : null,
      ``,
      qLine,
      flagsLine,
      ``,
      `Review: <i>rbtr-jarvis.vercel.app/wms.html</i> → Intelligence → WW Leads`,
    ].filter(Boolean).join('\n');
    const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: lines, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    telegramOk = (await tg.json().catch(() => ({}))).ok;
    if (telegramOk && leadId) {
      await sbUpdate('psnm_ww_leads', { id: leadId }, { telegram_alerted: true }).catch(() => null);
    }
  }

  return {
    ok: true, lead_id: leadId, source: 'whichwarehouse_wam',
    ww_reference: wam.ww_reference,
    parsed: { ...wam, quote },
    telegram_alerted: telegramOk,
  };
}

// POST /api/atlas?action=recompute_ww_quote  { lead_id, duration_weeks? }
async function recomputeWWQuote(body) {
  const { lead_id, duration_weeks } = body || {};
  if (!lead_id) return { ok: false, error: 'lead_id required' };
  const leads = await sbSelect('psnm_ww_leads', `id=eq.${lead_id}&limit=1`);
  const lead = leads?.[0];
  if (!lead) return { ok: false, error: 'lead not found' };
  if (lead.source !== 'whichwarehouse_wam') return { ok: false, error: 'not a WAM lead' };

  let notesObj = {};
  try { notesObj = JSON.parse(lead.notes || '{}'); } catch (_) {}

  const offerCfg = await getOfferConfig();
  const offer = offerCfg?.offer || null;
  const weeks = duration_weeks || notesObj.duration_weeks || 8;
  const quote = calcQuote({
    pallet_count:    lead.pallet_count,
    duration_weeks:  weeks,
    product_nature:  notesObj.product_nature,
    offer,
  });

  notesObj.quote = quote;
  notesObj.duration_weeks = weeks;
  await sbUpdate('psnm_ww_leads', { id: lead_id }, {
    notes: JSON.stringify(notesObj),
    updated_at: new Date().toISOString(),
  });

  return { ok: true, lead_id, quote };
}

// GET /api/atlas?action=get_ww_leads&status=new&source=whichwarehouse_wam&limit=50
async function getWWLeads(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const filterStatus = url.searchParams.get('status');
  const filterSource = url.searchParams.get('source_filter'); // 'wam', 'direct', or omit for all
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  const qs = [
    filterStatus ? `status=eq.${filterStatus}` : null,
    filterSource === 'wam'    ? 'source=eq.whichwarehouse_wam' : null,
    filterSource === 'direct' ? 'source=neq.whichwarehouse_wam' : null,
    `order=received_at.desc`,
    `limit=${limit}`,
    `select=id,received_at,source,company,contact_name,contact_email,contact_phone,pallet_count,location,goods_type,start_date,status,notes,response_draft`,
  ].filter(Boolean).join('&');
  const rows = await sbSelect('psnm_ww_leads', qs);
  const counts = {};
  for (const s of ['new','contacted','converted','lost']) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_ww_leads?status=eq.${s}&select=id`,
      { method: 'HEAD', headers: { ...sbHeaders(), Prefer: 'count=exact' } });
    counts[s] = parseInt((r.headers.get('content-range') || '').split('/')[1]) || 0;
  }
  return { ok: true, leads: rows || [], counts };
}

// POST /api/atlas?action=update_ww_lead  { id, status, notes, ... }
async function updateWWLead(body) {
  const { id, ...patch } = body || {};
  if (!id) return { ok: false, error: 'id required' };
  const allowed = ['status','notes','contact_name','contact_email','contact_phone','pallet_count','location','response_draft'];
  const update = {};
  for (const k of allowed) if (patch[k] !== undefined) update[k] = patch[k];
  update.updated_at = new Date().toISOString();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/psnm_ww_leads?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(update),
  });
  const rows = await r.json().catch(() => []);
  return { ok: r.ok, lead: rows?.[0] || update };
}

// POST /api/atlas?action=generate_ww_response  { lead_id }
// Warmer, faster cadence than cold outreach — bottom-of-funnel inbound.
// For WAM leads: uses scenario-aware prompt (5 scenarios).
// For direct leads: uses _ww_response_prompt.md template.
async function generateWWResponse(body) {
  const { lead_id } = body || {};
  if (!lead_id) return { ok: false, error: 'lead_id required' };

  const leads = await sbSelect('psnm_ww_leads', `id=eq.${lead_id}&limit=1`);
  const lead = leads?.[0];
  if (!lead) return { ok: false, error: 'lead not found' };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';
  if (!anthropicKey) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  const offerCfg = await getOfferConfig();
  const offer = offerCfg?.offer || null;
  const offerHeadline = offer?.headline || 'First month free. No deposit. No contract.';

  // ── WAM lead: scenario-aware prompt ──────────────────────────────────────
  if (lead.source === 'whichwarehouse_wam') {
    let notesObj = {};
    try { notesObj = JSON.parse(lead.notes || '{}'); } catch (_) {}

    // Re-run quote if not stored
    let quote = notesObj.quote;
    if (!quote) {
      quote = calcQuote({
        pallet_count:   lead.pallet_count,
        duration_weeks: notesObj.duration_weeks || 8,
        product_nature: notesObj.product_nature,
        offer,
      });
    }

    const wamRef    = notesObj.ww_reference || 'your enquiry';
    const tier      = notesObj.opportunity_tier || '';
    const pallets   = lead.pallet_count;
    const location  = lead.location || notesObj.preferred_location || 'your preferred location';
    const goods     = lead.goods_type || notesObj.product_type || 'your goods';
    const nature    = notesObj.product_nature || '';
    const startDate = lead.start_date || 'your preferred date';
    const overview  = notesObj.brief_overview || '';
    const port      = notesObj.origin_port;
    const amazon    = notesObj.amazon_mention;
    const distant   = isDistantLocation(location);
    const approxPallets = pallets && !notesObj.pallet_count_exact;

    // Scenario detection
    let scenario = 'happy_path';
    if (quote.blocked)                                                scenario = 'blocked';
    else if (!pallets || approxPallets || !notesObj.product_nature)   scenario = 'awkward_data';
    else if (distant && !port && !amazon)                             scenario = 'location_mismatch';
    else if (port)                                                    scenario = 'port_pressure';

    // Scenario-specific instructions
    let scenarioInstructions = '';
    if (scenario === 'blocked') {
      scenarioInstructions = `SCENARIO: BLOCKED PRODUCT
The goods type (${nature || goods}) means we cannot automatically quote.
Write a warm, brief reply that:
- States we specialise in ambient, dry pallet storage
- Explains we don't currently handle ${nature || 'this product type'}
- Offers to refer them OR says "if I've misread your requirement, call me directly"
- Does NOT give any price
- Flags for manual review
Do NOT pretend we can accommodate it.`;
    } else if (scenario === 'awkward_data') {
      const missingFields = [];
      if (!pallets) missingFields.push('pallet count');
      if (!nature)  missingFields.push('product type');
      if (approxPallets) missingFields.push('exact pallet count (approximate given)');
      scenarioInstructions = `SCENARIO: VAGUE DATA — ${missingFields.join(', ')} unclear
Write a warm reply that:
- Acknowledges what we DO know from their enquiry
- Asks ONE specific clarifying question (the most important missing piece)
- Gives a ballpark price RANGE based on what we know (e.g. "based on 5-10 pallets, storage runs £X–£Y/week")
- Confirms we have capacity and are ready to move fast once confirmed
Use the quote range: £${quote.blocked ? '?' : quote.weekly_storage}/wk at confirmed count.`;
    } else if (scenario === 'location_mismatch') {
      scenarioInstructions = `SCENARIO: LOCATION MISMATCH
Their preferred location (${location}) is far from Hellaby, Rotherham (S66 8HR, South Yorkshire).
Write a reply that:
- Acknowledges the location gap UPFRONT — don't pretend it doesn't exist
- Reframes why we're worth considering despite the distance:
  * We're on the M18/M1/A1 corridor — excellent outbound logistics reach
  * Lower cost per pallet than southern warehouses (quote the actual price)
  * Free collection from them within 48 hours of signing
- Shows the quote clearly
- Keeps it short — don't oversell, let the numbers do it
${amazon ? '- Also mention we are close to Amazon MCO1/MCO3 fulfilment hubs (Doncaster area)' : ''}`;
    } else if (scenario === 'port_pressure') {
      scenarioInstructions = `SCENARIO: PORT / IMPORT ORIGIN DETECTED (${port})
Their goods appear to be moving through ${port}.
Write a reply that:
- Leads with speed: "we can take delivery off ${port} within [X] days of your shipment clearing"
- Mentions our M18 motorway access (direct corridor from ${port === 'Immingham' || port === 'Hull' || port === 'Grimsby' ? 'Humber ports' : port})
- Shows the quote with deposit
- Makes the CTA a phone call — port-clearance timing is urgent, not email-pace
- Tone: confident, operational, fast. This person needs a yes/no quickly.`;
    } else {
      scenarioInstructions = `SCENARIO: HAPPY PATH — clean ambient lead
Write a warm, direct response. Confirm we have capacity, quote the specific numbers, single CTA.`;
    }

    const fmtQuote = quote.blocked ? 'Quote blocked — see scenario instructions' : `
Quote breakdown (for ${pallets || '?'} pallets × ${notesObj.duration_weeks || 8} weeks):
- Storage: £${quote.storage_total}
- Receipt: £${quote.receipt_total}
- Despatch: £${quote.despatch_total}
- Onboarding: £${quote.onboarding} ${quote.onboarding === 0 ? '(waived — 12+ weeks)' : ''}
- Subtotal: £${quote.subtotal}
- VAT (20%): £${quote.vat}
- ALL-IN TOTAL: £${quote.all_in}
- Deposit to confirm: £${quote.deposit}
- First month free saving: £${quote.first_month_saving}
Rate tier: ${quote.rate_tier} (£${quote.rate_used}/pallet/week)`.trim();

    const sysPrompt = `You are Ben Greenwood, founder of Pallet Storage Near Me — a 1,602-space pallet warehouse at Unit 3C, Hellaby Industrial Estate, Rotherham S66 8HR. Tel: 07506 255033.

You are responding to WhichWarehouse lead ${wamRef}${tier ? ` (${tier} tier)` : ''}.

LEAD DETAILS:
- Pallets: ${pallets || 'unknown'}${approxPallets ? ' (approximate)' : ''}
- Location: ${location}
- Goods: ${goods}
- Nature: ${nature || 'not specified'}
- Start: ${startDate}
- Brief overview: ${overview || 'none provided'}
${port ? `- Goods from: ${port}` : ''}
${amazon ? '- Amazon/FBA mentioned' : ''}

${fmtQuote}

${scenarioInstructions}

MANDATORY IN ALL RESPONSES:
- Reference the WW reference number: ${wamRef}
- Sign off: Ben Greenwood, 07506 255033, sales@palletstoragenearme.co.uk
- Address: Hellaby Industrial Estate, Rotherham, S66 8HR
- ONE CTA only (call or email — not both, not a menu)
- Max 250 words
- ${offerHeadline}

Output ONLY valid JSON:
{"subject":"...","body":"full email as string with \\n line breaks","confidence_score":0-100,"scenario":"${scenario}"}`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 700,
        messages: [{ role: 'user', content: sysPrompt + '\n\nGenerate the response now.' }] }),
    });

    if (!aiRes.ok) return { ok: false, error: `Anthropic ${aiRes.status}` };
    const aiJson = await aiRes.json();
    const raw = aiJson?.content?.[0]?.text || '';
    let aiParsed;
    try { const m = raw.match(/\{[\s\S]*\}/); aiParsed = JSON.parse(m?.[0] || raw); }
    catch (_) { return { ok: false, error: 'JSON parse failed', raw: raw.slice(0, 300) }; }

    // Store draft + update notes with quote
    notesObj.quote = quote;
    await sbUpdate('psnm_ww_leads', { id: lead_id }, {
      response_draft: `SUBJECT: ${aiParsed.subject}\n\n${aiParsed.body}`,
      notes: JSON.stringify(notesObj),
      updated_at: new Date().toISOString(),
    });

    return {
      ok: true, lead_id,
      subject: aiParsed.subject, body: aiParsed.body,
      confidence_score: aiParsed.confidence_score,
      scenario, quote,
    };
  }

  // ── Direct / non-WAM lead: use existing _ww_response_prompt.md template ──
  let promptTemplate = null;
  try { promptTemplate = fs.readFileSync(path.join(__dirname, 'docs/_ww_response_prompt.md'), 'utf8'); }
  catch (_) {}

  const tiers = offer?.rate_tiers || [];
  const palletBand = (lead.pallet_count || 0) >= 150 ? 'bulk'
    : (lead.pallet_count || 0) >= 50 ? 'mid' : 'small';
  const rateForBand = t => {
    if (t === 'bulk') return tiers.find(r => r.range_min >= 150)?.rate_per_pallet_week || 2.95;
    if (t === 'mid')  return tiers.find(r => r.range_min === 50)?.rate_per_pallet_week || 3.45;
    return tiers.find(r => r.range_min === 1)?.rate_per_pallet_week || 3.95;
  };
  const weeklyEst = lead.pallet_count ? (lead.pallet_count * rateForBand(palletBand)).toFixed(2) : null;

  const sysPrompt = promptTemplate
    ? promptTemplate
        .replace(/\{\{company\}\}/g,           lead.company || 'your company')
        .replace(/\{\{contact_name\}\}/g,       lead.contact_name || 'there')
        .replace(/\{\{contact_first_name\}\}/g, (lead.contact_name || '').split(' ')[0] || 'there')
        .replace(/\{\{pallet_count\}\}/g,       String(lead.pallet_count || 'your enquired'))
        .replace(/\{\{location\}\}/g,           lead.location || 'your area')
        .replace(/\{\{goods_type\}\}/g,         lead.goods_type || 'your goods')
        .replace(/\{\{start_date\}\}/g,         lead.start_date || 'your preferred date')
        .replace(/\{\{rate_small\}\}/g,         String(rateForBand('small')))
        .replace(/\{\{rate_mid\}\}/g,           String(rateForBand('mid')))
        .replace(/\{\{rate_bulk\}\}/g,          String(rateForBand('bulk')))
        .replace(/\{\{headline\}\}/g,           offerHeadline)
    : `You are Ben Greenwood, founder of Pallet Storage Near Me (Hellaby, Rotherham S66 8HR).
Reply warmly and quickly to a WhichWarehouse inbound lead from ${lead.company || 'a prospect'}.
Contact: ${lead.contact_name || 'unknown'}. Pallets: ${lead.pallet_count || '?'}. Location: ${lead.location || '?'}.
This is warm inbound — they found us on WhichWarehouse. Respond fast, confirm availability,
quote ~£${weeklyEst || '?'}/week, show first month free saving, one CTA. Under 200 words.
Output JSON: {"subject":"...","body":"...","confidence_score":0-100}`;

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 600,
      messages: [{ role: 'user', content: sysPrompt + '\n\nGenerate the warm response now.' }] }),
  });

  if (!aiRes.ok) return { ok: false, error: `Anthropic ${aiRes.status}` };
  const aiJson = await aiRes.json();
  const raw = aiJson?.content?.[0]?.text || '';
  let aiParsed;
  try { const m = raw.match(/\{[\s\S]*\}/); aiParsed = JSON.parse(m?.[0] || raw); }
  catch (_) { return { ok: false, error: 'JSON parse failed', raw: raw.slice(0, 300) }; }

  await sbUpdate('psnm_ww_leads', { id: lead_id }, {
    response_draft: `SUBJECT: ${aiParsed.subject}\n\n${aiParsed.body}`,
    updated_at: new Date().toISOString(),
  });

  return { ok: true, lead_id, subject: aiParsed.subject, body: aiParsed.body, confidence_score: aiParsed.confidence_score };
}

// ── Dispatcher ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // offer_config is public — no auth needed (it's marketing pricing)
  const url = new URL(req.url, `http://${req.headers.host || 'x'}`);
  const action = url.searchParams.get('action');
  if (action === 'offer_config' && req.method === 'GET') return res.status(200).json(await getOfferConfig());
  // book is public — submitted by external visitors
  const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})) : {};
  if (action === 'book' && req.method === 'POST') return res.status(201).json(await bookEnquiry(body));

  // inbound_email: auth via SENDGRID_INBOUND_SECRET query param (not x-rbtr-auth)
  if (action === 'inbound_email' && req.method === 'POST') return res.status(200).json(await inboundEmail(req));

  const auth = checkAuth(req);
  if (!auth.ok) { res.status(401).json({ error: auth.error }); return; }

  try {
    if (action === 'queue' && req.method === 'GET')        return res.status(200).json(await getQueue());
    if (action === 'scorecard' && req.method === 'GET')    return res.status(200).json(await getScorecard());
    if (action === 'seed_day1' && req.method === 'POST')   return res.status(200).json(await seedDay1(body));
    if (action === 'complete_action' && req.method === 'POST') return res.status(200).json(await completeAction(body));
    if (action === 'log_cash' && req.method === 'POST')    return res.status(200).json(await logCash(body));
    if (action === 'send_email' && req.method === 'POST')  return res.status(200).json(await sendEmail(body));
    if (action === 'rank_one_target' && req.method === 'POST') return res.status(200).json(await rankOneTarget(body));
    if (action === 'enrich_email' && req.method === 'POST')    return res.status(200).json(await enrichEmail(body));
    if (action === 'rank_targets' && req.method === 'POST') {
      return res.status(202).json({ ok: false, deferred: true, reason: 'Use rank_one_target in a client loop (Vercel 10s per-call cap).' });
    }
    if (action === 'social_post' && req.method === 'POST') return res.status(200).json(await triggerSocialPost(body));
    if (action === 'social_due' && req.method === 'GET')   return res.status(200).json(await getSocialDue());
    // Atlas v2
    if (action === 'generate_drafts' && req.method === 'POST')  return res.status(200).json(await generateDrafts(body));
    if (action === 'dispatch_approved' && req.method === 'POST') return res.status(200).json(await dispatchApproved(body));
    if (action === 'update_draft' && req.method === 'POST')      return res.status(200).json(await updateDraft(body));
    if (action === 'get_drafts' && req.method === 'GET')         return res.status(200).json(await getDrafts(req));
    if (action === 'get_atlas_config' && req.method === 'GET')   return res.status(200).json({ ok: true, config: await getAtlasConfig() });
    if (action === 'update_atlas_config' && req.method === 'POST') return res.status(200).json(await updateAtlasConfig(body));
    if (action === 'strategy_doc' && req.method === 'GET') return res.status(200).json(await getStrategyDoc(req));
    // WhichWarehouse inbound leads
    if (action === 'get_ww_leads' && req.method === 'GET')          return res.status(200).json(await getWWLeads(req));
    if (action === 'update_ww_lead' && req.method === 'POST')       return res.status(200).json(await updateWWLead(body));
    if (action === 'generate_ww_response' && req.method === 'POST') return res.status(200).json(await generateWWResponse(body));
    if (action === 'recompute_ww_quote' && req.method === 'POST')   return res.status(200).json(await recomputeWWQuote(body));
    res.status(400).json({ error: 'action required: offer_config|book|queue|scorecard|seed_day1|complete_action|log_cash|send_email|rank_targets|social_post|social_due|generate_drafts|dispatch_approved|update_draft|get_drafts|get_atlas_config|update_atlas_config|strategy_doc|inbound_email|get_ww_leads|update_ww_lead|generate_ww_response' });
  } catch (err) {
    console.error('[atlas]', err);
    res.status(500).json({ error: err.message });
  }
};
