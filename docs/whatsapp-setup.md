# WhatsApp Bot Setup Guide

This guide will help you set up the WhatsApp integration for PrepMyMeeting using Meta's WhatsApp Cloud API.

## Prerequisites

- A Facebook Business account
- A deployed app URL (e.g., Vercel deployment)
- Access to Meta for Developers

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Business** as the app type
4. Fill in app details:
   - App name: `PrepMyMeeting`
   - Contact email: your email
5. Click **Create App**

## Step 2: Add WhatsApp Product

1. In your app dashboard, find **WhatsApp** product
2. Click **Set Up** on the WhatsApp card
3. You'll be taken to WhatsApp setup page

## Step 3: Get API Credentials

1. In the WhatsApp setup page, you'll see:
   - **Phone Number ID** - Copy this
   - **WhatsApp Business Account ID** - Copy this
   - **Temporary Access Token** - Copy this (valid for 24 hours)

2. For production, you'll need a permanent access token:
   - Go to **System Users** in Business Settings
   - Create a system user
   - Generate a permanent token with `whatsapp_business_messaging` permission

## Step 4: Configure Test Phone Number

1. Meta provides a test phone number for development
2. Add your personal WhatsApp number as a test recipient:
   - In the WhatsApp setup page, click **Add phone number**
   - Enter your WhatsApp number
   - Verify the OTP sent to your WhatsApp

## Step 5: Configure Webhook

1. In the WhatsApp setup page, find **Configuration** → **Webhook**
2. Click **Edit**
3. Enter your webhook URL:
   ```
   https://YOUR_DOMAIN/api/whatsapp
   ```
4. Enter your verify token (create a random string):
   ```
   my-secret-verify-token-12345
   ```
5. Click **Verify and Save**

6. Subscribe to webhook fields:
   - ✓ messages

## Step 6: Add Environment Variables

Add these to your `.env.local` and Vercel:

```bash
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=my-secret-verify-token-12345
```

## Step 7: Run the Database Migration

Run the WhatsApp support migration in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Open a new query
3. Copy contents of `supabase/migrations/003_add_whatsapp_support.sql`
4. Run the query

## Step 8: Deploy to Vercel

1. Push your code to GitHub
2. Vercel will automatically deploy
3. Add the environment variables in Vercel dashboard
4. Wait for deployment to complete

## Step 9: Test the Bot

1. Open WhatsApp on your phone
2. Send a message to the test number provided by Meta
3. Try these commands:
   - `Hi` or `/start` - Welcome message
   - `/help` - Show help
   - `/prep doctor` - Generate a prep checklist

## Troubleshooting

### Webhook verification fails
- Make sure `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches what you entered in Meta
- Check that your app is deployed and accessible
- Verify the webhook URL is correct

### Messages not received
- Check that your number is added as a test recipient
- Verify webhook is subscribed to `messages` field
- Check Vercel logs for errors

### Access token expired
- Temporary tokens expire after 24 hours
- Generate a permanent token using System Users in Business Settings

## Going to Production

To use WhatsApp in production (not just test numbers):

1. **Get Business Verification**
   - Verify your Facebook Business
   - This can take 1-2 weeks

2. **Add a Phone Number**
   - You need a dedicated phone number for the bot
   - Cannot use your personal number
   - Can purchase through Meta or use existing business number

3. **Message Templates**
   - For messages outside 24-hour window, you need approved templates
   - Submit templates for review in Meta dashboard

4. **Rate Limits**
   - Start with 1,000 conversations per day
   - Increases as you maintain quality

## Resources

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

## Support

For issues specific to PrepMyMeeting WhatsApp integration, check:
- `docs/whatsapp-integration-plan.md` - Technical implementation details
- GitHub issues
- Vercel logs for webhook errors
