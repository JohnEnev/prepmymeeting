/**
 * Audio file download utilities for WhatsApp and Telegram
 */

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export interface AudioFile {
  buffer: Buffer;
  mimeType: string;
  fileSize: number;
  duration?: number; // Duration in seconds if available
}

/**
 * Download audio file from WhatsApp
 */
export async function downloadWhatsAppAudio(
  mediaId: string
): Promise<AudioFile> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("WhatsApp access token not configured");
  }

  try {
    // Step 1: Get media URL from WhatsApp API
    const mediaInfoResponse = await fetch(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaInfoResponse.ok) {
      const errorText = await mediaInfoResponse.text();
      console.error("WhatsApp media info error:", errorText);
      throw new Error(`Failed to get WhatsApp media info: ${mediaInfoResponse.status}`);
    }

    const mediaInfo = await mediaInfoResponse.json();
    const { url: mediaUrl, mime_type: mimeType, file_size: fileSize } = mediaInfo;

    // Step 2: Download the actual audio file
    const audioResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download WhatsApp audio: ${audioResponse.status}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      mimeType: mimeType || "audio/ogg",
      fileSize: fileSize || buffer.length,
    };
  } catch (error) {
    console.error("Error downloading WhatsApp audio:", error);
    throw new Error("Failed to download voice message from WhatsApp. Please try again.");
  }
}

/**
 * Download audio file from Telegram
 */
export async function downloadTelegramAudio(
  fileId: string
): Promise<AudioFile> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error("Telegram bot token not configured");
  }

  try {
    // Step 1: Get file path from Telegram API
    const fileInfoResponse = await fetch(
      `${TELEGRAM_API_URL}/getFile?file_id=${fileId}`
    );

    if (!fileInfoResponse.ok) {
      const errorText = await fileInfoResponse.text();
      console.error("Telegram file info error:", errorText);
      throw new Error(`Failed to get Telegram file info: ${fileInfoResponse.status}`);
    }

    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok) {
      throw new Error(`Telegram API error: ${fileInfo.description}`);
    }

    const { file_path: filePath, file_size: fileSize } = fileInfo.result;

    // Step 2: Download the actual audio file
    const audioUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const audioResponse = await fetch(audioUrl);

    if (!audioResponse.ok) {
      throw new Error(`Failed to download Telegram audio: ${audioResponse.status}`);
    }

    const arrayBuffer = await audioResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine MIME type from file extension
    let mimeType = "audio/ogg"; // Default for Telegram voice messages
    if (filePath.endsWith(".mp3")) {
      mimeType = "audio/mpeg";
    } else if (filePath.endsWith(".m4a")) {
      mimeType = "audio/mp4";
    } else if (filePath.endsWith(".oga") || filePath.endsWith(".ogg")) {
      mimeType = "audio/ogg";
    }

    return {
      buffer,
      mimeType,
      fileSize: fileSize || buffer.length,
    };
  } catch (error) {
    console.error("Error downloading Telegram audio:", error);
    throw new Error("Failed to download voice message from Telegram. Please try again.");
  }
}
