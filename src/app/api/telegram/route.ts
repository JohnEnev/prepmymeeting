import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_SUPPRESS_SEND = (process.env.TELEGRAM_SUPPRESS_SEND || "").toLowerCase() === "true" || process.env.TELEGRAM_SUPPRESS_SEND === "1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "o4-mini";

async function sendTelegramMessage(chatId: number, text: string) {
  if (TELEGRAM_SUPPRESS_SEND) {
    console.warn("TELEGRAM_SUPPRESS_SEND=true; skipping Telegram send (local dev)");
    return;
  }
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
    console.error(`Telegram sendMessage failed: ${res.status} ${body}`);
    return;
  }
}

function parseCommand(text: string | undefined) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  // Normalize "/cmd@botname" to "/cmd"
  const cmdOnly = rawCmd.split("@")[0];
  const args = rest.join(" ");
  return { cmd: cmdOnly.toLowerCase(), args } as const;
}

function chunkForTelegram(text: string, max = 3500): string[] {
  if (text.length <= max) return [text];
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    const seg = current ? current + "\n\n" + p : p;
    if (seg.length <= max) {
      current = seg;
    } else {
      if (current) chunks.push(current);
      if (p.length <= max) {
        current = p;
      } else {
        for (let i = 0; i < p.length; i += max) {
          chunks.push(p.slice(i, i + max));
        }
        current = "";
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function generatePrepChecklist(topic: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Add OPENAI_API_KEY to get detailed suggestions.)`;
  }
  console.log(`OpenAI: using model ${OPENAI_MODEL}`);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You generate concise, practical meeting preparation checklists. Use short bullets, grouped by 2-3 sections with headings. Focus on questions to ask and items to bring. Limit total to ~20 bullets.",
          },
          { role: "user", content: `Topic: ${topic}` },
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`OpenAI error: ${res.status} ${t}`);
      return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Temporary: OpenAI error, using fallback.)`;
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text || `Could not generate checklist for: ${topic}`;
  } catch (err: unknown) {
    console.error("OpenAI request failed", err);
    return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Temporary: OpenAI request failed, using fallback.)`;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing TELEGRAM_WEBHOOK_SECRET" }, { status: 500 });
    }

    const url = new URL(req.url);
    const auth = url.searchParams.get("secret");
    if (auth !== TELEGRAM_WEBHOOK_SECRET) {
      console.error("telegram webhook auth failed or missing secret");
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
          const checklist = await generatePrepChecklist(topic);
          const parts = chunkForTelegram(checklist);
          for (const part of parts) {
            await sendTelegramMessage(chatId, part);
          }
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
  } catch (error: unknown) {
    console.error("telegram webhook error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
} 