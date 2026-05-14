'use strict';
// PSNM Customer Portal — Get Current Customer
// GET /api/customer/me

const { requireCustomerAuth } = require('./_middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

async function sbQuery(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!r.ok) return null;
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireCustomerAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const customers = await sbQuery('psnm_customers', `id=eq.${auth.customer_id}&limit=1`);

    if (!customers || customers.length === 0) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }

    const customer = customers[0];

    // Return safe customer data (exclude internal fields)
    return res.status(200).json({
      ok: true,
      customer: {
        id: customer.id,
        company: customer.company,
        contact_name: customer.contact_name,
        email: customer.email,
        phone: customer.phone,
        billing_address: customer.billing_address,
        delivery_address: customer.delivery_address,
        created_at: customer.created_at,
      },
    });

  } catch (e) {
    console.error('[me] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch customer' });
  }
};
