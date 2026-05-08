'use strict';

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet, sbPost, sbPatch, sbDelete } = require('./_db');

function toRow(b) {
  return {
    id:         b.id || ('BK' + Date.now()),
    company:    b.company,
    contact:    b.contact,
    email:      b.email || null,
    phone:      b.phone || null,
    pallets:    b.pallets != null ? String(b.pallets) : null,
    type:       b.type || null,
    rate:       b.rate != null ? String(b.rate) : null,
    start_date: b.startDate || b.start_date || null,
    goods:      b.goods || null,
    notes:      b.notes || null,
    status:     b.status || 'active',
    created_at: b.created || undefined,
  };
}

function fromRow(r) {
  return {
    id:        r.id,
    company:   r.company,
    contact:   r.contact,
    email:     r.email || '',
    phone:     r.phone || '',
    pallets:   r.pallets || '',
    type:      r.type || '',
    rate:      r.rate || '',
    startDate: r.start_date || '',
    goods:     r.goods || '',
    notes:     r.notes || '',
    status:    r.status,
    created:   r.created_at,
  };
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  try {
    if (req.method === 'GET') {
      const params = { select: '*', order: 'created_at.desc' };
      const statusFilter = req.query.status;
      if (statusFilter && statusFilter !== 'all') params['status'] = `eq.${statusFilter}`;
      else if (!statusFilter) params['status'] = 'eq.active';
      const rows = await sbGet('psnm_bookings', params);
      return res.status(200).json({ bookings: rows.map(fromRow) });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body.id) body.id = 'BK' + Date.now();
      const created = await sbPost('psnm_bookings', [toRow(body)], true);
      return res.status(201).json({ booking: fromRow(created[0]) });
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      ['status','notes','goods','pallets','rate','start_date','startDate'].forEach(k => {
        if (rest[k] !== undefined) {
          patch[k === 'startDate' ? 'start_date' : k] = rest[k];
        }
      });
      const updated = await sbPatch('psnm_bookings', { id }, patch);
      return res.status(200).json({ booking: updated[0] ? fromRow(updated[0]) : null });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await sbDelete('psnm_bookings', { id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[standalone/bookings]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
