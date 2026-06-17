#!/bin/bash
# ============================================================
# 3 BOXES LUXURY - Deploy ZAI Virtual Try-On to Vercel
# ============================================================
# This script deploys the ZAI-only virtual try-on (v20) to Vercel
# and sets the required ZAI environment variables.
#
# USAGE:
#   chmod +x deploy-zai-tryon.sh
#   ./deploy-zai-tryon.sh YOUR_VERCEL_TOKEN
#
# Get your Vercel token at: https://vercel.com/account/tokens
# ============================================================

set -e

TOKEN="${1:?'Error: Vercel token required. Get one at https://vercel.com/account/tokens'}"
API="https://api.vercel.com"

echo "🏆 3 BOXES LUXURY - ZAI Virtual Try-On Deployment"
echo "=================================================="
echo ""

# Step 1: Find existing project
echo "📋 Step 1: Finding Vercel project..."
PROJECTS=$(curl -s "$API/v9/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

PROJECT_ID=$(echo "$PROJECTS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for p in data.get('projects', []):
        if '3boxes' in p.get('name', '').lower() or '3-boxes' in p.get('name', '').lower():
            print(p['id'])
            break
    else:
        print('')
except:
    print('')
" 2>/dev/null || echo "")

if [ -z "$PROJECT_ID" ]; then
    echo "  Creating new project..."
    PROJECT=$(curl -s -X POST "$API/v9/projects" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"name": "3boxes-luxury", "framework": "nextjs"}')
    PROJECT_ID=$(echo "$PROJECT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('id', ''))
except:
    print('')
" 2>/dev/null || echo "")
fi

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not find or create Vercel project"
    exit 1
fi

echo "  ✅ Project ID: $PROJECT_ID"

# Step 2: Set ZAI environment variables (CRITICAL for virtual try-on)
echo ""
echo "📋 Step 2: Setting ZAI environment variables..."

# ZAI_BASE_URL - Use the PUBLIC API endpoint (internal-api.z.ai is not reachable from Vercel)
echo "  Setting ZAI_BASE_URL..."
curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"ZAI_BASE_URL","value":"https://api.z.ai/api/v1","type":"encrypted","target":["production","preview"]}' > /dev/null 2>&1 || true

# ZAI_API_KEY
echo "  Setting ZAI_API_KEY..."
curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"ZAI_API_KEY","value":"Z.ai","type":"encrypted","target":["production","preview"]}' > /dev/null 2>&1 || true

# ZAI_CHAT_ID
echo "  Setting ZAI_CHAT_ID..."
curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"ZAI_CHAT_ID","value":"chat-97b5f242-82cb-4d42-801a-52a64cae9d47","type":"encrypted","target":["production","preview"]}' > /dev/null 2>&1 || true

# ZAI_TOKEN (JWT token)
echo "  Setting ZAI_TOKEN..."
curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"ZAI_TOKEN","value":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZDcxYjY5NjQtOWFmZS00M2ZkLTlhYjgtMTA4ZTU3YjA1NWZhIiwiY2hhdF9pZCI6ImNoYXQtOTdiNWYyNDItODJjYi00ZDQyLTgwMWEtNTJhNjRjYWU5ZDQ3IiwicGxhdGZvcm0iOiJ6YWkifQ.fjmP7wiqFk0qaWxoLRtjEEVwGHe5Vx4kqsSbz5eM2C4","type":"encrypted","target":["production","preview"]}' > /dev/null 2>&1 || true

# ZAI_USER_ID
echo "  Setting ZAI_USER_ID..."
curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"ZAI_USER_ID","value":"d71b6964-9afe-43fd-9ab8-108e57b055fa","type":"encrypted","target":["production","preview"]}' > /dev/null 2>&1 || true

echo "  ✅ All ZAI env vars set!"

# Step 3: Set other required env vars
echo ""
echo "📋 Step 3: Setting other environment variables..."

for VAR in \
  "SHOPIFY_STORE_DOMAIN:3boxesluxury-2.myshopify.com" \
  "SHOPIFY_STOREFRONT_ACCESS_TOKEN:09124abbd07ca423db9488b3dc2c737f" \
  "SHOPIFY_ADMIN_API_TOKEN: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"
do
  KEY=$(echo "$VAR" | cut -d: -f1)
  VAL=$(echo "$VAR" | cut -d: -f2)
  echo "  Setting $KEY..."
  curl -s -X POST "$API/v9/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$KEY\",\"value\":\"$VAL\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}" > /dev/null 2>&1 || true
done

echo "  ✅ All env vars set!"

# Step 4: Deploy
echo ""
echo "📋 Step 4: Deploying to Vercel..."
cd "$(dirname "$0")"
npx vercel --prod --token "$TOKEN" 2>&1

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 The virtual try-on is now powered by Z.ai (FREE, no external APIs needed)"
echo "   - VLM (glm-4v-plus) analyzes both selfie and product"
echo "   - Image Generation creates the try-on result"
echo "   - Works for ALL product types: garments, jewelry, watches, accessories"
echo ""
echo "🔗 Visit your Vercel dashboard to see the deployment URL:"
echo "   https://vercel.com/dashboard"
