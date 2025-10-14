/**
 * Google Calendar Service
 * Fetches and parses calendar events from Google Calendar API
 */

import { google, calendar_v3 } from "googleapis";
import { createAuthenticatedClient } from "./google-oauth";

export interface ParsedCalendarEvent {
  eventId: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  attendees?: Array<{ email: string; name?: string; responseStatus?: string }>;
  meetingLink?: string;
  isAllDay: boolean;
}

/**
 * Fetch upcoming events from user's Google Calendar
 * @param accessToken - OAuth access token
 * @param refreshToken - OAuth refresh token
 * @param hoursAhead - How many hours ahead to look (default 24)
 * @param maxResults - Maximum number of events to return (default 10)
 */
export async function fetchUpcomingEvents(
  accessToken: string,
  refreshToken: string,
  hoursAhead = 24,
  maxResults = 10
): Promise<ParsedCalendarEvent[]> {
  try {
    const oauth2Client = createAuthenticatedClient(accessToken, refreshToken);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000).toISOString();

    // Fetch events from primary calendar
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    return events.map((event) => parseCalendarEvent(event, "primary"));
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw new Error("Failed to fetch calendar events");
  }
}

/**
 * Parse a Google Calendar event into our format
 */
function parseCalendarEvent(
  event: calendar_v3.Schema$Event,
  calendarId: string
): ParsedCalendarEvent {
  const eventId = event.id || "";
  const summary = event.summary || "Untitled Event";
  const description = event.description || undefined;
  const location = event.location || undefined;

  // Parse start and end times
  const isAllDay = !!event.start?.date;
  const startTime = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
      ? new Date(event.start.date)
      : new Date();

  const endTime = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : event.end?.date
      ? new Date(event.end.date)
      : new Date();

  // Parse attendees
  const attendees = event.attendees?.map((attendee) => ({
    email: attendee.email || "",
    name: attendee.displayName || undefined,
    responseStatus: attendee.responseStatus || undefined,
  }));

  // Extract meeting link (Google Meet, Zoom, etc.)
  const meetingLink = extractMeetingLink(event);

  return {
    eventId,
    calendarId,
    summary,
    description,
    location,
    startTime,
    endTime,
    attendees,
    meetingLink,
    isAllDay,
  };
}

/**
 * Extract meeting link from event
 * Checks for Google Meet, Zoom, Teams, etc.
 */
function extractMeetingLink(event: calendar_v3.Schema$Event): string | undefined {
  // Check Google Meet link
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  // Check conference data
  if (event.conferenceData?.entryPoints) {
    const videoEntry = event.conferenceData.entryPoints.find(
      (entry) => entry.entryPointType === "video"
    );
    if (videoEntry?.uri) {
      return videoEntry.uri;
    }
  }

  // Check description for common meeting links
  const description = event.description || "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = description.match(urlRegex) || [];

  for (const url of urls) {
    if (
      url.includes("zoom.us") ||
      url.includes("meet.google.com") ||
      url.includes("teams.microsoft.com") ||
      url.includes("webex.com")
    ) {
      return url;
    }
  }

  // Check location for meeting links
  const locationUrl = event.location?.match(urlRegex)?.[0];
  if (
    locationUrl &&
    (locationUrl.includes("zoom.us") ||
      locationUrl.includes("meet.google.com") ||
      locationUrl.includes("teams.microsoft.com") ||
      locationUrl.includes("webex.com"))
  ) {
    return locationUrl;
  }

  return undefined;
}

/**
 * Detect meeting type from event details
 * Used to determine what kind of prep to generate
 */
export function detectMeetingType(event: ParsedCalendarEvent): string {
  const summary = event.summary.toLowerCase();
  const description = event.description?.toLowerCase() || "";
  const combined = `${summary} ${description}`;

  // Common meeting types
  const patterns = [
    { pattern: /\b(doctor|dentist|dental|medical|appointment|checkup)\b/, type: "doctor" },
    { pattern: /\b(interview|job|career|hiring|candidate)\b/, type: "interview" },
    { pattern: /\b(contractor|renovation|repair|construction)\b/, type: "contractor" },
    { pattern: /\b(dinner|lunch|breakfast|restaurant|cafe)\b/, type: "meal" },
    { pattern: /\b(1:1|one.on.one|check.in|sync)\b/, type: "1-on-1" },
    { pattern: /\b(standup|stand.up|daily|scrum)\b/, type: "standup" },
    { pattern: /\b(performance|review|feedback)\b/, type: "performance review" },
    { pattern: /\b(client|customer|prospect)\b/, type: "client meeting" },
    { pattern: /\b(board|executive|leadership)\b/, type: "executive meeting" },
    { pattern: /\b(planning|strategy|roadmap)\b/, type: "planning" },
  ];

  for (const { pattern, type } of patterns) {
    if (pattern.test(combined)) {
      return type;
    }
  }

  // Default to the event summary if no pattern matches
  return summary;
}

/**
 * Build context string from event details for prep generation
 */
export function buildEventContext(event: ParsedCalendarEvent): string {
  const parts: string[] = [];

  if (event.description) {
    parts.push(`Description: ${event.description}`);
  }

  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    const attendeeNames = event.attendees
      .map((a) => a.name || a.email)
      .slice(0, 5)
      .join(", ");
    parts.push(`Attendees: ${attendeeNames}`);
  }

  if (event.meetingLink) {
    parts.push(`Meeting Link: ${event.meetingLink}`);
  }

  const duration = Math.round(
    (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)
  );
  parts.push(`Duration: ${duration} minutes`);

  return parts.join("\n");
}

/**
 * Format event time for notification message
 */
export function formatEventTime(event: ParsedCalendarEvent): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: event.isAllDay ? undefined : "numeric",
    minute: event.isAllDay ? undefined : "2-digit",
  };

  return event.startTime.toLocaleDateString("en-US", options);
}
