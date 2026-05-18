'use strict';
// PSNM Customer Portal — Update Account Details
// POST /api/customer/account/update

const { requireCustomerAuth } = require('../_middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

async function sbUpdate(table, match, data) {
  const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbUpdate ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireCustomerAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON' });
  }

  const { contact_name, phone, billing_address, delivery_address } = body;

  // Build update object with only provided fields
  const updates = {};
  if (contact_name !== undefined) updates.contact_name = contact_name;
  if (phone !== undefined) updates.phone = phone;
  if (billing_address !== undefined) updates.billing_address = billing_address;
  if (delivery_address !== undefined) updates.delivery_address = delivery_address;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ ok: false, error: 'No fields to update' });
  }

  try {
    await sbUpdate('psnm_customers', { id: auth.customer_id }, updates);

    return res.status(200).json({
      ok: true,
      message: 'Account updated successfully',
      updated: updates,
    });

  } catch (e) {
    console.error('[account/update] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Failed to update account' });
  }
};
