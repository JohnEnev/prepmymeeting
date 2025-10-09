# WhatsApp Bot Integration - Implementation Plan

## Overview
Add WhatsApp support to PrepMyMeeting bot alongside the existing Telegram integration, allowing users to interact via WhatsApp Business API.

## Linear Issue Template

**Title:** Add WhatsApp Business API Integration

**Description:**
Enable PrepMyMeeting to work as a WhatsApp bot in addition to Telegram. Users should be able to send messages, get prep checklists, and receive AI-generated responses via WhatsApp.

**Priority:** High
**Estimate:** 5-8 hours
**Labels:** `feature`, `whatsapp`, `integration`

---

## Technical Approach

### Option 1: Meta WhatsApp Cloud API (Recommended)
**Pros:**
- Free tier available (1,000 conversations/month)
- Direct integration with Meta
- No middleman costs
- Official API
- Supports media, templates, interactive messages

**Cons:**
- Requires Facebook Business account setup
- More complex initial setup
- Webhook verification required
- Need to get business verification for production

**Setup Steps:**
1. Create Meta Business account
2. Create WhatsApp Business app
3. Get API credentials (Phone Number ID, Business Account ID, Access Token)
4. Verify webhook
5. Test with provided test numbers

### Option 2: Twilio WhatsApp API
**Pros:**
- Simpler setup
- Good documentation
- Reliable infrastructure
- Easy testing sandbox

**Cons:**
- Paid service (charges per message)
- Additional third-party dependency
- Higher long-term costs

**Recommendation:** Start with Meta Cloud API for cost efficiency.

---

## Implementation Plan

### Phase 1: Setup & Configuration (1-2 hours)

#### Tasks:
1. **Create Meta WhatsApp Business App**
   - Set up Facebook Business account
   - Create WhatsApp Business API app
   - Configure test phone numbers
   - Get API credentials

2. **Add Environment Variables**
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
   ```

3. **Update Documentation**
   - Add WhatsApp setup guide
   - Document environment variables
   - Create troubleshooting section

### Phase 2: Webhook Implementation (2-3 hours)

#### Tasks:
1. **Create WhatsApp Webhook Endpoint**
   - File: `src/app/api/whatsapp/route.ts`
   - Handle GET (webhook verification)
   - Handle POST (incoming messages)
   - Parse WhatsApp message format
   - Extract text, media, contact info

2. **Implement Message Handler**
   - Reuse existing command parser
   - Map WhatsApp user format to internal user model
   - Handle WhatsApp-specific message types (text, media, location)

3. **Integrate with Existing Systems**
   - Connect to Supabase (getOrCreateUser)
   - Log conversations
   - Save checklists
   - Use same OpenAI integration

### Phase 3: Response System (1-2 hours)

#### Tasks:
1. **Create WhatsApp Message Sender**
   - Function to send text messages
   - Handle message chunking (WhatsApp limit: 4096 chars)
   - Support rich formatting (bold, italic, lists)
   - Error handling and retries

2. **Implement Commands**
   - `/start` or "Hi" → Welcome message
   - `/prep <topic>` → Generate checklist
   - `/help` → Show commands
   - Free text → AI response (future)

### Phase 4: User Management (1 hour)

#### Tasks:
1. **Update Database Schema**
   - Add `whatsapp_id` field to users table
   - Add `platform` field ('telegram' | 'whatsapp')
   - Update unique constraints

2. **Update User Creation Logic**
   - Handle both Telegram and WhatsApp users
   - Link users if they use both platforms (future enhancement)

### Phase 5: Testing & Deployment (1 hour)

#### Tasks:
1. **Local Testing**
   - Use Meta test numbers
   - Test all commands
   - Verify database logging
   - Check error handling

2. **Deploy & Configure**
   - Add env vars to Vercel
   - Deploy to production
   - Register webhook with Meta
   - Test with real WhatsApp number

---

## File Structure

```
src/app/api/
├── telegram/
│   ├── route.ts (existing)
│   └── set-webhook/
│       └── route.ts (existing)
├── whatsapp/
│   ├── route.ts (new - webhook handler)
│   └── set-webhook/
│       └── route.ts (new - webhook setup)
src/lib/
├── db.ts (existing - update for WhatsApp users)
├── supabase.ts (existing)
├── telegram.ts (new - extract Telegram-specific logic)
└── whatsapp.ts (new - WhatsApp API client)
docs/
└── whatsapp-setup.md (new - setup guide)
```

---

## Database Changes

### Migration: `003_add_whatsapp_support.sql`

```sql
-- Add WhatsApp support to users table
ALTER TABLE users ADD COLUMN whatsapp_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN platform TEXT DEFAULT 'telegram' CHECK (platform IN ('telegram', 'whatsapp'));
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- Add constraint: must have either telegram_id or whatsapp_id
ALTER TABLE users ADD CONSTRAINT user_has_platform_id
  CHECK (telegram_id IS NOT NULL OR whatsapp_id IS NOT NULL);

-- Update index
CREATE INDEX idx_users_whatsapp_id ON users(whatsapp_id);
```

---

## API Endpoints

### `POST /api/whatsapp`
Receives incoming WhatsApp messages from Meta webhook

**Request Format (from Meta):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "1234567890",
          "id": "wamid.xxx",
          "timestamp": "1234567890",
          "text": { "body": "/prep doctor" },
          "type": "text"
        }],
        "metadata": {
          "phone_number_id": "xxx"
        }
      }
    }]
  }]
}
```

**Response:**
```json
{ "status": "ok" }
```

### `GET /api/whatsapp`
Webhook verification (required by Meta)

**Query Params:**
- `hub.mode=subscribe`
- `hub.challenge=xxx`
- `hub.verify_token=your_token`

**Response:** Echo back the challenge

---

## Testing Checklist

- [ ] Webhook verification works
- [ ] Receives text messages
- [ ] Sends text messages
- [ ] Command parsing works
- [ ] User creation/lookup works
- [ ] Conversations are logged
- [ ] Checklists are saved
- [ ] OpenAI integration works
- [ ] Error handling works
- [ ] Message chunking works
- [ ] Works on production (Vercel)

---

## Success Metrics

1. **Functional:** Users can interact with bot via WhatsApp
2. **Parity:** All Telegram features work on WhatsApp
3. **Reliability:** 99%+ message delivery rate
4. **Performance:** <2s average response time

---

## Future Enhancements (Post-MVP)

- Media support (images, voice notes)
- Interactive buttons and lists
- Message templates for common responses
- WhatsApp Status updates
- Cross-platform user linking
- Rich message formatting
- Location sharing for property prep
- Contact card sharing for networking meetings

---

## Resources

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Platform](https://business.whatsapp.com)
- [Message Format Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Testing Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started#test-your-app)

---

## Notes

- WhatsApp requires webhook verification before going live
- Test phone numbers need to be added in Meta dashboard
- Business verification needed for production (can take 1-2 weeks)
- Consider rate limits: 1000 messages per user per 24 hours
- WhatsApp messages have 24-hour response window unless using templates
