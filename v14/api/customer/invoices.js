'use strict';
// PSNM Customer Portal — Invoice List
// GET /api/customer/invoices?year=2026&status=all

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

  const { year, status } = req.query;

  try {
    let filter = `customer_id=eq.${auth.customer_id}`;

    // Filter by status if specified
    if (status && status !== 'all') {
      filter += `&status=eq.${status}`;
    }

    // Filter by year if specified
    if (year) {
      const yearStart = `${year}-01-01T00:00:00Z`;
      const yearEnd = `${year}-12-31T23:59:59Z`;
      filter += `&created_at=gte.${yearStart}&created_at=lte.${yearEnd}`;
    }

    filter += '&order=created_at.desc&limit=100';

    const invoices = await sbQuery('psnm_invoices', filter) || [];

    return res.status(200).json({
      ok: true,
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        status: inv.status,
        due_date: inv.due_date,
        paid_at: inv.paid_at,
        description: inv.description,
        pdf_url: inv.pdf_url || null,
        created_at: inv.created_at,
      })),
      count: invoices.length,
    });

  } catch (e) {
    console.error('[invoices] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch invoices' });
  }
};
