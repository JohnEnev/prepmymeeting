/**
 * Google OAuth Service
 * Handles OAuth 2.0 flow for Google Calendar API
 */

import { google } from "googleapis";
import { supabase } from "@/lib/supabase";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// OAuth scopes for Calendar readonly access
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

/**
 * Create OAuth2 client
 */
export function getOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      "Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI"
    );
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for user to grant access
 * @param userId - User ID to include in state parameter
 */
export function generateAuthUrl(userId: string): string {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Required to get refresh token
    scope: SCOPES,
    prompt: "consent", // Force consent screen to ensure we get refresh token
    state: userId, // Pass userId in state for callback
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from OAuth callback
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get tokens from Google");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(), // Default 1 hour
    scopes: tokens.scope?.split(" ") || SCOPES,
  };
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token from database
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: credentials.expiry_date
      ? new Date(credentials.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

/**
 * Store OAuth tokens in database
 * @param userId - User ID
 * @param tokens - OAuth tokens from Google
 */
export async function storeTokens(
  userId: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    scopes: string[];
  }
) {
  // Check if connection already exists
  const { data: existing } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (existing) {
    // Update existing connection
    const { error } = await supabase
      .from("calendar_connections")
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        scopes: tokens.scopes,
        is_active: true,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating calendar connection:", error);
      throw new Error("Failed to update calendar connection");
    }

    return existing.id;
  } else {
    // Create new connection
    const { data, error } = await supabase
      .from("calendar_connections")
      .insert({
        user_id: userId,
        provider: "google",
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresAt,
        scopes: tokens.scopes,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("Error creating calendar connection:", error);
      throw new Error("Failed to create calendar connection");
    }

    return data.id;
  }
}

/**
 * Get active calendar connection for user
 * Automatically refreshes token if expired
 */
export async function getActiveConnection(userId: string) {
  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("is_active", true)
    .single();

  if (error || !connection) {
    return null;
  }

  // Check if token is expired or expiring soon (within 5 minutes)
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt <= fiveMinutesFromNow) {
    console.log("Access token expired or expiring soon, refreshing...");
    try {
      const refreshed = await refreshAccessToken(connection.refresh_token);

      // Update token in database
      await supabase
        .from("calendar_connections")
        .update({
          access_token: refreshed.accessToken,
          token_expires_at: refreshed.expiresAt,
        })
        .eq("id", connection.id);

      connection.access_token = refreshed.accessToken;
      connection.token_expires_at = refreshed.expiresAt;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Mark connection as inactive
      await supabase
        .from("calendar_connections")
        .update({ is_active: false })
        .eq("id", connection.id);
      return null;
    }
  }

  return connection;
}

/**
 * Disconnect calendar for user
 */
export async function disconnectCalendar(userId: string) {
  const { error } = await supabase
    .from("calendar_connections")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("provider", "google");

  if (error) {
    console.error("Error disconnecting calendar:", error);
    throw new Error("Failed to disconnect calendar");
  }

  return true;
}

/**
 * Create authenticated OAuth2 client with user's tokens
 */
export function createAuthenticatedClient(accessToken: string, refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return oauth2Client;
}
