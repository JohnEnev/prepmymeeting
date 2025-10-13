/**
 * Web search feature configuration
 */

/**
 * Check if web search is enabled globally
 */
export function isSearchEnabled(): boolean {
  const enabled = process.env.ENABLE_WEB_SEARCH;
  return enabled === "true" || enabled === "1";
}

/**
 * Check if citations should be shown to users
 */
export function shouldShowCitations(): boolean {
  const show = process.env.SHOW_SEARCH_CITATIONS;
  return show === "true" || show === "1";
}

/**
 * Get max number of citations to show
 */
export function getMaxCitations(): number {
  const max = parseInt(process.env.MAX_SEARCH_CITATIONS || "3", 10);
  return isNaN(max) ? 3 : Math.min(max, 5); // Cap at 5
}

/**
 * Format citations for display to user
 */
export function formatCitations(citations: string[]): string {
  if (!citations || citations.length === 0) {
    return "";
  }

  const maxCitations = getMaxCitations();
  const citationsToShow = citations.slice(0, maxCitations);

  return "\n\n📚 Sources:\n" + citationsToShow.map((url, i) => `${i + 1}. ${url}`).join("\n");
}

/**
 * Build search context message for OpenAI prompt
 */
export function buildSearchContextPrompt(searchResult: string): string {
  return `\n\nCURRENT WEB INFORMATION:\n${searchResult}\n\nUse this information to provide more accurate and current advice.`;
}
