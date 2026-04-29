'use strict';

// ── Claim-Source Verification Layer ──────────────────────────────────────────
// Extracts factual claims from a generated draft and verifies each against the
// fact registry. Returns a verdict that routes drafts to correct queue status.
//
// Verdicts:
//   all_green          — every claim matched a registry entry → pending_approval
//   has_red_claims     — one or more claims not in registry   → needs_source
//   insufficient_data  — LLM reported INSUFFICIENT_DATA       → enrichment_required

const Anthropic = require('@anthropic-ai/sdk');

const EXTRACTION_PROMPT = `You are a fact-extraction assistant for a pallet storage cold-email pipeline.

Given an email draft below, extract every verifiable factual claim into a JSON array.
For each claim output:
  { "claim_type": "drive_time"|"facility"|"offer_terms"|"other", "claim_key": "<short key>", "claim_value": "<verbatim value from email>" }

Examples of what counts as a claim:
- Drive time or distance ("1h 15min from Manchester", "60 miles")
- Facility spec ("ambient only", "1,602 pallet spaces", "M18/M1")
- Offer terms ("£3.45/pallet/week", "12-week minimum", "30-day notice")
- Location/postcode ("S66 8HR", "Hellaby")

Do NOT extract:
- Generic opener/closer phrases
- Prospect-specific facts about their business (those are not our claims)
- Questions or calls to action

If the draft contains the literal text "INSUFFICIENT_DATA" anywhere, return exactly:
  { "insufficient_data": true }

Otherwise return exactly:
  { "insufficient_data": false, "claims": [ ... ] }

Draft:
---
{{DRAFT}}
---`;

// ── Registry helpers ──────────────────────────────────────────────────────────

function buildFactBlock(registry) {
  // registry: Array<{ claim_type, claim_key, claim_value }>
  if (!registry || registry.length === 0) return '(no fact registry loaded)';
  const lines = registry.map(r =>
    `  [${r.claim_type}] ${r.claim_key}: ${r.claim_value}`
  );
  return 'VERIFIED FACT REGISTRY:\n' + lines.join('\n');
}

function matchClaim(claim, registry) {
  // Exact key match first
  const exact = registry.find(
    r => r.claim_type === claim.claim_type && r.claim_key === claim.claim_key
  );
  if (exact) return { matched: true, registry_value: exact.claim_value };

  // Fuzzy: same type, value substring match
  const fuzzy = registry.find(
    r => r.claim_type === claim.claim_type &&
         r.claim_value.toLowerCase().includes(claim.claim_value.toLowerCase().slice(0, 8))
  );
  if (fuzzy) return { matched: true, registry_value: fuzzy.claim_value };

  return { matched: false, registry_value: null };
}

// ── Main verifier ─────────────────────────────────────────────────────────────

async function verifyDraft(body, registry) {
  // body: string — the draft email body
  // registry: Array from psnm_atlas_fact_sources rows
  // returns: { verdict, claims, raw_extraction }

  if (body.includes('INSUFFICIENT_DATA')) {
    return {
      verdict: 'insufficient_data',
      claims: [],
      raw_extraction: { insufficient_data: true },
    };
  }

  let extraction;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = EXTRACTION_PROMPT.replace('{{DRAFT}}', body);
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0].text.trim();
    // Strip markdown fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    extraction = JSON.parse(cleaned);
  } catch (err) {
    // On parse/API failure treat as no claims extractable — route to needs_source
    return {
      verdict: 'has_red_claims',
      claims: [],
      error: `extraction_failed: ${err.message}`,
    };
  }

  if (extraction.insufficient_data) {
    return { verdict: 'insufficient_data', claims: [], raw_extraction: extraction };
  }

  const rawClaims = extraction.claims || [];
  const annotated = rawClaims.map(claim => {
    const match = matchClaim(claim, registry);
    return {
      ...claim,
      matched: match.matched,
      registry_value: match.registry_value,
    };
  });

  const redClaims = annotated.filter(c => !c.matched);
  const verdict = redClaims.length === 0 ? 'all_green' : 'has_red_claims';

  return { verdict, claims: annotated, raw_extraction: extraction };
}

module.exports = { buildFactBlock, verifyDraft };
