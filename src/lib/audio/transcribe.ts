/**
 * Audio transcription using OpenAI Whisper API
 */

import OpenAI from "openai";
import type { AudioFile } from "./download";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptionResult {
  text: string;
  duration?: number; // Actual duration from Whisper if available
  language?: string;
}

/**
 * Transcribe audio file using OpenAI Whisper
 */
export async function transcribeAudio(
  audioFile: AudioFile
): Promise<TranscriptionResult> {
  try {
    console.log(`Transcribing audio file (${audioFile.fileSize} bytes, ${audioFile.mimeType})`);

    // Create a File object from the buffer
    // Whisper expects a file with proper extension
    const extension = getFileExtension(audioFile.mimeType);

    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(audioFile.buffer);
    const blob = new Blob([uint8Array], { type: audioFile.mimeType });
    const file = new File([blob], `audio.${extension}`, {
      type: audioFile.mimeType,
    });

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en", // Can be made dynamic if needed
      response_format: "verbose_json", // Get duration and language info
    });

    // verbose_json returns additional metadata
    const result = transcription as {
      text: string;
      duration?: number;
      language?: string;
    };

    console.log(`Transcription complete: "${result.text.substring(0, 100)}..."`);

    return {
      text: result.text,
      duration: result.duration,
      language: result.language,
    };
  } catch (error) {
    console.error("Error transcribing audio:", error);

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes("file_size")) {
        throw new Error("Voice message file is too large. Please send a shorter message.");
      } else if (error.message.includes("invalid_file")) {
        throw new Error("Unable to process voice message. Please try recording again.");
      }
    }

    throw new Error("Failed to transcribe voice message. Please try again or send a text message instead.");
  }
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/ogg": "ogg",
    "audio/oga": "oga",
    "audio/opus": "opus",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/wav": "wav",
    "audio/webm": "webm",
  };

  return mimeToExt[mimeType.toLowerCase()] || "ogg";
}

/**
 * Calculate Whisper API cost based on audio duration
 * Whisper pricing: $0.006 per minute
 */
export function calculateWhisperCost(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  const costPerMinute = 0.6; // $0.006 = 0.6 cents
  return Math.ceil(minutes * costPerMinute * 100) / 100; // Round up to nearest cent
}
