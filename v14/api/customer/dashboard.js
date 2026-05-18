'use strict';
// PSNM Customer Portal — Dashboard Data
// GET /api/customer/dashboard
// Returns: bookings, pallet count, invoice summary, upcoming charges

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
    // Get customer details
    const customers = await sbQuery('psnm_customers', `id=eq.${auth.customer_id}&limit=1`);
    const customer = customers?.[0];

    if (!customer) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }

    // Get active bookings
    const bookings = await sbQuery('psnm_bookings', `customer_id=eq.${auth.customer_id}&status=eq.active&order=start_date.desc`) || [];

    // Calculate total pallet count
    const totalPallets = bookings.reduce((sum, b) => sum + (b.pallet_count || 0), 0);

    // Get unpaid invoices
    const unpaidInvoices = await sbQuery('psnm_invoices', `customer_id=eq.${auth.customer_id}&status=eq.unpaid&order=due_date.asc&limit=5`) || [];

    // Get recent paid invoices
    const paidInvoices = await sbQuery('psnm_invoices', `customer_id=eq.${auth.customer_id}&status=eq.paid&order=paid_at.desc&limit=3`) || [];

    // Calculate outstanding balance
    const outstandingBalance = unpaidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return res.status(200).json({
      ok: true,
      customer: {
        company: customer.company,
        contact_name: customer.contact_name,
      },
      bookings: bookings.map(b => ({
        id: b.id,
        pallet_count: b.pallet_count,
        location: b.location_zone || 'Warehouse',
        start_date: b.start_date,
        monthly_rate: b.monthly_rate || 0,
      })),
      pallet_count: totalPallets,
      unpaid_invoices: unpaidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        due_date: inv.due_date,
        description: inv.description,
      })),
      recent_invoices: paidInvoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        paid_at: inv.paid_at,
      })),
      outstanding_balance: outstandingBalance,
    });

  } catch (e) {
    console.error('[dashboard] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch dashboard data' });
  }
};
