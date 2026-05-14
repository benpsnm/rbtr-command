#!/bin/bash
# Secret scanner for staged files
# Usage: ./scripts/check-for-secrets.sh
# Returns exit code 1 if secrets found, 0 otherwise

echo "🔍 Scanning staged files for secrets..."

# Secret patterns to detect
PATTERNS=(
  "sk-ant-"
  "sk-proj-"
  "sk_"
  "SG\."
  "sb_secret_"
  "ANTHROPIC_API_KEY[[:space:]]*="
  "SENDGRID_API_KEY[[:space:]]*="
  "SUPABASE_SERVICE_KEY[[:space:]]*="
  "SUPABASE_SERVICE_ROLE[[:space:]]*="
  "TWILIO_AUTH_TOKEN[[:space:]]*="
  "TELEGRAM_BOT_TOKEN[[:space:]]*="
  "EBAY_CLIENT_SECRET[[:space:]]*="
  "-----BEGIN PRIVATE KEY-----"
  "-----BEGIN RSA PRIVATE KEY-----"
)

FOUND=0

# Get staged files
STAGED_FILES=$(git diff --cached --name-only)

if [ -z "$STAGED_FILES" ]; then
  echo "   No staged files to scan"
  exit 0
fi

# Scan each pattern
for PATTERN in "${PATTERNS[@]}"; do
  MATCHES=$(git diff --cached | grep -E "$PATTERN" || true)
  if [ -n "$MATCHES" ]; then
    echo "❌ Found potential secret: $PATTERN"
    echo "$MATCHES" | head -3
    echo ""
    FOUND=1
  fi
done

# Check for .env files
ENV_FILES=$(echo "$STAGED_FILES" | grep -E "\.env" || true)
if [ -n "$ENV_FILES" ]; then
  echo "❌ Found .env file(s) staged:"
  echo "$ENV_FILES"
  FOUND=1
fi

if [ $FOUND -eq 0 ]; then
  echo "✅ No secrets detected in staged files"
  exit 0
else
  echo ""
  echo "❌ Secrets detected - commit blocked"
  echo "   Remove sensitive data before committing"
  exit 1
fi
