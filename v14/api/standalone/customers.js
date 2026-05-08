'use strict';

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet, sbPost, sbPatch, sbDelete } = require('./_db');

function toRow(c) {
  return {
    name:    c.name,
    contact: c.contact || null,
    phone:   c.phone || null,
    email:   c.email || null,
    rate:    c.rate != null ? String(c.rate) : '6.50',
    deal:    c.deal || 'none',
    notes:   c.notes || null,
  };
}

function fromRow(r) {
  return {
    name:    r.name,
    contact: r.contact || '',
    phone:   r.phone || '',
    email:   r.email || '',
    rate:    r.rate || '6.50',
    deal:    r.deal || 'none',
    notes:   r.notes || '',
  };
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  try {
    if (req.method === 'GET') {
      const rows = await sbGet('psnm_customers', { select: '*', order: 'name.asc' });
      const customers = {};
      rows.forEach(r => { customers[r.name] = fromRow(r); });
      return res.status(200).json({ customers });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body;

      // Bulk sync — replaces entire customer set
      if (body.customers && typeof body.customers === 'object') {
        const rows = Object.values(body.customers).map(toRow);
        if (!rows.length) return res.status(200).json({ ok: true, count: 0 });
        await sbPost('psnm_customers', rows, true);
        return res.status(200).json({ ok: true, count: rows.length });
      }

      // Single upsert
      const row = toRow(body);
      if (!row.name) return res.status(400).json({ error: 'name required' });
      const upserted = await sbPost('psnm_customers', [row], true);
      return res.status(200).json({ customer: fromRow(upserted[0]) });
    }

    if (req.method === 'DELETE') {
      const name = req.query.name;
      if (!name) return res.status(400).json({ error: 'name required' });
      // Guard: don't delete if active pallets exist
      const active = await sbGet('psnm_pallets', { customer: `eq.${name}`, out: 'eq.false', select: 'id', limit: 1 });
      if (active.length) return res.status(409).json({ error: 'Customer has active pallets' });
      await sbDelete('psnm_customers', { name });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[standalone/customers]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
