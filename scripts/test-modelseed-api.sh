#!/bin/bash

# scripts/test-modelseed-api.sh
# Automated verification for modelseed-api endpoints.
# Usage: ./scripts/test-modelseed-api.sh <PATRIC_TOKEN> [BASE_URL]

TOKEN=$1
BASE_URL=${2:-"http://poplar.cels.anl.gov:8000"}

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <PATRIC_TOKEN> [BASE_URL]"
    exit 1
fi

echo "--- Testing modelseed-api at $BASE_URL ---"

# 1. Health check
echo -n "Checking /api/health... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$HEALTH" == "200" ]; then
    echo "✅ OK"
else
    echo "❌ FAILED (Status: $HEALTH)"
fi

# 2. Public Media
echo -n "Checking /api/media/public (no token)... "
MEDIA=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/media/public")
if [ "$MEDIA" == "200" ]; then
    echo "✅ OK"
elif [ "$MEDIA" == "401" ]; then
    echo "⚠️ UNAUTHORIZED (Requires Token)"
    echo -n "Checking /api/media/public (with token)... "
    MEDIA_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: $TOKEN" "$BASE_URL/api/media/public")
    if [ "$MEDIA_AUTH" == "200" ]; then
        echo "✅ OK"
    else
        echo "❌ FAILED (Status: $MEDIA_AUTH)"
    fi
else
    echo "❌ FAILED (Status: $MEDIA)"
fi

# 3. Authenticated Models
echo -n "Checking /api/models (with token)... "
MODELS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: $TOKEN" "$BASE_URL/api/models")
if [ "$MODELS" == "200" ]; then
    echo "✅ OK"
else
    echo "❌ FAILED (Status: $MODELS)"
fi

# 4. Authenticated Media
echo -n "Checking /api/media (with token)... "
MY_MEDIA=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: $TOKEN" "$BASE_URL/api/media")
if [ "$MY_MEDIA" == "200" ]; then
    echo "✅ OK"
else
    echo "❌ FAILED (Status: $MY_MEDIA)"
fi

echo "--- Verification Complete ---"
