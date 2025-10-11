/**
 * Natural Language Processing utilities
 * Uses OpenAI to understand user intent and extract entities
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export type Intent =
  | "prep_meeting" // User wants to prepare for a meeting
  | "greeting" // User is greeting the bot
  | "help" // User needs help
  | "follow_up" // User asking about previous response
  | "refinement" // User wants to modify previous response (shorter, longer, etc.)
  | "clarification" // User wants to explain/expand on previous response
  | "feedback" // User wants to refine previous response (legacy)
  | "unclear"; // Intent cannot be determined

export interface NLPResult {
  intent: Intent;
  meetingType?: string; // e.g., "doctor", "contractor", "interview"
  context?: string; // Additional context from the message
  confidence: number; // 0-1 score
  originalMessage: string;
}

/**
 * Classify user intent and extract entities using OpenAI
 */
export async function classifyIntent(
  message: string,
  conversationHistory?: string[]
): Promise<NLPResult> {
  if (!OPENAI_API_KEY) {
    // Fallback without OpenAI
    return {
      intent: "unclear",
      confidence: 0,
      originalMessage: message,
    };
  }

  try {
    const systemPrompt = `You are an intent classifier for a meeting preparation assistant bot.

Analyze the user's message and determine:
1. Intent: What does the user want?
   - "prep_meeting": User wants help preparing for a NEW meeting/appointment
   - "greeting": User is greeting the bot
   - "help": User needs assistance/instructions
   - "follow_up": User asking a follow-up question about previous response (e.g., "what about X?", "tell me more")
   - "refinement": User wants to MODIFY previous response (e.g., "make it shorter", "more formal", "less detailed")
   - "clarification": User wants MORE INFO or EXPLANATION about previous response (e.g., "explain the second point", "why")
   - "unclear": Cannot determine intent

IMPORTANT: Use context from conversation history to distinguish between new prep requests and follow-ups!

2. Meeting Type (if intent is "prep_meeting"): Extract the type of meeting
   - Examples: "doctor", "dentist", "contractor", "interview", "lawyer", "real estate agent", "restaurant", etc.
   - Be flexible with phrasings: "seeing a doctor" = "doctor", "job interview" = "interview"

3. Context: Any additional relevant information
   - Examples: "bathroom renovation", "senior engineer position", "annual checkup"

4. Confidence: Your confidence in the classification (0-1)

Respond ONLY with a valid JSON object in this exact format:
{
  "intent": "prep_meeting" | "greeting" | "help" | "follow_up" | "refinement" | "clarification" | "unclear",
  "meetingType": "string or null",
  "context": "string or null",
  "confidence": 0.95
}`;

    const userPrompt = conversationHistory && conversationHistory.length > 0
      ? `Previous messages:\n${conversationHistory.join("\n")}\n\nCurrent message: ${message}`
      : message;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI classification error:", response.status);
      return {
        intent: "unclear",
        confidence: 0,
        originalMessage: message,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        intent: "unclear",
        confidence: 0,
        originalMessage: message,
      };
    }

    const parsed = JSON.parse(content);

    return {
      intent: parsed.intent || "unclear",
      meetingType: parsed.meetingType || undefined,
      context: parsed.context || undefined,
      confidence: parsed.confidence || 0,
      originalMessage: message,
    };
  } catch (error) {
    console.error("Error classifying intent:", error);
    return {
      intent: "unclear",
      confidence: 0,
      originalMessage: message,
    };
  }
}

/**
 * Generate a prep checklist based on NLP result
 */
export function buildPrepTopic(nlpResult: NLPResult): string {
  const parts: string[] = [];

  if (nlpResult.meetingType) {
    parts.push(nlpResult.meetingType);
  }

  if (nlpResult.context) {
    parts.push(nlpResult.context);
  }

  return parts.join(" - ") || "general meeting";
}

/**
 * Quick pattern-based classification for common cases (fallback)
 * This is used if OpenAI is not available or as a pre-filter
 */
export function quickClassify(message: string): {
  likelyPrep: boolean;
  meetingKeywords: string[];
} {
  const normalized = message.toLowerCase();

  // Common meeting-related keywords
  const meetingKeywords = [
    "doctor", "dentist", "dermatologist", "physician", "therapist",
    "contractor", "plumber", "electrician", "handyman",
    "interview", "job", "hiring", "recruiter",
    "lawyer", "attorney", "legal",
    "real estate", "realtor", "agent", "house", "apartment", "property",
    "restaurant", "dinner", "lunch", "reservation",
    "meeting", "appointment", "consultation", "session",
    "vet", "veterinarian", "pet",
  ];

  const foundKeywords = meetingKeywords.filter(keyword =>
    normalized.includes(keyword)
  );

  // Phrases that indicate prep intent
  const prepPhrases = [
    "preparing for",
    "prep for",
    "getting ready for",
    "have a",
    "going to see",
    "meeting with",
    "appointment with",
    "seeing a",
    "seeing the",
    "visit to",
    "visiting",
  ];

  const hasIntentPhrase = prepPhrases.some(phrase =>
    normalized.includes(phrase)
  );

  return {
    likelyPrep: foundKeywords.length > 0 || hasIntentPhrase,
    meetingKeywords: foundKeywords,
  };
}
