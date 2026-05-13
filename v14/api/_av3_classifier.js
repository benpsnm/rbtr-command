'use strict';
// Atlas v3 — ClassifierAgent
// Scores prospect fit for PSNM (B2B ambient pallet storage, Hellaby Rotherham S66 8HR).
// Improvements over v2: bankruptcy-aware, marketplace-seller-aware, multi-site-aware.

const db = require('./_av3_db');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-4-6';

// Hard exclusions: companies that CANNOT use PSNM regardless of score
const HARD_EXCLUSIONS = {
  chilled:    /food|fresh|frozen|chilled|refrigerat|dairy|produce|meat|fish|poultry|veg|perishab/i,
  hazmat:     /pharma|medicine|medical|drug|clinical|biotech|chemical|hazmat|dangerous|flammable|aerosol|corrosive|toxic|explosive|radioactive/i,
  competitor: /pallet\s*storage|3pl|fulfilment\s*(center|centre)|third.party\s*logistic|warehouse\s*operator|self.storage\s*provider/i,
  residential:/residential\s*storage|household\s*storage|student\s*storage|personal\s*storage/i,
};

// Soft positives: signals that raise fit score
const FIT_SIGNALS = [
  { pattern: /overflow\s*storage|seasonal\s*stock|peak\s*demand|flexible\s*storage/i, weight: 20 },
  { pattern: /e.?commerce|online\s*retail|amazon\s*seller|marketplace/i, weight: 15 },
  { pattern: /import|export|freight|logistics\s*(company)?|haulage|transport/i, weight: 12 },
  { pattern: /south\s*yorkshire|west\s*yorkshire|derbyshire|nottingham|sheffield|rotherham|doncaster/i, weight: 18 },
  { pattern: /manufacturing|production|assembly|fabricat/i, weight: 10 },
  { pattern: /wholesale|distributor|distribution/i, weight: 15 },
  { pattern: /growing|expansion|new\s*premises|additional\s*space|scaling/i, weight: 15 },
  { pattern: /insolvency|administration|restructur|wind.*down/i, weight: 12 }, // asset disposal = short-term storage need
  { pattern: /construction|building\s*materials|timber|steel|hardware/i, weight: 8 },
  { pattern: /b2b|trade\s*(only|supply)|trade\s*counter/i, weight: 8 },
];

function computeQuickFitScore(prospect) {
  const text = [
    prospect.company, prospect.industry, prospect.city, prospect.postcode,
    prospect.notes, JSON.stringify(prospect.enrichment_data || {}),
  ].join(' ');

  // Check hard exclusions first
  const exclusions = [];
  for (const [flag, rx] of Object.entries(HARD_EXCLUSIONS)) {
    if (rx.test(text)) exclusions.push(flag);
  }
  if (exclusions.length > 0) return { score: 0, exclusions, method: 'hard_exclusion' };

  // Accumulate fit signals
  let score = 30; // base score for any active UK business
  for (const { pattern, weight } of FIT_SIGNALS) {
    if (pattern.test(text)) score += weight;
  }

  // Proximity bonus (rough postcode area)
  if (prospect.postcode) {
    const pca = prospect.postcode.substring(0, 2).toUpperCase();
    const proximate = new Set(['S6','S7','S8','S9','S1','S2','S3','S4','S5','DN','HD','HX','WF','BD','LS','DE','NG']);
    if (proximate.has(pca)) score += 15;
  }

  // Pallet estimate bonus
  if ((prospect.pallet_estimate || 0) >= 100) score += 15;
  else if ((prospect.pallet_estimate || 0) >= 20) score += 8;

  return { score: Math.min(score, 100), exclusions: [], method: 'heuristic' };
}

async function claudeClassify(prospect) {
  if (!ANTHROPIC_API_KEY) return null;

  const enrichText = JSON.stringify(prospect.enrichment_data || {}, null, 2).slice(0, 2000);

  const prompt = `You are classifying a B2B prospect for PSNM — Pallet Storage Near Me. PSNM is a 1,602-space ambient-only pallet warehouse in Hellaby, Rotherham S66 8HR. We want businesses that need short- or medium-term overflow pallet storage for non-perishable, non-hazardous goods.

PROSPECT DATA:
Company: ${prospect.company}
Industry: ${prospect.industry || 'unknown'}
City: ${prospect.city || 'unknown'}
Pallet estimate: ${prospect.pallet_estimate || 'unknown'}
Enrichment: ${enrichText}

Return ONLY valid JSON:
{
  "fit_score": 0-100,
  "fit_reasoning": "2-sentence plain explanation",
  "primary_sector": "one of: ecommerce/manufacturing/wholesale/distribution/import-export/construction/retail/services/other",
  "exclusion_flags": [],
  "ideal_hook": "one specific thing about this company that makes PSNM storage relevant — cite an enrichment fact",
  "confidence": 0-100
}

Hard exclusion rules (set fit_score=0 if any apply):
- Food/pharma/hazmat/chilled goods
- Already operates own warehouse > 5,000 sqft
- Is a competitor (3PL, storage provider, fulfilment centre)
- Residential/personal storage need

Bankruptcy note: if company is in administration/insolvency, they may need short-term stock storage during wind-down — this is a valid fit, not an exclusion.`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!r.ok) return null;
  const j = await r.json();
  const raw = (j.content || [])[0]?.text || '';
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

class ClassifierAgent {
  // Classify a single enriched prospect. Returns { ok, prospect_id, fit_score, exclusion_flags, stage }
  async classifyOne(prospect) {
    const prospectId = prospect.id;

    // Fast heuristic pass
    const quick = computeQuickFitScore(prospect);

    let finalScore = quick.score;
    let exclusionFlags = quick.exclusions;
    let primarySector = null;
    let idealHook = null;
    let method = quick.method;

    // Only call Claude if heuristic score is ambiguous (30–70) or heuristic had no exclusions
    if (quick.method !== 'hard_exclusion' && quick.score >= 20 && ANTHROPIC_API_KEY) {
      try {
        const ai = await claudeClassify(prospect);
        if (ai) {
          finalScore = ai.fit_score;
          exclusionFlags = ai.exclusion_flags || [];
          primarySector = ai.primary_sector;
          idealHook = ai.ideal_hook;
          method = 'claude';
        }
      } catch (e) {
        console.warn('[ClassifierAgent] Claude classification failed, using heuristic:', e.message);
      }
    }

    // Determine next stage
    const isDead = finalScore < 30 || exclusionFlags.length > 0;
    const newStage = isDead ? 'dead' : 'classified';
    const newStatus = isDead ? 'dead' : 'active';

    const updatePayload = {
      fit_score:       finalScore,
      exclusion_flags: exclusionFlags.length > 0 ? exclusionFlags : null,
      industry:        prospect.industry || primarySector,
      pipeline_stage:  newStage,
      status:          newStatus,
    };
    if (idealHook) {
      updatePayload.notes = (prospect.notes ? prospect.notes + '\n' : '') + `[Hook] ${idealHook}`;
    }
    if (primarySector && !prospect.industry) {
      updatePayload.industry = primarySector;
    }

    await db.update('prospects', { id: prospectId }, updatePayload);
    await db.logStageTransition(prospectId, prospect.pipeline_stage, newStage, 'ClassifierAgent',
      `score=${finalScore} method=${method} exclusions=${exclusionFlags.join(',') || 'none'}`);

    return {
      ok: true,
      prospect_id:     prospectId,
      fit_score:       finalScore,
      exclusion_flags: exclusionFlags,
      primary_sector:  primarySector,
      new_stage:       newStage,
      method,
    };
  }

  // Run classification on a batch of enriched prospects awaiting classification
  async runBatch(limit = 10) {
    const enriched = await db.select('prospects',
      `pipeline_stage=eq.enriched&status=eq.active&order=created_at.asc&limit=${limit}`);
    if (!Array.isArray(enriched) || enriched.length === 0) {
      return { ok: true, processed: 0, reason: 'no_enriched_prospects' };
    }

    const results = [];
    for (const p of enriched) {
      if (results.length > 0 && ANTHROPIC_API_KEY) await new Promise(r => setTimeout(r, 800));
      const r = await this.classifyOne(p);
      results.push(r);
    }

    const advanced = results.filter(r => r.ok && r.new_stage === 'classified').length;
    const dead = results.filter(r => r.ok && r.new_stage === 'dead').length;
    const failed = results.filter(r => !r.ok).length;

    return { ok: true, processed: enriched.length, advanced, dead, failed };
  }
}

module.exports = ClassifierAgent;
