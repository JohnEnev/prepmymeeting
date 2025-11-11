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
  try {
    if (!FIRECRAWL_API_KEY) {
      console.error("FIRECRAWL_API_KEY not set");
      return null;
    }

    console.log(`Fetching URL content via Firecrawl: ${url}`);

    const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

    // Use scrape to get the page content as markdown
    const scrapeResult = await app.scrape(url, {
      formats: ["markdown"],
    });

    const content = scrapeResult.markdown || "";

    if (!content) {
      console.error(`Firecrawl returned empty content for ${url}`);
      return null;
    }

    console.log(`Firecrawl fetched ${content.length} characters from ${url}`);
    console.log(`Content preview: ${content.substring(0, 300)}`);

    return content;
  } catch (error) {
    console.error("Error fetching URL content with Firecrawl:", error);
    return null;
  }
}

/**
 * Parse URL and extract relevant information
 */
export async function parseURL(url: string): Promise<URLInfo> {
  const type = classifyURL(url);
  const content = await fetchURLContent(url);

  if (!content) {
    return {
      url,
      type,
      content: null,
      summary: "Could not fetch content from URL",
    };
  }

  // Extract title from markdown (usually first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : undefined;

  // Truncate content if too long (keep first 5000 chars for context)
  const truncatedContent = content.length > 5000
    ? content.slice(0, 5000) + "\n\n[Content truncated...]"
    : content;

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
