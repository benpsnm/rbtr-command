'use strict';

// ── Claim-Source Verification Layer ──────────────────────────────────────────
// Extracts factual claims from a generated draft and verifies each against the
// fact registry. Returns a verdict that routes drafts to correct queue status.
//
// Verdicts:
//   all_green          — every claim matched a registry entry → pending_approval
//   has_red_claims     — one or more claims not in registry   → needs_source
//   insufficient_data  — LLM reported INSUFFICIENT_DATA       → enrichment_required

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const EXTRACTION_PROMPT = `You are a fact-extraction assistant for a pallet storage cold-email pipeline.

Given an email draft below, extract every verifiable factual claim into a JSON array.
For each claim output:
  { "claim_type": "drive_time"|"facility"|"offer_terms"|"other", "claim_key": "<short key>", "claim_value": "<verbatim text from email>" }

EXTRACT these types of claims:
- Drive times with duration ("1h 15min from Manchester", "3h 15min from London") — include the duration verbatim
- Distances in miles ("60 miles", "170 miles")
- Facility capacity numbers ("1,602 pallet spaces", "1,602-space facility")
- Facility spec type ("ambient only", "ambient pallet facility")
- Postcode only — NOT town or city names ("S66 8HR" yes, "Hellaby" or "Rotherham" no)
- Motorway access ("M18/M1")
- Prices with £ sign ("£3.95/pallet/week", "£3.50 per pallet movement")
- Complete offer statements as ONE claim — do NOT split sub-components ("First week free when you commit to 12 weeks" is ONE claim, not two)
- Notice period ("30-day notice to cancel after the initial 12 weeks")
- Onboarding timeline — use claim_type "offer_terms" ("3-5 working days from contract signed")

DO NOT extract:
- Town or city names without a postcode (no "Hellaby", "Rotherham", "Manchester" alone)
- Volume ranges without an associated price (no "10-50 pallets" if £3.95/pallet/week is already extracted)
- Sub-components of an offer statement — extract the full sentence as one claim
- Generic phrases, greetings, sign-off lines, questions, calls to action
- Facts about the prospect's own business

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

// Extract distinctive numeric tokens from a string.
// Patterns: currency (£3.95), drive times (3h 15min), distances (170 miles),
// large formatted numbers (1,602), hyphenated periods (30-day, 12-week),
// working-day ranges (3-5 working days).
function extractNumericTokens(text) {
  const t = text.toLowerCase();
  const tokens = new Set();
  (t.match(/£[\d,]+\.?\d*/g) || []).forEach(m => tokens.add(m));
  (t.match(/\d+h\s*\d+\s*min|\d+h\b(?!\s*\d)|\b\d+\s*min\b/g) || [])
    .forEach(m => tokens.add(m.replace(/\s+/g, '')));
  (t.match(/\d+\s*miles?\b/g) || []).forEach(m => tokens.add(m.replace(/\s+/, ' ').trim()));
  (t.match(/\d{1,3}(?:,\d{3})+/g) || []).forEach(m => tokens.add(m));
  (t.match(/\d+-(?:day|week|month)s?/g) || []).forEach(m => tokens.add(m));
  (t.match(/\d+-\d+\s*working\s*days?/g) || []).forEach(m => tokens.add(m.replace(/\s+/, ' ').trim()));
  return tokens;
}

function matchClaim(claim, registry) {
  // 1. Exact key match — same claim_type only
  const exact = registry.find(
    r => r.claim_type === claim.claim_type && r.claim_key === claim.claim_key
  );
  if (exact) return { matched: true, registry_value: exact.claim_value };

  // Determine which registry entries to search.
  // claim_type 'other' means haiku couldn't classify it — try all types as fallback.
  const sameType = claim.claim_type === 'other'
    ? registry
    : registry.filter(r => r.claim_type === claim.claim_type);
  const cv = claim.claim_value.toLowerCase();

  // 2. Bidirectional phrase match — skipped for drive_time.
  // Drive times must use numeric token matching only: two times can share the same
  // minute portion (e.g. "1h 30min" and "3h 30min" both contain "h 30min ") while
  // referring to completely different journeys. Phrase matching would create false
  // positives that let fabricated drive times through.
  if (claim.claim_type !== 'drive_time') {
    // Normalise hyphens to spaces so "ambient-only" matches "ambient only".
    const cvNorm = cv.replace(/-/g, ' ');
    for (const r of sameType) {
      const rv = r.claim_value.toLowerCase().replace(/-/g, ' ');
      // Must be ≥ 8 chars AND ≥ 25% of the registry value length.
      // The 25% floor prevents short generic substrings (e.g. "12 weeks" at 22% of
      // notice_period) from incidentally matching the wrong registry entry.
      const minLen = Math.max(8, Math.ceil(rv.length * 0.25));
      for (let len = Math.min(cvNorm.length, rv.length); len >= minLen; len--) {
        for (let i = 0; i <= cvNorm.length - len; i++) {
          if (rv.includes(cvNorm.slice(i, i + len))) {
            return { matched: true, registry_value: r.claim_value };
          }
        }
      }
    }
  }

  // 3. Numeric token match — same claim_type only (or all types for 'other').
  // A distinctive numeric token (currency, time, distance, large number, period)
  // appearing in both the claim and a registry entry is treated as a match.
  // For drive_time this is the ONLY match path — exact hour+minute combination required.
  const claimTokens = extractNumericTokens(cv);
  if (claimTokens.size > 0) {
    for (const r of sameType) {
      const regTokens = extractNumericTokens(r.claim_value.toLowerCase());
      if ([...claimTokens].some(t => regTokens.has(t))) {
        return { matched: true, registry_value: r.claim_value };
      }
    }
  }

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
    const prompt = EXTRACTION_PROMPT.replace('{{DRAFT}}', body);
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!aiRes.ok) throw new Error(`Anthropic API ${aiRes.status}`);
    const aiJson = await aiRes.json();
    const text = (aiJson?.content?.[0]?.text || '').trim();
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
