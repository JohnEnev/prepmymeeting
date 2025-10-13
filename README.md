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

# Web Search (optional - Perplexity API)
PERPLEXITY_API_KEY=pplx-...       # optional; enables web search for prep requests
ENABLE_WEB_SEARCH=true            # optional; set to "true" or "1" to enable (default: false)
SHOW_SEARCH_CITATIONS=true        # optional; show source URLs to users (default: false)
MAX_SEARCH_CITATIONS=3            # optional; max number of citations to show (default: 3, max: 5)

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

## Web Search Feature

PrepMyMeeting can search the web for current information when you explicitly request it. This feature uses Perplexity's Sonar API.

**Setup:**
1. Get an API key from [Perplexity AI](https://www.perplexity.ai/)
2. Add `PERPLEXITY_API_KEY` to your environment variables
3. Enable the feature by setting `ENABLE_WEB_SEARCH=true`

**Usage:**
Ask questions using explicit search phrases:
- "Tell me about [company name]"
- "What's the latest on [topic]"
- "Find information about [person/place]"
- "Search for [topic]"

**Configuration:**
- `SHOW_SEARCH_CITATIONS=true` - Display source URLs with results
- `MAX_SEARCH_CITATIONS=3` - Control how many sources are shown (1-5)

The search feature is designed for explicit requests only, ensuring it activates when you need current information without interrupting regular prep flows.

## Commands

- `/start`, `/help`
- `/prep <topic>` → AI checklist via OpenAI when key is set
- `/agenda` (placeholder)
- Any text → echo (for now)

## Roadmap

- Voice (Whisper) + TTS
- Link ingestion + RAG
- Calendar context
