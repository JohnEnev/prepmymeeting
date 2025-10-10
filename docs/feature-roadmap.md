# PrepMyMeeting Feature Roadmap

## Linear Issues - Next Steps

### 1. Natural Language Processing (High Priority)

**Title:** Add natural language understanding for meeting prep requests

**Description:**
Replace command-based interaction (/prep) with natural language processing. Users should be able to say things like:
- "I'm going to see a dermatologist, what should I ask?"
- "I have a contractor meeting tomorrow"
- "Preparing for a job interview"

**Implementation:**
- Use OpenAI to classify user intent from free text
- Detect meeting type (doctor, contractor, interview, etc.)
- Extract context from natural language
- Keep /commands as fallback for power users

**Technical Approach:**
1. Add intent classifier function using OpenAI
2. Parse entities (meeting type, date/time, context)
3. Route to appropriate handler based on intent
4. Update both Telegram and WhatsApp handlers

**Acceptance Criteria:**
- [ ] Bot responds to natural language requests without /prep command
- [ ] Correctly identifies meeting type from context
- [ ] Handles multiple phrasings ("seeing a doctor", "doctor appointment", "medical visit")
- [ ] Falls back gracefully when intent is unclear
- [ ] /prep command still works for backwards compatibility

**Estimate:** 5-8 hours
**Priority:** High
**Labels:** `enhancement`, `ai`, `ux`

---

### 2. Conversational Feedback & Refinement (High Priority)

**Title:** Allow users to request refinements to generated checklists

**Description:**
Enable users to provide feedback and request modifications to generated content:
- "Make it shorter"
- "Less formal tone"
- "More detailed"
- "Focus more on budget questions"

**Implementation:**
- Store conversation context (last generated checklist)
- Use OpenAI with chat history to refine responses
- Support multiple rounds of refinement
- Clear context after new topic

**Technical Approach:**
1. Store last N messages in conversation context
2. Add refinement intent detection
3. Pass conversation history to OpenAI
4. Update stored checklist with refinement
5. Add "start over" or "new topic" detection

**Example Flow:**
```
User: "I have a doctor appointment"
Bot: [generates checklist]
User: "Make it shorter and less formal"
Bot: [regenerates with adjustments]
User: "Perfect, thanks!"
```

**Acceptance Criteria:**
- [ ] Users can request tone changes (formal, casual, friendly)
- [ ] Users can request length changes (shorter, longer, more detailed)
- [ ] Users can request focus changes ("more about budget", "focus on timeline")
- [ ] Bot maintains context for up to 5 message exchanges
- [ ] Bot detects when user wants to start a new topic

**Estimate:** 8-12 hours
**Priority:** High
**Labels:** `enhancement`, `ai`, `conversation`

---

### 3. URL/Link Integration (Medium Priority)

**Title:** Extract and analyze content from URLs for context-aware prep

**Description:**
Parse URLs shared by users to provide context-aware preparation checklists:
- LinkedIn profiles → networking/interview prep
- Job postings → interview questions
- Property listings → home viewing checklist
- Restaurant menus → ordering recommendations
- Business websites → meeting prep with context

**Implementation:**
- Detect URLs in messages
- Fetch and parse content (use Jina AI Reader or similar)
- Extract key information
- Store in `submitted_links` table
- Use content as context for checklist generation

**Technical Approach:**
1. Add URL detection regex
2. Integrate web scraping service:
   - Option A: Jina AI Reader API (https://jina.ai/reader)
   - Option B: Puppeteer for dynamic content
   - Option C: Simple fetch + Cheerio for static pages
3. Parse and extract relevant info
4. Pass to OpenAI with instructions
5. Save to `submitted_links` table

**Example Flow:**
```
User: "I have an interview at this company: https://example.com/jobs/123"
Bot: [scrapes job posting]
Bot: "I see this is for a Senior Engineer role at Example Corp. Here's your prep checklist..."
[generates checklist with company-specific context]
```

**Acceptance Criteria:**
- [ ] Detects URLs in messages automatically
- [ ] Successfully fetches and parses common website types
- [ ] Handles LinkedIn, job boards, Zillow/Redfin, Yelp
- [ ] Stores link content in database
- [ ] Generates context-aware checklists
- [ ] Graceful handling of blocked/protected content

**Estimate:** 12-16 hours
**Priority:** Medium
**Labels:** `feature`, `scraping`, `ai`

---

### 4. Conversation Memory & Context (Medium Priority)

**Title:** Maintain conversation history and user preferences

**Description:**
Remember past conversations and user preferences across sessions:
- "Prep me for my follow-up with Dr. Smith" (references past conversation)
- Remember user's preferred tone/length
- Track recurring meetings (weekly 1:1s, monthly reviews)

**Implementation:**
- Use existing `conversations` table
- Add user preferences table
- Load recent context on each interaction
- Implement conversation summarization for long histories

**Technical Approach:**
1. Create `user_preferences` table (tone, length, style)
2. Load last 10-20 messages as context
3. Summarize older conversations for efficiency
4. Detect references to past topics
5. Update preferences based on feedback patterns

**Acceptance Criteria:**
- [ ] Bot remembers past meeting topics within 30 days
- [ ] Stores user's preferred checklist style
- [ ] References previous conversations when relevant
- [ ] Summarizes long conversation histories

**Estimate:** 8-10 hours
**Priority:** Medium
**Labels:** `enhancement`, `ai`, `database`

---

### 5. Calendar Integration (Low Priority)

**Title:** Connect to Google Calendar/Outlook for automatic meeting prep

**Description:**
Read user's calendar and proactively suggest prep for upcoming meetings:
- "You have a dentist appointment tomorrow at 2pm. Would you like prep?"
- Extract meeting details from calendar events
- Auto-generate prep 24 hours before meetings

**Implementation:**
- OAuth integration with Google Calendar
- OAuth integration with Microsoft Outlook
- Periodic check for upcoming events
- Trigger notifications via Telegram/WhatsApp

**Technical Approach:**
1. Implement OAuth flow for calendar providers
2. Store refresh tokens securely
3. Add cron job to check upcoming events
4. Parse event titles/descriptions for meeting type
5. Send proactive prep suggestions

**Acceptance Criteria:**
- [ ] Users can connect Google Calendar
- [ ] Users can connect Outlook Calendar
- [ ] Bot checks for events 24 hours in advance
- [ ] Sends prep suggestions for detected meetings
- [ ] Users can configure notification timing

**Estimate:** 16-20 hours
**Priority:** Low
**Labels:** `feature`, `integration`, `calendar`

---

### 6. Voice Message Support (Low Priority)

**Title:** Accept voice messages and respond with prep checklists

**Description:**
Allow users to send voice messages describing their meeting:
- Record voice note: "I'm meeting with a contractor tomorrow to discuss bathroom renovation"
- Bot transcribes and generates prep

**Implementation:**
- Handle voice message webhook events
- Use OpenAI Whisper for transcription
- Process transcription as natural language
- Optional: Respond with voice (TTS)

**Technical Approach:**
1. Handle voice message webhook from Telegram/WhatsApp
2. Download audio file
3. Send to OpenAI Whisper API
4. Process transcription through NLP pipeline
5. Generate and send text response
6. (Optional) Generate TTS response

**Acceptance Criteria:**
- [ ] Accepts voice messages on both platforms
- [ ] Transcribes with 95%+ accuracy
- [ ] Processes transcription same as text
- [ ] Responds with text checklist

**Estimate:** 8-12 hours
**Priority:** Low
**Labels:** `feature`, `voice`, `ai`

---

### 7. Template Library (Medium Priority)

**Title:** Pre-built templates for common meeting types

**Description:**
Offer quick-start templates users can customize:
- Doctor appointments
- Contractor meetings
- Job interviews
- Property viewings
- Restaurant reservations
- Networking events

**Implementation:**
- Create template database table
- Build template selection UI (buttons/lists)
- Allow customization after selection
- Learn from user modifications

**Technical Approach:**
1. Create `checklist_templates` table
2. Seed with 10-15 common templates
3. Add interactive buttons (WhatsApp/Telegram)
4. Support template browsing via /templates command
5. Track template usage for analytics

**Acceptance Criteria:**
- [ ] 15+ templates available
- [ ] Users can browse templates
- [ ] Templates can be customized after selection
- [ ] Track which templates are most used

**Estimate:** 6-8 hours
**Priority:** Medium
**Labels:** `feature`, `templates`, `ux`

---

### 8. Export & Sharing (Low Priority)

**Title:** Export checklists to other formats and share

**Description:**
Allow users to export/share their prep checklists:
- Export to PDF
- Export to Google Docs
- Email checklist
- Share with calendar event

**Implementation:**
- PDF generation (puppeteer or similar)
- Google Docs API integration
- Email service (SendGrid, Resend)
- Calendar event notes integration

**Acceptance Criteria:**
- [ ] Export checklist as PDF
- [ ] Export to Google Docs
- [ ] Email checklist to self
- [ ] Add to calendar event notes

**Estimate:** 8-10 hours
**Priority:** Low
**Labels:** `feature`, `export`, `integration`

---

## Implementation Priority

### Phase 1 (MVP+) - Next 2 Weeks
1. ✅ WhatsApp Integration (DONE)
2. 🔄 Natural Language Processing
3. 🔄 Conversational Feedback & Refinement

### Phase 2 - Following 2 Weeks
4. URL/Link Integration
5. Template Library
6. Conversation Memory & Context

### Phase 3 - Future
7. Calendar Integration
8. Voice Message Support
9. Export & Sharing

---

## Suggested Linear Issue Format

**For each feature above, create a Linear issue with:**

1. **Title:** Copy from above
2. **Description:**
   - Copy the description and implementation sections
   - Add "Related: [link to this doc]"
3. **Acceptance Criteria:** Copy checklist
4. **Estimate:** Copy hours
5. **Priority:** Copy priority level
6. **Labels:** Copy labels
7. **Project:** PrepMyMeeting
8. **Cycle:** Assign to current or future cycle

---

## Technical Debt to Address

While implementing new features, consider:
- [ ] Add comprehensive error handling
- [ ] Improve logging and monitoring
- [ ] Add rate limiting for API calls
- [ ] Implement retry logic for external APIs
- [ ] Add user analytics/metrics
- [ ] Write integration tests
- [ ] Add CI/CD pipeline improvements

---

## Metrics to Track

Once features are live, track:
- Daily/Monthly Active Users (DAU/MAU)
- Commands vs Natural Language usage ratio
- Average conversation length
- Most requested meeting types
- User retention rate
- Checklist refinement frequency
- Link scraping success rate
- Template usage statistics
