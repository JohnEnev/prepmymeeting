/**
 * Perplexity API integration for web search
 * Uses OpenAI-compatible API
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

export interface SearchResult {
  answer: string;
  citations?: string[];
}

/**
 * Search the web using Perplexity API
 */
export async function searchWeb(query: string): Promise<SearchResult> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  try {
    console.log(`🔍 Searching web: "${query}"`);

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar", // Fast, cost-effective model
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides concise, accurate information from the web. Keep answers brief and focused on key facts."
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: 0.2,
        return_citations: true,
        return_related_questions: false,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: ${response.status} ${errorText}`);
      throw new Error(`Perplexity API failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract answer from response
    const answer = data.choices?.[0]?.message?.content || "";

    // Extract citations if available
    const citations = data.citations || [];

    console.log(`✅ Search complete: ${answer.substring(0, 100)}...`);
    if (citations.length > 0) {
      console.log(`📚 Sources: ${citations.length} citations`);
    }

    return {
      answer,
      citations,
    };
  } catch (error) {
    console.error("Error searching web:", error);
    throw error;
  }
}

/**
 * Build a search query optimized for getting prep context
 */
export function buildPrepSearchQuery(text: string, topic?: string): string {
  // If we have a topic, search for that specifically
  if (topic) {
    return `Give me key facts about ${topic} that would be useful for preparing for a meeting or appointment. Include recent news, key information, and important context. Keep it concise.`;
  }

  // Otherwise, use the raw text
  return `${text}. Provide key facts and context that would help someone prepare for this meeting or appointment. Keep it concise.`;
}
