# RBTR Command Centre V14 · JARVIS Edition

Evolved from V13 (8454 lines, 35 sections) into a JARVIS-style interactive hub.

## What's new in V14

- **JARVIS floating orb** (bottom-right on every section) — click to open. Voice in (Web Speech API), text fallback, voice out (SpeechSynthesis). `Cmd/Ctrl + J` to toggle.
- **New sections** (top of sidebar under `✦ Assistant`):
  - **Today** — daily briefing, live countdowns, weather Rotherham, top-3 focus, morning reflection, live ticker
  - **Goals & Wins** — tiered today/week/month/life + Wins Wall
  - **Learning Dojo** — Guitar, Turkish, Reading, Filmmaking with streak tracking
  - **Best-Self Protocol** — Built Dad day counter, morning ritual, Nate notes, evening reflection
  - **Live Signals** — PSNM / Airbnb / eBay / Sponsors / Weather / News feeds
  - **Tool Registry** — every tool/agent built lives here; auto-registers on request
  - **JARVIS Chat** — full-page chat interface
- **Calm-advisor system prompt** baked into `netlify/functions/jarvis.js` with full RBTR context
- **Supabase tables** scaffolded (optional — localStorage-first; sync later)

## Architecture

```
v14/
├── netlify.toml                   # Netlify config
├── public/
│   └── index.html                 # Copy of ../RBTR-Command-Centre-V14.html lives here
├── netlify/functions/
│   ├── jarvis.js                  # Claude proxy — keeps ANTHROPIC_API_KEY server-side
│   ├── weather.js                 # Open-Meteo, no key needed
│   └── supabase-proxy.js          # Supabase CRUD via service_role key (optional)
└── supabase/migrations/
    └── 09_jarvis_tables.sql       # Goals, reflections, streaks, registry, signals

../RBTR-Command-Centre-V14.html    # Main single-file app (evolve from V13)
```

## Deploy

```sh
# 1. Copy the main HTML into the publish directory
cp RBTR-Command-Centre-V14.html v14/public/index.html

# 2. From v14/
cd v14
netlify init                # link / create site
netlify env:set ANTHROPIC_API_KEY sk-ant-...
# optional, for Supabase sync:
netlify env:set SUPABASE_URL https://xxx.supabase.co
netlify env:set SUPABASE_SERVICE_ROLE_KEY eyJ...

# 3. Deploy
netlify deploy --prod
```

## Required environment variables

| Variable | Where | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Netlify env | JARVIS brain (Claude Opus 4.6) |
| `SUPABASE_URL` | Netlify env (optional) | Sync goals/reflections/etc. |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify env (optional) | Write access via proxy |

The V13 Vercel deploy at `rbtr-command-centre.vercel.app` is **not touched**.
V14 lives on its own Netlify site. Switch DNS when ready.

## How JARVIS picks up context

On every message it sends to the backend, the browser gathers:
- Current section Ben is viewing
- Days to departure / photoshoot
- Built Dad day
- Open goals today
- Learning streaks
- Last 3 reflections
- RBTR core state from localStorage `rbtr2`

The Netlify function prepends the full RBTR system prompt (family, mission, three financial entities, key people, current status) and calls Claude. No hallucinations on Ben's core facts.

## How new tools get registered

In the Command Centre: open Tool Registry → fill the form → Register.
Or ask JARVIS: "Register a new tool called X that does Y at URL Z."
The Netlify function can persist it to `jarvis_tool_registry` in Supabase.

## Voice

- **Input**: Chrome / Edge only (Web Speech API, `en-GB`). Falls back to text.
- **Output**: Browser `speechSynthesis`. Prefers en-GB voice (Daniel/Oliver/Arthur if available).
- Disable voice output: `localStorage.setItem('jarvis_voice_off','1')`.

## Safety

- No auto-send of emails, social posts, or purchases. JARVIS drafts; Ben confirms.
- API keys stay on Netlify. Browser only ever sees the function URL.
- Supabase tables have RLS on. Only service_role (server-side) can write.
- Conversations are stored locally by default. Syncing to Supabase is opt-in.

## Not done in first pass (so you know what's still TODO)

- Apple Health bridge integration (already has a migration file under `../RBTR/supabase/05_apple_health_bridge.sql`)
- Real Gmail/Airbnb/eBay feeds (currently placeholders — Zapier MCP can push into `jarvis_signals`)
- Streaming Claude responses (non-streaming for reliability; easy upgrade later)
- Guitar video curation (needs Ben's taste input)
- PWA manifest / offline (V13 already has one, can be re-added)
