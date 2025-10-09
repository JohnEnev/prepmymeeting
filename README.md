# PrepMyMeeting

A minimal Next.js app + Telegram webhook to help you prep any meeting.

## Local development

```bash
npm install
cp .env.sample .env.local # if present, or create manually
npm run dev
```

## Environment variables

Create `.env.local` for local (not committed) and set in Vercel for production:

```
APP_BASE_URL=https://YOUR_DOMAIN # Vercel production
TELEGRAM_BOT_TOKEN=123456:ABC...  # from @BotFather
TELEGRAM_WEBHOOK_SECRET=your-random-secret
OPENAI_API_KEY=sk-...             # optional locally; required for AI checklists
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

See `supabase/README.md` for detailed Supabase setup instructions.

## Telegram bot setup

1) Create a bot with `@BotFather` → copy token
2) Set envs in Vercel (`APP_BASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `OPENAI_API_KEY` optional)
3) Set webhook:
   - POST `https://YOUR_DOMAIN/api/telegram/set-webhook`
   - or manual `setWebhook` curl

## Commands

- `/start`, `/help`
- `/prep <topic>` → AI checklist via OpenAI when key is set
- `/agenda` (placeholder)
- Any text → echo (for now)

## Roadmap

- Voice (Whisper) + TTS
- Link ingestion + RAG
- Calendar context
