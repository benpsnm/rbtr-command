# Smoke Test — Expected Layer Outputs
**To be compared against actual outputs when pipeline is deployed.**
**Run:** `POST /api/v2_2_run?action=smoke_test`

---

## Test 1: Gripple Ltd (lead_id reference: 1)
**Company:** Gripple Ltd, Sheffield S9 1DA, Wire Products Manufacturing

### Layer 1 — Enricher (expected)
- Companies House: active company, SIC 25940 (Manufacture of chain and springs) or similar metal products code
- Website: gripple.com — should scrape homepage + about, expect content about wire rope joints, construction, viticulture
- News: Gripple regularly in Sheffield manufacturing news — expect 2-5 items (expansions, awards, export wins)
- Quality score: **75-90** (well-established company, good public presence)
- Quality flag: none

### Layer 2 — Reasoner (expected)
- Primary pain point: seasonal or contract-driven overflow for physical components/wire products; export dispatch requiring accessible UK-central storage
- Evidence: CH data confirming active manufacturing + website product range + any expansion news
- Prospect role lens: ops director or logistics manager at a precision manufacturer cares about zero errors, access reliability, and not having to chase third parties
- Hook: reference to specific product line or export market visible on website (e.g. "Gripple's Defect-free guarantee for construction fixings..." or specific recent contract)
- Confidence: **70-85**
- Confidence flag: none

### Layer 3 — Drafter v2.2 (expected)
- Touch number: 1 (no sent touches in outreach_touches for this lead — see data audit)
- Opener: specific to Gripple's products/operations, not generic manufacturing
- Drive time: Sheffield 25min (most relevant — they're local)
- Body: 100-140 words, references the hook
- Claim verifier: all_green (no unverifiable PSNM facts)
- Validator: pass or minor warnings only

### Layer 4 — Critic (expected)
- opener_specificity: pass (Gripple-specific hook)
- speculative_claims: pass (no assumptions about their current setup)
- touch_tone_match: pass (Touch 1 = polite cold opener)
- voice_quality: pass (no banned words)
- real_reader_test: ideally pass — the hook about their specific products earns the read
- **Expected final verdict:** PASS on attempt 1 or 2
- **Final status:** pending_approval

---

## Test 2: AF Blakemore & Son (lead_id reference: 2)
**Company:** AF Blakemore & Son Ltd, Doncaster DN3 1HH, FMCG Distribution (Spar)

### Layer 1 — Enricher (expected)
- Companies House: active, SIC 46390 (Non-specialised wholesale of food, beverages and tobacco) or FMCG distribution code
- Website: afblakemore.co.uk — expect content about Spar wholesale, distribution depots, logistics
- News: expect trade press around FMCG distribution, possibly depot expansions
- Quality score: **65-80**
- Quality flag: none

### Layer 2 — Reasoner (expected)
- Primary pain point: seasonal overflow (FMCG distribution has Christmas peak, Easter peak, promotional stock surges) requiring flexible ambient pallet space
- Evidence: FMCG distribution SIC code + Spar depot operations from website
- Prospect role lens: logistics/supply chain director at an FMCG distributor cares about throughput consistency and not having to build more fixed space for peak demand
- Hook: reference to Spar distribution operations or a specific depot/region they serve
- Confidence: **65-80**
- Note: AF Blakemore is large enough to have in-house warehousing — reasoner may flag this in what_to_avoid and reduce confidence

### Layer 3 — Drafter v2.2 (expected)
- Touch number: 1
- Drive time: Sheffield 25min or Leeds 45min (Doncaster is between both)
- Should acknowledge they likely have current arrangements (Holmes Dream 100 principle)

### Layer 4 — Critic (expected)
- Main risk: speculative_claims about their current setup or stock volumes
- **Expected final verdict:** PASS on attempt 1-2 if drafter avoids speculation
- **Final status:** pending_approval

---

## Test 3: AJ Webb and Sons (lead_id reference: 3)
**CRITICAL TEST — Fresh Produce Wholesale, Sheffield S2 5BQ**

### Expected pipeline behaviour
PSNM is **ambient-only**. AJ Webb handles fresh produce — temperature-sensitive goods. This should be caught at Layer 2.

### Layer 1 — Enricher (expected)
- SIC code: likely 46310 (Wholesale of fruit and vegetables) or similar fresh produce
- Quality score: **40-65** (may have limited web presence)

### Layer 2 — Reasoner (expected)
- **what_to_avoid:** "AJ Webb handles fresh produce — temperature-sensitive goods. PSNM is ambient-only and cannot serve chilled or fresh stock. This company is a poor fit."
- **Confidence: 0-15**
- **confidence_flag: human_review_required**
- **Pipeline stops here**

### Expected final status: `human_review_required`
The pipeline should NOT produce a draft for AJ Webb. If it does proceed to Layer 3, the Critic MUST flag the draft for pitching cold storage capability PSNM does not have.

### What to check in actual output
- Does the pipeline stop at Layer 2?
- Does the angle_brief.what_to_avoid mention fresh produce / ambient-only conflict?
- If a draft was somehow generated (should not be), does the critic fail `speculative_claims` for implying cold storage capability?

---

## Test 4: ABI Electronics Ltd (lead_id reference: 6)
**Company:** ABI Electronics Ltd, Barnsley S75 2BY, Electronics Manufacturing

### Layer 1 — Enricher (expected)
- SIC: 26 series (electronics manufacturing)
- Website: abielectronics.co.uk — specialist electronics test equipment manufacturer
- Quality score: **50-70** (smaller company, may have limited news coverage)

### Layer 2 — Reasoner (expected)
- Primary pain point: electronics components inventory — seasonal demand cycles, new product launches requiring buffer stock
- Prospect role lens: electronics SME ops director or MD cares about component traceability and access, not just space
- Hook: specific to ABI Electronics' product range (circuit board test equipment is niche — if website scraped this, it's a strong hook)
- Confidence: **55-75**
- Note: this is a smaller company — reasoner should calibrate accordingly (owner-involved)

### Layer 3 — Drafter v2.2 (expected)
- Touch number: 1
- Drive time: Sheffield 25min (Barnsley is between Sheffield and Leeds)
- Electronics lens: components, batch storage, access for stock checks

### Layer 4 — Critic (expected)
- Main risk: generic electronics assumptions rather than ABI-specific hook
- **Expected final verdict:** PASS on attempt 1-3
- **Final status:** pending_approval

---

## Test 5: GW Engineering (lead_id reference: 7)
**Company:** GW Engineering, Barnsley S70 3JG, Metal Engineering & Fabrication
**Note:** Micro company, owner-run (Graeme — email: graeme@gw-engineering.co.uk confirms owner-operator)

### Layer 1 — Enricher (expected)
- SIC: 25 series (fabricated metal products)
- Website: gw-engineering.co.uk — likely basic site, engineering workshop
- News: unlikely to have significant press coverage
- Quality score: **30-55** — micro companies often have low public data
- Quality flag: may flag `manual_research_required` if below 40

### Layer 2 — Reasoner (expected)
- If quality score ≥ 40 and pipeline proceeds:
  - Primary pain point: overflow storage for fabricated components between projects, or material/stock that doesn't fit on-site
  - Prospect role lens: owner-operator cares about keeping overheads variable, not adding fixed costs — "Graeme" lens, not "Operations Director" lens
  - Hook: likely generic to fabrication without strong news evidence — hook may reference proximity/Sheffield manufacturing cluster
  - Confidence: **50-65** (limited data)
- If quality score < 40: pipeline stops at Layer 1 with `manual_research_required`

### Layer 3 — Drafter v2.2 (expected — if it reaches this layer)
- Touch number: 1
- Tone: peer-to-peer (owner to owner), not corporate
- Drive time: Sheffield 25min (most relevant)
- Should feel like Ben writing to Graeme directly, not a sales team

### Layer 4 — Critic (expected)
- Main risk: tone too corporate for a micro owner-operator
- **Expected final verdict:** PASS or 1-2 attempts to get the peer-to-peer tone right
- **Final status:** pending_approval (or pipeline stopped at Layer 1)

---

## Smoke Test Pass Criteria

| Test | Expected status | Key pass condition |
|------|----------------|--------------------|
| Gripple | pending_approval | Hook references wire products specifically |
| AF Blakemore | pending_approval | No speculative claims about their stock volumes |
| AJ Webb | human_review_required | Pipeline stops at Layer 2, fresh produce flag in what_to_avoid |
| ABI Electronics | pending_approval | Electronics lens maintained throughout |
| GW Engineering | pending_approval OR manual_research_required | Peer tone if approved; quality gate if insufficient data |

**Critical failure condition:** If AJ Webb reaches pending_approval with a draft that implies PSNM can handle fresh/chilled produce — this is a build failure, not a configuration issue.

---

## How to Run
```bash
POST /api/v2_2_run?action=smoke_test
x-rbtr-auth: <RBTR_AUTH_TOKEN>
Content-Type: application/json

{}
```

Returns a summary for each lead. Then review each draft individually in WMS (filter by source='v2.2_stack' and status IN ('pending_approval','needs_revision')).
