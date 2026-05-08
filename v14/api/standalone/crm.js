'use strict';

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet, sbPost, sbDelete } = require('./_db');

const VALID_STATUSES = new Set(['new','hot','opened','contacted','cold']);

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  try {
    if (req.method === 'GET') {
      const rows = await sbGet('psnm_crm_status', { select: 'lead_id,status' });
      const status = {};
      rows.forEach(r => { status[r.lead_id] = r.status; });
      return res.status(200).json({ status });
    }

    if (req.method === 'POST') {
      const { leadId, status } = req.body;
      if (!leadId || !status) return res.status(400).json({ error: 'leadId and status required' });
      if (!VALID_STATUSES.has(status)) return res.status(400).json({ error: 'invalid status' });
      await sbPost('psnm_crm_status', [{ lead_id: leadId, status, updated_at: new Date().toISOString() }], true);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const leadId = req.query.leadId;
      if (!leadId) return res.status(400).json({ error: 'leadId required' });
      await sbDelete('psnm_crm_status', { lead_id: leadId });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[standalone/crm]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
