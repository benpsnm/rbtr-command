'use strict';

// One-shot migration verifier. Checks which tables exist and returns status.
// Does NOT create tables — tables must be created manually via Supabase SQL editor.
// Migration SQL: v14/supabase/migrations/53_standalone_wms_tables.sql

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('./_cors');
const { sbGet } = require('./_db');

const REQUIRED_TABLES = ['psnm_wms_pallets','psnm_wms_customers','psnm_wms_movements','psnm_wms_bookings','psnm_wms_enquiries','psnm_wms_crm_status'];

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;

  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const results = {};
  await Promise.all(REQUIRED_TABLES.map(async table => {
    try {
      await sbGet(table, { select: 'count', limit: '0' });
      results[table] = 'ok';
    } catch (e) {
      results[table] = e.message.includes('404') || e.message.includes('relation') ? 'missing' : `error: ${e.message.slice(0,60)}`;
    }
  }));

  const allOk = Object.values(results).every(v => v === 'ok');
  return res.status(allOk ? 200 : 503).json({
    ready: allOk,
    tables: results,
    migration: 'Run v14/supabase/migrations/53_standalone_wms_tables.sql in Supabase SQL editor if any table shows missing',
  });
};
