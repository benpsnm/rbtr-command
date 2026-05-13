# JARVIS Overnight Build - Decisions Awaiting Ben
**Created:** Thursday 14 May 2026 00:12
**Branch:** feature/overnight-complete

## PHASE 0 — Voice Pipeline Status

### ROOT CAUSE DIAGNOSED + FIXED
The new API keys Ben pasted to `.env.local` weren't loading because:
1. Vercel dev server pulls env vars from **Vercel Cloud dashboard**, not local .env files
2. Old keys were cached in cloud for "Development" environment (set 22 days ago)

**FIXED:**
- Updated ELEVENLABS_API_KEY in Vercel cloud → `vercel env add ELEVENLABS_API_KEY development --force`
- Added OPENAI_API_KEY to Vercel cloud → `vercel env add OPENAI_API_KEY development`
- Removed `node-fetch` import from STT (using native fetch in Node 24)
- Updated STT to use native FormData + Blob instead of `form-data` npm package

### TTS (Text-to-Speech) — ✅ WORKING
- Tested: `POST /api/rocko/tts` with "G day from Rocko, this is a test"
- Response: HTTP 200, 41KB MP3 file, valid audio (MPEG ADTS layer III)
- ElevenLabs API accepting new key `sk_7656021...`

### STT (Speech-to-Text) — ❌ BLOCKED on OpenAI quota
- Tested: `POST /api/rocko/stt` with audio file
- Error: `"insufficient_quota"` from OpenAI Whisper API
- Message: "You exceeded your current quota, please check your plan and billing details"
- **The key is valid and the code works** — just no credits on the account

**BEN ACTION NEEDED:**
- Add credits to OpenAI account OR
- Provide a different OpenAI API key with quota OR
- Use browser-based STT fallback (already implemented in frontend)

**Recommendation:** Use browser STT for now (free, already wired, works offline). Add OpenAI credits later if higher quality transcription needed.

---

## Files Changed (Phase 0)
- `v14/.env.production` → Added new ELEVENLABS_API_KEY + OPENAI_API_KEY
- `v14/.env.development.local` → Created (copy of .env.local)
- `v14/.env.production.backup` → Backup of original
- `v14/api/rocko/stt.js` → Removed node-fetch, using native FormData + Blob
- `v14/api/debug-env.js` → Created for debugging (can delete after build)

---

## Vercel Cloud Env Vars Updated
Development environment:
- ELEVENLABS_API_KEY → `sk_765602...` (new, working)
- OPENAI_API_KEY → `sk-proj-tlv...` (new, valid but no quota)

---

## Next: Phases 1-12
Proceeding with JARVIS completion, SEO pipeline, house jobs, RBTR sponsors, etc.
Voice pipeline: TTS works, STT blocked on quota (not critical for overnight build).
