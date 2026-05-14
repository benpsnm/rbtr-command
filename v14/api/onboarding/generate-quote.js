'use strict';

// POST /api/onboarding/generate-quote
// Input: { customer_id, pallet_count, duration_weeks, services_requested }
// Output: { ok, quote_id, quote_number, doc_url }
// Uses rate card from psnm_rate_card (is_current=true).
// Falls back to _quote_calc.js hardcoded rates if DB unavailable.

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPost, sbPatch } = require('../standalone/_db');
const calcQuote = require('../_quote_calc');

function quoteNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0,10).replace(/-/g,'');
  const suffix = Math.random().toString(36).slice(2,6).toUpperCase();
  return `PSN-Q-${ymd}-${suffix}`;
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const {
      customer_id,
      pallet_count,
      duration_weeks = 12,
      services_requested = [],
      special_conditions,
      internal_notes,
    } = req.body;

    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
    if (!pallet_count || pallet_count < 1) return res.status(400).json({ error: 'pallet_count required (min 1)' });

    // Load customer
    const customers = await sbGet('psnm_customers', { id: `eq.${customer_id}`, select: 'id,business_name,goods_description' });
    if (!customers.length) return res.status(404).json({ error: 'customer_not_found' });
    const customer = customers[0];

    // Load rate card
    let rateCard = null;
    try {
      const cards = await sbGet('psnm_rate_card', { is_current: 'eq.true', select: '*', limit: 1 });
      rateCard = cards[0] || null;
    } catch (_) { /* fall through to hardcoded */ }

    // Build offer shape compatible with _quote_calc.js
    const offer = rateCard ? {
      rate_tiers: rateCard.storage_tiers,
      handling_in_rate: Number(rateCard.handling_in_rate),
      handling_out_rate: Number(rateCard.handling_out_rate),
      onboarding_fee: Number(rateCard.onboarding_fee),
      onboarding_waiver_threshold: Number(rateCard.onboarding_waiver_min_pallets),
    } : null;

    // Run quote calc — returns { blocked, ... } or full quote object
    const calc = calcQuote({
      pallet_count: parseInt(pallet_count),
      duration_weeks: parseInt(duration_weeks),
      product_nature: customer.goods_description || '',
      offer,
    });

    if (calc.blocked) {
      return res.status(422).json({ ok: false, blocked: true, reason: calc.reason });
    }

    // Additional service lines from services_requested
    const devan20 = services_requested.includes('devan_20ft') ? Number((rateCard || {}).devan_20ft_rate || 200) : 0;
    const devan40 = services_requested.includes('devan_40ft') ? Number((rateCard || {}).devan_40ft_rate || 350) : 0;

    const validDays = rateCard ? Number(rateCard.quote_valid_days) : 14;
    const validUntil = new Date(Date.now() + validDays * 86400000).toISOString().slice(0,10);

    const row = {
      customer_id,
      quote_number:           quoteNumber(),
      quote_date:             new Date().toISOString().slice(0,10),
      valid_until:            validUntil,
      pallet_count:           calc.pallet_count,
      duration_weeks:         calc.weeks_assumed,
      rate_tier:              calc.rate_tier,
      storage_rate_pw:        calc.rate_used,
      storage_total:          calc.storage_total,
      receipt_rate:           calc.receipt_total / calc.pallet_count,
      receipt_total:          calc.receipt_total,
      despatch_rate:          calc.despatch_total / calc.pallet_count,
      despatch_total:         calc.despatch_total,
      devan_rate_20ft:        Number((rateCard || {}).devan_20ft_rate || 200),
      devan_rate_40ft:        Number((rateCard || {}).devan_40ft_rate || 350),
      onboarding_fee:         calc.onboarding,
      weekly_storage_cost:    calc.weekly_storage,
      monthly_storage_cost:   Math.round(calc.weekly_storage * 4.33 * 100) / 100,
      subtotal:               calc.subtotal + devan20 + devan40,
      vat_amount:             Math.round((calc.subtotal + devan20 + devan40) * 0.20 * 100) / 100,
      total_inc_vat:          Math.round((calc.subtotal + devan20 + devan40) * 1.20 * 100) / 100,
      deposit_required:       calc.deposit,
      special_conditions:     special_conditions || null,
      internal_notes:         internal_notes || null,
      status:                 'draft',
      bankruptcy_filing_date_context: 'pre_filing',
    };

    const created = await sbPost('psnm_quotes', row);
    const quote = Array.isArray(created) ? created[0] : created;

    // Update customer status to quote_sent if still at lead
    await sbGet('psnm_customers', { id: `eq.${customer_id}`, select: 'status' })
      .then(async rows => {
        if (rows[0]?.status === 'lead') {
          await sbPatch('psnm_customers', { id: customer_id }, {
            status: 'quote_sent',
            quote_sent_at: new Date().toISOString(),
          }).catch(() => null);
        }
      }).catch(() => null);

    const docUrl = `/quote-doc.html?id=${quote.id}`;
    return res.status(201).json({ ok: true, quote_id: quote.id, quote_number: quote.quote_number, doc_url: docUrl, quote });
  } catch (e) {
    console.error('[onboarding/generate-quote]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
