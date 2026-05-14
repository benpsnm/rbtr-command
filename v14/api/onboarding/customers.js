'use strict';

// POST /api/onboarding/customers — Customer pipeline CRUD + read.
// Ben's admin only. Uses existing requireAuth().

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPost, sbPatch } = require('../standalone/_db');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  try {
    // GET — list customers (with optional status filter) or single customer
    if (req.method === 'GET') {
      const { id, status, action } = req.query;

      // Single customer full record (with quotes, agreements, insurance, bookings)
      if (id) {
        const [customer, quotes, agreements, insurance, bookings] = await Promise.all([
          sbGet('psnm_customers', { id: `eq.${id}`, select: '*' }),
          sbGet('psnm_quotes', { customer_id: `eq.${id}`, select: '*', order: 'created_at.desc' }),
          sbGet('psnm_agreements', { customer_id: `eq.${id}`, select: '*', order: 'created_at.desc' }),
          sbGet('psnm_insurance_records', { customer_id: `eq.${id}`, select: '*', order: 'created_at.desc' }),
          sbGet('psnm_pipeline_bookings', { customer_id: `eq.${id}`, select: '*', order: 'created_at.desc', limit: 10 }),
        ]);
        if (!customer.length) return res.status(404).json({ error: 'not_found' });
        return res.status(200).json({ ok: true, customer: customer[0], quotes, agreements, insurance, bookings });
      }

      // Quote/agreement HTML doc data
      if (action === 'quote_doc') {
        const { quote_id } = req.query;
        if (!quote_id) return res.status(400).json({ error: 'quote_id required' });
        const rows = await sbGet('psnm_quotes', { id: `eq.${quote_id}`, select: '*' });
        if (!rows.length) return res.status(404).json({ error: 'not_found' });
        const quote = rows[0];
        const customers = await sbGet('psnm_customers', { id: `eq.${quote.customer_id}`, select: '*' });
        const rate = await sbGet('psnm_rate_card', { is_current: 'eq.true', select: '*', limit: 1 });
        return res.status(200).json({ ok: true, quote, customer: customers[0] || null, rate_card: rate[0] || null });
      }

      if (action === 'agreement_doc') {
        const { agreement_id } = req.query;
        if (!agreement_id) return res.status(400).json({ error: 'agreement_id required' });
        const rows = await sbGet('psnm_agreements', { id: `eq.${agreement_id}`, select: '*' });
        if (!rows.length) return res.status(404).json({ error: 'not_found' });
        const agreement = rows[0];
        const [customers, quotes] = await Promise.all([
          sbGet('psnm_customers', { id: `eq.${agreement.customer_id}`, select: '*' }),
          agreement.quote_id ? sbGet('psnm_quotes', { id: `eq.${agreement.quote_id}`, select: '*' }) : Promise.resolve([]),
        ]);
        return res.status(200).json({ ok: true, agreement, customer: customers[0] || null, quote: quotes[0] || null });
      }

      // List customers
      const params = { select: '*', order: 'created_at.desc' };
      if (status) params.status = `eq.${status}`;
      const customers = await sbGet('psnm_customers', params);
      return res.status(200).json({ ok: true, customers });
    }

    // POST — create new customer
    if (req.method === 'POST') {
      const body = req.body;
      if (!body.business_name) return res.status(400).json({ error: 'business_name required' });
      const row = {
        business_name:          body.business_name,
        contact_name:           body.contact_name || null,
        email:                  body.email || null,
        phone:                  body.phone || null,
        billing_address:        body.billing_address || null,
        delivery_address:       body.delivery_address || null,
        company_reg:            body.company_reg || null,
        vat_number:             body.vat_number || null,
        source:                 body.source || 'direct',
        ww_ref:                 body.ww_ref || null,
        status:                 body.status || 'lead',
        volume_pallets_forecast: body.volume_pallets_forecast || null,
        goods_description:      body.goods_description || null,
        goods_accepted:         body.goods_accepted !== undefined ? body.goods_accepted : null,
        internal_notes:         body.internal_notes || null,
        bankruptcy_aware_notes: body.bankruptcy_aware_notes || null,
      };
      const created = await sbPost('psnm_customers', row);
      return res.status(201).json({ ok: true, customer: Array.isArray(created) ? created[0] : created });
    }

    // PATCH — update customer fields
    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      const allowed = [
        'business_name','contact_name','email','phone','billing_address','delivery_address',
        'company_reg','vat_number','source','ww_ref','status','volume_pallets_forecast',
        'volume_pallets_actual','goods_description','goods_accepted','account_manager',
        'portal_user_id','bankruptcy_aware_notes','internal_notes','onboarding_started_at',
        'quote_sent_at','agreement_signed_at','insurance_verified_at','became_live_at','terminated_at',
      ];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
      if (!Object.keys(update).length) return res.status(400).json({ error: 'no fields to update' });
      const updated = await sbPatch('psnm_customers', { id }, update);
      return res.status(200).json({ ok: true, customer: Array.isArray(updated) ? updated[0] : updated });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('[onboarding/customers]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
