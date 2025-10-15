# Google OAuth Testing Guide

## Error 403: access_denied

If you see "Access blocked: prepmymeeting.vercel.app has not completed the Google verification process", your OAuth app is in Testing mode.

### Solution: Add Test Users

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **APIs & Services** → **OAuth consent screen**
4. Scroll to **Test users** section
5. Click **"+ ADD USERS"**
6. Add email addresses that need access:
   - Your email
   - Any other testers' emails
7. Click **SAVE**

### Test Users Can Now:
- Connect their Google Calendar
- Use all OAuth features
- Test the full integration

---

## Publishing Your App (Optional)

To allow **any user** to connect without being added as a test user:

### Option 1: Keep in Testing Mode (Recommended for now)
- Add up to 100 test users
- No verification needed
- Good for MVP and testing phase

### Option 2: Publish to Production
1. Complete all required OAuth consent screen fields:
   - App name
   - User support email
   - Developer contact email
   - Privacy policy URL (required!)
   - Terms of service URL (recommended)
   - App logo (optional)

2. Submit for Google Verification:
   - **Review process takes 1-4 weeks**
   - Google reviews your app's security
   - Must provide video demo
   - Must explain why you need each scope

3. Once approved, any user can connect

---

## Current Setup (Testing Mode)

Your app is currently in **Testing** mode, which is perfect for:
- Development
- Testing with friends/family
- MVP validation
- Up to 100 users

**No verification needed!** Just add users to the test users list.

---

## Scopes Currently Requested

Your app requests:
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events

This is a **sensitive scope** that requires verification if you want public access.

---

## Next Steps

1. ✅ Add yourself as test user
2. ✅ Test the OAuth flow
3. ✅ Add other test users as needed (up to 100)
4. ⏭️ Later: Submit for verification when ready for public launch

---

## Verification Requirements (for future reference)

If you decide to publish:

### Required:
- Privacy Policy (hosted on your domain)
- Homepage URL
- Authorized domains list
- Video demonstration of OAuth flow
- Justification for each scope

### Timeline:
- Submission: 5-10 minutes
- Review: 1-4 weeks
- Updates if rejected: 1-2 weeks

### Tips:
- Use clear app branding
- Write detailed scope justifications
- Create professional demo video
- Have privacy policy ready
- Respond quickly to Google's questions

---

## Troubleshooting

### "Access blocked" error?
→ Add user's email to test users list

### "Redirect URI mismatch"?
→ Check environment variable matches Google Console exactly

### "Invalid scope"?
→ Verify scope format in OAuth consent screen

### "Unverified app warning"?
→ Normal for testing mode - users can click "Advanced" → "Go to app"

---

## Resources

- [Google OAuth Verification Guide](https://support.google.com/cloud/answer/9110914)
- [OAuth Consent Screen Documentation](https://support.google.com/cloud/answer/10311615)
- [API Scopes List](https://developers.google.com/identity/protocols/oauth2/scopes)
