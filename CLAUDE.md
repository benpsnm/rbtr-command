# RBTR Command Centre — Claude Code Context

## CORE RULE — agents act, Ben approves only when truly necessary

Before asking me anything — check if you can do it yourself. Then check if there's another path to the same result. Only when both fail do you surface to me. Default is agent does it. Me doing it is the exception, not the rule.

The 5% of tasks that genuinely need me: macOS permission dialogs requiring a physical click, Face ID or fingerprint confirmation, 2FA codes from my phone, money leaving an account, anything that legally requires my identity to sign off. That's the full list. Not file edits. Not API calls. Not build decisions. Not config changes.

When escalation IS necessary, use this format and only this format: "Ben, this needs your physical input because [specific reason]. Single tap/action: [what to do]. Takes [X seconds]." One option. Not a discussion. Not three alternatives. The single best path.

Everything else: handle it, document it, report it. I'll read the report. I don't need to be in the middle.

---

## Project overview

Full operational state: see `PSNM_STATE.md` and `ATLAS_V2_FRAMEWORK.md` in this directory.

Sub-project context: `/Users/bengreenwood/Desktop/psnm/deploy/CLAUDE.md` covers the PSNM WMS standalone app.

Agent definitions: `.claude/agents/` — the-grunt, stuart-the-reviewer, kevin-the-architect.

State snapshots: `state-snapshots/` — specs, templates, locked plans.
