import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppMessage,
  chunkWhatsAppMessage,
  parseWhatsAppWebhook,
  extractMessageText,
  markMessageAsRead,
} from "@/lib/whatsapp";
import { getOrCreateUser, logConversation, saveChecklist } from "@/lib/db";

const WHATSAPP_WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const RAW_OPENAI_MODEL = process.env.OPENAI_MODEL || "o4-mini";
const OPENAI_MODEL = RAW_OPENAI_MODEL.replace(/^['\"]|['\"]$/g, "").trim();

/**
 * Parse command from text (same logic as Telegram)
 */
function parseCommand(text: string | undefined | null) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  const args = rest.join(" ");
  return { cmd, args } as const;
}

/**
 * Detect if text is a greeting
 */
function isGreeting(text: string | undefined | null): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  const greetings = [
    "hi", "hello", "hey", "hiya", "howdy", "greetings",
    "good morning", "good afternoon", "good evening",
    "what's up", "whats up", "sup", "yo"
  ];

  // Check if the message is just a greeting (with optional punctuation)
  const cleanText = normalized.replace(/[.,!?]+$/, '');
  return greetings.includes(cleanText) || greetings.some(g => cleanText === g);
}

/**
 * Extract response text from OpenAI API response
 */
function extractResponseText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const dataObj = data as Record<string, unknown>;

  // Try output_text field
  const outputText = dataObj.output_text;
  if (outputText && typeof outputText === "string") {
    const t = outputText.trim();
    if (t) return t;
  }

  // Try output array
  const output = Array.isArray(dataObj.output) ? dataObj.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const itemObj = item as Record<string, unknown>;
    const content = Array.isArray(itemObj.content) ? itemObj.content : [];
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      const cObj = c as Record<string, unknown>;
      const text = cObj.text || cObj.content;
      if (text && typeof text === "string" && text.trim()) {
        parts.push(text.trim());
      }
    }
  }
  if (parts.length) return parts.join("\n").trim();

  // Try choices array (standard OpenAI format)
  const choices = Array.isArray(dataObj.choices) ? dataObj.choices : [];
  if (choices.length > 0 && choices[0] && typeof choices[0] === "object") {
    const firstChoice = choices[0] as Record<string, unknown>;
    const message = firstChoice.message;
    if (message && typeof message === "object") {
      const messageObj = message as Record<string, unknown>;
      const content = messageObj.content;
      if (typeof content === "string" && content.trim()) {
        return content.trim();
      }
    }
  }

  return null;
}

/**
 * Generate prep checklist using OpenAI
 */
async function generatePrepChecklist(topic: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Add OPENAI_API_KEY to get detailed suggestions.)`;
  }

  const isO4Family = OPENAI_MODEL.toLowerCase().startsWith("o4");
  console.log(
    `OpenAI: using model ${OPENAI_MODEL} via ${isO4Family ? "responses" : "chat"}`
  );

  try {
    if (isO4Family) {
      const prompt = [
        "You generate concise, practical meeting preparation checklists.",
        "Use short bullets, grouped by 2-3 sections with headings.",
        "Focus on questions to ask and items to bring.",
        "Limit total to ~20 bullets.",
        "",
        `Topic: ${topic}`,
      ].join("\n");

      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          input: prompt,
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text();
        console.error(`OpenAI error: ${res.status} ${t}`);
        return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Temporary: OpenAI error, using fallback.)`;
      }

      const data = await res.json();
      const text = extractResponseText(data);
      return text || `Could not generate checklist for: ${topic}`;
    } else {
      const payload: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
      } = {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You generate concise, practical meeting preparation checklists. Use short bullets, grouped by 2-3 sections with headings. Focus on questions to ask and items to bring. Limit total to ~20 bullets.",
          },
          { role: "user", content: `Topic: ${topic}` },
        ],
      };

      if (!OPENAI_MODEL.toLowerCase().startsWith("o4")) {
        payload.temperature = 0.4;
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!res.ok) {
        const t = await res.text();
        console.error(`OpenAI error: ${res.status} ${t}`);
        return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Temporary: OpenAI error, using fallback.)`;
      }

      const data = await res.json();
      const text = extractResponseText(data);
      return text || `Could not generate checklist for: ${topic}`;
    }
  } catch (err: unknown) {
    console.error("OpenAI request failed", err);
    return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Temporary: OpenAI request failed, using fallback.)`;
  }
}

/**
 * GET handler - Webhook verification
 * Meta requires this to verify the webhook URL
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log("WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  console.error("WhatsApp webhook verification failed");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST handler - Incoming messages
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseWhatsAppWebhook(body);

    if (!parsed || parsed.messages.length === 0) {
      return NextResponse.json({ status: "ok" });
    }

    const { messages, contacts } = parsed;
    const message = messages[0];
    const contact = contacts[0];

    // Extract message details
    const from = message.from;
    const messageId = message.id;
    const text = extractMessageText(message);

    // Mark message as read
    await markMessageAsRead(messageId);

    // Get or create user
    let user = null;
    if (contact) {
      user = await getOrCreateUser({
        whatsappId: contact.wa_id,
        username: contact.profile.name,
        firstName: contact.profile.name,
        platform: "whatsapp",
      });
    }

    // Log user message
    if (text && user) {
      await logConversation(user.id, text, "user");
    }

    // Check for greetings first
    if (text && isGreeting(text)) {
      const greetingMsg = `Hi there! 👋 I'm here to help you prepare for your meetings and appointments.\n\nWhat's coming up for you? Tell me about your next meeting, or use these commands:\n\n• /prep <topic> - Get a prep checklist (e.g., "/prep doctor")\n• /help - See all commands\n\nOr just tell me naturally, like "I have a contractor meeting tomorrow"!`;
      await sendWhatsAppMessage(from, greetingMsg);
      if (user) {
        await logConversation(user.id, greetingMsg, "bot");
      }
      return NextResponse.json({ status: "ok" });
    }

    // Parse command
    const command = parseCommand(text);

    if (command) {
      switch (command.cmd) {
        case "/start":
        case "/hi":
        case "/hello": {
          const welcomeMsg =
            "Welcome to PrepMyMeeting! 👋\n\nCommands:\n• /help – show help\n• /prep <topic> – e.g., doctor, contractor, interview\n• /agenda – build an agenda from your topic";
          await sendWhatsAppMessage(from, welcomeMsg);
          if (user) {
            await logConversation(user.id, welcomeMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }

        case "/help": {
          const helpMsg =
            "Use /prep <topic> to get tailored question checklists.\n\nExamples:\n• /prep doctor\n• /prep contractor\n• /prep interview\n\nYou can also paste a link (job post, listing, profile) – support coming soon.";
          await sendWhatsAppMessage(from, helpMsg);
          if (user) {
            await logConversation(user.id, helpMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }

        case "/prep": {
          const topic = command.args?.trim();
          if (!topic) {
            const errorMsg = "Please provide a topic. Example: /prep doctor";
            await sendWhatsAppMessage(from, errorMsg);
            if (user) {
              await logConversation(user.id, errorMsg, "bot");
            }
            return NextResponse.json({ status: "ok" });
          }

          const checklist = await generatePrepChecklist(topic);
          const chunks = chunkWhatsAppMessage(checklist);

          for (const chunk of chunks) {
            await sendWhatsAppMessage(from, chunk);
            if (user) {
              await logConversation(user.id, chunk, "bot");
            }
          }

          // Save checklist to database
          if (user) {
            await saveChecklist(user.id, topic, checklist);
          }

          return NextResponse.json({ status: "ok" });
        }

        case "/agenda": {
          const agendaMsg =
            "(Agenda builder coming soon – will suggest structure and notes.)";
          await sendWhatsAppMessage(from, agendaMsg);
          if (user) {
            await logConversation(user.id, agendaMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }

        default: {
          const unknownMsg = "Unknown command. Try /help";
          await sendWhatsAppMessage(from, unknownMsg);
          if (user) {
            await logConversation(user.id, unknownMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }
      }
    }

    // For now, don't respond to non-command text
    // Just log it and wait for natural language processing feature
    // TODO: Add NLP to handle natural language requests

    return NextResponse.json({ status: "ok" });
  } catch (error: unknown) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
