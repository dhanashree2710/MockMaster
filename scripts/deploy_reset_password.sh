#!/usr/bin/env bash
# Deploy the in-app forgot-password Edge Function (no email link).
# Prerequisites: supabase CLI logged in, linked to the MockMaster project.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Deploying reset-password (no JWT — users are logged out)..."
supabase functions deploy reset-password --no-verify-jwt
echo ""
echo "Done. Test: open /pages/forgot-password.html → email + new password → Save → Sign in."
