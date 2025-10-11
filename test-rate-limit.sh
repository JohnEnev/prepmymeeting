#!/bin/bash

# Test script for rate limiting
# This will send multiple requests rapidly to test the per-minute limit (5 requests)

URL="http://localhost:3000/api/whatsapp"
TEST_PHONE="1234567890"
TEST_NAME="RateLimit Test"

echo "🧪 Testing Rate Limiting (5 requests per minute)"
echo "================================================"
echo ""

# Function to send a test message
send_message() {
  local message_num=$1
  local message_text="Test message $message_num"

  echo "📤 Sending message $message_num: '$message_text'"

  response=$(curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d '{
      "object": "whatsapp_business_account",
      "entry": [{
        "changes": [{
          "value": {
            "messaging_product": "whatsapp",
            "contacts": [{
              "profile": {"name": "'"$TEST_NAME"'"},
              "wa_id": "'"$TEST_PHONE"'"
            }],
            "messages": [{
              "from": "'"$TEST_PHONE"'",
              "id": "wamid.test_'"$message_num"'_'"$RANDOM"'",
              "timestamp": "'"$(date +%s)"'",
              "text": {"body": "'"$message_text"'"},
              "type": "text"
            }]
          }
        }]
      }]
    }')

  # Check if response contains rate_limited
  if echo "$response" | grep -q "rate_limited"; then
    echo "❌ RATE LIMITED! (Expected after 5 requests)"
    echo "   Response: $response"
  else
    echo "✅ Request accepted"
    echo "   Response: $response"
  fi
  echo ""
}

# Send 8 requests rapidly (should hit 5 per minute limit)
echo "Sending 8 requests in rapid succession..."
echo ""

for i in {1..8}; do
  send_message $i
  # Small delay to ensure messages are processed in order
  sleep 0.5
done

echo "================================================"
echo ""
echo "✅ Test complete!"
echo ""
echo "Expected behavior:"
echo "  - Requests 1-5: Accepted ✅"
echo "  - Requests 6-8: Rate limited ❌"
echo ""
echo "Check the output above to verify rate limiting is working."
