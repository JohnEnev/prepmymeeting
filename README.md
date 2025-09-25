# PrepMyMeeting

A minimal Next.js app + Telegram webhook to help you prep any meeting.

## Local development

```bash
# install deps
npm install

# run dev server
npm run dev
# http://localhost:3000
```

## Environment variables

Create `.env.local` in the project root (not committed):

```
TELEGRAM_BOT_TOKEN=123456:ABC... # from @BotFather
TELEGRAM_WEBHOOK_SECRET=your-random-secret
```

## Telegram webhook (Vercel)

1. Create a bot with `@BotFather`, copy the token.
2. Deploy this repo to Vercel (set the env vars in Project Settings → Environment Variables).
3. Find your production domain, e.g. `https://prepmymeeting.vercel.app`.
4. Set Telegram webhook (replace placeholders):

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/api/telegram?secret=YOUR_WEBHOOK_SECRET"
  }'
```

To remove webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook"
```

## Commands

- `/start`: welcome message
- Text message: echo back for now; LLM flow coming next.

## Roadmap

- Whisper STT for voice notes
- Link ingestion + RAG
- Meeting personas & calendar context
