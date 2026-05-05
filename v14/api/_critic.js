'use strict';

// ── Atlas v2.2 · Layer 4 · Critic ────────────────────────────────────────────
// Input:  draft (subject + body), enrichment_data, angle_brief, touch_number
// Model:  Claude Sonnet 4.6, temperature 0.0 (deterministic)
// Frame:  Sceptical UK ops director, NOT a helpful copywriter
//
// Checks (all must pass):
//   1. opener_specificity    — specific to this prospect or generic?
//   2. speculative_claims    — any numbers/assumptions not in enrichment_data?
//   3. touch_tone_match      — email tone vs actual touch number
//   4. voice_quality         — no banned corp-speak words
//   5. typos_grammar         — basic language quality
//   6. real_reader_test      — would an ops director read past line 2?
//   7. claim_cross_check     — verify claim verifier output matches (no new flags)
//
// Output: { verdict, checks, failed_checks, suggested_rewrite_prompt }
// If fail: caller loops back to Drafter (max 3 attempts).

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL         = 'claude-sonnet-4-6';

// ── System prompt ─────────────────────────────────────────────────────────────
// DIFFERENT framing from Drafter. Critic is adversarial, not helpful.

const CRITIC_SYSTEM = `You are a sharp UK operations director at a mid-sized manufacturing company in the East Midlands. You receive 30+ cold emails every week. You delete most of them in under 5 seconds.

You are NOT reading this email to help the sender. You are reading it to find every reason to delete it.

You care about:
- Being treated like an intelligent adult, not a demographic
- Real, specific information — not vague promises
- Efficient language — you don't have time for filler
- Honest operators — you've seen every cheap trick

What makes you delete immediately:
- Generic opener that could have been sent to anyone
- Made-up numbers or assumptions about YOUR business that the sender couldn't possibly know
- Corporate buzzwords: "leverage", "passionate about", "synergy", "unlock", "elevate", "optimise", "holistic", "seamlessly", "best-in-class"
- Overly familiar tone on a first contact
- Poor grammar or obvious errors
- Email that feels longer than it needs to be
- Internal system labels visible in a customer email — "Touch 3", "v2.2", "lead_id", "pending_approval", etc. A sender who lets their CRM scaffolding leak into the subject line is not paying attention.

Your job: read the draft and score it against each check. Be harsh but specific. Generic feedback is useless — point to specific lines and words.

Return ONLY valid JSON, no markdown wrapper:
{
  "checks": [
    {
      "check": "internal_label_leak",
      "result": "pass" or "fail",
      "note": "Does the subject or body contain any internal system labels, CRM field names, or touch-sequence numbers used as content rather than tone calibration? Banned: 'Touch 1/2/3/4/5', 'v2.1', 'v2.2', 'Atlas' as a system name, 'lead_id', 'draft_id', 'angle_id', 'pending_approval', 'pending_critic', 'needs_revision', 'human_review_required', 'Reasoner', 'Drafter', 'Critic', 'claim_verifier'. Quote the exact offending term and its location if found."
    },
    {
      "check": "opener_specificity",
      "result": "pass" or "fail",
      "note": "specific reason — quote the offending text or confirm what passed"
    },
    {
      "check": "speculative_claims",
      "result": "pass" or "fail",
      "note": "list any specific numbers, statistics, or assumptions about the prospect that are not evidenced in the enrichment data provided"
    },
    {
      "check": "touch_tone_match",
      "result": "pass" or "fail",
      "note": "does the tone match the touch number? Touch 1 = cold and polite. Touch 2-3 = warmer. Touch 4-5 = direct follow-through."
    },
    {
      "check": "voice_quality",
      "result": "pass" or "fail",
      "note": "list any corporate buzzwords found, or confirm none present"
    },
    {
      "check": "typos_grammar",
      "result": "pass" or "fail",
      "note": "list any errors found, or confirm clean"
    },
    {
      "check": "real_reader_test",
      "result": "pass" or "fail",
      "note": "as a busy ops director, would you read past line 2? Why or why not?"
    }
  ],
  "verdict": "pass" or "fail",
  "failed_checks": ["check_name", ...],
  "suggested_rewrite_prompt": "if verdict is fail: one specific instruction for the drafter to fix the identified issues. Be surgical — name what to change and how. If verdict is pass, write null."
}

The verdict is fail if ANY check fails. The verdict is pass only if ALL checks pass.`;

// ── Internal label check (pre-flight kill-switch, no API needed) ─────────────

const INTERNAL_LABELS = [
  'touch 1', 'touch 2', 'touch 3', 'touch 4', 'touch 5',
  'lead_id', 'draft_id', 'angle_id', 'enrichment_id',
  'pending_approval', 'pending_critic', 'needs_revision', 'human_review_required',
  'v2.2', 'v2.1', 'atlas stack', 'atlas v2',
  'claim_verifier', 'reasoner', 'drafter', 'critic',
];

function checkInternalLabels(subject, body) {
  const combined = (subject + ' ' + body).toLowerCase();
  return INTERNAL_LABELS.filter(label => combined.includes(label));
}

// ── Banned words check (pre-flight, no API needed) ────────────────────────────

const BANNED_WORDS = [
  'leverage', 'leveraging', 'leveraged',
  'passionate about', 'passionately',
  'synergy', 'synergies', 'synergistic',
  'unlock', 'unlocking', 'unlocks',
  'elevate', 'elevating', 'elevates',
  'optimise', 'optimising', 'optimised', 'optimize', 'optimizing',
  'seamlessly', 'seamless',
  'best-in-class', 'best in class',
  'world-class', 'world class',
  'holistic',
  'going forward',
  'value-add', 'value add',
  'streamline', 'streamlining',
  'pain point', 'pain points',
  'touch base',
  'circle back',
  'deep dive',
  'thought leader', 'thought leadership',
];

function checkBannedWords(body) {
  const lower = body.toLowerCase();
  return BANNED_WORDS.filter(w => lower.includes(w));
}

// ── Main export ───────────────────────────────────────────────────────────────

async function criticDraft(subject, body, enrichmentData, angleBrief, touchNumber, claimVerifierResult) {
  if (!ANTHROPIC_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };

  // Pre-flight: internal label kill-switch (runs before everything, no API needed)
  const internalLabelsFound = checkInternalLabels(subject, body);
  if (internalLabelsFound.length > 0) {
    return {
      ok: true,
      verdict: 'fail',
      failed_checks: ['internal_label_leak'],
      checks: [{
        check: 'internal_label_leak',
        result: 'fail',
        note: `Internal system labels found in customer-facing copy: ${internalLabelsFound.join(', ')}. These must never appear in subject or body. Remove them and rewrite any sentence that uses touch-number language.`,
      }],
      suggested_rewrite_prompt: `CRITICAL: Remove all internal system labels from subject and body. Found: ${internalLabelsFound.join(', ')}. The touch number is a tone calibration input — never write "Touch X" or the digit in customer copy. Rewrite the subject and any affected lines.`,
    };
  }

  // Pre-flight: banned words (deterministic, no API)
  const bannedFound = checkBannedWords(body);

  // Build enrichment summary for context (what the critic knows the sender DOES have)
  const e = enrichmentData;
  const knownFacts = [];
  if (e.companies_house) {
    knownFacts.push(`- CH: ${e.companies_house.company_name} | ${e.companies_house.company_status} | SIC ${(e.companies_house.sic_codes || []).join(', ')}`);
    if (e.companies_house.directors?.length) {
      knownFacts.push(`- Directors: ${e.companies_house.directors.slice(0, 3).map(d => d.name).join(', ')}`);
    }
  }
  if (e.news?.length > 0) {
    knownFacts.push(`- Known news items: ${e.news.slice(0, 3).map(n => n.title).join(' | ')}`);
  }
  if (e.website?.scraped) {
    knownFacts.push(`- Website content was scraped (${e.website.page_count} pages)`);
  }

  const userMessage = `Here is the draft email you are reading as a sceptical UK ops director.

SUBJECT: ${subject}

BODY:
${body}

---

CONTEXT FOR SCORING:
- Touch number: ${touchNumber} (1 = first ever contact, 5 = fifth in sequence)
- Angle the sender was trying to use: "${angleBrief?.primary_pain_point || 'unknown'}"
- Hook the sender was given: "${angleBrief?.hook || 'unknown'}"
- What the sender LEGITIMATELY KNOWS about your company (from public sources):
${knownFacts.join('\n') || '  (minimal data available)'}

BANNED WORDS PRE-CHECK (already detected, flag in voice_quality if present):
${bannedFound.length > 0 ? bannedFound.join(', ') : 'None detected'}

CLAIM VERIFIER OUTPUT:
${claimVerifierResult ? JSON.stringify({ verdict: claimVerifierResult.verdict, red_count: claimVerifierResult.claims?.filter(c => !c.matched)?.length || 0 }) : 'not run'}

Score the email against every check. Be specific and harsh. Return only valid JSON.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.0,
        system: CRITIC_SYSTEM,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      return { ok: false, error: `Anthropic API ${r.status}`, detail: err.slice(0, 300) };
    }
    const data = await r.json();
    const text = (data.content?.[0]?.text || '').trim();
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: 'critic_parse_failed', raw: text.slice(0, 500) };
    const parsed = JSON.parse(m[0]);

    // Enforce banned word fail if pre-flight found any (belt-and-braces)
    if (bannedFound.length > 0) {
      const voiceCheck = (parsed.checks || []).find(c => c.check === 'voice_quality');
      if (voiceCheck) voiceCheck.result = 'fail';
      if (!parsed.failed_checks?.includes('voice_quality')) {
        parsed.failed_checks = [...(parsed.failed_checks || []), 'voice_quality'];
      }
      parsed.verdict = 'fail';
    }

    // Add claim_cross_check from verifier result
    if (claimVerifierResult?.verdict === 'has_red_claims') {
      const redClaims = (claimVerifierResult.claims || []).filter(c => !c.matched);
      parsed.checks = [...(parsed.checks || []), {
        check: 'claim_cross_check',
        result: 'fail',
        note: `Claim verifier flagged ${redClaims.length} unverified claim(s): ${redClaims.map(c => c.claim_value).join('; ')}`,
      }];
      if (!parsed.failed_checks?.includes('claim_cross_check')) {
        parsed.failed_checks = [...(parsed.failed_checks || []), 'claim_cross_check'];
      }
      parsed.verdict = 'fail';
    }

    return {
      ok: true,
      verdict:                 parsed.verdict || 'fail',
      checks:                  parsed.checks || [],
      failed_checks:           parsed.failed_checks || [],
      suggested_rewrite_prompt: parsed.suggested_rewrite_prompt || null,
      banned_words_found:      bannedFound,
    };
  } catch (e) {
    return { ok: false, error: 'critic_exception', detail: e.message };
  }
}

module.exports = { criticDraft };
