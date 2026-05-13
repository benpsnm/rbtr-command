# JARVIS Build — Waiting on Ben

## OPENAI_API_KEY needed for Whisper STT

**Status**: Blocking Rocko voice input

**What's needed**: Your OpenAI API key in format `sk-proj-xxxxx...`

**Where to get it**: https://platform.openai.com/api-keys

**Once you provide it**:
- Add to `v14/.env.local` as `OPENAI_API_KEY=sk-proj-xxxxx`
- Whisper STT will work immediately (no code changes needed)
- Voice input will function end-to-end

**Current state**:
- STT endpoint exists and is properly wired (`/api/rocko/stt`)
- Returns fallback error when key is missing (the toast Ben saw)
- Text input works as fallback, but needs accessibility improvements (see below)

---

## Text input improvements (proceeding without key)

Making text input more accessible:
- Currently requires double-click on mic to reveal
- Adding visible "Type" button next to mic for one-click access
- Input already wired to `Rocko.sendTextMessage()` — just needs better visibility

## Model display (proceeding)

- API already using `claude-sonnet-4-5` (confirmed in `/api/rocko/chat.js`)
- Adding status label to bottom bar: "Rocko: Sonnet 4.5"

---

## URGENT: OPENAI_API_KEY Required for Voice Input (13 May 2026)

**Issue**: Voice input (Whisper STT) is broken because `OPENAI_API_KEY` is missing from `v14/.env.local`

**Fix**: Add to `v14/.env.local`:
```
OPENAI_API_KEY=sk-proj-... (your OpenAI API key)
```

**Why**: The `/api/rocko/stt` endpoint needs this to send audio to OpenAI's Whisper API for speech-to-text transcription.

**Current Status**: 
- ✓ Text input IS wired and functional (toggle with ⌨️ button, type message, press Enter or click Send)
- ✓ Model already on Sonnet 4.5 (no swap needed)
- ✗ Voice input will fail gracefully with "STT unavailable" message until key is added

