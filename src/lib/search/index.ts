/**
 * Web search module
 * Exports all search-related functionality
 */

export { searchWeb, buildPrepSearchQuery, type SearchResult } from "./perplexity";
export { shouldSearch, extractSearchTopic, type SearchDetectionResult } from "./detection";
export {
  isSearchEnabled,
  shouldShowCitations,
  getMaxCitations,
  formatCitations,
  buildSearchContextPrompt,
} from "./config";
