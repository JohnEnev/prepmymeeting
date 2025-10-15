# Google OAuth Verification Submission Checklist

## ✅ Pre-Submission Checklist

### Required Documents (Already Created!)
- [x] Privacy Policy - `/public/privacy-policy.html`
- [x] Terms of Service - `/public/terms-of-service.html`

### Required URLs
- [ ] Privacy Policy URL: `https://prepmymeeting.vercel.app/privacy-policy.html`
- [ ] Terms of Service URL: `https://prepmymeeting.vercel.app/terms-of-service.html`
- [ ] Homepage URL: `https://prepmymeeting.vercel.app`

### App Branding
- [ ] App name: PrepMyMeeting
- [ ] App logo (120x120px minimum)
- [ ] Support email: enevoldsen.j@gmail.com

---

## 📝 Scope Justification

You'll need to explain why you need `calendar.readonly` scope:

**Template Response:**
```
Scope: https://www.googleapis.com/auth/calendar.readonly

Justification:
PrepMyMeeting is a meeting preparation assistant that helps users prepare
for upcoming meetings by generating customized checklists. We need read-only
access to the user's Google Calendar to:

1. Detect upcoming events 24 hours in advance
2. Extract meeting details (title, description, attendees, time)
3. Send proactive preparation notifications via WhatsApp/Telegram
4. Generate context-aware prep suggestions based on meeting type

We ONLY read calendar data - we never create, modify, or delete events.
Users can disconnect at any time via the /disconnect_calendar command.

The calendar data is used solely to improve the user's meeting preparation
experience and is never shared with third parties (except OpenAI API for
generating prep suggestions, as disclosed in our Privacy Policy).
```

---

## 🎥 Video Demonstration

You need to create a **2-3 minute screen recording** showing:

### Video Script:

1. **Introduction (15 seconds)**
   - "Hi, I'm demonstrating PrepMyMeeting, a WhatsApp bot that helps prepare for meetings"

2. **Show OAuth Flow (45 seconds)**
   - Open WhatsApp
   - Send `/connect_calendar` command
   - Click the OAuth URL
   - Show Google consent screen
   - Click "Allow"
   - Show success confirmation in WhatsApp

3. **Show Calendar Access (30 seconds)**
   - Open Google Calendar
   - Show an upcoming event
   - Explain: "PrepMyMeeting reads this event and will notify me 24 hours before"

4. **Show Notification (30 seconds)**
   - Show a WhatsApp notification from the bot
   - Explain: "The bot detected my meeting and sent a proactive notification"
   - Show the prep suggestion being generated

5. **Show Disconnect (15 seconds)**
   - Send `/disconnect_calendar` command
   - Show confirmation
   - Explain: "Users can revoke access anytime"

6. **Privacy Explanation (30 seconds)**
   - Show Privacy Policy page
   - Explain: "We only read calendar data, never modify it"
   - "Users control their data and can disconnect anytime"

### Tools for Recording:
- **Mac:** QuickTime Screen Recording (⌘ + Shift + 5)
- **Windows:** Windows Game Bar (Win + G)
- **Chrome:** Loom (loom.com - free screen recording)
- **Mobile:** iOS Screen Recording / Android Screen Recorder

### Video Requirements:
- **Format:** MP4, MOV, or AVI
- **Max Size:** 100MB (compress if needed)
- **Length:** 2-5 minutes
- **Quality:** 720p minimum
- **Audio:** Clear narration explaining each step

---

## 🚀 Submission Steps

### 1. Deploy Privacy Policy & Terms
```bash
git add public/privacy-policy.html public/terms-of-service.html
git commit -m "Add privacy policy and terms of service for OAuth verification"
git push
vercel --prod
```

### 2. Verify URLs Work
Test these URLs:
- https://prepmymeeting.vercel.app/privacy-policy.html
- https://prepmymeeting.vercel.app/terms-of-service.html

### 3. Access OAuth Consent Screen (Alternative Methods)

**Method A: Direct OAuth Client Edit**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID
3. Click the edit icon (pencil)
4. This should let you edit without going through consent screen

**Method B: Use API Console (Old Interface)**
1. Go to: https://console.developers.google.com/apis/credentials
2. Select your project: prepmymeeting
3. Click OAuth consent screen tab

**Method C: Use gcloud CLI**
```bash
gcloud config set project prepmymeeting
# Then use web interface from gcloud
```

### 4. Fill Out OAuth Consent Screen

Once you can access it:

**App Information:**
- App name: `PrepMyMeeting`
- User support email: `enevoldsen.j@gmail.com`
- App logo: Upload a 120x120px logo
- App domain: `prepmymeeting.vercel.app`
- Authorized domains: `vercel.app`
- Application homepage: `https://prepmymeeting.vercel.app`
- Privacy policy: `https://prepmymeeting.vercel.app/privacy-policy.html`
- Terms of service: `https://prepmymeeting.vercel.app/terms-of-service.html`

**Scopes:**
- Add scope: `https://www.googleapis.com/auth/calendar.readonly`
- Justification: (Use template above)

**Publishing Status:**
- Click "PUBLISH APP"
- Submit for verification

### 5. Wait for Google Review

**Timeline:**
- **Acknowledgment:** 1-2 business days
- **Review:** 2-4 weeks (average)
- **Clarifications:** May ask follow-up questions
- **Approval:** Instant once approved

**What Google Checks:**
- Privacy Policy completeness
- Scope justification validity
- Video demonstration clarity
- App security and compliance

---

## 🎯 Common Rejection Reasons (And How We Avoid Them)

### 1. ❌ "Privacy Policy doesn't explain calendar access"
✅ **Our Fix:** Privacy Policy explicitly explains calendar.readonly scope

### 2. ❌ "Video doesn't show full OAuth flow"
✅ **Our Fix:** Follow video script above showing complete flow

### 3. ❌ "Scope justification too vague"
✅ **Our Fix:** Use detailed justification template above

### 4. ❌ "Privacy Policy not accessible"
✅ **Our Fix:** Hosted at public URL, no login required

---

## 🔄 While Waiting for Approval

**Current Status:** App works in "Testing" mode

**Limitations:**
- Only test users can connect (up to 100)
- Shows "unverified app" warning

**Workarounds:**
1. Add users manually to test users list (if you can access consent screen)
2. Users can click "Advanced" → "Go to app" to bypass warning
3. Share this with early users: "It's safe, just click through the warning"

---

## 📧 Response Templates

### If Google Asks for Clarification:

**Q: Why do you need calendar access?**
```
PrepMyMeeting is a meeting preparation assistant that sends proactive
notifications 24 hours before meetings. We read calendar events to:
1. Detect upcoming meetings
2. Extract meeting context (title, attendees, description)
3. Generate personalized prep checklists
We never modify calendar data - only read for notification purposes.
```

**Q: How do you protect user data?**
```
- OAuth 2.0 with automatic token refresh
- Tokens encrypted at rest in Supabase database
- Row-level security policies
- Users can revoke access anytime via /disconnect_calendar
- Data retention: 90 days after event date
- Never sold or shared (except OpenAI for prep generation, as disclosed)
```

---

## ✅ Post-Approval Steps

Once approved:

1. ✅ Update app status to "In Production"
2. ✅ Remove "unverified app" warning (automatic)
3. ✅ Any user can now connect without test user list
4. ✅ Update documentation
5. 🎉 Launch!

---

## 📞 Need Help?

**Google OAuth Support:**
- [OAuth Verification Guide](https://support.google.com/cloud/answer/9110914)
- [API Console Support](https://support.google.com/googleapi/)

**Contact for this project:**
- Email: enevoldsen.j@gmail.com

---

## 🎯 Estimated Timeline

- **Setup (You):** 1-2 hours
- **Video Creation:** 30-60 minutes
- **Submission:** 10 minutes
- **Google Review:** 2-4 weeks
- **Total:** ~3-5 weeks from submission to approval

**Good news:** While waiting, users can still use the app by clicking through the "unverified" warning!
