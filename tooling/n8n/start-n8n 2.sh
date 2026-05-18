#!/bin/bash
# n8n startup script - sources .env and launches n8n with proper config

set -a
source ~/Desktop/rbtr-command/scripts/.env
set +a

export N8N_USER_FOLDER="$HOME/.n8n-rbtr"
export WEBHOOK_URL="http://localhost:5678/"
export GENERIC_TIMEZONE="Europe/London"
export TZ="Europe/London"

echo "Starting n8n on http://localhost:5678"
echo "User: admin"
echo "Password: (from N8N_BASIC_AUTH_PASSWORD in .env)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

n8n start
