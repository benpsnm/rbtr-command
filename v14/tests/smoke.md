# RBTR Command Centre — smoke test

Run manually before each deploy; also referenced by CI when we get there.

## Phase 1 (schema + proxy)

- [x] `/api/supabase-proxy` rejects cross-origin calls with 401 when `x-rbtr-auth` missing
- [x] `/api/supabase-proxy` accepts same-origin browser calls (Origin/Referer match host) without token
- [x] `/api/supabase-proxy` accepts calls with valid `x-rbtr-auth` header
- [x] `/api/supabase-proxy` blocks `rbtr_api_keys` with HTTP 403
- [x] `legal_*` tables return zero rows when queried as anon role (RLS verified via Management API)
- [x] `reconciliation_audit` contains `phase1_complete` row + 16 `orphan_flagged` rows + 4 `rename` rows

## Phase 2 · M0.1 — morning brief end-to-end

- [x] `POST /api/morning-brief?force=1` generates a fresh script + MP3 in < 60s
- [x] Script is 250–450 words, no banned words, no prohibited names, opens "Morning Ben."
- [x] Audio MP3 uploaded to Supabase Storage, public URL returned
- [x] `/api/cron-morning-brief` triggers morning-brief → telegram → WhatsApp (Twilio may skip)
- [x] Telegram voice note delivered to Ben's chat_id 8669062243 (@Rbtr_rocko_bot)
- [ ] 3 consecutive days of 06:00 automated delivery observed (awaiting)

## Phase 2 · M0.2 — Today tab brief card

- [x] Card loads today's `daily_briefs` row on tab open (same-origin proxy call works)
- [x] Audio player has `src` pointing to Supabase Storage signed URL
- [x] "Generate new" button posts `/api/morning-brief?force=1`, shows spinner, reloads card
- [x] "Generate new" surfaces 402/quota errors inline as "ElevenLabs credits exhausted — top up at elevenlabs.io/app/subscription"
- [x] "Read script" toggle expands/collapses full script text (monospace, white on dark)
- [x] "← yesterday" / "today →" switcher populates card from previous day's row when present
- [x] Audio `ended` event PATCHes `daily_briefs.listened_to_at = NOW()`

## Phase 2 · M0.3 — Evening check-in

- [x] "EVENING CHECK-IN" block hidden before 19:00 local (`td-evening-wrap` display=none)
- [x] Block appears at/after 19:00 local
- [x] Mood 1–5 buttons store selected mood, highlight selected button
- [x] `Log` button validates: mood required, one-line required; shows inline hint
- [x] POST writes to `evening_reflections` with `mood_score`, `one_line` (and legacy `one_line_reflection`), `tomorrow_priority`, `reflection_date=today`
- [x] On success, card is replaced with "Logged. See you at 6am."
- [x] On next page load after a save, card renders locked (already-logged check)
- [ ] Round-trip: reflection logged tonight appears as `yesterday_reflection` in tomorrow's `/api/briefing-data` (tests pending overnight)

## Phase 2 · M0.4 — Null field handling

- [x] Appendix C prompt says "skip any category entirely if there is nothing material to say. Don't pad."
- [x] Live brief with 11 populated / 18 null fields did not invent sponsor names, pallet counts, or audience numbers
- [x] Observed brief acknowledged the data sparsity explicitly ("sparse brief today because the data's mostly empty")

## Phase 2 · M0.5 — Delivery resilience

- [x] `cron-morning-brief.js` tracks `telegramOk` flag
- [x] If Telegram fails AND `TWILIO_SMS_FROM` is configured, Twilio SMS fires with audio URL as fallback
- [x] If Telegram fails and Twilio SMS is not configured, `sms_fallback` step is simply absent from `out.steps`
- [x] WhatsApp step still attempts independently when Telegram is fine
- [ ] Test-fire: temporarily null `TELEGRAM_BOT_TOKEN` in a test context, re-run `/api/cron-morning-brief`, confirm `sms_fallback.ok === true` (requires `TWILIO_SMS_FROM` env — Ben's call if we want this path live)

## Infrastructure

- [x] Monochrome default (`<body class="mono">`) active; opt-out via toggle persists
- [x] `ELEVENLABS_VOICE_ID` set to Hannah (`M7ya1YbaeFaPXljg9BpK`)
- [x] Redeploy after env changes picks up new values
- [x] Vercel cron `0 6 * * *` configured (vercel.json)
- [ ] Revoke Supabase PAT `rbtr-claude-code` (Ben confirms: done)
