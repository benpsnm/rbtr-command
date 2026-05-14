# Rocko Smoke Test — JARVIS Phase 3 v1
**Branch:** feature/jarvis-cockpit
**Dev server:** http://localhost:3000
**Date:** 2026-05-13

---

## Test Scenarios

### 1. Mic Permission Grant Flow
**Test:** Open http://localhost:3000/jarvis → click Rocko voice button → browser prompts for mic access → grant permission

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Permission prompt appeared?
- UI feedback clear?
- Fallback message if denied?

---

### 2. Voice Input "Hi Rocko" → Transcript Appears
**Test:** Click mic button → say "Hi Rocko" → check if transcript appears in real-time

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Transcript accuracy?
- Latency from speech to text?
- Text appears incrementally or all at once?

---

### 3. Voice Query "What are the outreach emails doing?" → Multi-Tool Chain
**Test:** Ask Rocko about outreach emails → check if multiple tools fire (e.g., psnm_outreach_replies, psnm_enquiries)

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Which tools fired?
- Response accuracy?
- Tool chaining visible in UI?

---

### 4. Word-by-Word Text Sync Timing
**Test:** Ask a question that generates a ~30-second response → watch text appear word-by-word in sync with voice

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Text pace matches voice?
- Any lag or desync?
- Text readable at speech pace?

---

### 5. Sarcasm Test: "Should I work tonight or sleep?"
**Test:** Ask Rocko for advice on work/life balance → check for sarcastic/dry Australian personality

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Response tone (sweet vs. sharp)?
- Personality came through?
- Too nice or appropriately sarcastic?

---

### 6. Australian-isms Test (5 Questions)
**Test:** Ask 5 different questions → count "yeah nah", "mate", "fair dinkum", "reckon", etc.

**Questions to ask:**
1. "What's the warehouse looking like today?"
2. "Should I call that hot lead now?"
3. "Any urgent tasks I'm missing?"
4. "What's the truck build status?"
5. "Give me a summary of yesterday"

**Pass/Fail:** ☐ Pass ☐ Fail

**Count:**
- "yeah nah": ___
- "mate": ___
- "fair dinkum": ___
- "reckon": ___
- Other Australianisms: ___

**Observations:**
- Moderate use (good) or overdone (bad)?
- Natural or forced?
- Annoying or endearing?

---

### 7. Error Handling: Deny Mic → Fallback Message
**Test:** Reload page → deny mic permission → check UI shows clear fallback message

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Fallback message clear?
- Offers text input alternative?
- No JS errors in console?

---

### 8. Quick Fire Buttons: +Task, +Quote, +Note, +Build Log
**Test:** Click each quick-fire button → verify modal opens → fill minimal data → submit → check Supabase insert

**Buttons to test:**
- ☐ +Task → opens modal → inserts to rbtr_tasks
- ☐ +Quote → opens modal → inserts to psnm_quotes
- ☐ +Note → opens modal → inserts to notes
- ☐ +Build Log → opens modal → inserts to cc_build_log

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Modals styled correctly?
- Form validation works?
- Supabase inserts successful?
- Any JS errors?

---

### 9. PSNM Atlas v3 Approve/Reject Draft Buttons
**Test:** Navigate to PSNM Intelligence module → find pending draft → click Approve or Reject → verify status update

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Draft found in UI?
- Buttons visible?
- Status updates in Supabase?
- UI feedback after action?

---

### 10. Mobile Test: localhost via Phone on Same Network
**Test:** Get local IP (ifconfig | grep "inet " | grep -v 127.0.0.1) → open http://[LOCAL_IP]:3000/jarvis on phone → test voice + buttons

**Steps:**
1. Find local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. Open on phone: http://[LOCAL_IP]:3000/jarvis
3. Test voice input
4. Test 2-3 quick-fire buttons
5. Check responsive layout

**Pass/Fail:** ☐ Pass ☐ Fail

**Observations:**
- Mobile layout responsive?
- Voice input works on mobile browser?
- Buttons tap-able?
- Performance acceptable?

---

## Rocko Tuning Notes (for tomorrow)
**Personality:**
- Too sarcastic / just right / too nice?
- Australian-isms: too much / moderate / not enough?

**Voice/Text Sync:**
- Timing issues?
- Text pace comfortable?

**Tool Chaining:**
- Tools fired as expected?
- Any missing tools?

**UI/UX:**
- Quick-fire buttons: smooth or clunky?
- Modals: readable or cramped?
- Mobile: usable or needs work?

**Blockers Found:**
- Migration 64 not applied?
- API errors?
- Supabase connection issues?

---

## Next Steps After Smoke Test
1. Log all observations to JARVIS-PHASE-3-SMOKE-TEST-RESULTS.md
2. Create bug list for Phase 3 v1.1 fixes
3. Tune Rocko personality based on feedback
4. Adjust word-by-word timing if needed
5. Fix any critical blockers before Phase 3 wire-rest merge
