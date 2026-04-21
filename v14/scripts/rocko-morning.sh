#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ROCKO · Morning briefing auto-open
# Pulls today's Apple Calendar events (across all calendars — iCloud, Google,
# Outlook that sync through Calendar.app), URL-encodes them, opens Chrome to
# the Command Centre with ?briefing=1 so Rocko auto-delivers the briefing.
# ═══════════════════════════════════════════════════════════════════════════

set -e

URL="https://rbtr-jarvis.vercel.app"
LOG="/Users/bengreenwood/Library/Logs/rocko-morning.log"
mkdir -p "$(dirname "$LOG")"
echo "[$(date)] rocko-morning.sh starting" >> "$LOG"

# ─── Pull today's calendar events via AppleScript ──────────────────────────
# Uses Calendar.app (fast enough; returns title, start/end, location).
# Gracefully empty if Calendar.app isn't configured or has no events.
EVENTS_JSON=$(osascript <<'APPLESCRIPT' 2>/dev/null || echo "[]"
set todayStart to current date
set hours of todayStart to 0
set minutes of todayStart to 0
set seconds of todayStart to 0
set todayEnd to todayStart + 1 * days
set outList to {}
tell application "Calendar"
    repeat with cal in calendars
        try
            set evs to (every event of cal whose start date is greater than or equal to todayStart and start date is less than todayEnd)
            repeat with ev in evs
                set evTitle to summary of ev
                set evStart to (start date of ev as string)
                set evEnd to (end date of ev as string)
                try
                    set evLoc to location of ev
                on error
                    set evLoc to ""
                end try
                set end of outList to "{\"title\":\"" & (my escText(evTitle)) & "\",\"start\":\"" & evStart & "\",\"end\":\"" & evEnd & "\",\"location\":\"" & (my escText(evLoc)) & "\"}"
            end repeat
        on error
            -- skip calendars we can't read
        end try
    end repeat
end tell
set AppleScript's text item delimiters to ","
set out to "[" & (outList as text) & "]"
set AppleScript's text item delimiters to ""
return out

on escText(t)
    if t is missing value then return ""
    set s to t as text
    set AppleScript's text item delimiters to "\\"
    set parts to text items of s
    set AppleScript's text item delimiters to "\\\\"
    set s to parts as text
    set AppleScript's text item delimiters to "\""
    set parts to text items of s
    set AppleScript's text item delimiters to "\\\""
    set s to parts as text
    set AppleScript's text item delimiters to ""
    return s
end escText
APPLESCRIPT
)

# Validate JSON; if empty/invalid, use "[]"
if ! echo "$EVENTS_JSON" | python3 -c "import sys,json; json.loads(sys.stdin.read())" 2>/dev/null; then
  EVENTS_JSON="[]"
fi

ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read()))" <<< "$EVENTS_JSON")

echo "[$(date)] events: $EVENTS_JSON" >> "$LOG"

# ─── Open Chrome to the briefing URL ───────────────────────────────────────
# -g keeps current focus; remove -g if you want it to grab focus
FINAL_URL="${URL}/?briefing=1&events=${ENCODED}"
open -a "Google Chrome" "$FINAL_URL"
echo "[$(date)] opened: $FINAL_URL" >> "$LOG"
