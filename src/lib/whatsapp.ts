/**
 * WhatsApp Business Cloud API client
 * Handles sending messages and interacting with Meta's WhatsApp API
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_API_VERSION = "v21.0";

/**
 * Send a text message via WhatsApp
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<boolean> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.warn("WhatsApp credentials not configured; skipping send");
    return false;
  }

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `WhatsApp send failed: ${response.status} ${errorText}`
      );
      return false;
    }

    const data = await response.json();
    console.log("WhatsApp message sent:", data);
    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    return false;
  }

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error marking message as read:", error);
    return false;
  }
}

/**
 * Chunk long messages for WhatsApp (max 4096 characters)
 */
export function chunkWhatsAppMessage(text: string, max = 4000): string[] {
  if (text.length <= max) return [text];

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    const seg = current ? current + "\n\n" + p : p;
    if (seg.length <= max) {
      current = seg;
    } else {
      if (current) chunks.push(current);
      if (p.length <= max) {
        current = p;
      } else {
        // Split long paragraph by sentences or by character limit
        for (let i = 0; i < p.length; i += max) {
          chunks.push(p.slice(i, i + max));
        }
        current = "";
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Parse WhatsApp webhook message
 */
export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: "text" | "image" | "video" | "audio" | "document" | "location";
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export function parseWhatsAppWebhook(body: unknown): {
  messages: WhatsAppMessage[];
  contacts: WhatsAppContact[];
} | null {
  if (!body || typeof body !== "object") return null;

  const bodyObj = body as Record<string, unknown>;
  const entry = Array.isArray(bodyObj.entry) ? bodyObj.entry : [];

  if (entry.length === 0) return null;

  const firstEntry = entry[0];
  if (!firstEntry || typeof firstEntry !== "object") return null;

  const entryObj = firstEntry as Record<string, unknown>;
  const changes = Array.isArray(entryObj.changes) ? entryObj.changes : [];

  if (changes.length === 0) return null;

  const firstChange = changes[0];
  if (!firstChange || typeof firstChange !== "object") return null;

  const changeObj = firstChange as Record<string, unknown>;
  const value = changeObj.value;

  if (!value || typeof value !== "object") return null;

  const valueObj = value as Record<string, unknown>;
  const messages = Array.isArray(valueObj.messages) ? valueObj.messages : [];
  const contacts = Array.isArray(valueObj.contacts) ? valueObj.contacts : [];

  return {
    messages: messages as WhatsAppMessage[],
    contacts: contacts as WhatsAppContact[],
  };
}

/**
 * Extract text from WhatsApp message
 */
export function extractMessageText(message: WhatsAppMessage): string | null {
  if (message.type === "text" && message.text && message.text.body) {
    return message.text.body;
  }
  return null;
}

/**
 * Format WhatsApp message with basic formatting
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```code```
 */
export function formatWhatsAppMessage(text: string): string {
  // Already formatted text, return as-is
  return text;
}
