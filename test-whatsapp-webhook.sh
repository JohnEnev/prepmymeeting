#!/bin/bash

# Test WhatsApp webhook with a sample message payload
# Replace YOUR_DOMAIN with your actual Vercel domain

WEBHOOK_URL="https://prepmymeeting-2y2iyuso6-johnenevs-projects.vercel.app/api/whatsapp"

echo "Testing WhatsApp webhook..."
echo "URL: $WEBHOOK_URL"
echo ""

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15550000000",
            "phone_number_id": "PHONE_NUMBER_ID"
          },
          "contacts": [{
            "profile": {
              "name": "Test User"
            },
            "wa_id": "15551234567"
          }],
          "messages": [{
            "from": "15551234567",
            "id": "wamid.test123",
            "timestamp": "1633024800",
            "text": {
              "body": "I have a doctor appointment"
            },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'

echo ""
echo "Check the response above and Vercel logs"
