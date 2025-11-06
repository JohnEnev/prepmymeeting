# Fixing Google OAuth Consent Screen Issues

## Problem
Google Cloud Console has a UI bug where clicking "OAuth consent screen" redirects back to project overview.

## Solutions

### Option 1: Direct URL Access (Recommended)
Access the OAuth consent screen directly using this URL:

```
https://console.cloud.google.com/apis/credentials/consent?project=prepmymeeting-prod
```

Or with project number:
```
https://console.cloud.google.com/apis/credentials/consent?project=1080837814019
```

### Option 2: Use Incognito/Different Browser
Sometimes the issue is caused by cached browser state:
1. Open an incognito/private window
2. Go to https://console.cloud.google.com
3. Select your project
4. Navigate to "APIs & Services" > "OAuth consent screen"

### Option 3: Clear Browser Cache
1. Clear Google Cloud Console cookies/cache
2. Log out and log back in
3. Try accessing the consent screen again

### Option 4: Use gcloud CLI (Advanced)
```bash
# Install alpha components
gcloud components install alpha --quiet

# List existing OAuth brands
gcloud alpha iap oauth-brands list --project=prepmymeeting-prod

# Create OAuth brand (if none exists)
gcloud alpha iap oauth-brands create \
  --application_title="PrepMyMeeting" \
  --support_email="enevoldsen.j@gmail.com" \
  --project=prepmymeeting-prod
```

## Current OAuth Setup

Your OAuth credentials are already created:
- **Client ID**: `1080837814019-4mbsg9mr8f6bosl3iu1pnkge0eir4q4s.apps.googleusercontent.com`
- **Client Secret**: `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`
- **Redirect URI**: `https://prepmymeeting.vercel.app/api/calendar/google/callback`

## What You Need to Configure on OAuth Consent Screen

1. **User Type**: External (for testing with personal accounts)
2. **App Information**:
   - App name: `PrepMyMeeting`
   - User support email: Your email
   - Developer contact: Your email
3. **Scopes**:
   - `https://www.googleapis.com/auth/calendar.readonly` (already configured in code)
4. **Test Users** (for External apps):
   - Add your WhatsApp-connected email as a test user
   - This allows you to test without publishing the app

## Verification Status

For a personal/hobby project, you **don't need** to verify the app. You can:
- Keep it in "Testing" mode
- Add up to 100 test users
- Use it indefinitely without publishing

## Testing the OAuth Flow

Once configured, test with:
```bash
# From WhatsApp, send:
/connect_calendar
```

This will:
1. Generate auth URL via `/api/calendar/google/auth`
2. Redirect you to Google consent screen
3. After approval, callback to `/api/calendar/google/callback`
4. Store tokens in Supabase
5. Send confirmation via WhatsApp

## Troubleshooting

### "Access blocked: This app's request is invalid"
- OAuth consent screen not configured
- Try direct URL access above

### "Redirect URI mismatch"
- Ensure `https://prepmymeeting.vercel.app/api/calendar/google/callback` is added to authorized redirect URIs in OAuth client

### "This app hasn't been verified"
- Normal for apps in testing mode
- Click "Advanced" → "Go to PrepMyMeeting (unsafe)" to proceed
- Only you and test users will see this

## Next Steps

1. Try accessing consent screen via direct URL (Option 1)
2. Configure app name, support email, scopes
3. Add yourself as a test user
4. Test OAuth flow via WhatsApp `/connect_calendar` command
