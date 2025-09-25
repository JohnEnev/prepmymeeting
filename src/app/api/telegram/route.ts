import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not set; skipping Telegram send (local dev)");
    return;
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
  }
}

function parseCommand(text: string | undefined) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [cmd, ...rest] = trimmed.split(/\s+/);
  const args = rest.join(" ");
  return { cmd: cmd.toLowerCase(), args } as const;
}

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing TELEGRAM_WEBHOOK_SECRET" }, { status: 500 });
    }

    const auth = req.nextUrl.searchParams.get("secret");
    if (auth !== TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await req.json();

    const message = update?.message;
    const chatId: number | undefined = message?.chat?.id;
    const text: string | undefined = message?.text;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    const command = parseCommand(text);

    if (command) {
      switch (command.cmd) {
        case "/start": {
          await sendTelegramMessage(
            chatId,
            "Welcome to PrepMyMeeting!\n\nCommands:\n/help – show help\n/prep <topic> – e.g., doctor, contractor, interview\n/agenda – build an agenda from your topic"
          );
          return NextResponse.json({ ok: true });
        }
        case "/help": {
          await sendTelegramMessage(
            chatId,
            "Use /prep <topic> to get tailored question checklists. Examples:\n/prep doctor\n/prep contractor\n/prep interview\n\nYou can also paste a link (job post, listing, profile) – support coming soon."
          );
          return NextResponse.json({ ok: true });
        }
        case "/prep": {
          const topic = command.args?.trim();
          if (!topic) {
            await sendTelegramMessage(chatId, "Please provide a topic. Example: /prep doctor");
            return NextResponse.json({ ok: true });
          }
          await sendTelegramMessage(
            chatId,
            `Preparing for: ${topic}\n\n(Next: AI-generated checklist; for now this is a placeholder.)`
          );
          return NextResponse.json({ ok: true });
        }
        case "/agenda": {
          await sendTelegramMessage(chatId, "(Agenda builder coming soon – will suggest structure and notes.)");
          return NextResponse.json({ ok: true });
        }
        default: {
          await sendTelegramMessage(chatId, "Unknown command. Try /help");
          return NextResponse.json({ ok: true });
        }
      }
    }

    if (text) {
      await sendTelegramMessage(chatId, `You said: ${text}\n\n(LLM replies coming soon 🚧)`);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("telegram webhook error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
} 