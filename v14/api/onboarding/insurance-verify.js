'use strict';

// POST /api/onboarding/insurance-verify
// Accepts insurance certificate data (text or image URL).
// Uses Claude to extract policy details and checks against PSNM minimums.
// Marks insurance record compliant or flags gaps to Ben.

const { requireAuth } = require('../auth/middleware');
const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPost, sbPatch } = require('../standalone/_db');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap for extraction tasks

async function extractInsuranceClaude({ text, imageUrl }) {
  const messages = [];

  if (imageUrl) {
    // Vision: image URL
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        {
          type: 'text',
          text: 'Extract the following fields from this insurance certificate and return ONLY valid JSON with no markdown:\n{"insurance_provider":"","policy_number":"","cover_type":"","cover_amount_gbp":null,"cover_starts":"YYYY-MM-DD","cover_ends":"YYYY-MM-DD","named_insured":"","extends_to_third_party_premises":null,"notes":""}',
        },
      ],
    });
  } else if (text) {
    messages.push({
      role: 'user',
      content: `Extract the following fields from this insurance certificate text and return ONLY valid JSON with no markdown:\n{"insurance_provider":"","policy_number":"","cover_type":"","cover_amount_gbp":null,"cover_starts":"YYYY-MM-DD","cover_ends":"YYYY-MM-DD","named_insured":"","extends_to_third_party_premises":null,"notes":""}\n\nCertificate text:\n${text}`,
    });
  } else {
    throw new Error('text or imageUrl required');
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 512, messages }),
  });

  if (!r.ok) throw new Error(`Anthropic API ${r.status}`);
  const data = await r.json();
  const rawText = data.content?.[0]?.text || '{}';
  try {
    return JSON.parse(rawText);
  } catch {
    // Try to extract JSON from text that might have surrounding content
    const match = rawText.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  }
}

function checkCompliance(extracted, minRequirements) {
  const gaps = [];

  // Cover amount check
  if (extracted.cover_amount_gbp !== null && extracted.cover_amount_gbp !== undefined) {
    if (Number(extracted.cover_amount_gbp) < Number(minRequirements.insurance_min_pl)) {
      gaps.push(`cover_amount_too_low: £${extracted.cover_amount_gbp} < required £${minRequirements.insurance_min_pl}`);
    }
  } else {
    gaps.push('cover_amount_not_extracted');
  }

  // Expiry check
  if (extracted.cover_ends) {
    const expires = new Date(extracted.cover_ends);
    const thirtyDaysOut = new Date(Date.now() + 30 * 86400000);
    if (expires < new Date()) gaps.push('policy_already_expired');
    else if (expires < thirtyDaysOut) gaps.push('policy_expires_within_30_days');
  } else {
    gaps.push('expiry_date_not_extracted');
  }

  // Third-party premises extension
  if (extracted.extends_to_third_party_premises === false) {
    gaps.push('no_third_party_premises_extension');
  } else if (extracted.extends_to_third_party_premises === null) {
    gaps.push('third_party_extension_unclear_verify_manually');
  }

  return gaps;
}

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  const auth = requireAuth(req);
  if (!auth.authorized) return res.status(401).json({ error: auth.reason });
  setCors(req, res);

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const { customer_id, certificate_text, certificate_image_url, cover_type = 'goods_in_storage' } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'customer_id required' });
    if (!certificate_text && !certificate_image_url) {
      return res.status(400).json({ error: 'certificate_text or certificate_image_url required' });
    }

    // Load rate card for compliance thresholds
    let rateCard = null;
    try {
      const cards = await sbGet('psnm_rate_card', { is_current: 'eq.true', select: 'insurance_min_pl,insurance_min_goods', limit: 1 });
      rateCard = cards[0] || null;
    } catch (_) {}

    const minRequirements = {
      insurance_min_pl:    Number((rateCard || {}).insurance_min_pl    || 5000000),
      insurance_min_goods: Number((rateCard || {}).insurance_min_goods || 25000),
    };

    // Extract from certificate
    let extracted = {};
    let extractionMethod = 'manual';
    try {
      extracted = await extractInsuranceClaude({
        text: certificate_text,
        imageUrl: certificate_image_url,
      });
      extractionMethod = certificate_image_url ? 'claude_vision' : 'claude_vision';
    } catch (e) {
      console.error('[insurance-verify] Claude extraction failed:', e.message);
      // Continue with empty extraction — Ben will need to fill in manually
    }

    const gaps = checkCompliance(extracted, minRequirements);
    const isCompliant = gaps.length === 0;

    // Deactivate any previous active insurance record for this customer
    const existing = await sbGet('psnm_insurance_records', { customer_id: `eq.${customer_id}`, is_active: 'eq.true', select: 'id' });
    for (const old of existing) {
      await sbPatch('psnm_insurance_records', { id: old.id }, { is_active: false }).catch(() => null);
    }

    // Create new record
    const renewalCheck = extracted.cover_ends
      ? new Date(new Date(extracted.cover_ends).getTime() - 30 * 86400000).toISOString().slice(0,10)
      : null;

    const row = {
      customer_id,
      insurance_provider:        extracted.insurance_provider || null,
      policy_number:             extracted.policy_number || null,
      cover_type,
      cover_amount:              extracted.cover_amount_gbp ? Number(extracted.cover_amount_gbp) : null,
      cover_starts:              extracted.cover_starts || null,
      cover_ends:                extracted.cover_ends || null,
      named_insured:             extracted.named_insured || null,
      certificate_storage_path:  certificate_image_url || null,
      extraction_method:         extractionMethod,
      extraction_raw:            extracted,
      verified_by_ben:           false,
      verification_gaps:         gaps.length ? gaps : null,
      is_compliant:              isCompliant,
      next_renewal_check_at:     renewalCheck,
      is_active:                 true,
    };

    const created = await sbPost('psnm_insurance_records', row);
    const record = Array.isArray(created) ? created[0] : created;

    // If compliant, auto-advance customer status
    if (isCompliant) {
      const customers = await sbGet('psnm_customers', { id: `eq.${customer_id}`, select: 'status' });
      const currentStatus = customers[0]?.status;
      if (currentStatus === 'agreement_signed' || currentStatus === 'quote_sent') {
        await sbPatch('psnm_customers', { id: customer_id }, {
          status: 'insurance_verified',
          insurance_verified_at: new Date().toISOString(),
        }).catch(() => null);
      }
    }

    // Send Telegram alert if gaps found
    if (!isCompliant) {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        const customers = await sbGet('psnm_customers', { id: `eq.${customer_id}`, select: 'business_name' });
        const name = customers[0]?.business_name || customer_id;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ Insurance gaps for ${name}:\n${gaps.join('\n')}\nCheck: /customer-portal admin`,
            parse_mode: 'Markdown',
          }),
        }).catch(() => null);
      }
    }

    return res.status(200).json({
      ok: true,
      record_id:    record.id,
      is_compliant: isCompliant,
      gaps,
      extracted,
    });
  } catch (e) {
    console.error('[onboarding/insurance-verify]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
