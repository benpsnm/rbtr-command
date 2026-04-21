#!/bin/bash
# Install/refresh the Rocko morning LaunchAgent.
# Safe to run multiple times.

set -e
PLIST="$HOME/Library/LaunchAgents/com.rbtr.rocko-morning.plist"

if [ ! -f "$PLIST" ]; then
  echo "✗ plist not found at $PLIST"
  exit 1
fi

# Unload if already loaded (idempotent)
launchctl unload "$PLIST" 2>/dev/null || true

# Load it
launchctl load "$PLIST"

echo "✓ Rocko morning LaunchAgent installed."
echo ""
echo "  Triggers:"
echo "   • On login / wake from sleep"
echo "   • Daily at 08:07 local time"
echo ""
echo "  Dedupe: front-end skips if briefing given within last 4h."
echo ""
echo "  Test right now: launchctl start com.rbtr.rocko-morning"
echo "  View logs:       tail -f ~/Library/Logs/rocko-morning.log"
echo "  Uninstall:       launchctl unload $PLIST && rm $PLIST"
