/**
 * Long-term memory utilities for cross-session context
 */

import type { Database } from "./supabase";
import {
  searchPastConversations,
  searchPastChecklists,
  getRecurringMeeting,
  getUserPreferences,
  updateUserPreferences,
} from "./db";

type UserPreferences = Database["user_preferences"]["Row"];
type Checklist = Database["checklists"]["Row"];
type RecurringMeeting = Database["recurring_meetings"]["Row"];

/**
 * Extract keywords from user message for searching past conversations
 */
export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase().trim();

  // Remove common words
  const stopWords = new Set([
    "i", "me", "my", "am", "is", "are", "was", "were", "the", "a", "an",
    "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "have", "has", "had", "do", "does", "did", "can", "could", "would",
    "should", "will", "what", "when", "where", "who", "how", "why",
  ]);

  const words = normalized
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Return unique keywords
  return [...new Set(words)];
}

/**
 * Detect if message references past conversation
 * Examples: "my follow-up with Dr. Smith", "last time", "previous meeting"
 */
export function detectsPastReference(text: string): {
  isPastReference: boolean;
  keywords: string[];
} {
  const normalized = text.toLowerCase();

  const pastReferencePatterns = [
    /\b(follow.?up|followup)\b/i,
    /\b(last time|previously|before|earlier|past)\b/i,
    /\b(again|another|recurring|weekly|monthly)\b/i,
    /\b(remember|recall|mentioned)\b/i,
    /\b(dr\.|doctor|with)\s+[A-Z][a-z]+/i, // Names like "Dr. Smith" or "with John"
  ];

  const isPastReference = pastReferencePatterns.some(pattern =>
    pattern.test(normalized)
  );

  if (isPastReference) {
    const keywords = extractKeywords(text);
    return { isPastReference: true, keywords };
  }

  return { isPastReference: false, keywords: [] };
}

/**
 * Search for relevant past context
 */
export async function findPastContext(
  userId: string,
  keywords: string[]
): Promise<{
  checklists: Checklist[];
  conversations: Database["conversations"]["Row"][];
}> {
  const results = {
    checklists: [] as Checklist[],
    conversations: [] as Database["conversations"]["Row"][],
  };

  // Search for each keyword
  for (const keyword of keywords.slice(0, 3)) {
    // Limit to top 3 keywords
    const checklists = await searchPastChecklists(userId, keyword, 3);
    const conversations = await searchPastConversations(userId, keyword, 5);

    results.checklists.push(...checklists);
    results.conversations.push(...conversations);
  }

  // Deduplicate by ID
  results.checklists = Array.from(
    new Map(results.checklists.map(c => [c.id, c])).values()
  ).slice(0, 3); // Top 3 most relevant

  results.conversations = Array.from(
    new Map(results.conversations.map(c => [c.id, c])).values()
  ).slice(0, 10); // Top 10 messages

  return results;
}

/**
 * Build past context string for OpenAI
 */
export function buildPastContextString(
  checklists: Checklist[],
  conversations: Database["conversations"]["Row"][],
  recurringMeeting?: RecurringMeeting | null
): string {
  const parts: string[] = [];

  if (recurringMeeting && recurringMeeting.occurrence_count > 1) {
    parts.push(`RECURRING MEETING INFO:`);
    parts.push(
      `This is a recurring meeting: "${recurringMeeting.meeting_type}" (occurred ${recurringMeeting.occurrence_count} times)`
    );
    if (recurringMeeting.last_summary) {
      parts.push(`Last time summary: ${recurringMeeting.last_summary}`);
    }
  }

  if (checklists.length > 0) {
    parts.push(`\nPAST RELATED CHECKLISTS:`);
    checklists.forEach((checklist, i) => {
      parts.push(
        `${i + 1}. ${checklist.topic} (${new Date(checklist.created_at).toLocaleDateString()})`
      );
      parts.push(checklist.content.slice(0, 300) + "..."); // First 300 chars
    });
  }

  if (conversations.length > 0) {
    parts.push(`\nRELATED PAST CONVERSATIONS:`);
    conversations.slice(0, 5).forEach(conv => {
      parts.push(
        `- ${conv.message_type === "user" ? "User" : "Bot"}: ${conv.message_text.slice(0, 100)}...`
      );
    });
  }

  return parts.length > 0 ? parts.join("\n") : "";
}

/**
 * Infer user preferences from refinement patterns
 */
export async function inferPreferencesFromBehavior(
  userId: string,
  refinementType: string | null
): Promise<void> {
  if (!refinementType) return;

  const currentPrefs = await getUserPreferences(userId);
  if (!currentPrefs) return;

  const updates: Partial<Database["user_preferences"]["Update"]> = {};

  // Infer length preference
  if (refinementType === "shorter" && currentPrefs.preferred_length !== "short") {
    updates.preferred_length = "short";
    updates.max_bullets = 5;
  } else if (
    refinementType === "longer" &&
    currentPrefs.preferred_length === "short"
  ) {
    updates.preferred_length = "medium";
    updates.max_bullets = 10;
  }

  // Infer tone preference
  if (
    refinementType === "casual" &&
    currentPrefs.preferred_tone !== "casual"
  ) {
    updates.preferred_tone = "casual";
  } else if (
    refinementType === "formal" &&
    currentPrefs.preferred_tone !== "formal"
  ) {
    updates.preferred_tone = "formal";
  }

  if (Object.keys(updates).length > 0) {
    await updateUserPreferences(userId, updates);
    console.log(`Updated user preferences based on behavior:`, updates);
  }
}

/**
 * Detect if this is a recurring meeting type
 */
export function detectRecurringPattern(text: string): {
  isRecurring: boolean;
  meetingType: string | null;
  frequency: string | null;
} {
  const normalized = text.toLowerCase();

  // Recurring patterns
  const recurringPatterns = [
    {
      pattern: /\b(weekly|every week)\s+(.+?)(?:\s|$)/i,
      frequency: "weekly",
    },
    {
      pattern: /\b(monthly|every month)\s+(.+?)(?:\s|$)/i,
      frequency: "monthly",
    },
    {
      pattern: /\b(quarterly|every quarter)\s+(.+?)(?:\s|$)/i,
      frequency: "quarterly",
    },
    { pattern: /\b(1:1|one.on.one)\s+(?:with\s+)?(.+?)(?:\s|$)/i, frequency: "recurring" },
    { pattern: /\b(standup|stand.up|daily)\b/i, frequency: "daily" },
    { pattern: /\b(retrospective|retro)\b/i, frequency: "monthly" },
  ];

  for (const { pattern, frequency } of recurringPatterns) {
    const match = text.match(pattern);
    if (match) {
      const meetingType = match[2] ? match[2].trim() : match[1];
      return {
        isRecurring: true,
        meetingType: meetingType || null,
        frequency,
      };
    }
  }

  return { isRecurring: false, meetingType: null, frequency: null };
}

/**
 * Apply user preferences to prompt
 */
export function applyPreferencesToPrompt(
  basePrompt: string,
  preferences: UserPreferences
): string {
  let prompt = basePrompt;

  // Apply length preference
  if (preferences.preferred_length === "short") {
    prompt += `\n\nIMPORTANT: User prefers SHORT checklists. Keep to ${preferences.max_bullets} bullets maximum.`;
  } else if (preferences.preferred_length === "long") {
    prompt += `\n\nIMPORTANT: User prefers DETAILED checklists. Provide comprehensive information with examples.`;
  }

  // Apply tone preference
  if (preferences.preferred_tone === "formal") {
    prompt += `\n\nTONE: Use professional, business-appropriate language.`;
  } else if (preferences.preferred_tone === "casual") {
    prompt += `\n\nTONE: Use friendly, conversational language like talking to a friend.`;
  }

  return prompt;
}

/**
 * Check if topic matches recurring meeting
 */
export async function checkForRecurringMeeting(
  userId: string,
  topic: string
): Promise<RecurringMeeting | null> {
  const { isRecurring, meetingType } = detectRecurringPattern(topic);

  if (isRecurring && meetingType) {
    return await getRecurringMeeting(userId, meetingType);
  }

  // Also try exact topic match
  return await getRecurringMeeting(userId, topic);
}
