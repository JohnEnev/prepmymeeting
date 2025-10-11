/**
 * Conversation context helpers for managing follow-up conversations
 */

import type { Database } from "./supabase";

type ConversationMessage = Database["conversations"]["Row"];

/**
 * Build conversation context from recent messages
 * Limits to last N messages to control token costs
 */
export function buildConversationContext(
  messages: ConversationMessage[],
  maxMessages = 10
): string {
  // Get the most recent messages (they come in reverse order from DB)
  const recent = messages.slice(0, maxMessages).reverse();

  if (recent.length === 0) {
    return "";
  }

  return recent
    .map(msg => {
      const role = msg.message_type === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.message_text}`;
    })
    .join('\n\n');
}

/**
 * Check if message is likely a follow-up question
 */
export function isLikelyFollowUp(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const normalized = text.toLowerCase().trim();

  // Patterns that indicate follow-up questions
  const followUpPatterns = [
    // Refinement requests
    /^(can you|could you|please)\s+(make|change|update|modify|adjust|get|give|show|tell|provide)/i,
    /\b(make it|change it|update it)\b/i,
    /\b(shorter|longer|more detailed|less detailed|simpler|more formal|less formal)\b/i,

    // Clarification requests
    /\b(what about|how about|tell me more|explain|elaborate|clarify)\b/i,
    /^(what|how|why|when|where)\b/i,

    // Pronouns referring to previous context
    /^(that|this|it|those|these)\b/i,
    /\b(the (first|second|third|last|previous))\b/i,

    // Continuation words
    /^(also|and|but|however|additionally)\b/i,

    // Direct modifications
    /\b(add|remove|include|exclude)\b.*\b(more|less|another)\b/i,

    // References to previous messages/content
    /\b(the (link|url|website|page|article|post|message))\b/i,
    /\b(i (posted|shared|sent|mentioned|said))\b/i,
    /\b(from (the|that|what|above))\b/i,
    /\b(based on (the|that|what))\b/i,
    /\b(you (said|mentioned|posted|shared))\b/i,
  ];

  return followUpPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Extract refinement type from message
 */
export function getRefinementType(text: string): string | null {
  const normalized = text.toLowerCase();

  if (/\b(shorter|brief|concise|condensed)\b/.test(normalized)) {
    return "shorter";
  }
  if (/\b(longer|more detailed|elaborate|extensive)\b/.test(normalized)) {
    return "longer";
  }
  if (/\b(more formal|professional|business)\b/.test(normalized)) {
    return "formal";
  }
  if (/\b(less formal|casual|friendly|relaxed)\b/.test(normalized)) {
    return "casual";
  }
  if (/\b(simpler|easier|basic)\b/.test(normalized)) {
    return "simpler";
  }

  return null;
}

/**
 * Extract focus area from message
 * Returns specific topic/area user wants to focus on
 */
export function extractFocusArea(text: string): string | null {
  const normalized = text.toLowerCase();

  // Pattern: "more about X" or "focus on X" or "emphasize X"
  const focusPatterns = [
    /(?:more|focus|emphasize|concentrate|elaborate)\s+(?:on|about)\s+([a-z\s]+?)(?:\s|$|,|\.|!|\?)/i,
    /(?:what about|tell me about)\s+([a-z\s]+?)(?:\s|$|,|\.|!|\?)/i,
  ];

  for (const pattern of focusPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const focus = match[1].trim();
      // Filter out common words that aren't meaningful focus areas
      const stopWords = ["the", "it", "that", "this", "them", "those", "these"];
      if (!stopWords.includes(focus)) {
        return focus;
      }
    }
  }

  // Check for specific keywords
  const specificFocus = [
    { pattern: /\b(budget|cost|price|money|expense)\b/i, area: "budget and costs" },
    { pattern: /\b(timeline|schedule|time|deadline|duration)\b/i, area: "timeline and scheduling" },
    { pattern: /\b(technical|technology|tech|system)\b/i, area: "technical details" },
    { pattern: /\b(risk|concern|problem|issue|challenge)\b/i, area: "risks and concerns" },
    { pattern: /\b(permit|regulation|legal|compliance|law)\b/i, area: "permits and regulations" },
    { pattern: /\b(quality|standard|specification)\b/i, area: "quality standards" },
    { pattern: /\b(experience|qualification|credential)\b/i, area: "experience and qualifications" },
    { pattern: /\b(reference|review|feedback|testimonial)\b/i, area: "references and reviews" },
  ];

  for (const { pattern, area } of specificFocus) {
    if (pattern.test(normalized)) {
      return area;
    }
  }

  return null;
}

/**
 * Estimate token count for context (rough approximation)
 * Used for cost control
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Truncate context if it exceeds max tokens
 */
export function truncateContext(
  context: string,
  maxTokens = 2000
): string {
  const estimatedTokens = estimateTokenCount(context);

  if (estimatedTokens <= maxTokens) {
    return context;
  }

  // Truncate to approximate character count
  const maxChars = maxTokens * 4;
  const truncated = context.slice(-maxChars);

  // Try to truncate at a message boundary
  const messageStart = truncated.indexOf('\n\n');
  if (messageStart > 0) {
    return truncated.slice(messageStart + 2);
  }

  return truncated;
}
