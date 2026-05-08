'use strict';

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet, sbPost, sbPatch, sbDelete } = require('./_db');

// camelCase ↔ snake_case translation for pallet rows
function toRow(p) {
  return {
    id:          p.id,
    customer:    p.customer,
    ref:         p.ref || null,
    description: p.desc || p.description,
    weight_kg:   p.weight || p.weight_kg || null,
    size:        p.size || 'standard',
    notes:       p.notes || null,
    date_in:     p.dateIn || p.date_in,
    time_in:     p.timeIn || p.time_in || null,
    location:    p.location,
    stype:       p.stype,
    weekly_rate: p.weeklyRate != null ? p.weeklyRate : (p.weekly_rate != null ? p.weekly_rate : 6.50),
    out:         p.out || false,
    out_date:    p.outDate || p.out_date || null,
    out_time:    p.outTime || p.out_time || null,
  };
}

function fromRow(r) {
  return {
    id:         r.id,
    customer:   r.customer,
    ref:        r.ref || '',
    desc:       r.description || '',
    weight:     r.weight_kg || '',
    size:       r.size || 'standard',
    notes:      r.notes || '',
    dateIn:     r.date_in,
    timeIn:     r.time_in || '',
    location:   r.location,
    stype:      r.stype,
    weeklyRate: r.weekly_rate != null ? parseFloat(r.weekly_rate) : 6.50,
    out:        r.out || false,
    outDate:    r.out_date || null,
    outTime:    r.out_time || null,
  };
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  try {
    if (req.method === 'GET') {
      const params = { select: '*' };
      if (!req.query.all) params['out'] = 'eq.false';
      if (req.query.customer) params['customer'] = `eq.${req.query.customer}`;
      const rows = await sbGet('psnm_wms_pallets', params);
      const pallets = rows.map(fromRow);
      const maxId = pallets.reduce((m, p) => Math.max(m, p.id), 0);
      return res.status(200).json({ pallets, nextId: maxId + 1 });
    }

    if (req.method === 'POST') {
      const body = req.body;

      // Bulk sync — replaces entire pallet set
      if (body.pallets && typeof body.pallets === 'object') {
        const rows = Object.values(body.pallets).map(toRow);
        if (!rows.length) return res.status(200).json({ ok: true, count: 0 });
        await sbPost('psnm_wms_pallets', rows, true);
        return res.status(200).json({ ok: true, count: rows.length });
      }

      // Single pallet create
      const row = toRow(body);
      if (!row.id) {
        // Assign next ID
        const existing = await sbGet('psnm_wms_pallets', { select: 'id', order: 'id.desc', limit: 1 });
        row.id = existing.length ? existing[0].id + 1 : 1;
      }
      const created = await sbPost('psnm_wms_pallets', [row], true);
      return res.status(201).json({ pallet: fromRow(created[0]) });
    }

    if (req.method === 'PUT') {
      const { id, ...rest } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const updateable = ['out','out_date','out_time','outDate','outTime','location','weekly_rate','weeklyRate','notes','ref'];
      const patch = {};
      updateable.forEach(k => {
        if (rest[k] !== undefined) {
          if (k === 'outDate') patch['out_date'] = rest[k];
          else if (k === 'outTime') patch['out_time'] = rest[k];
          else if (k === 'weeklyRate') patch['weekly_rate'] = rest[k];
          else patch[k] = rest[k];
        }
      });
      const updated = await sbPatch('psnm_wms_pallets', { id }, patch);
      return res.status(200).json({ pallet: updated[0] ? fromRow(updated[0]) : null });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id || req.query.confirm !== 'true') {
        return res.status(400).json({ error: 'id and confirm=true required' });
      }
      await sbDelete('psnm_wms_pallets', { id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[standalone/pallets]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
