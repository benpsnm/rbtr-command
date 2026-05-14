'use strict';

// POST /api/onboarding/generate-agreement
// Input: { customer_id, quote_id, effective_from?, minimum_term_weeks?, notice_period_days? }
// Output: { ok, agreement_id, agreement_number, doc_url }

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPost } = require('../standalone/_db');

function agreementNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0,10).replace(/-/g,'');
  const suffix = Math.random().toString(36).slice(2,6).toUpperCase();
  return `PSN-A-${ymd}-${suffix}`;
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
      quote_id,
      effective_from,
      minimum_term_weeks = 4,
      notice_period_days = 30,
      special_conditions,
    } = req.body;

    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });

    // Verify customer exists
    const customers = await sbGet('psnm_customers', { id: `eq.${customer_id}`, select: 'id,business_name' });
    if (!customers.length) return res.status(404).json({ error: 'customer_not_found' });

    // Verify quote if provided
    if (quote_id) {
      const quotes = await sbGet('psnm_quotes', { id: `eq.${quote_id}`, customer_id: `eq.${customer_id}`, select: 'id,status' });
      if (!quotes.length) return res.status(404).json({ error: 'quote_not_found' });
    }

    const row = {
      customer_id,
      quote_id:             quote_id || null,
      agreement_number:     agreementNumber(),
      agreement_date:       new Date().toISOString().slice(0,10),
      tc_version:           'v1.0-april-2026',
      effective_from:       effective_from || null,
      minimum_term_weeks:   parseInt(minimum_term_weeks),
      notice_period_days:   parseInt(notice_period_days),
      status:               'draft',
    };

    const created = await sbPost('psnm_agreements', row);
    const agreement = Array.isArray(created) ? created[0] : created;

    const docUrl = `/agreement-doc.html?id=${agreement.id}`;
    return res.status(201).json({ ok: true, agreement_id: agreement.id, agreement_number: agreement.agreement_number, doc_url: docUrl, agreement });
  } catch (e) {
    console.error('[onboarding/generate-agreement]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
