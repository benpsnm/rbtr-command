'use strict';

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet, sbPost, sbPatch, sbDelete } = require('./_db');

function toRow(e) {
  return {
    id:         e.id || ('EQ' + Date.now()),
    company:    e.company,
    contact:    e.contact,
    email:      e.email || null,
    phone:      e.phone || null,
    pallets:    e.pallets != null ? String(e.pallets) : null,
    type:       e.type || null,
    rate:       e.rate != null ? String(e.rate) : null,
    start_date: e.startDate || e.start_date || null,
    goods:      e.goods || null,
    notes:      e.notes || null,
    status:     e.status || 'enquiry',
    created_at: e.created || undefined,
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
      const rows = await sbGet('psnm_enquiries', params);
      return res.status(200).json({ enquiries: rows.map(fromRow) });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body.id) body.id = 'EQ' + Date.now();
      const created = await sbPost('psnm_enquiries', [toRow(body)], true);
      return res.status(201).json({ enquiry: fromRow(created[0]) });
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
      const updated = await sbPatch('psnm_enquiries', { id }, patch);
      return res.status(200).json({ enquiry: updated[0] ? fromRow(updated[0]) : null });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      await sbDelete('psnm_enquiries', { id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[standalone/enquiries]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
