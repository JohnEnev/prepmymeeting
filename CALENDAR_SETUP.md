# Google Calendar Integration Setup Guide

This guide walks you through setting up the Google Calendar integration for proactive meeting prep notifications.

## Features

- 📅 **Calendar Connection**: Users can connect their Google Calendar via OAuth
- 🔔 **Proactive Notifications**: Automatic prep suggestions 24 hours before meetings
- ⚙️ **Customizable Settings**: Users can adjust notification timing and preferences
- 🤖 **Smart Detection**: Automatically detects meeting types from event details
- 📝 **Context-Aware Prep**: Uses event description, attendees, and location for better prep

## Prerequisites

1. **Google Cloud Project** with Calendar API enabled
2. **OAuth 2.0 Credentials** (Client ID and Secret)
3. **Supabase Database** with migrations applied
4. **Vercel Account** with Cron Jobs enabled (Pro tier or higher)

## Setup Steps

### 1. Google Cloud Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: `PrepMyMeeting Calendar Integration`
   - Authorized redirect URIs:
     - `https://your-domain.com/api/calendar/google/callback`
     - `http://localhost:3000/api/calendar/google/callback` (for testing)

5. Note down your **Client ID** and **Client Secret**

### 2. Environment Variables

Add the following to your `.env` file:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/google/callback

# Cron Job Security
CRON_SECRET=generate_a_random_secret_here
```

**Important**: Generate a secure random string for `CRON_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Database Migration

Run the calendar integration migration:

```bash
# If you have a migration runner
npm run migrate

# Or manually apply the migration
# supabase/migrations/002_calendar_integration.sql
```

This creates three new tables:
- `calendar_connections` - Stores OAuth tokens
- `calendar_events` - Tracks calendar events and notifications
- `notification_settings` - User notification preferences

### 4. Vercel Configuration

1. **Deploy to Vercel** with the `vercel.json` configuration
2. **Set Environment Variables** in Vercel dashboard:
   - Go to Project Settings > Environment Variables
   - Add all environment variables from step 2
3. **Verify Cron Job**:
   - Go to Project > Cron Jobs
   - Confirm `/api/cron/check-upcoming-events` is scheduled
   - Schedule: Every 6 hours (`0 */6 * * *`)

4. **Configure Cron Secret**:
   - Vercel automatically adds the `Authorization: Bearer <CRON_SECRET>` header
   - Ensure `CRON_SECRET` matches in both Vercel and your environment

### 5. Test the Integration

#### Test OAuth Flow:
1. Send `/connect_calendar` to your bot via WhatsApp
2. Click the OAuth URL
3. Sign in with Google and grant permissions
4. You should see "Calendar Connected!" confirmation

#### Test Calendar Commands:
```
/calendar_settings          # View current settings
/set_advance_hours 48       # Set to 48 hours advance notice
/toggle_notifications       # Enable/disable notifications
/toggle_auto_prep          # Toggle auto-generation
/disconnect_calendar       # Disconnect calendar
```

#### Test Cron Job Manually:
```bash
curl -X GET https://your-domain.com/api/cron/check-upcoming-events \
  -H "Authorization: Bearer your_cron_secret"
```

Expected response:
```json
{
  "success": true,
  "usersProcessed": 1,
  "eventsProcessed": 5,
  "notificationsSent": 2
}
```

## User Flow

### Connecting Calendar

1. User sends `/connect_calendar` via WhatsApp
2. Bot sends OAuth URL
3. User clicks URL and grants Google Calendar access
4. User is redirected to success page
5. Bot confirms connection via WhatsApp

### Receiving Proactive Notifications

1. Cron job runs every 6 hours
2. Bot fetches upcoming events for all users
3. For events within notification window (default 24 hours):
   - Bot sends proactive notification with event details
   - User can reply "yes <eventId>" to generate prep
   - Or user can ignore and prep won't be generated

### Notification Example

```
📅 Upcoming Meeting Alert

I noticed you have: Team Standup
When: Wednesday, January 15, 9:00 AM

🔗 https://meet.google.com/xyz-abcd-123

Would you like me to prepare a quick prep checklist for this meeting?

Reply "yes 123e4567-e89b-12d3-a456-426614174000" to generate prep now
```

## Troubleshooting

### Token Refresh Errors
- Ensure you set `access_type: 'offline'` in OAuth flow
- Check that refresh tokens are being stored correctly
- Verify token expiry logic in `google-oauth.ts`

### Cron Job Not Running
- Verify `vercel.json` is in project root
- Check Vercel Cron Jobs dashboard for execution logs
- Ensure `CRON_SECRET` is set correctly in Vercel
- Test manually with curl command

### Events Not Being Detected
- Check user's `notification_settings.notification_enabled` is `true`
- Verify `calendar_connections.is_active` is `true`
- Check `advance_notice_hours` setting
- Review cron job logs for errors

### OAuth Flow Issues
- Verify redirect URI exactly matches Google Cloud Console
- Check that Calendar API is enabled
- Ensure credentials are not expired
- Test with localhost first before production

## Security Considerations

1. **Token Storage**: OAuth tokens are stored in Supabase with RLS enabled
2. **Cron Job Security**: Protected with `CRON_SECRET` header check
3. **User Data**: Users can only access their own calendar data via RLS policies
4. **Token Refresh**: Automatic token refresh prevents stale credentials
5. **Disconnect Anytime**: Users can disconnect calendar at any time

## Architecture

```
┌─────────────┐
│   WhatsApp  │
│    User     │
└─────┬───────┘
      │ /connect_calendar
      ↓
┌─────────────────┐
│  WhatsApp Bot   │
│  (route.ts)     │
└─────┬───────────┘
      │ Generate OAuth URL
      ↓
┌─────────────────┐
│  Google OAuth   │
│   Consent       │
└─────┬───────────┘
      │ Authorization Code
      ↓
┌─────────────────┐
│ OAuth Callback  │
│   (callback)    │
└─────┬───────────┘
      │ Store Tokens
      ↓
┌─────────────────┐
│   Supabase DB   │
│  (connections)  │
└─────────────────┘

┌─────────────────┐
│  Vercel Cron    │ (Every 6 hours)
└─────┬───────────┘
      ↓
┌─────────────────┐
│  Cron Endpoint  │
│ (check-events)  │
└─────┬───────────┘
      │ Fetch Events
      ↓
┌─────────────────┐
│ Google Calendar │
│      API        │
└─────┬───────────┘
      │ Process Events
      ↓
┌─────────────────┐
│  WhatsApp Bot   │
│  (notifications)│
└─────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/calendar/google/auth` | GET | Initiate OAuth flow |
| `/api/calendar/google/callback` | GET | Handle OAuth callback |
| `/api/cron/check-upcoming-events` | GET | Check and notify upcoming events |

## Database Tables

### `calendar_connections`
- Stores OAuth access and refresh tokens
- One connection per user per provider
- Auto-refreshes expired tokens

### `calendar_events`
- Tracks calendar events from Google
- Stores notification status
- Links to generated checklists

### `notification_settings`
- User preferences for notifications
- Advance notice hours (1-168)
- Auto-prep enabled/disabled

## Next Steps

1. ✅ Test OAuth flow with real Google account
2. ✅ Create a test event in Google Calendar
3. ✅ Manually trigger cron job to test notifications
4. ✅ Verify prep generation works with "yes <eventId>"
5. 📊 Monitor cron job logs in production
6. 🎨 Consider adding Outlook Calendar support (future)

## Support

For issues or questions:
- Check Vercel logs for cron job execution
- Review Supabase logs for database errors
- Test OAuth flow with curl commands
- Verify environment variables are set correctly

---

**Note**: This integration requires Vercel Pro tier or higher for cron jobs. The free tier does not support scheduled functions.
