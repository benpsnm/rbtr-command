#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# JARVIS brain setup · one-shot script
# Prompts for your Anthropic API key (hidden), sets it on Vercel, redeploys.
# ═══════════════════════════════════════════════════════════════════════════

set -e

cd "$(dirname "$0")"

echo ""
echo "  ╔════════════════════════════════════════════════╗"
echo "  ║   JARVIS · RBTR Command Centre V14             ║"
echo "  ║   One-shot key setup + redeploy                ║"
echo "  ╚════════════════════════════════════════════════╝"
echo ""
echo "  1. Get your Anthropic API key:"
echo "     → https://console.anthropic.com/settings/keys"
echo "     → Click 'Create Key' (or use an existing one that starts with sk-ant-)"
echo ""
echo "  2. Paste it below — input is HIDDEN for safety, nothing will print."
echo ""
printf "  API key: "
read -rs ANTHROPIC_API_KEY
echo ""

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "  ✗ No key entered. Aborted."
  exit 1
fi

if [[ "$ANTHROPIC_API_KEY" != sk-ant-* ]]; then
  echo "  ⚠  That doesn't look like an Anthropic key (should start with sk-ant-)."
  printf "  Continue anyway? [y/N] "
  read -r yn
  case "$yn" in [Yy]*) ;; *) echo "  Aborted."; exit 1;; esac
fi

echo ""
echo "  → Removing any existing value on Vercel (ignore 'not found' errors)…"
vercel env rm ANTHROPIC_API_KEY production --yes 2>/dev/null || true
vercel env rm ANTHROPIC_API_KEY preview --yes    2>/dev/null || true
vercel env rm ANTHROPIC_API_KEY development --yes 2>/dev/null || true

echo "  → Setting ANTHROPIC_API_KEY on all Vercel environments…"
printf "%s" "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY production
printf "%s" "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY preview
printf "%s" "$ANTHROPIC_API_KEY" | vercel env add ANTHROPIC_API_KEY development

echo ""
echo "  → Redeploying to production…"
vercel --prod --yes

echo ""
echo "  → Testing the JARVIS endpoint…"
sleep 2
RESP=$(curl -s -X POST https://rbtr-jarvis.vercel.app/api/jarvis \
  -H 'Content-Type: application/json' \
  -d '{"message":"In one sentence, confirm you are live."}')

echo "  Response:"
echo "  $RESP" | head -c 500
echo ""
echo ""
echo "  ╔════════════════════════════════════════════════╗"
echo "  ║   ✓ Done. JARVIS is live.                      ║"
echo "  ║   Open: https://rbtr-jarvis.vercel.app         ║"
echo "  ║   Click the blue orb, or press Cmd+J           ║"
echo "  ╚════════════════════════════════════════════════╝"
echo ""
