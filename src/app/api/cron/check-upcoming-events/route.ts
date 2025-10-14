/**
 * Cron Job: Check Upcoming Calendar Events
 * Runs periodically to check for upcoming events and send proactive prep notifications
 *
 * Vercel Cron: GET /api/cron/check-upcoming-events
 * Secured with Authorization header
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getUsersWithActiveCalendars,
  saveCalendarEvent,
  markPrepNotificationSent,
  getCalendarEvent,
} from "@/lib/db";
import { getActiveConnection } from "@/lib/calendar/google-oauth";
import {
  fetchUpcomingEvents,
  detectMeetingType,
  buildEventContext,
  formatEventTime,
  type ParsedCalendarEvent,
} from "@/lib/calendar/google-calendar";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔔 Cron job started: Checking upcoming events");

    // Get all users with active calendar connections
    const usersWithCalendars = await getUsersWithActiveCalendars();
    console.log(`Found ${usersWithCalendars.length} users with active calendars`);

    let totalEventsProcessed = 0;
    let totalNotificationsSent = 0;

    // Process each user
    for (const { user, connection, settings } of usersWithCalendars) {
      if (!settings?.notification_enabled) {
        continue;
      }

      try {
        console.log(`Processing calendar for user ${user.id}`);

        // Get active connection (handles token refresh)
        const activeConnection = await getActiveConnection(user.id);
        if (!activeConnection) {
          console.log(`No active connection for user ${user.id}, skipping`);
          continue;
        }

        // Fetch upcoming events based on user's advance notice preference
        const advanceHours = settings.advance_notice_hours || 24;
        const events = await fetchUpcomingEvents(
          activeConnection.access_token,
          activeConnection.refresh_token,
          advanceHours,
          10
        );

        console.log(`Found ${events.length} upcoming events for user ${user.id}`);
        totalEventsProcessed += events.length;

        // Process each event
        for (const event of events) {
          await processEvent(user.id, connection.id, event, settings.advance_notice_hours || 24);
          totalNotificationsSent++;
        }
      } catch (error) {
        console.error(`Error processing calendar for user ${user.id}:`, error);
        // Continue with next user
      }
    }

    console.log(`✅ Cron job completed: Processed ${totalEventsProcessed} events, sent ${totalNotificationsSent} notifications`);

    return NextResponse.json({
      success: true,
      usersProcessed: usersWithCalendars.length,
      eventsProcessed: totalEventsProcessed,
      notificationsSent: totalNotificationsSent,
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Process a single calendar event
 * Saves event to database and sends notification if needed
 */
async function processEvent(
  userId: string,
  connectionId: string,
  event: ParsedCalendarEvent,
  advanceHours: number
): Promise<void> {
  try {
    // Calculate notification window
    const now = new Date();
    const notificationWindow = new Date(event.startTime.getTime() - advanceHours * 60 * 60 * 1000);
    const shouldNotify = now >= notificationWindow && now < event.startTime;

    // Save event to database
    const eventId = await saveCalendarEvent({
      user_id: userId,
      connection_id: connectionId,
      event_id: event.eventId,
      calendar_id: event.calendarId,
      summary: event.summary,
      description: event.description || null,
      location: event.location || null,
      start_time: event.startTime.toISOString(),
      end_time: event.endTime.toISOString(),
      attendees: event.attendees ? JSON.parse(JSON.stringify(event.attendees)) : null,
      meeting_link: event.meetingLink || null,
    });

    if (!eventId) {
      console.error(`Failed to save event ${event.eventId}`);
      return;
    }

    // Check if notification already sent
    const savedEvent = await getCalendarEvent(eventId);
    if (savedEvent?.prep_notification_sent) {
      console.log(`Notification already sent for event ${event.eventId}`);
      return;
    }

    // Send notification if in window
    if (shouldNotify) {
      await sendPrepNotification(userId, event, eventId);
      await markPrepNotificationSent(eventId, true);
    }
  } catch (error) {
    console.error(`Error processing event ${event.eventId}:`, error);
  }
}

/**
 * Send proactive prep notification to user
 */
async function sendPrepNotification(
  userId: string,
  event: ParsedCalendarEvent,
  eventDbId: string
): Promise<void> {
  try {
    // Get user's WhatsApp ID
    const { getUser } = await import("@/lib/db");
    const user = await getUser(userId);
    if (!user?.whatsapp_id) {
      console.log(`No WhatsApp ID for user ${userId}`);
      return;
    }

    // Detect meeting type (for future use)
    const _meetingType = detectMeetingType(event);

    // Format event time
    const eventTimeStr = formatEventTime(event);

    // Build context for richer notification (for future use)
    const _context = buildEventContext(event);

    // Create notification message
    let message = `📅 *Upcoming Meeting Alert*\n\n`;
    message += `I noticed you have: *${event.summary}*\n`;
    message += `When: ${eventTimeStr}\n\n`;

    if (event.location) {
      message += `📍 ${event.location}\n`;
    }

    if (event.meetingLink) {
      message += `🔗 ${event.meetingLink}\n`;
    }

    message += `\nWould you like me to prepare a quick prep checklist for this meeting?\n\n`;
    message += `Reply "yes ${eventDbId}" to generate prep now, or just reply "yes" for your next request.`;

    // Send via WhatsApp
    await sendWhatsAppMessage(user.whatsapp_id, message);
    console.log(`Sent prep notification for event: ${event.summary} to user ${userId}`);
  } catch (error) {
    console.error("Error sending prep notification:", error);
  }
}
