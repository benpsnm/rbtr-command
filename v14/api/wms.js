'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// WMS dispatcher · single Vercel function for all WMS API modules
//
// Routes by ?module= query param:
//   /api/wms?module=crm&action=...    → _crm.js
//   /api/wms?module=pricing&action=... → _pricing.js  (Phase 3)
//   /api/wms?module=triage&action=...  → _triage.js   (Phase 4)
//   /api/wms?module=daily&action=...   → _daily.js    (Phase 5)
//   /api/wms?module=cashflow&action=.. → _cashflow.js (Phase 6)
//   /api/wms?module=ek&action=...      → _ek.js       (Phase 7)
//   /api/wms?module=sponsors&action=.. → _sponsors.js (Phase 8)
//
// Keeping all WMS modules under one function preserves the Vercel Hobby
// plan 12-function limit regardless of how many modules are added.
// ═══════════════════════════════════════════════════════════════════════════

const crm = require('./wms/_crm');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-rbtr-auth');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const mod = url.searchParams.get('module');

  switch (mod) {
    case 'crm': return crm(req, res);
    // case 'pricing':  return pricing(req, res);   // Phase 3
    // case 'triage':   return triage(req, res);    // Phase 4
    // case 'daily':    return daily(req, res);     // Phase 5
    // case 'cashflow': return cashflow(req, res);  // Phase 6
    // case 'ek':       return ek(req, res);        // Phase 7
    // case 'sponsors': return sponsors(req, res);  // Phase 8
    default:
      res.status(400).json({ ok: false, error: `unknown module: ${mod}` });
  }
};
