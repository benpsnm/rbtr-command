'use strict';

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet, sbPost } = require('./_db');

function toRow(m) {
  return {
    type:        m.type,
    date:        m.date,
    time:        m.time,
    customer:    m.customer,
    ref:         m.ref || null,
    pallets:     m.pallets || 1,
    location:    m.location || null,
    rate:        m.rate != null ? m.rate : null,
    handling:    m.handling != null ? m.handling : 0,
    description: m.desc || m.description || null,
    notes:       m.notes || null,
  };
}

function fromRow(r) {
  return {
    id:       r.id,
    type:     r.type,
    date:     r.date,
    time:     r.time,
    customer: r.customer,
    ref:      r.ref || '',
    pallets:  r.pallets || 1,
    location: r.location || '',
    rate:     r.rate != null ? parseFloat(r.rate) : null,
    handling: r.handling != null ? parseFloat(r.handling) : 0,
    desc:     r.description || '',
    notes:    r.notes || '',
  };
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  try {
    if (req.method === 'GET') {
      const limit = parseInt(req.query.limit) || 200;
      const offset = parseInt(req.query.offset) || 0;
      const params = {
        select: '*',
        order: 'date.desc,id.desc',
        limit: String(limit),
        offset: String(offset),
      };
      if (req.query.customer) params['customer'] = `eq.${req.query.customer}`;
      if (req.query.type) params['type'] = `eq.${req.query.type}`;
      if (req.query.from) params['date'] = `gte.${req.query.from}`;

      // Get total count separately
      const countParams = { ...params, select: 'id', limit: '1000', offset: '0' };
      const [rows, allIds] = await Promise.all([
        sbGet('psnm_movements', params),
        sbGet('psnm_movements', countParams),
      ]);
      return res.status(200).json({ movements: rows.map(fromRow), total: allIds.length });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const items = Array.isArray(body) ? body : [body];
      const rows = items.map(toRow);
      const created = await sbPost('psnm_movements', rows, false);
      return res.status(201).json({ movements: (Array.isArray(created) ? created : [created]).map(fromRow) });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[standalone/movements]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
