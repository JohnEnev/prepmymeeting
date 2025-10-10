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

```bash
# App
APP_BASE_URL=https://YOUR_DOMAIN # Vercel production URL

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC...  # from @BotFather
TELEGRAM_WEBHOOK_SECRET=your-random-secret

# WhatsApp Bot (optional - only if using WhatsApp)
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token
NEXT_PUBLIC_WHATSAPP_NUMBER=15551234567  # Your WhatsApp number for wa.me link (without +)

# OpenAI
OPENAI_API_KEY=sk-...             # optional locally; required for AI checklists
OPENAI_MODEL=o4-mini              # optional, defaults to o4-mini

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Recommended for bot operations
```

See `supabase/README.md` for detailed Supabase setup instructions.
See `docs/whatsapp-integration-plan.md` for WhatsApp setup instructions.

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
