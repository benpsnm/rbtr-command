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
      const msg = `🚨 *NEW BOOKING REQUEST*\n*${company}* — ${contact_name||'no name'}\n📧 ${email}${phone?' · 📞 '+phone:''}\n📦 ${pallets} pallets · ${duration_weeks} wks · ${tierLabel}\n💷 Period: £${totalPeriod.toFixed(2)} · Monthly: £${monthlyEstimate.toFixed(2)}\nGoods: ${goods_description||'not specified'}\nStatus: pending_review`;
      const tg = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ chat_id:chatId, text:msg, parse_mode:'Markdown' }) });
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
    if (action === 'rank_targets' && req.method === 'POST') {
      return res.status(202).json({ ok: false, deferred: true, reason: 'Use rank_one_target in a client loop (Vercel 10s per-call cap).' });
    }
    res.status(400).json({ error: 'action required: offer_config|book|queue|scorecard|seed_day1|complete_action|log_cash|send_email|rank_targets' });
  } catch (err) {
    console.error('[atlas]', err);
    res.status(500).json({ error: err.message });
  }
};
