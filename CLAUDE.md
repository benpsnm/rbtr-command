# Project: RBTR Command + PSNM Operations

## Owner & context
Ben Greenwood. Solo operator. PSNM warehouse + RBTR truck build + Eternal Kustoms consulting + family. Time-poor, learning fast. Read PSNM_STATE.md for full operational state.

---

## Critical operating rules

### Paste-first discipline
NEVER summarise tool output. Paste verbatim — full cat outputs, full sed slices, full curl responses. Phrases like "above", "complete", "verbatim", "ctrl+o to expand" indicate a missed step. If output is large, paste in chunks; never collapse.

### Per-file gates
For multi-file builds, write one file → cat it → wait for "approved" → next file. NEVER batch. NEVER assume approval.

### Strict spec
Don't add features not in spec. No rate limiting unless asked. No "improvements" unless asked. If something seems missing, ASK before adding.

### Blast-radius awareness
Production code (v14, atlas.js, anything live) gets reviewed line-by-line. Test paths d (x-rbtr-auth header) and e (Bearer CRON_SECRET) are critical regression checks for any auth changes. NEVER deploy without explicit Ben approval.

### Stopping points
After hour 7+ of a session, suggest a stop point before complex steps. Don't push through.

---

## Stack

- Node.js 18+, Vercel serverless functions, vanilla JavaScript (no TypeScript)
- Supabase (Postgres) for data persistence — project `mpxgyobotiqcawmqlhbf`
- Single-file SPAs for HTML UIs (wms.html is 5000+ lines, intentional)
- Auth: Pattern A — single password, JWT cookie + x-rbtr-auth header (see v14/api/auth/middleware.js)
- Deployment: Vercel CLI (`vercel --prod` from v14/), aliased to rbtr-jarvis.vercel.app
- NOTE: Vercel Pro subscription canceled/suspended as of 6 May 2026. Both rbtr-jarvis and psnm-wms return 402 until billing resolved (~13 May).

---

## Commit conventions

- Branch off `feature/atlas-v2.2-intelligence-stack` for production work
- Branch off `feature/agentic-stack-upgrade` for tooling/agent work
- Conventional Commits format: feat:, fix:, chore:, docs:
- Multi-line commits for non-trivial changes; body explains WHY not WHAT
- git author email must be `beniproautobodies@gmail.com` (Vercel team-auth requires verified email)

---

## Sub-agents available (see .claude/agents/)

- **the-grunt** — read-only verification (cat, grep, sed, node --check, curl). Use for any "confirm X is in place" task. Never writes files.
- **stuart-the-reviewer** — code/security review. Use before any production deploy or auth change. Returns numbered concern list with severity.
- **kevin-the-architect** — planning and design. Use before any new build >100 lines. Returns written spec with build sequence.

---

## MCP servers (when configured)

- `claude-context` — semantic codebase search. Use `search_codebase` before modifying any function with downstream consumers.
- `chrome-mcp` — visual UI verification of wms.html and login.html.
- `github-mcp` — repo audits and PR management.

---

## Known deferred items (DO NOT auto-fix)

- Vercel billing suspended since 6 May 2026 (canceled subscription, awaiting reactivation ~13 May when eBay clears)
- `psnm-wms` standalone has no Supabase wiring — spec at `state-snapshots/standalone-supabase-spec.md`
- `isSameOrigin` in atlas.js is intentional path-5 fallback during cookie-auth transition — do not remove until confirmed
- psnm-wms GitHub auto-deploy webhook not delivering — reconnect via Vercel dashboard once billing resolved
- 4 intel prospects need email enrichment: Clugston Distribution Services, International Stones UK, Stanton Logistics, All Shires Foods Ltd

---

## Files to read for context (priority order)

1. `PSNM_STATE.md` — operational ground truth. Read this FIRST in every session.
2. `state-snapshots/auth-build-state-2026-05-06.md` — last major build's auth state
3. `state-snapshots/standalone-supabase-spec.md` — pending standalone wire-up spec
4. `state-snapshots/worktree-cheatsheet.md` — git worktree usage for parallel builds

---

## Worktrees

Active worktrees for parallel work (see `git worktree list`):
- `/Users/bengreenwood/Desktop/rbtr-command-supabase-build` → branch `feature/standalone-supabase-build`
- `/Users/bengreenwood/Desktop/rbtr-command-intel-fix` → branch `feature/intel-enrichment-fix`

---

## Known hook quirks

The PreToolUse deploy guard greps the entire bash command string for `vercel --prod` patterns. This blocks intended `vercel --prod` invocations correctly, but also false-positives when those strings appear elsewhere — e.g. inside a commit message, an echo, or a grep search.

Workarounds when you need to bypass for legitimate non-deploy reasons:
- For commit messages: write the message to a file and use `git commit -F /tmp/commit-msg.txt` instead of inline `-m`
- For echo or display purposes: split the string with shell concatenation, e.g. `echo "vercel" "--prod"` or use a variable
- For greps and searches: most don't trigger the pattern because of word boundaries, but if one does, escape or split

The pattern is intentionally over-cautious — false positives are preferable to false negatives in a deploy guard. If a real deploy is needed, intentionally pause, get Ben's explicit approval in chat, then run the actual `vercel --prod` command (the hook will block, you confirm Ben said yes, then bypass via temporary hook disable or by running outside the hooked environment).

---

## Key file map

```
v14/
  api/
    atlas.js                  — main PSNM intelligence + WMS API dispatcher
    _intelligence_core.js     — 4-layer pipeline: Enricher/Reasoner/Drafter/Critic
    _intelligence_pipeline.js — pipeline orchestration
    _enricher.js              — Companies House + web enrichment
    _drafter_v2_2.js          — Claude draft generation
    _critic.js                — draft quality checker
    _draft_validator.js       — structural validation
    _reasoner.js              — prospect scoring
    auth/
      login.js                — bcrypt check + JWT issue
      logout.js               — cookie clear
      middleware.js           — checkAuth() — OR's cookie vs x-rbtr-auth
      check.js                — /api/auth/check status endpoint
    sendgrid_events.js        — ECDSA signature verification + event capture
    sendgrid_inbound.js       — inbound reply capture
    cron-morning-brief.js     — 06:00 + 21:00 daily briefs
    cron-backup.js            — 03:00 daily backup
  public/
    wms.html                  — main CC SPA (~5000 lines)
    login.html                — PSNM single-password login page
  vercel.json                 — 7 cron definitions, CORS headers
PSNM_STATE.md                 — operational ground truth
state-snapshots/              — arch decisions, specs, build states
.claude/
  agents/                     — sub-agent definitions
  hooks.json                  — auto-hooks (syntax check, deploy guard)
  settings.local.json         — permissions allowlist
```
