#!/bin/bash
# Simple API smoke tests for Mission Control 2.0

set -e

BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"

echo "🧪 Testing MC2 API at $BASE_URL..."

# Health check
echo -n "Health check... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/health")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ Failed (HTTP $HTTP_CODE)"
  exit 1
fi

# Create story
echo -n "Create story... "
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/stories" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Story",
    "description": "API test",
    "priority": "medium",
    "acceptanceCriteria": ["Test passes"]
  }')
STORY_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$STORY_ID" ]; then
  echo "✅ OK (ID: $STORY_ID)"
else
  echo "❌ Failed"
  exit 1
fi

# Get stories
echo -n "List stories... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/stories")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ Failed (HTTP $HTTP_CODE)"
  exit 1
fi

# Approve requirements
echo -n "Approve requirements... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE_URL/api/v1/stories" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\": \"$STORY_ID\", \"approved\": true}")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ Failed (HTTP $HTTP_CODE)"
  exit 1
fi

echo ""
echo "✅ All API tests passed!"