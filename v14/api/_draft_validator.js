// _draft_validator.js — Atlas v2 quality gate
// Guards against regression on the locked template principles.
// v2.0 — LOCKED 2026-04-28
// v2.1 — 2026-04-29: canonical-offer enforcement, unsubstantiated social proof,
//                    drive-time source tagging, speculative prospect claims.
// Reference: api/docs/_atlas_v2_reference_email.md (POO-CH POUCH, 28 Apr 2026)
//
// Usage:
//   const { validateDraft, VERIFIED_DRIVE_TIMES } = require('./_draft_validator');
//   const result = validateDraft({ subject, body, drive_time_sources });
//   // drive_time_sources: optional Array<{ destination, source: 'maps_api'|'verified_static' }>
//   // result: { pass: boolean, issues: Array<{ rule, type, severity, description, offending? }> }

'use strict';

// ── Verified static drive-time table ──────────────────────────────────────────
// Source: pre-verified by Ben (2026-04-29). Hellaby S66 8HR origin.
// Any draft using a drive time outside this table requires source: 'maps_api'.
// Times are in hours (decimal) and miles. Update only with verified data.

const VERIFIED_DRIVE_TIMES = {
  glasgow:    { hours: 4.5,  miles: 272, label: '4h 30min' },
  london:     { hours: 3.25, miles: 170, label: '3h 15min' },  // central London
  felixstowe: { hours: 3.5,  miles: 190, label: '3h 30min' },
  manchester: { hours: 1.25, miles: 60,  label: '1h 15min' },
  birmingham: { hours: 1.75, miles: 95,  label: '1h 45min' },
  leeds:      { hours: 0.75, miles: 35,  label: '45min' },
  sheffield:  { hours: 0.42, miles: 12,  label: '25min' },
};

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
  // ── v2.1 · canonical offer enforcement ──────────────────────────────────────
  // Locked offer = "first week free WITH 12-week commitment". Never a free walk-away.
  {
    rule: 'offer_walk_away',
    pattern: /\bwalk[- ]away\b/i,
    description: 'Contradicts canonical trial offer — offer is "first week free with 12-week commit", NOT a free walk-away',
  },
  {
    rule: 'offer_week2_no_bill',
    pattern: /week ?2 doesn'?t bill|week 2 won'?t bill|week 2 doesn'?t charge/i,
    description: 'Contradicts canonical trial offer — week 2 onwards is committed under the 12-week minimum',
  },
  {
    rule: 'offer_no_commitment',
    pattern: /\bno commitment\b|\bcancel anytime in week ?1\b|\bcancel any time\b/i,
    description: 'Contradicts canonical trial offer — 12-week commitment is part of the trial',
  },
  {
    rule: 'offer_money_back',
    pattern: /\b(only pay if|money[- ]back|refund (you|your money)|risk[- ]free trial)\b/i,
    description: 'Contradicts canonical trial offer — no money-back/risk-free framing; commitment is structural',
  },
  // ── v2.1 · unsubstantiated social proof ─────────────────────────────────────
  {
    rule: 'social_proof_real_x',
    pattern: /\breal (product|customers?|results|stock)\b/i,
    description: 'Unsubstantiated social-proof claim — implies a customer base we cannot evidence; speak from operator perspective',
  },
  {
    rule: 'social_proof_aggregated',
    pattern: /\b(operators tell us|customers say|we hear from|customers tell us|operators say|clients tell us|users say)\b/i,
    description: 'Aggregated-voice social proof — implies a customer base; use first-person operator framing instead ("I built this because…")',
  },
  // ── v2.1 · speculative prospect claims ──────────────────────────────────────
  // We don't know the prospect's operations — never assert facts about them.
  // Allowed: questions ("what does your dispatch profile look like?") and offers ("if X matters, here's ours").
  {
    rule: 'speculative_you_can_probably',
    pattern: /\byou can probably\b/i,
    description: 'Speculative prospect claim — assumes knowledge of prospect ops; reframe as a question or offer',
  },
  {
    rule: 'speculative_youre_probably',
    pattern: /\byou'?re probably (hitting|losing|wasting|paying|stuck|dealing with|overpaying|short on|running)\b/i,
    description: 'Speculative prospect claim — assumes their state; reframe as a question or offer',
  },
  {
    rule: 'speculative_youre_losing',
    pattern: /\byou'?re losing \w+ on\b/i,
    description: 'Speculative prospect claim — asserts a loss we cannot evidence; reframe as a question',
  },
  {
    rule: 'speculative_your_setup_is',
    pattern: /\byour current setup is (slow|expensive|inefficient|wrong|wasteful|too \w+)\b/i,
    description: 'Speculative prospect claim — judges their setup we have not seen; reframe as a question',
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
    // Accept verified-label cities + the legacy regional ports.
    // Match "4h 30min", "4 hours", "45min", "3h", "1h 15min", "3.5 hours", etc.
    pattern: /\b(Glasgow|London|Cardiff|Liverpool|Felixstowe|Southampton|Manchester|Birmingham|Leeds|Sheffield)\b.{0,40}?\b(\d{1,2}(?:\.\d+)?\s?(?:hours?|hrs?|h\b)|\d{1,2}\s?min)/i,
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

// ── Drive-time detection ──────────────────────────────────────────────────────
// Catches phrases like "Glasgow is 4 hours from us", "London 3 hours", "Manchester 1h 15min",
// "Felixstowe port 3 hours", "Glasgow 4hrs". Captures destination + stated time.
// Returns Array<{ destination, stated_hours, raw }>.

// Match city name (single word, capitalized) optionally followed by another
// capitalized word ("New York") or " port" ("Felixstowe port"). Then up to 30
// non-period chars, then a numeric duration. We do NOT extend the destination
// across lowercase words like "is" or "from".
const DRIVE_TIME_REGEX =
  /\b([A-Z][a-zA-Z]+(?:[ -][A-Z][a-zA-Z]+)?(?: port)?)\b[^.,\n]{0,30}?\b(\d{1,2}(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)(?:\s*(\d{1,2})\s*min(?:utes?)?)?/g;

// Skip self-references: "Hellaby sits 4 hours from Glasgow" describes Glasgow,
// not Hellaby, as the destination. Same for the company name and Rotherham.
const ORIGIN_TOKENS = new Set(['hellaby', 'rotherham', 'psnm', 'pallet', 'we', 'i', 'ben']);

function extractDriveTimeMentions(body) {
  const out = [];
  let m;
  const re = new RegExp(DRIVE_TIME_REGEX.source, 'g');
  while ((m = re.exec(body)) !== null) {
    const dest = m[1].trim().toLowerCase();
    const firstWord = dest.split(/\s+/)[0];
    if (ORIGIN_TOKENS.has(firstWord)) continue; // origin reference, not a destination claim
    const hours = parseFloat(m[2]) + (m[3] ? parseInt(m[3], 10) / 60 : 0);
    out.push({ destination: dest, stated_hours: hours, raw: m[0] });
  }
  return out;
}

// Resolve a destination string against the verified table.
// Returns the verified entry, or null if not in table.
function lookupVerified(destination) {
  // strip " port" suffix for matching ("felixstowe port" → "felixstowe")
  const key = destination.replace(/\s+port$/, '').trim();
  return VERIFIED_DRIVE_TIMES[key] || null;
}

// ── Main validator ────────────────────────────────────────────────────────────
// Optional: drive_time_sources = [{ destination: 'glasgow', source: 'maps_api'|'verified_static' }]
// When the generator wires Google Maps Distance Matrix, it can pass per-destination
// source tags. Without sources, validator falls back to the verified static table only.

function validateDraft({ subject = '', body = '', drive_time_sources = null }) {
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

  // 1a. Canonical-offer pairing: if "first week free" appears, "12 weeks" or
  // "12-week commit" must appear in the same paragraph. Otherwise the trial
  // is being framed without its commitment leg, which contradicts the offer.
  const paragraphs = body.split(/\n\s*\n/);
  for (const para of paragraphs) {
    const hasFreeWeek = /\b(first week free|free first (storage )?week|free (storage )?week|week one free)\b/i.test(para);
    if (!hasFreeWeek) continue;
    const hasCommit = /\b12[- ]week(s)?\b|\b12[- ]week commit/i.test(para);
    if (!hasCommit) {
      issues.push({
        rule: 'offer_free_week_missing_commit',
        type: 'forbidden',
        severity: 'error',
        description: 'Canonical-offer rule: "first week free" must be paired with "12 weeks" / "12-week commit" in the same paragraph',
        offending: para.slice(0, 100),
      });
    }
  }

  // 1b. Drive-time source check. Any numerical drive time must be either:
  //   a) destination in VERIFIED_DRIVE_TIMES with stated hours within ±15% of verified, OR
  //   b) explicitly tagged in drive_time_sources as source='maps_api'.
  const dtMentions = extractDriveTimeMentions(body);
  for (const m of dtMentions) {
    const verified = lookupVerified(m.destination);
    const taggedSource = (drive_time_sources || []).find(
      s => s.destination?.toLowerCase().replace(/\s+port$/, '').trim() === m.destination.replace(/\s+port$/, '').trim()
    );
    if (taggedSource?.source === 'maps_api') {
      continue; // Trusted: live maps lookup at compose time
    }
    if (!verified) {
      issues.push({
        rule: 'drive_time_unverified',
        type: 'forbidden',
        severity: 'error',
        description: `Drive time to "${m.destination}" not in verified static table and not tagged source='maps_api' — likely LLM-fabricated. Add to VERIFIED_DRIVE_TIMES or pass drive_time_sources metadata.`,
        offending: m.raw,
      });
      continue;
    }
    const tolerance = 0.10;
    const lo = verified.hours * (1 - tolerance);
    const hi = verified.hours * (1 + tolerance);
    if (m.stated_hours < lo || m.stated_hours > hi) {
      issues.push({
        rule: 'drive_time_inaccurate',
        type: 'forbidden',
        severity: 'error',
        description: `Drive time to "${m.destination}" stated as ${m.stated_hours}h, verified is ${verified.label} (${verified.hours}h). Use the verified value.`,
        offending: m.raw,
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

module.exports = { validateDraft, VERIFIED_DRIVE_TIMES, extractDriveTimeMentions };
