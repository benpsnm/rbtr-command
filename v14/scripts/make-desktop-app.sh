#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Turn ROCKO Command Centre into a Mac .app on the desktop
# Uses AppleScript -> osacompile to create a native wrapper that opens the URL.
# Bundles an icon. Goes straight on Desktop.
# ═══════════════════════════════════════════════════════════════════════════
set -e

URL="https://rbtr-jarvis.vercel.app"
APP_NAME="ROCKO"
APP_DIR="$HOME/Desktop/${APP_NAME}.app"

# Remove any previous install
rm -rf "$APP_DIR"

# Write a tiny AppleScript that opens the URL in Chrome's app mode (clean window, no address bar)
TMP_SCRIPT=$(mktemp /tmp/rocko-launcher-XXXXX.applescript)
cat > "$TMP_SCRIPT" <<APPLE
-- ROCKO · Command Centre launcher
-- Opens the Command Centre in Chrome app mode (no address bar, feels native)

on run
    set rbtrURL to "$URL"

    -- Try Chrome first (best experience: app mode, no chrome UI)
    try
        tell application "Google Chrome"
            activate
            -- App mode flag removed in modern Chrome; fall back to new window
            set appWindow to (make new window)
            set URL of active tab of appWindow to rbtrURL
            set bounds of appWindow to {100, 80, 1500, 1000}
        end tell
        return
    end try

    -- Fall back to Safari if Chrome not available
    try
        tell application "Safari"
            activate
            make new document with properties {URL:rbtrURL}
        end tell
        return
    end try

    -- Last resort: system default browser
    do shell script "open " & quoted form of rbtrURL
end run
APPLE

# Compile into a .app bundle on the Desktop
osacompile -o "$APP_DIR" "$TMP_SCRIPT"
rm "$TMP_SCRIPT"

# Create a simple icon if we don't have one — use system "globe" icon as a placeholder
ICON_SRC="/System/Applications/Safari.app/Contents/Resources/compass.icns"
if [ -f "$ICON_SRC" ]; then
    cp "$ICON_SRC" "$APP_DIR/Contents/Resources/applet.icns"
fi

# Touch the bundle so Finder picks up the new icon immediately
touch "$APP_DIR"

# Register with LaunchServices so macOS sees it as a proper app
/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f "$APP_DIR" 2>/dev/null || true

echo "✓ Installed: $APP_DIR"
echo "  Double-click the ROCKO icon on your Desktop."
