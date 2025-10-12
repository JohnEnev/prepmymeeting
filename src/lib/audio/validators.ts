/**
 * Audio validation utilities
 */

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
}

// Max audio duration in seconds (2 minutes)
const MAX_DURATION_SECONDS = 120;

// Supported audio formats
const SUPPORTED_FORMATS = [
  "audio/ogg",
  "audio/oga",
  "audio/opus",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
];

/**
 * Validate audio file size and format
 */
export function validateAudioFile(
  mimeType: string | undefined,
  fileSize: number | undefined
): AudioValidationResult {
  // Check if we have the required information
  if (!mimeType) {
    return {
      valid: false,
      error: "Unable to determine audio format. Please try again.",
    };
  }

  // Check format
  const formatSupported = SUPPORTED_FORMATS.some((format) =>
    mimeType.toLowerCase().includes(format.toLowerCase())
  );

  if (!formatSupported) {
    return {
      valid: false,
      error: `Audio format "${mimeType}" is not supported. Please send a voice message using your messaging app's voice recorder.`,
    };
  }

  // Check file size (20MB limit)
  if (fileSize && fileSize > 20 * 1024 * 1024) {
    return {
      valid: false,
      error: "Audio file is too large (max 20MB). Please send a shorter voice message.",
    };
  }

  return { valid: true };
}

/**
 * Estimate audio duration from file size (rough estimate)
 * Typical voice message bitrates: 16-64 kbps
 */
export function estimateAudioDuration(fileSizeBytes: number): number {
  // Assume average bitrate of 32 kbps for voice messages
  const avgBitrate = 32000; // bits per second
  const durationSeconds = (fileSizeBytes * 8) / avgBitrate;
  return Math.round(durationSeconds);
}

/**
 * Check if estimated duration exceeds limits
 */
export function validateAudioDuration(
  fileSizeBytes: number
): AudioValidationResult {
  const estimatedDuration = estimateAudioDuration(fileSizeBytes);

  if (estimatedDuration > MAX_DURATION_SECONDS) {
    return {
      valid: false,
      error: `Voice message is too long (estimated ${Math.round(estimatedDuration / 60)} minutes). Please keep it under ${Math.round(MAX_DURATION_SECONDS / 60)} minutes.`,
    };
  }

  return { valid: true };
}
