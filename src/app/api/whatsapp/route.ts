import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppMessage,
  chunkWhatsAppMessage,
  parseWhatsAppWebhook,
  extractMessageText,
  markMessageAsRead,
} from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";
import {
  getOrCreateUser,
  logConversation,
  saveChecklist,
  getRecentConversations,
  saveSubmittedLink,
  getOrCreateSession,
  updateSessionActivity,
  deactivateOldSessions,
  logConversationWithSession,
  getUserPreferences,
  findOrCreateRecurringMeeting,
  updateRecurringMeeting,
  getOrCreateNotificationSettings,
  updateNotificationSettings,
  getCalendarEvent,
  linkChecklistToEvent,
} from "@/lib/db";
import { classifyIntent, buildPrepTopic, quickClassify } from "@/lib/nlp";
import { extractURLs, parseURL, buildURLContext } from "@/lib/url-parser";
import {
  isLikelyFollowUp,
  buildConversationContext,
  truncateContext,
} from "@/lib/conversation-context";
import { generateFollowUpResponse, shouldUsePrepFlow } from "@/lib/follow-up";
import {
  detectsPastReference,
  findPastContext,
  buildPastContextString,
  detectRecurringPattern,
  checkForRecurringMeeting,
} from "@/lib/long-term-memory";
import {
  checkRateLimit,
  incrementRequestCount,
  trackCost,
  COSTS,
} from "@/lib/rate-limit";
import { downloadWhatsAppAudio } from "@/lib/audio/download";
import { transcribeAudio, calculateWhisperCost } from "@/lib/audio/transcribe";
import {
  validateAudioFile,
  validateAudioDuration,
} from "@/lib/audio/validators";
import {
  searchWeb,
  buildPrepSearchQuery,
  shouldSearch,
  extractSearchTopic,
  isSearchEnabled,
  shouldShowCitations,
  formatCitations,
} from "@/lib/search";
import { generateAuthUrl, disconnectCalendar, getActiveConnection } from "@/lib/calendar/google-oauth";
import {
  shouldSendWelcomeMessage,
  markWelcomeMessageSent,
  updateUserLastMessage,
  WELCOME_MESSAGE,
} from "@/lib/welcome-message";

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
async function generatePrepChecklist(
  topic: string,
  urlContext?: string,
  pastContext?: string,
  searchContext?: string,
  userPreferences?: { preferred_length: string; preferred_tone: string; max_bullets: number }
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return `Prep checklist for: ${topic}\n\n- Goals and context\n- Key questions (3-5)\n- Constraints (time, budget, risks)\n- Next steps & follow-up\n\n(Add OPENAI_API_KEY to get detailed suggestions.)`;
  }

  const isO4Family = OPENAI_MODEL.toLowerCase().startsWith("o4");
  console.log(
    `OpenAI: using model ${OPENAI_MODEL} via ${isO4Family ? "responses" : "chat"}`
  );

  try {
    if (isO4Family) {
      const promptParts = [
        "You're a helpful friend giving quick, practical advice for meeting prep.",
        "Be conversational and warm. Start with a friendly intro like 'Of course! Here's what I'd ask...' or 'Sure thing! Here are the key things...'",
        "Use plain text with simple bullets (•) - NO markdown headers or formatting.",
      ];

      // Apply user preferences
      if (userPreferences) {
        if (userPreferences.preferred_length === "short") {
          promptParts.push(`Keep it SHORT - max ${userPreferences.max_bullets} bullets total.`);
        } else if (userPreferences.preferred_length === "long") {
          promptParts.push(`Provide DETAILED information with examples and context. Aim for 15-20 comprehensive bullets.`);
        } else {
          promptParts.push(`Keep it SHORT - max 8-10 bullets total.`);
        }

        if (userPreferences.preferred_tone === "formal") {
          promptParts.push("Use PROFESSIONAL, business-appropriate language.");
        } else if (userPreferences.preferred_tone === "casual") {
          promptParts.push("Use CASUAL, friendly language like texting a friend.");
        }
      } else {
        promptParts.push("Keep it SHORT - max 8-10 bullets total.");
      }

      promptParts.push("Focus on the most important questions and 2-3 things to bring.");
      promptParts.push("Sound natural, like texting a friend.");
      promptParts.push("");
      promptParts.push(`Topic: ${topic}`);

      if (pastContext) {
        promptParts.push("", "PAST CONTEXT (reference this if relevant):", pastContext);
      }

      if (urlContext) {
        promptParts.push("", "CONTEXT FROM URL:", urlContext);
      }

      if (searchContext) {
        promptParts.push("", "CURRENT WEB INFORMATION:", searchContext);
      }

      const prompt = promptParts.join("\n");

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
      let systemContent = "You're a helpful friend giving quick, practical advice for meeting prep. Be conversational and warm. Start with a friendly intro like 'Of course! Here's what I'd ask...' or 'Sure thing! Here are the key things...'. Use plain text with simple bullets (•) - NO markdown headers or formatting.";

      // Apply user preferences
      if (userPreferences) {
        if (userPreferences.preferred_length === "short") {
          systemContent += ` Keep it SHORT - max ${userPreferences.max_bullets} bullets total.`;
        } else if (userPreferences.preferred_length === "long") {
          systemContent += ` Provide DETAILED information with examples and context. Aim for 15-20 comprehensive bullets.`;
        } else {
          systemContent += ` Keep it SHORT - max 8-10 bullets total.`;
        }

        if (userPreferences.preferred_tone === "formal") {
          systemContent += " Use PROFESSIONAL, business-appropriate language.";
        } else if (userPreferences.preferred_tone === "casual") {
          systemContent += " Use CASUAL, friendly language like texting a friend.";
        }
      } else {
        systemContent += " Keep it SHORT - max 8-10 bullets total.";
      }

      systemContent += " Focus on the most important questions and 2-3 things to bring. Sound natural, like texting a friend.";

      if (urlContext) {
        systemContent += " IMPORTANT: The user shared a URL and I've scraped the full content for you. You MUST reference specific details from the URL content in your response. Do NOT say you can't access the URL - you have all the information right here.";
      }

      let userContent = `Topic: ${topic}`;
      if (pastContext) {
        userContent += `\n\nPAST CONTEXT (reference this if relevant):\n${pastContext}`;
      }
      if (urlContext) {
        userContent += `\n\nCONTEXT FROM URL:\n${urlContext}`;
      }
      if (searchContext) {
        userContent += `\n\nCURRENT WEB INFORMATION:\n${searchContext}`;
      }

      const payload: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
      } = {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: systemContent,
          },
          { role: "user", content: userContent },
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
    console.log("WhatsApp webhook received");
    const body = await req.json();
    console.log("WhatsApp webhook body:", JSON.stringify(body, null, 2));

    const parsed = parseWhatsAppWebhook(body);

    if (!parsed || parsed.messages.length === 0) {
      console.log("No messages in webhook");
      return NextResponse.json({ status: "ok" });
    }

    const { messages, contacts } = parsed;
    const message = messages[0];
    const contact = contacts[0];

    // Extract message details
    const from = message.from;
    const messageId = message.id;
    let text = extractMessageText(message);

    console.log("Extracted text:", text);
    console.log("Message type:", message.type);

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

    // Handle voice messages
    if (message.type === "audio" && message.audio?.id) {
      console.log("Voice message detected, processing...");

      try {
        // Send processing acknowledgment
        await sendWhatsAppMessage(from, "🎤 Got your voice message! Transcribing...");

        // Download audio file
        const audioFile = await downloadWhatsAppAudio(message.audio.id);

        // Validate audio file
        const formatValidation = validateAudioFile(audioFile.mimeType, audioFile.fileSize);
        if (!formatValidation.valid) {
          await sendWhatsAppMessage(from, formatValidation.error || "Invalid audio file");
          return NextResponse.json({ status: "ok" });
        }

        const durationValidation = validateAudioDuration(audioFile.fileSize);
        if (!durationValidation.valid) {
          await sendWhatsAppMessage(from, durationValidation.error || "Audio file too long");
          return NextResponse.json({ status: "ok" });
        }

        // Transcribe audio
        const transcription = await transcribeAudio(audioFile);
        text = transcription.text;

        console.log(`Voice transcribed: "${text}"`);

        // Track Whisper cost
        if (user && transcription.duration) {
          const whisperCost = calculateWhisperCost(transcription.duration);
          await trackCost(user.id, whisperCost);
          console.log(`Whisper cost: ${whisperCost} cents for ${transcription.duration}s`);
        }
      } catch (error) {
        console.error("Voice message processing error:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to process voice message. Please try sending a text message instead.";
        await sendWhatsAppMessage(from, errorMsg);
        return NextResponse.json({ status: "ok" });
      }
    }

    // Check if we should send welcome message (first time or returning after inactivity)
    if (user && text) {
      const shouldWelcome = await shouldSendWelcomeMessage(user.id);
      if (shouldWelcome) {
        console.log(`Sending welcome message to user ${user.id}`);
        const chunks = chunkWhatsAppMessage(WELCOME_MESSAGE);
        for (const chunk of chunks) {
          await sendWhatsAppMessage(from, chunk);
        }
        await markWelcomeMessageSent(user.id);
        await logConversation(user.id, WELCOME_MESSAGE, "bot");
        // Continue processing the user's message below
      } else {
        // Update last message time for active users
        await updateUserLastMessage(user.id);
      }
    }

    // Session management and logging
    let session = null;
    if (user) {
      // Deactivate old sessions (>10 min)
      await deactivateOldSessions(user.id);

      // Get or create active session
      session = await getOrCreateSession(user.id);

      // Log user message with session
      if (text) {
        await logConversationWithSession(user.id, text, "user", session?.id);
      }
    }

    // CHECK RATE LIMITS - Do this after logging to track all requests
    if (user && text) {
      const rateLimitResult = await checkRateLimit(user.id);

      if (!rateLimitResult.allowed) {
        console.log(`Rate limit exceeded for user ${user.id}: ${rateLimitResult.limit}`);
        await sendWhatsAppMessage(from, rateLimitResult.reason || "You've exceeded your usage limit. Please try again later.");
        return NextResponse.json({ status: "rate_limited" });
      }

      // Increment request count
      await incrementRequestCount(user.id);
    }

    // Check for greetings - but only send if welcome message wasn't just sent
    if (text && isGreeting(text) && user) {
      const shouldWelcome = await shouldSendWelcomeMessage(user.id);
      if (!shouldWelcome) {
        // Only send greeting if we didn't already send the welcome message
        const greetingMsg = `Hi there! 👋 I'm here to help you prepare for your meetings and appointments.\n\nWhat's coming up for you? Tell me about your next meeting, or use these commands:\n\n• /prep <topic> - Get a prep checklist (e.g., "/prep doctor")\n• /help - See all commands\n\nOr just tell me naturally, like "I have a contractor meeting tomorrow"!`;
        await sendWhatsAppMessage(from, greetingMsg);
        await logConversation(user.id, greetingMsg, "bot");
        return NextResponse.json({ status: "ok" });
      }
      // If welcome message was sent, just continue processing normally (which will exit gracefully)
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

        case "/connect_calendar": {
          if (!user) {
            return NextResponse.json({ status: "ok" });
          }

          // Check if already connected
          const existingConnection = await getActiveConnection(user.id);
          if (existingConnection) {
            const alreadyConnectedMsg =
              "Your Google Calendar is already connected! 📅\n\nUse /disconnect_calendar to remove the connection, or /calendar_settings to adjust notification preferences.";
            await sendWhatsAppMessage(from, alreadyConnectedMsg);
            await logConversation(user.id, alreadyConnectedMsg, "bot");
            return NextResponse.json({ status: "ok" });
          }

          // Generate OAuth URL
          const authUrl = generateAuthUrl(user.id);
          const connectMsg = `📅 *Connect Your Google Calendar*\n\nTo enable proactive meeting prep suggestions, please connect your calendar:\n\n${authUrl}\n\n1. Click the link above\n2. Sign in with Google\n3. Grant calendar access\n\nI'll send you prep suggestions 24 hours before your meetings!`;
          await sendWhatsAppMessage(from, connectMsg);
          if (user) {
            await logConversation(user.id, connectMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }

        case "/disconnect_calendar": {
          if (!user) {
            return NextResponse.json({ status: "ok" });
          }

          try {
            await disconnectCalendar(user.id);
            const disconnectMsg =
              "✅ Your Google Calendar has been disconnected. You won't receive proactive prep notifications anymore.\n\nYou can reconnect anytime with /connect_calendar";
            await sendWhatsAppMessage(from, disconnectMsg);
            await logConversation(user.id, disconnectMsg, "bot");
          } catch {
            const errorMsg =
              "❌ Failed to disconnect calendar. Please try again later.";
            await sendWhatsAppMessage(from, errorMsg);
            await logConversation(user.id, errorMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }

        case "/calendar_settings": {
          if (!user) {
            return NextResponse.json({ status: "ok" });
          }

          const settings = await getOrCreateNotificationSettings(user.id);
          if (!settings) {
            const errorMsg = "❌ Failed to load settings. Please try again.";
            await sendWhatsAppMessage(from, errorMsg);
            await logConversation(user.id, errorMsg, "bot");
            return NextResponse.json({ status: "ok" });
          }

          const settingsMsg = `📅 *Calendar Notification Settings*\n\n` +
            `• Notifications: ${settings.notification_enabled ? "✅ Enabled" : "❌ Disabled"}\n` +
            `• Advance Notice: ${settings.advance_notice_hours} hours\n` +
            `• Auto-Generate Prep: ${settings.auto_generate_prep ? "✅ Yes" : "❌ No (ask first)"}\n\n` +
            `To change settings, use:\n` +
            `/set_advance_hours <hours>` +
            ` - Set notification timing (1-168 hours)\n` +
            `/toggle_notifications` +
            ` - Enable/disable notifications\n` +
            `/toggle_auto_prep` +
            ` - Auto-generate prep without asking`;

          await sendWhatsAppMessage(from, settingsMsg);
          await logConversation(user.id, settingsMsg, "bot");
          return NextResponse.json({ status: "ok" });
        }

        case "/set_advance_hours": {
          if (!user) {
            return NextResponse.json({ status: "ok" });
          }

          const hours = parseInt(command.args);
          if (isNaN(hours) || hours < 1 || hours > 168) {
            const errorMsg =
              "Please provide a valid number of hours between 1 and 168.\n\nExample: /set_advance_hours 24";
            await sendWhatsAppMessage(from, errorMsg);
            await logConversation(user.id, errorMsg, "bot");
            return NextResponse.json({ status: "ok" });
          }

          await updateNotificationSettings(user.id, { advance_notice_hours: hours });
          const successMsg = `✅ Notification timing updated! I'll now send prep suggestions ${hours} hours before your meetings.`;
          await sendWhatsAppMessage(from, successMsg);
          await logConversation(user.id, successMsg, "bot");
          return NextResponse.json({ status: "ok" });
        }

        case "/toggle_notifications": {
          if (!user) {
            return NextResponse.json({ status: "ok" });
          }

          const settings = await getOrCreateNotificationSettings(user.id);
          const newValue = !settings?.notification_enabled;
          await updateNotificationSettings(user.id, { notification_enabled: newValue });

          const toggleMsg = newValue
            ? "✅ Calendar notifications enabled! I'll send you proactive prep suggestions."
            : "❌ Calendar notifications disabled. Use /toggle_notifications to re-enable.";
          await sendWhatsAppMessage(from, toggleMsg);
          await logConversation(user.id, toggleMsg, "bot");
          return NextResponse.json({ status: "ok" });
        }

        case "/toggle_auto_prep": {
          if (!user) {
            return NextResponse.json({ status: "ok" });
          }

          const settings = await getOrCreateNotificationSettings(user.id);
          const newValue = !settings?.auto_generate_prep;
          await updateNotificationSettings(user.id, { auto_generate_prep: newValue });

          const toggleMsg = newValue
            ? "✅ Auto-prep enabled! I'll automatically generate prep for your meetings."
            : "❌ Auto-prep disabled. I'll ask before generating prep.";
          await sendWhatsAppMessage(from, toggleMsg);
          await logConversation(user.id, toggleMsg, "bot");
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

    // Check for URLs in message
    if (text) {
      console.log(`[WHATSAPP] Checking for URLs in text: ${text.substring(0, 100)}...`);
      const urls = extractURLs(text);

      if (urls.length > 0) {
        console.log(`[WHATSAPP] ✅ URLs detected (${urls.length}):`, urls);
        const url = urls[0]; // Handle first URL for now
        console.log(`[WHATSAPP] Processing URL: ${url}`);

        // Send acknowledgment
        const ackMsg = "I see you shared a link! Let me fetch that info for you...";
        await sendWhatsAppMessage(from, ackMsg);
        if (user) {
          await logConversation(user.id, ackMsg, "bot");
        }

        console.log(`[WHATSAPP] Calling parseURL for: ${url}`);
        // Parse URL
        const urlInfo = await parseURL(url);
        console.log(`[WHATSAPP] parseURL completed. Has content: ${!!urlInfo.content}, Type: ${urlInfo.type}`);

        if (urlInfo.content) {
          console.log(`[WHATSAPP] ✅ URL content successfully fetched (${urlInfo.content.length} chars)`);
        } else {
          console.log(`[WHATSAPP] ❌ URL content is null/empty. Summary: ${urlInfo.summary}`);
        }

        if (urlInfo.content) {
          // Determine topic based on URL type and text
          let topic = "general meeting";
          if (text.toLowerCase().includes("interview") || urlInfo.type === "job_posting") {
            topic = "job interview";
          } else if (urlInfo.type === "linkedin_profile") {
            topic = "networking meeting";
          } else if (urlInfo.type === "property_listing") {
            topic = "property viewing";
          } else if (urlInfo.type === "restaurant") {
            topic = "restaurant visit";
          } else if (urlInfo.type === "business_website") {
            topic = "business meeting";
          }

          // Add any additional context from the message
          const textWithoutUrl = text.replace(url, "").trim();
          if (textWithoutUrl) {
            topic = textWithoutUrl;
          }

          // Build context from URL
          const urlContext = buildURLContext(urlInfo);

          // Generate checklist with URL context
          const checklist = await generatePrepChecklist(topic, urlContext);
          const chunks = chunkWhatsAppMessage(checklist);

          for (const chunk of chunks) {
            await sendWhatsAppMessage(from, chunk);
            if (user) {
              await logConversation(user.id, chunk, "bot");
            }
          }

          // Save checklist and link to database
          if (user) {
            await saveChecklist(user.id, topic, checklist);

            // Map URLType to database link_type
            let linkType: "linkedin" | "property" | "restaurant" | "job_post" | "other" = "other";
            if (urlInfo.type === "linkedin_profile" || urlInfo.type === "linkedin_company") {
              linkType = "linkedin";
            } else if (urlInfo.type === "job_posting") {
              linkType = "job_post";
            } else if (urlInfo.type === "property_listing") {
              linkType = "property";
            } else if (urlInfo.type === "restaurant") {
              linkType = "restaurant";
            }

            await saveSubmittedLink(
              user.id,
              url,
              linkType,
              urlInfo.title,
              urlInfo.content,
              { type: urlInfo.type, summary: urlInfo.summary }
            );
          }

          return NextResponse.json({ status: "ok" });
        } else {
          // Failed to fetch URL content
          const errorMsg =
            "Sorry, I couldn't access that link. It might be blocked or require login. Try describing your meeting instead!";
          await sendWhatsAppMessage(from, errorMsg);
          if (user) {
            await logConversation(user.id, errorMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }
      }
    }

    // Check for calendar event prep confirmation (e.g., "yes <eventId>")
    if (text && user) {
      const yesEventMatch = text.match(/^yes\s+([a-f0-9-]{36})$/i);
      if (yesEventMatch) {
        const eventId = yesEventMatch[1];
        console.log(`User confirmed prep for event: ${eventId}`);

        // Get event from database
        const event = await getCalendarEvent(eventId);
        if (event) {
          // Load user preferences
          const userPrefs = await getUserPreferences(user.id);

          // Generate prep for the event
          const topic = event.summary;
          const eventContext = event.description || "";

          const checklist = await generatePrepChecklist(
            topic,
            eventContext,
            undefined,
            undefined,
            userPrefs ? {
              preferred_length: userPrefs.preferred_length,
              preferred_tone: userPrefs.preferred_tone,
              max_bullets: userPrefs.max_bullets
            } : undefined
          );

          // Track cost
          const isO4 = OPENAI_MODEL.toLowerCase().startsWith("o4");
          await trackCost(user.id, isO4 ? COSTS.O4_MINI : COSTS.GPT4O_MINI);

          // Send prep
          const chunks = chunkWhatsAppMessage(checklist);
          for (const chunk of chunks) {
            await sendWhatsAppMessage(from, chunk);
            if (session) {
              await logConversationWithSession(user.id, chunk, "bot", session.id);
            }
          }

          // Save checklist and link to event
          const { data: savedChecklist } = await supabase
            .from("checklists")
            .insert({ user_id: user.id, topic, content: checklist })
            .select()
            .single();

          if (savedChecklist) {
            await linkChecklistToEvent(eventId, savedChecklist.id);
          }

          return NextResponse.json({ status: "ok" });
        } else {
          const errorMsg = "Sorry, I couldn't find that event. It may have been removed or cancelled.";
          await sendWhatsAppMessage(from, errorMsg);
          await logConversation(user.id, errorMsg, "bot");
          return NextResponse.json({ status: "ok" });
        }
      }
    }

    // Check for follow-up questions (conversational memory)
    if (text && user && session && isLikelyFollowUp(text)) {
      console.log("Detected potential follow-up question");

      // Get recent conversation history for context
      const recentMessages = await getRecentConversations(user.id, 10);

      // Build context from recent messages
      const conversationContext = buildConversationContext(recentMessages);

      if (conversationContext) {
        console.log("Have conversation context, classifying with OpenAI...");

        // Classify intent with conversation context
        const conversationHistory = recentMessages
          .slice(0, 5)
          .reverse()
          .map((msg) => `${msg.message_type}: ${msg.message_text}`);

        const nlpResult = await classifyIntent(text, conversationHistory);
        console.log("Follow-up NLP result:", nlpResult);

        // Check if this is actually a follow-up or a new prep request
        const useFullPrep = shouldUsePrepFlow(text, nlpResult.intent);

        if (!useFullPrep && (
          nlpResult.intent === "follow_up" ||
          nlpResult.intent === "refinement" ||
          nlpResult.intent === "clarification"
        ) && nlpResult.confidence > 0.6) {
          // Generate follow-up response with context
          const truncatedContext = truncateContext(conversationContext, 2000);
          const followUpResponse = await generateFollowUpResponse(
            text,
            truncatedContext,
            nlpResult.intent
          );

          // Send response
          const chunks = chunkWhatsAppMessage(followUpResponse);
          for (const chunk of chunks) {
            await sendWhatsAppMessage(from, chunk);
            if (user && session) {
              await logConversationWithSession(user.id, chunk, "bot", session.id);
            }
          }

          // Update session activity
          if (session) {
            await updateSessionActivity(session.id);
          }

          return NextResponse.json({ status: "ok" });
        }
        // If not a follow-up, fall through to normal NLP handling
      }
    }

    // Handle natural language using NLP
    if (text) {
      console.log("Handling NLP for text:", text);
      // Quick check if message is likely about prep
      const quickCheck = quickClassify(text);
      console.log("Quick classify result:", quickCheck);

      // Only classify with OpenAI if it seems like a prep request
      if (quickCheck.likelyPrep) {
        console.log("Text classified as likely prep, calling OpenAI...");
        // Get recent conversation history for context
        const recentMessages = user
          ? await getRecentConversations(user.id, 10)
          : [];
        const conversationHistory = recentMessages
          .slice(0, 5) // Last 5 messages
          .reverse()
          .map((msg) => `${msg.message_type}: ${msg.message_text}`);

        const nlpResult = await classifyIntent(text, conversationHistory);

        console.log("NLP Result:", nlpResult);

        // Handle based on intent
        if (nlpResult.intent === "prep_meeting" && nlpResult.confidence > 0.6) {
          const topic = buildPrepTopic(nlpResult);

          // Load user preferences
          const userPrefs = user ? await getUserPreferences(user.id) : null;

          // Detect past references and find context
          const pastRef = detectsPastReference(text);
          let pastContextString = "";
          let recurringMeeting = null;

          if (user && pastRef.isPastReference) {
            console.log("Detected past reference, searching for context...");
            const pastContext = await findPastContext(user.id, pastRef.keywords);
            pastContextString = buildPastContextString(
              pastContext.checklists,
              pastContext.conversations
            );
          }

          // Check for recurring meeting
          if (user) {
            recurringMeeting = await checkForRecurringMeeting(user.id, topic);
            if (recurringMeeting) {
              console.log(`Found recurring meeting: ${recurringMeeting.meeting_type} (${recurringMeeting.occurrence_count} times)`);
              pastContextString += `\n\n${buildPastContextString([], [], recurringMeeting)}`;
            } else {
              const recurringPattern = detectRecurringPattern(text);
              if (recurringPattern.isRecurring && recurringPattern.meetingType) {
                console.log(`Detected new recurring meeting: ${recurringPattern.meetingType}`);
                recurringMeeting = await findOrCreateRecurringMeeting(user.id, recurringPattern.meetingType);
              }
            }
          }

          // Check if web search is needed
          let searchContextString = "";
          let searchCitations: string[] = [];
          if (isSearchEnabled()) {
            const searchDetection = shouldSearch(text);

            if (searchDetection.shouldSearch) {
              console.log(`🔍 Search triggered: ${searchDetection.reason}`);

              try {
                const searchTopic = extractSearchTopic(text) || topic;
                const searchQuery = buildPrepSearchQuery(text, searchTopic);

                const searchResult = await searchWeb(searchQuery);
                searchContextString = searchResult.answer;
                searchCitations = searchResult.citations || [];

                console.log(`✅ Search complete, got ${searchContextString.length} chars`);

                // Track search cost
                if (user) {
                  await trackCost(user.id, COSTS.WEB_SEARCH);
                }
              } catch (error) {
                console.error("Search failed, continuing without search context:", error);
                // Continue without search context
              }
            }
          }

          // Generate checklist with all context
          const checklist = await generatePrepChecklist(
            topic,
            undefined,
            pastContextString || undefined,
            searchContextString || undefined,
            userPrefs ? {
              preferred_length: userPrefs.preferred_length,
              preferred_tone: userPrefs.preferred_tone,
              max_bullets: userPrefs.max_bullets
            } : undefined
          );

          // Track cost of OpenAI call
          if (user) {
            const isO4 = OPENAI_MODEL.toLowerCase().startsWith("o4");
            await trackCost(user.id, isO4 ? COSTS.O4_MINI : COSTS.GPT4O_MINI);
          }

          // Add citations if search was used and citations should be shown
          let finalChecklist = checklist;
          if (shouldShowCitations() && searchCitations.length > 0) {
            finalChecklist += formatCitations(searchCitations);
          }

          const chunks = chunkWhatsAppMessage(finalChecklist);

          for (const chunk of chunks) {
            await sendWhatsAppMessage(from, chunk);
            if (user && session) {
              await logConversationWithSession(user.id, chunk, "bot", session.id);
            }
          }

          // Save checklist to database and link to recurring meeting
          if (user) {
            const { data: savedChecklist } = await supabase
              .from("checklists")
              .insert({ user_id: user.id, topic, content: finalChecklist })
              .select()
              .single();

            if (recurringMeeting && savedChecklist) {
              await updateRecurringMeeting(recurringMeeting.id, savedChecklist.id, topic);
            }
          }

          // Update session activity
          if (session) {
            await updateSessionActivity(session.id);
          }

          return NextResponse.json({ status: "ok" });
        } else if (nlpResult.intent === "help") {
          const helpMsg =
            "I'm here to help you prepare for meetings! 🎯\n\nYou can:\n• Tell me about your upcoming meeting (e.g., \"I have a doctor appointment\")\n• Use /prep <topic> for quick checklists\n• Use /help to see all commands\n\nWhat would you like help with?";
          await sendWhatsAppMessage(from, helpMsg);
          if (user) {
            await logConversation(user.id, helpMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        } else if (nlpResult.intent === "feedback") {
          const feedbackMsg =
            "I'd love to help refine that! However, I need to remember our previous conversation better. This feature is coming soon! 🚧\n\nFor now, you can ask me to prepare for a new meeting.";
          await sendWhatsAppMessage(from, feedbackMsg);
          if (user) {
            await logConversation(user.id, feedbackMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        } else if (nlpResult.confidence < 0.6) {
          // Low confidence - ask for clarification
          const clarifyMsg =
            "I'm not quite sure what you need help with. Could you rephrase?\n\nFor example:\n• \"I have a doctor appointment tomorrow\"\n• \"/prep contractor\"\n• \"/help\" for more options";
          await sendWhatsAppMessage(from, clarifyMsg);
          if (user) {
            await logConversation(user.id, clarifyMsg, "bot");
          }
          return NextResponse.json({ status: "ok" });
        }
      }

      // If we get here, it's not a prep request - send a friendly fallback
      console.log("Message not classified as prep request, sending fallback");
      const fallbackMsg =
        "Hi! I'm here to help you prepare for meetings and appointments.\n\nTry telling me about your next meeting, like:\n• \"I have a dentist appointment tomorrow\"\n• \"Meeting a contractor for my kitchen\"\n\nOr use /help to see all options!";
      await sendWhatsAppMessage(from, fallbackMsg);
      if (user) {
        await logConversation(user.id, fallbackMsg, "bot");
      }
    } else {
      console.log("No text extracted from message");
    }

    console.log("Webhook processing complete");
    return NextResponse.json({ status: "ok" });
  } catch (error: unknown) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
