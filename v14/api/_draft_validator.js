// _draft_validator.js — Atlas v2 quality gate
// Guards against regression on the locked template principles (v2.0, 2026-04-28).
// Reference: api/docs/_atlas_v2_reference_email.md (POO-CH POUCH, 28 Apr 2026)
//
// Usage:
//   const { validateDraft } = require('./_draft_validator');
//   const result = validateDraft({ subject, body });
//   // result: { pass: boolean, issues: Array<{ rule, type, severity, description, offending? }> }

'use strict';

// ── Forbidden patterns ────────────────────────────────────────────────────────
// Things that must NEVER appear in a draft. Each is a regression against the
// locked template. Type: 'forbidden'. Severity: 'error' (hard fail).

const FORBIDDEN = [
  {
    rule: 'no_deposit',
    pattern: /\b(no deposit|zero deposit)\b/i,
    description: 'Removed offer element — "no deposit" is not part of current offer',
  },
  {
    rule: 'no_paperwork',
    pattern: /\b(zero paperwork|no paperwork)\b/i,
    description: 'Inaccurate claim — customers sign T&Cs, insurance check, onboarding form',
  },
  {
    rule: 'real_facility',
    pattern: /\breal (facility|despatch|warehouse)\b/i,
    description: 'Defensive framing — never use "real facility / real despatch / real warehouse"',
  },
  {
    rule: 'one_in_four',
    pattern: /\b(1 in 4|one in four)\b/i,
    description: 'Fabricated conversion stat — PSNM has no verified conversion data',
  },
  {
    rule: 'population_weighted',
    pattern: /population.weighted cent(re|er)/i,
    description: 'Undefendable claim — use "GB\'s logistics heartland" or drive-time facts only',
  },
  {
    rule: 'percentage_saving',
    pattern: /\b(save[s]?|cut[s]?|reduc(e[s]?|ing|tion))[^.]{0,40}(~?\d+[-–]\d*%|\d+%)/i,
    description: 'Unverifiable percentage claim — use drive-time facts only',
  },
  {
    rule: 'competitor_rates',
    pattern: /(Midlands rates?|£[34]\.\d{2}[–-]£?[45]\.\d{2}|£4\.\d{2}|£5\.\d{2})/i,
    description: 'Competitor rate benchmarking — prohibited; use "competitive central UK pricing"',
  },
  {
    rule: 'coffee_comparison',
    pattern: /less than (a |your )?(daily )?coffee/i,
    description: 'Trivialising comparison — not permitted',
  },
  {
    rule: 'old_offer_free_month',
    pattern: /\b(free first month|first month free|free month)\b/i,
    description: 'Old offer — replaced by "first week free with 12-week commitment"',
  },
  {
    rule: 'old_offer_no_contract',
    pattern: /,?\s*no contract\b/i,
    description: 'Old offer — we now require a 12-week commitment; "no contract" is wrong',
  },
  {
    rule: 'timing_48h',
    pattern: /\b(48.hour|48 hours?|same.week start|next.day collection)\b/i,
    description: 'Retired timing promise — use "typically 3-5 working days from contract signed"',
  },
  {
    rule: 'filler_opener',
    pattern: /I hope (this email |this message )?finds you/i,
    description: 'Generic filler opener — prohibited',
  },
  {
    rule: 'filler_close',
    pattern: /please don.?t hesitate/i,
    description: 'Generic filler close — prohibited',
  },
  {
    rule: 'apology_contact',
    pattern: /sorry (to bother|for (bothering|interrupting|reaching out))/i,
    description: 'Apologetic framing — Cardone principle: we believe in the offer, we don\'t apologise for it',
  },
];

// ── Required patterns ─────────────────────────────────────────────────────────
// Things that MUST appear. Missing any = soft fail (warning, not auto-reject).
// Severity: 'warning'.

const REQUIRED = [
  {
    rule: 'signoff_name',
    pattern: /Ben Greenwood/,
    description: 'Missing sign-off: "Ben Greenwood"',
  },
  {
    rule: 'signoff_title',
    pattern: /Founder — Pallet Storage Near Me/,
    description: 'Missing sign-off: "Founder — Pallet Storage Near Me"',
  },
  {
    rule: 'signoff_location',
    pattern: /Hellaby, Rotherham/,
    description: 'Missing sign-off location: "Hellaby, Rotherham"',
  },
  {
    rule: 'signoff_phone',
    pattern: /07506 255033/,
    description: 'Missing or wrong phone number in sign-off',
  },
  {
    rule: 'signoff_email',
    pattern: /sales@palletstoragenearme\.co\.uk/,
    description: 'Missing sign-off email address',
  },
  {
    rule: 'signoff_website',
    pattern: /palletstoragenearme\.co\.uk/,
    description: 'Missing sign-off website',
  },
  {
    rule: 'drive_time_fact',
    pattern: /\b(Glasgow|London|Cardiff|Liverpool|Felixstowe|Southampton)\b.{0,30}\b\d(\.\d)? ?h(ou?r|r)/i,
    description: 'Missing drive-time fact — geographic argument is the core value prop',
  },
  {
    rule: 'trial_offer_present',
    pattern: /\b(first week free|free first (storage )?week|week 1|week one free|trial week|free (storage )?week)\b/i,
    description: 'Trial offer not mentioned — should reference "first week free"',
  },
  {
    rule: 'followup_signal',
    pattern: /\b(follow.?up|follow up next|I.ll be in touch|in touch next)\b/i,
    description: 'Missing Cardone Touch 1 follow-up signal — "I\'ll follow up next week if I don\'t hear from you"',
  },
];

// ── Subject line rules ────────────────────────────────────────────────────────

const SUBJECT_RULES = [
  {
    rule: 'subject_length',
    check: (subject) => subject.length > 60,
    description: (subject) => `Subject is ${subject.length} chars — must be under 60`,
    severity: 'warning',
  },
  {
    rule: 'subject_present',
    check: (subject) => !subject || subject.trim().length === 0,
    description: () => 'Subject line is empty',
    severity: 'error',
  },
  {
    rule: 'subject_generic',
    pattern: /^(re:|fwd:|hello|hi |introduction|warehousing services?|storage services?|pallet storage$)/i,
    description: 'Subject appears generic — should be specific to company or industry',
    severity: 'warning',
  },
];

// ── Word count ────────────────────────────────────────────────────────────────
// Count words in body before the sign-off block begins.
// Target: 120-170 words. Warn below 100 or above 190.

function countBodyWords(body) {
  const sigIdx = body.lastIndexOf('Ben Greenwood');
  const bodyOnly = sigIdx !== -1 ? body.slice(0, sigIdx).trim() : body.trim();
  return bodyOnly.split(/\s+/).filter(Boolean).length;
}

// ── Voice drift heuristics ────────────────────────────────────────────────────
// Patterns that suggest the AI has drifted toward generic B2B marketing copy
// rather than the locked Atlas v2 voice.

const VOICE_DRIFT = [
  {
    rule: 'we_are_pleased',
    pattern: /we (are|'re) pleased to (offer|provide|present|inform)/i,
    description: 'Corporate tone drift: "we are pleased to..."',
  },
  {
    rule: 'at_your_convenience',
    pattern: /at your (earliest )?convenience/i,
    description: 'Passive filler: "at your convenience"',
  },
  {
    rule: 'world_class',
    pattern: /\b(world.class|best.in.class|industry.leading|state.of.the.art)\b/i,
    description: 'Marketing puffery: avoid superlative brand claims',
  },
  {
    rule: 'passive_hope',
    pattern: /\b(hoping to|hope (we|to|you))\b/i,
    description: 'Passive framing: Cardone voice is confident, not hopeful',
  },
  {
    rule: 'excessive_questions',
    check: (body) => (body.match(/\?/g) || []).length > 3,
    description: (body) => `${(body.match(/\?/g) || []).length} question marks — email should have 0-2 at most`,
  },
  {
    rule: 'exclamation_overuse',
    check: (body) => (body.match(/!/g) || []).length > 1,
    description: (body) => `${(body.match(/!/g) || []).length} exclamation marks — email should have 0-1`,
  },
];

// ── Main validator ────────────────────────────────────────────────────────────

function validateDraft({ subject = '', body = '' }) {
  const issues = [];

  // 1. Forbidden patterns — hard errors
  for (const rule of FORBIDDEN) {
    const match = body.match(rule.pattern);
    if (match) {
      issues.push({
        rule: rule.rule,
        type: 'forbidden',
        severity: 'error',
        description: rule.description,
        offending: match[0],
      });
    }
  }

  // 2. Required patterns — warnings
  for (const rule of REQUIRED) {
    if (!rule.pattern.test(body)) {
      issues.push({
        rule: rule.rule,
        type: 'required_missing',
        severity: 'warning',
        description: rule.description,
      });
    }
  }

  // 3. Subject line checks
  for (const rule of SUBJECT_RULES) {
    let hit = false;
    if (rule.pattern) {
      hit = rule.pattern.test(subject);
    } else if (rule.check) {
      hit = rule.check(subject);
    }
    if (hit) {
      issues.push({
        rule: rule.rule,
        type: 'subject',
        severity: rule.severity,
        description: typeof rule.description === 'function' ? rule.description(subject) : rule.description,
        offending: rule.pattern ? subject.match(rule.pattern)?.[0] : undefined,
      });
    }
  }

  // 4. Word count
  const wordCount = countBodyWords(body);
  if (wordCount < 100) {
    issues.push({
      rule: 'word_count_low',
      type: 'structure',
      severity: 'warning',
      description: `Body is ${wordCount} words — too short (target 120-170)`,
    });
  } else if (wordCount > 190) {
    issues.push({
      rule: 'word_count_high',
      type: 'structure',
      severity: 'warning',
      description: `Body is ${wordCount} words — too long (target 120-170)`,
    });
  }

  // 5. Voice drift heuristics
  for (const rule of VOICE_DRIFT) {
    let hit = false;
    let matchStr;
    if (rule.pattern) {
      const match = body.match(rule.pattern);
      hit = !!match;
      matchStr = match?.[0];
    } else if (rule.check) {
      hit = rule.check(body);
    }
    if (hit) {
      issues.push({
        rule: rule.rule,
        type: 'voice_drift',
        severity: 'warning',
        description: typeof rule.description === 'function' ? rule.description(body) : rule.description,
        offending: matchStr,
      });
    }
  }

  // Pass = zero errors (forbidden hits or missing required with severity error).
  // Warnings alone do not block — they land in pending_approval but are surfaced in WMS.
  const hasErrors = issues.some(i => i.severity === 'error');
  const pass = !hasErrors;

  return { pass, issues, word_count: wordCount };
}

module.exports = { validateDraft };
