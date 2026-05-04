'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// WMS CRM module · Sales pipeline for PSNM pallet storage prospects
//
// Mounted at /api/wms?module=crm via the api/wms.js dispatcher.
//
// GET  ?module=crm&action=list              — list active (or deleted) prospects
// GET  ?module=crm&action=get&id=UUID       — single prospect + interactions
// GET  ?module=crm&action=stats             — counts per status
// GET  ?module=crm&action=interactions&prospect_id=UUID
//
// POST ?module=crm  { action: 'create',          ...fields }
// POST ?module=crm  { action: 'update',    id,   ...fields }
// POST ?module=crm  { action: 'delete',    id           }   — soft delete
// POST ?module=crm  { action: 'restore',   id           }   — undo soft delete
// POST ?module=crm  { action: 'purge',     id, confirmation_token } — GDPR hard erase
// POST ?module=crm  { action: 'seed'              }   — insert Top 20 (idempotent)
// POST ?module=crm  { action: 'log_interaction',  prospect_id, type, summary, occurred_at? }
//
// Auth: x-rbtr-auth header OR same-origin browser call.
// Validation: manual, no schema library.
// Soft delete: sets deleted_at timestamp. Hard purge via 'purge' action only.
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const RBTR_AUTH_TOKEN = process.env.RBTR_AUTH_TOKEN;

// ── Supabase helpers ───────────────────────────────────────────────────────
function sbH(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...extra };
  if (SUPABASE_KEY?.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_KEY}`;
  return h;
}

async function sbQ(table, qs = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs ? '?' + qs : ''}`, { headers: sbH() });
  if (!r.ok) { const e = await r.text(); throw new Error(`${table} query ${r.status}: ${e}`); }
  return r.json();
}

async function sbInsert(table, rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: sbH({ Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`${table} insert ${r.status}: ${e}`); }
  return r.json();
}

async function sbPatch(table, match, row) {
  const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method: 'PATCH',
    headers: sbH({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`${table} patch ${r.status}: ${e}`); }
  return r.json();
}

async function sbDelete(table, match) {
  const q = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
    method: 'DELETE',
    headers: sbH(),
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`${table} delete ${r.status}: ${e}`); }
  return true;
}

// ── Auth (matches supabase-proxy + atlas.js pattern) ──────────────────────
function checkAuth(req) {
  if (!RBTR_AUTH_TOKEN) return true;
  const supplied = req.headers?.['x-rbtr-auth'];
  const origin   = req.headers?.origin || '';
  const referer  = req.headers?.referer || '';
  const host     = req.headers?.host || '';
  const sameOrigin = host &&
    (origin.includes(host) || referer.includes(host)) &&
    (host === 'rbtr-jarvis.vercel.app' || host.endsWith('.vercel.app') || host.startsWith('localhost'));
  return supplied === RBTR_AUTH_TOKEN || sameOrigin;
}

// ── Validation ─────────────────────────────────────────────────────────────
const VALID_STATUSES   = new Set(['new','contacted','replied','quoted','followup','won','lost']);
const VALID_PRIORITIES = new Set(['hot','warm','cold']);
const VALID_SOURCES    = new Set(['leadinfo','whichwarehouse','referral','cold','inbound','website','other']);
const VALID_INT_TYPES  = new Set(['call','email_out','email_in','linkedin','meeting','visit','note']);

function validateProspect(b) {
  if (!b.company || typeof b.company !== 'string' || !b.company.trim()) return 'company is required';
  if (b.status    && !VALID_STATUSES.has(b.status))   return `invalid status: ${b.status}`;
  if (b.priority  && !VALID_PRIORITIES.has(b.priority)) return `invalid priority: ${b.priority}`;
  if (b.source    && !VALID_SOURCES.has(b.source))    return `invalid source: ${b.source}`;
  if (b.pallet_volume !== undefined && b.pallet_volume !== null && b.pallet_volume !== '' &&
      isNaN(Number(b.pallet_volume))) return 'pallet_volume must be a number';
  return null;
}

function pickProspectFields(b) {
  return {
    company:          b.company.trim(),
    contact:          b.contact?.trim() || null,
    title:            b.title?.trim() || null,
    phone:            b.phone?.trim() || null,
    email:            b.email?.trim() || null,
    postcode:         b.postcode ? b.postcode.toUpperCase().trim() : null,
    source:           VALID_SOURCES.has(b.source) ? b.source : 'other',
    status:           VALID_STATUSES.has(b.status) ? b.status : 'new',
    priority:         VALID_PRIORITIES.has(b.priority) ? b.priority : 'warm',
    pallet_volume:    (b.pallet_volume !== '' && b.pallet_volume != null) ? Number(b.pallet_volume) : null,
    next_action:      b.next_action?.trim() || null,
    next_action_date: b.next_action_date || null,
    notes:            b.notes?.trim() || null,
    updated_at:       new Date().toISOString(),
  };
}

// ── Top 20 seed (real Leadinfo prospects — sourced from PSNM brief) ───────
const TOP_20_SEED = [
  { company:'Renewafuel',                      phone:'03330 502370',   postcode:'S80 2FT', priority:'hot',  notes:'Renewable heating fuel - Worksop. 25 min from Hellaby. Multiple weeks of Leadinfo visits = repeat visitor signal. Seasonal stock pile angle.' },
  { company:'Anpario Plc',                     phone:'01909 537380',   email:'info@anpario.com', postcode:'S80 2RS', priority:'hot',  notes:'PLC. Animal feed additives. Worksop, 25 min from Hellaby. Professional buyers, expect proper procurement.' },
  { company:'Select Alloys & Materials',       phone:'01709 730999',   postcode:'S66 8HN', priority:'hot',  notes:'POSTCODE NEIGHBOUR. Same estate area. Walk-in possible. Non-ferrous metal stockholder.' },
  { company:'Jewel Fire Group',                phone:'01709 703223',   postcode:'S65 3SH', priority:'hot',  notes:'Rotherham. Fire protection products - extinguishers, panels, signage, doors. 10 min from us.' },
  { company:'Tekfloor / Tekgroup',             phone:'01709 261007',   postcode:'S63 9BL', priority:'hot',  notes:'Rotherham. Construction flooring + building materials. Seasonal ramp spring/summer. Project-staging angle.' },
  { company:'Znd (UK) Ltd',                    phone:'01709 521100',   email:'sales@znd.com', postcode:'S62 6JL', priority:'hot',  notes:'Rotherham. Millwork - fencing, gates, security mesh. Heavy pallet operation.' },
  { company:'Northcol Ltd',                    contact:'Steve',        postcode:'NE34 0BH', priority:'warm', notes:'Piece goods/textiles distributor. South Shields. NO PHONE. Multiple Leadinfo visits. Email-only outreach.' },
  { company:'Highland Spring Limited',         phone:'01764 660500',   postcode:'PH4 1QA', priority:'warm', notes:'Bottled water. Scotland HQ but UK distribution. Forward stocking south of border angle.' },
  { company:'Headstock Distribution (Ibanez)', phone:'0121 508 6666',  postcode:'B62 8HD', priority:'warm', notes:'Musical instrument wholesale. Halesowen. Northern retailer stocking point angle.' },
  { company:'Edmundson Electrical',            phone:'020 8283 0820',  email:'sales@edmundson-electrical.co.uk', postcode:'WA16 6AY', priority:'warm', notes:"UK's largest electrical wholesaler by branch count. Find regional contact, NOT head office." },
  { company:'Acorn Labels',                    phone:'01480 462727',   email:'sales@acornlabels.co.uk', postcode:'PE27 3LE', priority:'warm', notes:'Labels/converted paper. Cambridgeshire. Northern hub for distribution angle.' },
  { company:'Direct Produce Supplies (DPS)',   phone:'020 7350 4600',  email:'enquiries@dpsltd.com', postcode:'SW19 5SB', priority:'cold', notes:'PROBABLY CHILLED. Scope-call only. Ambient sidelines might fit.' },
  { company:'Reynolds Catering Supplies',      phone:'01992 809200',   email:'info@reynolds-cs.com', postcode:'EN8 7RQ', priority:'warm', notes:'Catering wholesale. Ambient lines only - dry goods, equipment, packaging.' },
  { company:'Belpac (Bdn Packaging)',          phone:'01902 897343',   email:'sales@belpac.co.uk', postcode:'WV5 8AP', priority:'warm', notes:'Paper/paperboard packaging. Wolverhampton. Customer-side delivery speed.' },
  { company:'Bunzl UK / Keenpac',             phone:'0116 174 32222', postcode:'LE19 1WH', priority:'cold', notes:'Distribution giant. Probably own warehouses. Plant-the-seed only.' },
  { company:'Bishopsport',                     phone:'01753 648666',   email:'sales@bishopsport.co.uk', postcode:'RH18 5HE', priority:'cold', notes:'Sports equipment. Forest Row. Northern delivery speed angle.' },
  { company:'Fish4Dogs',                       phone:'01299 252352',   postcode:'WR9 0NR', priority:'warm', notes:'Premium dog food. Droitwich. Pet retailers + D2C. Volume + Northern angle.' },
  { company:'Pixley Berries',                  phone:'01531 670171',   email:'enquiries@pixleyberries.co.uk', postcode:'HR8 2RB', priority:'warm', notes:'Fruit juice manufacturer. Ledbury. Summer demand spike + volume.' },
  { company:'Yours Clothing',                  phone:'0330 912 2464',  email:'info@yoursclothing.co.uk', postcode:'PE2 6XJ', priority:'cold', notes:'Plus-size apparel retail. Peterborough. Returns processing + seasonal stock.' },
  { company:'Hayward Tyler',                   phone:'01582 731144',   email:'info@haywardtyler.com', postcode:'LU1 3LD', priority:'cold', notes:'Industrial motors/generators. Luton. Project staging for Northern industrial customers.' },
];

// ── Action handlers ────────────────────────────────────────────────────────

async function actionStats() {
  const rows = await sbQ('crm_prospects', 'select=status&deleted_at=is.null');
  const counts = {};
  rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
  return { ...counts, total: rows.length };
}

async function actionList(query) {
  const showDeleted = query.show_deleted === 'true';
  const deletedFilter = showDeleted ? 'deleted_at=not.is.null' : 'deleted_at=is.null';
  const rows = await sbQ('crm_prospects',
    `select=*,crm_interactions(id)&${deletedFilter}&order=created_at.desc`
  );
  const prospects = rows.map(({ crm_interactions, ...rest }) => ({
    ...rest,
    interaction_count: Array.isArray(crm_interactions) ? crm_interactions.length : 0,
  }));
  return { prospects };
}

async function actionGet(query) {
  if (!query.id) throw new Error('id required');
  const [prospects, interactions] = await Promise.all([
    sbQ('crm_prospects', `id=eq.${query.id}&select=*`),
    sbQ('crm_interactions', `prospect_id=eq.${query.id}&order=occurred_at.desc&limit=20`),
  ]);
  if (!prospects.length) throw new Error('prospect not found');
  return { prospect: prospects[0], interactions };
}

async function actionInteractions(query) {
  if (!query.prospect_id) throw new Error('prospect_id required');
  const rows = await sbQ('crm_interactions',
    `prospect_id=eq.${query.prospect_id}&order=occurred_at.desc&limit=50`
  );
  return { interactions: rows };
}

async function actionCreate(body) {
  const err = validateProspect(body);
  if (err) throw new Error(err);
  const row = { ...pickProspectFields(body), created_at: new Date().toISOString() };
  const result = await sbInsert('crm_prospects', row);
  return { prospect: Array.isArray(result) ? result[0] : result };
}

async function actionUpdate(body) {
  if (!body.id) throw new Error('id required');
  const err = validateProspect(body);
  if (err) throw new Error(err);
  const result = await sbPatch('crm_prospects', { id: body.id }, pickProspectFields(body));
  return { prospect: Array.isArray(result) ? result[0] : result };
}

async function actionDelete(body) {
  if (!body.id) throw new Error('id required');
  await sbPatch('crm_prospects', { id: body.id }, {
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return { ok: true, id: body.id };
}

async function actionRestore(body) {
  if (!body.id) throw new Error('id required');
  await sbPatch('crm_prospects', { id: body.id }, {
    deleted_at: null,
    updated_at: new Date().toISOString(),
  });
  return { ok: true, id: body.id };
}

const PURGE_TOKEN = 'PURGE_CONFIRMED_DELETE';
async function actionPurge(body) {
  if (!body.id) throw new Error('id required');
  if (body.confirmation_token !== PURGE_TOKEN) {
    throw new Error(`confirmation_token must be exactly '${PURGE_TOKEN}'`);
  }
  await sbDelete('crm_interactions', { prospect_id: body.id });
  await sbDelete('crm_prospects',    { id: body.id });
  return { ok: true, purged: body.id };
}

async function actionSeed() {
  const existing = await sbQ('crm_prospects', 'select=company&deleted_at=is.null');
  const existingNames = new Set(existing.map(r => r.company.toLowerCase()));

  const now = new Date().toISOString();
  const toInsert = TOP_20_SEED
    .filter(p => !existingNames.has(p.company.toLowerCase()))
    .map(p => ({
      company:          p.company,
      contact:          p.contact || null,
      phone:            p.phone || null,
      email:            p.email || null,
      postcode:         p.postcode || null,
      source:           'leadinfo',
      status:           'new',
      priority:         p.priority || 'warm',
      pallet_volume:    null,
      next_action:      'Initial outreach call',
      next_action_date: null,
      notes:            p.notes || null,
      created_at:       now,
      updated_at:       now,
    }));

  if (!toInsert.length) {
    return { seeded: 0, skipped: TOP_20_SEED.length, reason: 'all already present' };
  }

  await sbInsert('crm_prospects', toInsert);
  return { seeded: toInsert.length, skipped: TOP_20_SEED.length - toInsert.length };
}

async function actionLogInteraction(body) {
  if (!body.prospect_id) throw new Error('prospect_id required');
  if (!body.summary?.trim())   throw new Error('summary required');
  if (!VALID_INT_TYPES.has(body.type)) throw new Error(`invalid type: ${body.type}`);

  const now = new Date().toISOString();
  const row = {
    prospect_id: body.prospect_id,
    type:        body.type,
    summary:     body.summary.trim(),
    occurred_at: body.occurred_at || now,
    created_at:  now,
  };

  const result = await sbInsert('crm_interactions', row);
  await sbPatch('crm_prospects', { id: body.prospect_id }, { updated_at: now });

  return { interaction: Array.isArray(result) ? result[0] : result };
}

// ── Handler (called by api/wms.js dispatcher) ──────────────────────────────
module.exports = async function crmHandler(req, res) {
  if (!checkAuth(req)) {
    res.status(401).json({ error: 'x-rbtr-auth header missing or invalid' }); return;
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ error: 'Supabase env vars not set' }); return;
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action');

  try {
    let result;

    if (req.method === 'GET') {
      const query = Object.fromEntries(url.searchParams.entries());
      switch (action) {
        case 'list':         result = await actionList(query); break;
        case 'get':          result = await actionGet(query); break;
        case 'stats':        result = await actionStats(); break;
        case 'interactions': result = await actionInteractions(query); break;
        default: res.status(400).json({ error: `unknown GET action: ${action}` }); return;
      }
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const postAction = body.action || action;
      switch (postAction) {
        case 'create':          result = await actionCreate(body); break;
        case 'update':          result = await actionUpdate(body); break;
        case 'delete':          result = await actionDelete(body); break;
        case 'restore':         result = await actionRestore(body); break;
        case 'purge':           result = await actionPurge(body); break;
        case 'seed':            result = await actionSeed(); break;
        case 'log_interaction': result = await actionLogInteraction(body); break;
        default: res.status(400).json({ error: `unknown POST action: ${postAction}` }); return;
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' }); return;
    }

    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[CRM]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
