# OVERNIGHT_BLOCKERS — Phase 2.6 session

Generated 2026-04-22. Branch `phase-2-6-jarvis` based on `main` commit `c9651f5`.

## Hard blockers (session paused pending Ben input)

### 1. GitHub remote URL placeholder — REQUIRED to push

The URL provided in Ben's Rule 3 instructions contains a literal
`YOURUSERNAME` placeholder:

```
https://github.com/YOURUSERNAME/rbtr-command.git
```

**Status:**
- Local repo initialised at `/Users/bengreenwood/Desktop/rbtr-command/`.
- `main` branch created, 61 files committed (commit `c9651f5`).
- `phase-2-6-jarvis` branch checked out.
- NO remote `origin` configured yet — the placeholder URL is not valid.

**Unblock from Ben:**
- Paste the actual GitHub HTTPS URL (e.g.
  `https://github.com/bengreenwood89/rbtr-command.git` — or whatever the
  real username is).
- Confirm whether the repo already exists on GitHub, or if it needs to
  be created first at https://github.com/new.

### 2. Phase 2.6 main spec not yet provided — REQUIRED to build

Ben confirmed rules 1–12 and said "do this for me" to set up git, but the
WS1–WS6 *content* spec (what to actually build in each workstream) has
not been pasted. WS names/durations are known:

- WS1 Auth (2h)
- WS4 Financials schema + basic portal (2h)
- WS2 Landing page with 7 portals + orb (4h)
- WS3 Portal interiors + content migration (3h)
- WS5 Customer self-quote stubbed (3h)
- WS6 Warehouse staff share view (1h)

**Unblock from Ben:**
- Paste the Phase 2.6 main spec (WS1-WS6 detailed requirements,
  acceptance criteria, UI copy, schema shapes, auth flow details).

### 3. `gh` CLI not installed

Per Ben's Rule 3, standard `git` + HTTPS fallback is in use. `gh` CLI
would simplify repo creation and auth but is not required.

If Ben wants `gh`:
```
brew install gh
gh auth login
```

## What's been delivered

- `/Users/bengreenwood/Desktop/rbtr-command/.gitignore` updated with
  secret-safe defaults (RBTR_AUTH_TOKEN.txt, *.env, node_modules, etc.)
- Root git repo initialised
- Initial commit on `main`: 61 files, SHA `c9651f5`
- Branch `phase-2-6-jarvis` checked out and ready for WS1 commits
- This blockers file

## Next step when unblocked

1. `git remote add origin <real-url>`
2. `git push -u origin main`
3. `git push -u origin phase-2-6-jarvis`
4. Begin WS1 Auth per spec
