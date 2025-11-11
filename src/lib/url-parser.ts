/**
 * URL parsing and content extraction utilities
 * Uses Firecrawl for web scraping
 */

import FirecrawlApp from "@mendable/firecrawl-js";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

export interface URLInfo {
  url: string;
  type: URLType;
  title?: string;
  content?: string | null;
  summary?: string;
}

export type URLType =
  | "linkedin_profile"
  | "linkedin_company"
  | "job_posting"
  | "property_listing"
  | "restaurant"
  | "business_website"
  | "unknown";

/**
 * Extract URLs from text
 */
export function extractURLs(text: string): string[] {
  // Comprehensive URL regex that matches http(s) URLs
  const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Classify URL type based on domain and path
 */
export function classifyURL(url: string): URLType {
  const urlLower = url.toLowerCase();

  // LinkedIn
  if (urlLower.includes("linkedin.com/in/")) {
    return "linkedin_profile";
  }
  if (urlLower.includes("linkedin.com/company/")) {
    return "linkedin_company";
  }

  // Job boards
  if (
    urlLower.includes("linkedin.com/jobs/") ||
    urlLower.includes("indeed.com") ||
    urlLower.includes("glassdoor.com") ||
    urlLower.includes("lever.co") ||
    urlLower.includes("greenhouse.io") ||
    urlLower.includes("jobs.") ||
    urlLower.includes("/jobs/") ||
    urlLower.includes("/careers/")
  ) {
    return "job_posting";
  }

  // Property listings
  if (
    urlLower.includes("zillow.com") ||
    urlLower.includes("redfin.com") ||
    urlLower.includes("realtor.com") ||
    urlLower.includes("trulia.com") ||
    urlLower.includes("apartments.com") ||
    urlLower.includes("apartment") ||
    urlLower.includes("realestate")
  ) {
    return "property_listing";
  }

  // Restaurants
  if (
    urlLower.includes("yelp.com") ||
    urlLower.includes("opentable.com") ||
    urlLower.includes("tripadvisor.com") ||
    urlLower.includes("restaurant") ||
    urlLower.includes("menu")
  ) {
    return "restaurant";
  }

  // Default to business website
  return "business_website";
}

/**
 * Fetch and parse URL content using Firecrawl
 */
export async function fetchURLContent(url: string): Promise<string | null> {
  console.log(`[URL-PARSER] Starting fetchURLContent for: ${url}`);

  try {
    // Check API key
    console.log(`[URL-PARSER] FIRECRAWL_API_KEY is ${FIRECRAWL_API_KEY ? 'SET (length: ' + FIRECRAWL_API_KEY.length + ')' : 'NOT SET'}`);

    if (!FIRECRAWL_API_KEY) {
      console.error("[URL-PARSER] ❌ FIRECRAWL_API_KEY not set - cannot fetch URL");
      return null;
    }

    console.log(`[URL-PARSER] Initializing Firecrawl client...`);
    const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

    console.log(`[URL-PARSER] Calling Firecrawl scrape API for ${url}...`);
    const scrapeResult = await app.scrape(url, {
      formats: ["markdown"],
    });

    console.log(`[URL-PARSER] Firecrawl API call completed. Result type:`, typeof scrapeResult);
    console.log(`[URL-PARSER] Scrape result keys:`, Object.keys(scrapeResult));

    // Check if it's an error response
    if ('error' in scrapeResult) {
      console.error(`[URL-PARSER] ❌ Firecrawl returned error:`, scrapeResult.error);
      return null;
    }

    const content = scrapeResult.markdown || "";
    console.log(`[URL-PARSER] Content extracted. Length: ${content.length} chars`);

    if (!content) {
      console.error(`[URL-PARSER] ❌ Firecrawl returned empty content for ${url}`);
      console.error(`[URL-PARSER] Full scrape result:`, JSON.stringify(scrapeResult, null, 2));
      return null;
    }

    console.log(`[URL-PARSER] ✅ Successfully fetched ${content.length} characters`);
    console.log(`[URL-PARSER] Content preview (first 300 chars):`, content.substring(0, 300));

    return content;
  } catch (error) {
    console.error("[URL-PARSER] ❌ Exception while fetching URL:", error);
    if (error instanceof Error) {
      console.error("[URL-PARSER] Error name:", error.name);
      console.error("[URL-PARSER] Error message:", error.message);
      console.error("[URL-PARSER] Error stack:", error.stack);
    }
    return null;
  }
}

/**
 * Parse URL and extract relevant information
 */
export async function parseURL(url: string): Promise<URLInfo> {
  console.log(`[URL-PARSER] Starting parseURL for: ${url}`);

  const type = classifyURL(url);
  console.log(`[URL-PARSER] Classified URL type: ${type}`);

  const content = await fetchURLContent(url);

  if (!content) {
    console.log(`[URL-PARSER] ❌ Failed to fetch content, returning error response`);
    return {
      url,
      type,
      content: null,
      summary: "Could not fetch content from URL",
    };
  }

  console.log(`[URL-PARSER] ✅ Content fetched successfully, processing...`);

  // Extract title from markdown (usually first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : undefined;
  console.log(`[URL-PARSER] Extracted title: ${title || 'none'}`);

  // Truncate content if too long (keep first 5000 chars for context)
  const truncatedContent = content.length > 5000
    ? content.slice(0, 5000) + "\n\n[Content truncated...]"
    : content;

  console.log(`[URL-PARSER] Final content length: ${truncatedContent.length} chars (truncated: ${content.length > 5000})`);

  return {
    url,
    type,
    title,
    content: truncatedContent,
    summary: generateSummary(type, truncatedContent),
  };
}

/**
 * Generate a brief summary based on URL type and content
 */
function generateSummary(type: URLType, content: string): string {
  const preview = content.slice(0, 200);

  switch (type) {
    case "linkedin_profile":
      return `LinkedIn profile: ${preview}`;
    case "linkedin_company":
      return `LinkedIn company page: ${preview}`;
    case "job_posting":
      return `Job posting: ${preview}`;
    case "property_listing":
      return `Property listing: ${preview}`;
    case "restaurant":
      return `Restaurant info: ${preview}`;
    case "business_website":
      return `Business website: ${preview}`;
    default:
      return preview;
  }
}

/**
 * Build context string for OpenAI based on URL info
 */
export function buildURLContext(urlInfo: URLInfo): string {
  const parts: string[] = [];

  parts.push(`URL Type: ${urlInfo.type.replace("_", " ")}`);

  if (urlInfo.title) {
    parts.push(`Title: ${urlInfo.title}`);
  }

  if (urlInfo.content) {
    parts.push(`\nContent:\n${urlInfo.content}`);
  }

  return parts.join("\n");
}
