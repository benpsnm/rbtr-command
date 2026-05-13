'use strict';
// Atlas v3 — ProspectIngestor
// Takes a raw lead from any source and normalises + deduplicates into the prospects table.
// Sources: 'psnm_outreach' (legacy table), 'ww_inbound', 'str_manual', 'linkedin', 'manual'

const db = require('./_av3_db');

const DOMAIN_BLACKLIST = new Set([
  'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','me.com',
  'live.com','msn.com','aol.com','protonmail.com','googlemail.com',
]);

function extractDomain(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1].toLowerCase().trim();
}

function normaliseDomain(raw) {
  if (!raw) return null;
  return raw.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase().trim();
}

// Returns null if this lead already exists (by email, domain, or company+city combo)
async function findDuplicate(lead) {
  const candidates = [];
  if (lead.email) {
    const byEmail = await db.select('prospects', `email=ilike.${encodeURIComponent(lead.email)}&limit=1`);
    if (Array.isArray(byEmail) && byEmail.length > 0) candidates.push(byEmail[0]);
  }
  if (!candidates.length && lead.domain && !DOMAIN_BLACKLIST.has(lead.domain)) {
    const byDomain = await db.select('prospects', `domain=eq.${encodeURIComponent(lead.domain)}&status=neq.dead&limit=1`);
    if (Array.isArray(byDomain) && byDomain.length > 0) candidates.push(byDomain[0]);
  }
  if (!candidates.length && lead.company) {
    const byCompany = await db.select('prospects',
      `company=ilike.${encodeURIComponent(lead.company)}&city=ilike.${encodeURIComponent(lead.city || '')}&limit=1`);
    if (Array.isArray(byCompany) && byCompany.length > 0) candidates.push(byCompany[0]);
  }
  return candidates[0] || null;
}

// Classify exclusion flags from known data
function inferExclusionFlags(lead) {
  const flags = [];
  const text = [lead.industry, lead.goods_type, lead.notes, lead.company].join(' ').toLowerCase();
  if (/food|fresh|frozen|chilled|refrigerat|dairy|produce|meat|fish|poultry|veg/i.test(text)) flags.push('chilled');
  if (/pharma|medicine|medical|drug|clinical|biotech|chemical|hazmat|dangerous|flammable|aerosol/i.test(text)) flags.push('hazmat');
  if (/3pl|3rd party logistics|third.party logistic|fulfilment center|fulfillment|distribution center/i.test(text)) flags.push('3pl');
  if (/warehouse operator|storage provider|pallet storage|self.storage/i.test(text)) flags.push('competitor');
  if (/residential|home|personal|household/i.test(text)) flags.push('residential');
  return flags;
}

class ProspectIngestor {
  // Ingest a single raw lead. Returns { ok, prospect_id, is_duplicate, action }
  async ingest(raw, source, sourceRef = null) {
    const domain = raw.email ? extractDomain(raw.email) : normaliseDomain(raw.website || raw.domain);
    const exclusionFlags = inferExclusionFlags(raw);

    const lead = {
      company:              raw.company || raw.company_name || 'Unknown',
      domain:               domain,
      email:                raw.email || null,
      decision_maker_name:  raw.decision_maker_name || raw.contact_name || null,
      decision_maker_email: raw.decision_maker_email || raw.email || null,
      decision_maker_role:  raw.decision_maker_role || raw.contact_role || null,
      phone:                raw.phone || null,
      city:                 raw.city || null,
      postcode:             raw.postcode || null,
      industry:             raw.industry || null,
      sic_codes:            raw.sic_codes || null,
      pallet_estimate:      raw.pallet_estimate || raw.pallet_count || raw.pallets || null,
      exclusion_flags:      exclusionFlags.length > 0 ? exclusionFlags : null,
      notes:                raw.notes || null,
      goods_type:           undefined, // not a column, just for flag inference
    };

    // Remove keys that don't exist in schema
    delete lead.goods_type;

    // Dedup check
    const duplicate = await findDuplicate(lead);
    if (duplicate) {
      return { ok: true, prospect_id: duplicate.id, is_duplicate: true, action: 'skipped_duplicate', existing_stage: duplicate.pipeline_stage };
    }

    // Determine prospect_type
    const prospectType = source === 'ww_inbound' ? 'ww_inbound'
      : source === 'str_manual' ? 'str'
      : 'psnm';

    // Mark as dead immediately if hard exclusion
    const hardExclusions = ['chilled', 'hazmat'];
    const hasHardExclusion = exclusionFlags.some(f => hardExclusions.includes(f));

    const row = {
      ...lead,
      source,
      source_ref:      sourceRef,
      prospect_type:   prospectType,
      pipeline_stage:  hasHardExclusion ? 'dead' : 'raw',
      status:          hasHardExclusion ? 'dead' : 'active',
    };

    const [created] = await db.insert('prospects', row);
    const prospectId = created?.id;

    if (!prospectId) throw new Error('Ingestor: failed to get created prospect id');

    // Log initial stage
    await db.logStageTransition(prospectId, null, row.pipeline_stage, 'ProspectIngestor',
      hasHardExclusion ? `auto-dead: ${exclusionFlags.join(',')}` : `ingested from ${source}`);

    return {
      ok: true,
      prospect_id: prospectId,
      is_duplicate: false,
      action: hasHardExclusion ? 'dead_on_ingest' : 'created',
      exclusion_flags: exclusionFlags,
    };
  }

  // Bulk-ingest from legacy psnm_outreach_targets table
  async backfillFromLegacy(limit = 50) {
    const targets = await db.select('psnm_outreach_targets',
      `status=not.in.(rejected,lost,do_not_contact)&order=priority_score.desc.nullslast&limit=${limit}&select=id,company,email,decision_maker_name,decision_maker_role,city,industry,estimated_pallet_need,phone,status`);
    if (!Array.isArray(targets)) return { ok: false, error: 'Failed to fetch legacy targets' };

    const results = [];
    for (const t of targets) {
      try {
        const r = await this.ingest({
          company: t.company, email: t.email, decision_maker_name: t.decision_maker_name,
          decision_maker_role: t.decision_maker_role, city: t.city, industry: t.industry,
          pallet_estimate: t.estimated_pallet_need, phone: t.phone,
        }, 'psnm_outreach', t.id);
        results.push({ source_id: t.id, company: t.company, ...r });
      } catch (e) {
        results.push({ source_id: t.id, company: t.company, ok: false, error: e.message });
      }
    }

    const created = results.filter(r => r.action === 'created').length;
    const skipped = results.filter(r => r.is_duplicate).length;
    const dead = results.filter(r => r.action === 'dead_on_ingest').length;
    return { ok: true, total: targets.length, created, skipped, dead, results };
  }

  // Ingest from psnm_ww_leads table
  async backfillFromWW(limit = 50) {
    const leads = await db.select('psnm_ww_leads',
      `status=eq.new&order=created_at.desc&limit=${limit}&select=id,company,contact_name,contact_email,contact_phone,pallet_count,city,goods_type,notes`);
    if (!Array.isArray(leads)) return { ok: false, error: 'Failed to fetch WW leads' };

    const results = [];
    for (const l of leads) {
      try {
        const r = await this.ingest({
          company: l.company, email: l.contact_email, decision_maker_name: l.contact_name,
          phone: l.contact_phone, pallet_estimate: l.pallet_count, city: l.city,
          goods_type: l.goods_type, notes: l.notes,
        }, 'ww_inbound', l.id);
        results.push({ source_id: l.id, company: l.company, ...r });
      } catch (e) {
        results.push({ source_id: l.id, company: l.company, ok: false, error: e.message });
      }
    }
    const created = results.filter(r => r.action === 'created').length;
    const skipped = results.filter(r => r.is_duplicate).length;
    return { ok: true, total: leads.length, created, skipped, results };
  }
}

module.exports = ProspectIngestor;
