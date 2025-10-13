import { NextRequest, NextResponse } from "next/server";
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
  inferPreferencesFromBehavior,
  detectRecurringPattern,
  checkForRecurringMeeting,
} from "@/lib/long-term-memory";
import {
  checkRateLimit,
  incrementRequestCount,
  trackCost,
  COSTS,
} from "@/lib/rate-limit";
import { downloadTelegramAudio } from "@/lib/audio/download";
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
  buildSearchContextPrompt,
} from "@/lib/search";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TELEGRAM_SUPPRESS_SEND = (process.env.TELEGRAM_SUPPRESS_SEND || "").toLowerCase() === "true" || process.env.TELEGRAM_SUPPRESS_SEND === "1";
const RAW_OPENAI_MODEL = process.env.OPENAI_MODEL || "o4-mini";
const OPENAI_MODEL = RAW_OPENAI_MODEL.replace(/^['\"]|['\"]$/g, "").trim();

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

/**
 * Detect if text is a greeting
 */
function isGreeting(text: string | undefined): boolean {
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
  console.log(`OpenAI: using model ${OPENAI_MODEL} via ${isO4Family ? "responses" : "chat"}`);
  try {
    if (isO4Family) {
      // Use Responses API for o4/o4-mini with a single string input
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
          input: prompt
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
      // Chat Completions for non-o4 models (include temperature only if not o4)
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

      systemContent += " Focus on the most important questions and 2-3 things to bring. Sound natural, like texting a friend. If context from a URL or past conversations is provided, use it to tailor your advice.";

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
    let text: string | undefined = message?.text;
    const from = message?.from;
    const voice = message?.voice;
    const audio = message?.audio;

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // Get or create user in database
    let user = null;
    if (from) {
      user = await getOrCreateUser({
        id: from.id,
        username: from.username,
        first_name: from.first_name,
        last_name: from.last_name,
      });
    }

    // Handle voice messages
    if ((voice?.file_id || audio?.file_id) && user) {
      console.log("Voice/audio message detected, processing...");
      const fileId = voice?.file_id || audio?.file_id;

      try {
        // Send processing acknowledgment
        await sendTelegramMessage(chatId, "🎤 Got your voice message! Transcribing...");

        // Download audio file
        const audioFile = await downloadTelegramAudio(fileId);

        // Validate audio file
        const formatValidation = validateAudioFile(audioFile.mimeType, audioFile.fileSize);
        if (!formatValidation.valid) {
          await sendTelegramMessage(chatId, formatValidation.error || "Invalid audio file");
          return NextResponse.json({ ok: true });
        }

        const durationValidation = validateAudioDuration(audioFile.fileSize);
        if (!durationValidation.valid) {
          await sendTelegramMessage(chatId, durationValidation.error || "Audio file too long");
          return NextResponse.json({ ok: true });
        }

        // Transcribe audio
        const transcription = await transcribeAudio(audioFile);
        text = transcription.text;

        console.log(`Voice transcribed: "${text}"`);

        // Track Whisper cost
        if (transcription.duration) {
          const whisperCost = calculateWhisperCost(transcription.duration);
          await trackCost(user.id, whisperCost);
          console.log(`Whisper cost: ${whisperCost} cents for ${transcription.duration}s`);
        }
      } catch (error) {
        console.error("Voice message processing error:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to process voice message. Please try sending a text message instead.";
        await sendTelegramMessage(chatId, errorMsg);
        return NextResponse.json({ ok: true });
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
        await sendTelegramMessage(chatId, rateLimitResult.reason || "You've exceeded your usage limit. Please try again later.");
        return NextResponse.json({ ok: true, rate_limited: true });
      }

      // Increment request count
      await incrementRequestCount(user.id);
    }

    // Check for greetings first
    if (text && isGreeting(text)) {
      const greetingMsg = "Hi there! 👋 I'm here to help you prepare for your meetings and appointments.\n\nWhat's coming up for you? Tell me about your next meeting, or use these commands:\n\n• /prep <topic> - Get a prep checklist (e.g., \"/prep doctor\")\n• /help - See all commands\n\nOr just tell me naturally, like \"I have a contractor meeting tomorrow\"!";
      await sendTelegramMessage(chatId, greetingMsg);
      if (user) {
        await logConversation(user.id, greetingMsg, "bot");
      }
      return NextResponse.json({ ok: true });
    }

    const command = parseCommand(text);

    if (command) {
      switch (command.cmd) {
        case "/start": {
          const welcomeMsg = "Welcome to PrepMyMeeting!\n\nCommands:\n/help – show help\n/prep <topic> – e.g., doctor, contractor, interview\n/agenda – build an agenda from your topic";
          await sendTelegramMessage(chatId, welcomeMsg);
          if (user) {
            await logConversation(user.id, welcomeMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        }
        case "/help": {
          const helpMsg = "Use /prep <topic> to get tailored question checklists. Examples:\n/prep doctor\n/prep contractor\n/prep interview\n\nYou can also paste a link (job post, listing, profile) – support coming soon.";
          await sendTelegramMessage(chatId, helpMsg);
          if (user) {
            await logConversation(user.id, helpMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        }
        case "/prep": {
          const topic = command.args?.trim();
          if (!topic) {
            const errorMsg = "Please provide a topic. Example: /prep doctor";
            await sendTelegramMessage(chatId, errorMsg);
            if (user) {
              await logConversation(user.id, errorMsg, "bot");
            }
            return NextResponse.json({ ok: true });
          }
          const checklist = await generatePrepChecklist(topic);
          const parts = chunkForTelegram(checklist);
          for (const part of parts) {
            await sendTelegramMessage(chatId, part);
            if (user) {
              await logConversation(user.id, part, "bot");
            }
          }
          // Save the full checklist to database
          if (user) {
            await saveChecklist(user.id, topic, checklist);
          }
          return NextResponse.json({ ok: true });
        }
        case "/agenda": {
          const agendaMsg = "(Agenda builder coming soon – will suggest structure and notes.)";
          await sendTelegramMessage(chatId, agendaMsg);
          if (user) {
            await logConversation(user.id, agendaMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        }
        default: {
          const unknownMsg = "Unknown command. Try /help";
          await sendTelegramMessage(chatId, unknownMsg);
          if (user) {
            await logConversation(user.id, unknownMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        }
      }
    }

    // Check for URLs in message
    if (text) {
      const urls = extractURLs(text);
      if (urls.length > 0) {
        console.log("URLs detected:", urls);
        const url = urls[0]; // Handle first URL for now

        // Send acknowledgment
        const ackMsg = "I see you shared a link! Let me fetch that info for you...";
        await sendTelegramMessage(chatId, ackMsg);
        if (user) {
          await logConversation(user.id, ackMsg, "bot");
        }

        // Parse URL
        const urlInfo = await parseURL(url);
        console.log("Parsed URL info:", urlInfo);

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
          const parts = chunkForTelegram(checklist);

          for (const part of parts) {
            await sendTelegramMessage(chatId, part);
            if (user) {
              await logConversation(user.id, part, "bot");
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

          return NextResponse.json({ ok: true });
        } else {
          // Failed to fetch URL content
          const errorMsg =
            "Sorry, I couldn't access that link. It might be blocked or require login. Try describing your meeting instead!";
          await sendTelegramMessage(chatId, errorMsg);
          if (user) {
            await logConversation(user.id, errorMsg, "bot");
          }
          return NextResponse.json({ ok: true });
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
          const parts = chunkForTelegram(followUpResponse);
          for (const part of parts) {
            await sendTelegramMessage(chatId, part);
            if (user && session) {
              await logConversationWithSession(user.id, part, "bot", session.id);
            }
          }

          // Update session activity
          if (session) {
            await updateSessionActivity(session.id);
          }

          return NextResponse.json({ ok: true });
        }
        // If not a follow-up, fall through to normal NLP handling
      }
    }

    // Handle natural language using NLP
    if (text) {
      // Quick check if message is likely about prep
      const quickCheck = quickClassify(text);

      // Only classify with OpenAI if it seems like a prep request
      if (quickCheck.likelyPrep) {
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

          const parts = chunkForTelegram(finalChecklist);

          for (const part of parts) {
            await sendTelegramMessage(chatId, part);
            if (user && session) {
              await logConversationWithSession(user.id, part, "bot", session.id);
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

          return NextResponse.json({ ok: true });
        } else if (nlpResult.intent === "help") {
          const helpMsg =
            "I'm here to help you prepare for meetings! 🎯\n\nYou can:\n• Tell me about your upcoming meeting (e.g., \"I have a doctor appointment\")\n• Use /prep <topic> for quick checklists\n• Use /help to see all commands\n\nWhat would you like help with?";
          await sendTelegramMessage(chatId, helpMsg);
          if (user) {
            await logConversation(user.id, helpMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        } else if (nlpResult.intent === "feedback") {
          const feedbackMsg =
            "I'd love to help refine that! However, I need to remember our previous conversation better. This feature is coming soon! 🚧\n\nFor now, you can ask me to prepare for a new meeting.";
          await sendTelegramMessage(chatId, feedbackMsg);
          if (user) {
            await logConversation(user.id, feedbackMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        } else if (nlpResult.confidence < 0.6) {
          // Low confidence - ask for clarification
          const clarifyMsg =
            "I'm not quite sure what you need help with. Could you rephrase?\n\nFor example:\n• \"I have a doctor appointment tomorrow\"\n• \"/prep contractor\"\n• \"/help\" for more options";
          await sendTelegramMessage(chatId, clarifyMsg);
          if (user) {
            await logConversation(user.id, clarifyMsg, "bot");
          }
          return NextResponse.json({ ok: true });
        }
      }

      // If we get here, it's not a prep request - send a friendly fallback
      const fallbackMsg =
        "Hi! I'm here to help you prepare for meetings and appointments.\n\nTry telling me about your next meeting, like:\n• \"I have a dentist appointment tomorrow\"\n• \"Meeting a contractor for my kitchen\"\n\nOr use /help to see all options!";
      await sendTelegramMessage(chatId, fallbackMsg);
      if (user) {
        await logConversation(user.id, fallbackMsg, "bot");
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("telegram webhook error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
} 