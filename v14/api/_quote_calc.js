// ── WAM Auto-Quote Calculator ────────────────────────────────────────────────
// Pure synchronous math — no I/O, no external deps.
// Import: const calcQuote = require('./_quote_calc');
// Usage:  calcQuote({ pallet_count, duration_weeks, product_nature, offer })
//   offer = offer_json from psnm_offer_config (rate_tiers, handling_in_rate, etc.)
//   Returns a quote object OR { blocked: true, reason: string }

const BLOCKED_NATURES = [
  'hazardous', 'dangerous', 'chemical', 'flammable', 'explosive', 'toxic',
  'food', 'chilled', 'refrigerated', 'frozen', 'temperature-controlled',
  'temperature controlled', 'cold store', 'cold chain',
  'pharma', 'pharmaceutical', 'controlled drug',
];

module.exports = function calcQuote({ pallet_count, duration_weeks, product_nature, offer }) {
  const nature = (product_nature || '').toLowerCase();

  // Hard stop — blocked product types
  for (const blocked of BLOCKED_NATURES) {
    if (nature.includes(blocked)) {
      const label = blocked === 'food' ? 'food (ambient only — no temp-controlled)'
        : blocked === 'chilled' || blocked === 'refrigerated' || blocked === 'frozen' ? 'temperature-controlled goods'
        : blocked;
      return { blocked: true, auto_quote_blocked: true, reason: `We don't currently handle ${label} — needs human triage` };
    }
  }

  const n = parseInt(pallet_count) || 0;
  const w = parseInt(duration_weeks) || 8;

  if (n === 0) {
    return { blocked: true, auto_quote_blocked: true, reason: 'Pallet count unknown — needs human review before quoting' };
  }

  // Rates from offer config or hardcoded fallbacks
  const tiers = (offer && offer.rate_tiers) ? offer.rate_tiers : [
    { range_min: 1,   range_max: 49,   rate_per_pallet_week: 3.95 },
    { range_min: 50,  range_max: 149,  rate_per_pallet_week: 3.45 },
    { range_min: 150, range_max: null, rate_per_pallet_week: 2.95 },
  ];
  const movementRate = Number((offer && offer.handling_in_rate) || 3.50);
  const onboardingFee = Number((offer && offer.onboarding_fee) || 50);

  // Tier lookup
  const tier = tiers.find(t => n >= t.range_min && (t.range_max === null || n <= t.range_max))
    || tiers[tiers.length - 1];
  const rate_used = Number(tier.rate_per_pallet_week);
  const rate_tier = n >= 150 ? 'bulk' : n >= 50 ? 'mid' : 'small';

  // Fee components
  const storage_total   = round2(n * rate_used * w);
  const receipt_total   = round2(n * movementRate);
  const despatch_total  = round2(n * movementRate);
  const onboarding      = w >= 12 ? 0 : onboardingFee;
  const subtotal        = round2(storage_total + receipt_total + despatch_total + onboarding);
  const vat             = round2(subtotal * 0.20);
  const all_in          = round2(subtotal + vat);
  const deposit         = Math.max(50, Math.ceil((all_in * 0.10) / 10) * 10);

  // Helpful display figures
  const weekly_storage       = round2(n * rate_used);
  const first_month_saving   = round2(weekly_storage * 4.33);  // ~4.33 weeks/month

  return {
    blocked: false,
    pallet_count:      n,
    rate_tier,
    rate_used,
    weeks_assumed:     w,
    storage_total,
    receipt_total,
    despatch_total,
    onboarding,
    subtotal,
    vat,
    all_in,
    deposit,
    weekly_storage,
    first_month_saving,
  };
};

function round2(n) { return Math.round(n * 100) / 100; }
