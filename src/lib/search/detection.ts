/**
 * Smart detection for when to trigger web search
 */

export interface SearchDetectionResult {
  shouldSearch: boolean;
  query?: string;
  reason?: string;
  confidence: number;
}

/**
 * Detect if user is explicitly requesting web search or information
 */
export function shouldSearch(text: string): SearchDetectionResult {
  if (!text) {
    return { shouldSearch: false, confidence: 0 };
  }

  const lowerText = text.toLowerCase().trim();

  // Explicit search request phrases
  const explicitSearchPhrases = [
    /tell me about/i,
    /what'?s (the )?latest (on|about)/i,
    /information (about|on)/i,
    /background on/i,
    /details about/i,
    /what do (you |i )know about/i,
    /look up/i,
    /search for/i,
    /find (out )?about/i,
    /what are (the )?recent/i,
    /current (info|information) (on|about)/i,
  ];

  // Check for explicit search phrases
  for (const phrase of explicitSearchPhrases) {
    if (phrase.test(text)) {
      return {
        shouldSearch: true,
        query: text,
        reason: "explicit_request",
        confidence: 0.95,
      };
    }
  }

  // No search triggered
  return {
    shouldSearch: false,
    confidence: 0,
  };
}

/**
 * Extract search topic from text
 * Returns the main entity or topic the user is asking about
 */
export function extractSearchTopic(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Patterns to extract topic after trigger phrases
  const patterns = [
    /tell me about (.+)/i,
    /information (?:about|on) (.+)/i,
    /background on (.+)/i,
    /details about (.+)/i,
    /what do (?:you |i )?know about (.+)/i,
    /look up (.+)/i,
    /search for (.+)/i,
    /find (?:out )?about (.+)/i,
    /what'?s (?:the )?latest (?:on|about) (.+)/i,
    /what are (?:the )?recent (.+)/i,
    /current (?:info|information) (?:on|about) (.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}
