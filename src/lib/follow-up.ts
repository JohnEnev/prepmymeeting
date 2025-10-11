/**
 * Follow-up response generator for conversational memory
 * Uses gpt-4o-mini for cost efficiency
 */

import type { Intent } from "./nlp";
import { getRefinementType, extractFocusArea } from "./conversation-context";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Generate response to follow-up questions with conversation context
 */
export async function generateFollowUpResponse(
  question: string,
  conversationContext: string,
  intent: Intent
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "I'd love to help with that, but I need an API key configured. Try asking a new question!";
  }

  try {
    // Detect refinement type and focus area for more specific instructions
    const refinementType = getRefinementType(question);
    const focusArea = extractFocusArea(question);

    let systemPrompt = `You're a helpful friend in an ongoing conversation about meeting preparation.

Previous conversation:
${conversationContext}

The user is now asking a follow-up question. Use the conversation history to provide a relevant, contextual response.`;

    // Add specific instructions based on intent and refinement type
    if (intent === "refinement") {
      if (refinementType === "shorter") {
        systemPrompt += `\n\nThe user wants a SHORTER version. Condense the previous response to 3-5 bullets max, keeping only the most important points.`;
      } else if (refinementType === "longer") {
        systemPrompt += `\n\nThe user wants MORE DETAIL. Expand on the previous response with additional context, examples, or questions.`;
      } else if (refinementType === "formal") {
        systemPrompt += `\n\nThe user wants a MORE FORMAL tone. Regenerate in a professional, business-appropriate style.`;
      } else if (refinementType === "casual") {
        systemPrompt += `\n\nThe user wants a MORE CASUAL tone. Regenerate in a friendly, conversational style.`;
      } else if (refinementType === "simpler") {
        systemPrompt += `\n\nThe user wants it SIMPLER. Use plain language and break down complex concepts.`;
      } else {
        systemPrompt += `\n\nThe user wants to modify the previous response. Make the requested changes while keeping the same topic.`;
      }

      // Add focus area if specified
      if (focusArea) {
        systemPrompt += `\n\nIMPORTANT: The user specifically wants to focus more on "${focusArea}". Adjust the response to emphasize this area with more questions and details about ${focusArea}.`;
      }
    } else if (intent === "clarification") {
      systemPrompt += `\n\nThe user wants clarification or more information about a specific point from the previous response. Focus on that specific aspect.`;

      if (focusArea) {
        systemPrompt += `\n\nSpecifically, they're asking about "${focusArea}". Provide detailed information about ${focusArea}.`;
      }
    } else if (intent === "follow_up") {
      systemPrompt += `\n\nThe user is asking a related follow-up question. Build on the previous conversation naturally.`;

      if (focusArea) {
        systemPrompt += `\n\nThey're particularly interested in "${focusArea}". Make sure to address this in your response.`;
      }
    }

    systemPrompt += `\n\nImportant:
- Keep responses SHORT (3-5 bullets max for follow-ups)
- Use plain text with simple bullets (•) - NO markdown headers
- Sound natural and conversational, like texting a friend
- Reference the previous conversation directly when relevant
- If the question isn't related to the previous context, acknowledge that and help anyway`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Cheaper for follow-ups
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 500, // Limit response length for cost control
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI error: ${response.status} ${errorText}`);
      return "Sorry, I had trouble processing that. Could you rephrase your question?";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return "Sorry, I couldn't generate a response. Could you try rephrasing?";
    }

    return content.trim();
  } catch (error) {
    console.error("Error generating follow-up response:", error);
    return "Sorry, I had an issue processing that. Try asking again!";
  }
}

/**
 * Check if the follow-up is about a specific topic that needs the full prep flow
 * Returns true if we should use the full prep generation instead of follow-up
 */
export function shouldUsePrepFlow(question: string, intent: Intent): boolean {
  // If it's a new meeting/prep request, use full prep flow
  if (intent === "prep_meeting") {
    return true;
  }

  // Check for clear indicators of new prep topics
  const newTopicPatterns = [
    /\b(i have|i've got|meeting|appointment|interview|seeing|going to see)\b/i,
    /\b(next week|tomorrow|today|upcoming)\b.*\b(meeting|appointment)\b/i,
    /\bprepare (for|me)\b/i,
  ];

  return newTopicPatterns.some(pattern => pattern.test(question));
}
