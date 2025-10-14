import { supabase } from "./supabase";
import type { Database } from "./supabase";

type User = Database["users"]["Row"];

/**
 * Get or create a user by their platform ID (Telegram or WhatsApp)
 */
export async function getOrCreateUser(user: {
  id?: number; // Telegram ID
  whatsappId?: string; // WhatsApp ID
  username?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  platform?: "telegram" | "whatsapp";
}): Promise<User | null> {
  try {
    const platform = user.platform || "telegram";
    const firstName = user.first_name || user.firstName;
    const lastName = user.last_name || user.lastName;

    // Try to find existing user
    let existingUser: User | null = null;

    if (platform === "telegram" && user.id) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", user.id)
        .single();

      if (!error && data) {
        existingUser = data;
      }
    } else if (platform === "whatsapp" && user.whatsappId) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("whatsapp_id", user.whatsappId)
        .single();

      if (!error && data) {
        existingUser = data;
      }
    }

    if (existingUser) {
      // Update user info if it changed
      const needsUpdate =
        existingUser.username !== user.username ||
        existingUser.first_name !== firstName ||
        existingUser.last_name !== lastName;

      if (needsUpdate) {
        const { data: updatedUser } = await supabase
          .from("users")
          .update({
            username: user.username,
            first_name: firstName,
            last_name: lastName,
          })
          .eq("id", existingUser.id)
          .select()
          .single();

        return updatedUser || existingUser;
      }

      return existingUser;
    }

    // Create new user
    const insertData: Record<string, unknown> = {
      username: user.username,
      first_name: firstName,
      last_name: lastName,
      platform,
    };

    if (platform === "telegram" && user.id) {
      insertData.telegram_id = user.id;
    } else if (platform === "whatsapp" && user.whatsappId) {
      insertData.whatsapp_id = user.whatsappId;
    }

    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating user:", createError);
      return null;
    }

    return newUser;
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    return null;
  }
}

/**
 * Log a conversation message
 */
export async function logConversation(
  userId: string,
  messageText: string,
  messageType: "user" | "bot"
): Promise<boolean> {
  try {
    const { error } = await supabase.from("conversations").insert({
      user_id: userId,
      message_text: messageText,
      message_type: messageType,
    });

    if (error) {
      console.error("Error logging conversation:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in logConversation:", error);
    return false;
  }
}

/**
 * Save a generated checklist
 */
export async function saveChecklist(
  userId: string,
  topic: string,
  content: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("checklists").insert({
      user_id: userId,
      topic,
      content,
    });

    if (error) {
      console.error("Error saving checklist:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveChecklist:", error);
    return false;
  }
}

/**
 * Get recent checklists for a user
 */
export async function getUserChecklists(
  userId: string,
  limit = 10
): Promise<Database["checklists"]["Row"][]> {
  try {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching checklists:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserChecklists:", error);
    return [];
  }
}

/**
 * Save a submitted link
 */
export async function saveSubmittedLink(
  userId: string,
  url: string,
  linkType: "linkedin" | "property" | "restaurant" | "job_post" | "other" = "other",
  pageTitle?: string,
  pageContent?: string,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase.from("submitted_links").insert({
      user_id: userId,
      url,
      link_type: linkType,
      page_title: pageTitle,
      page_content: pageContent,
      metadata,
    });

    if (error) {
      console.error("Error saving submitted link:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in saveSubmittedLink:", error);
    return false;
  }
}

/**
 * Get recent conversation history for context
 */
export async function getRecentConversations(
  userId: string,
  limit = 20
): Promise<Database["conversations"]["Row"][]> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching conversations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getRecentConversations:", error);
    return [];
  }
}

/**
 * Get or create active session for user
 * Sessions expire after 10 minutes of inactivity
 */
export async function getOrCreateSession(
  userId: string,
  topic?: string
): Promise<Database["conversation_sessions"]["Row"] | null> {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Try to find an active session that's not expired
    const { data: existingSession, error: fetchError } = await supabase
      .from("conversation_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gt("last_activity_at", tenMinutesAgo)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .single();

    if (!fetchError && existingSession) {
      // Update activity timestamp
      await updateSessionActivity(existingSession.id);
      return existingSession;
    }

    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from("conversation_sessions")
      .insert({
        user_id: userId,
        topic: topic || null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating session:", createError);
      return null;
    }

    return newSession;
  } catch (error) {
    console.error("Error in getOrCreateSession:", error);
    return null;
  }
}

/**
 * Update session activity timestamp
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await supabase
      .from("conversation_sessions")
      .update({
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  } catch (error) {
    console.error("Error updating session activity:", error);
  }
}

/**
 * Deactivate old sessions (>10 min inactive)
 */
export async function deactivateOldSessions(userId: string): Promise<void> {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    await supabase
      .from("conversation_sessions")
      .update({
        is_active: false,
      })
      .eq("user_id", userId)
      .eq("is_active", true)
      .lt("last_activity_at", tenMinutesAgo);
  } catch (error) {
    console.error("Error deactivating old sessions:", error);
  }
}

/**
 * Log a conversation message with session tracking
 */
export async function logConversationWithSession(
  userId: string,
  messageText: string,
  messageType: "user" | "bot",
  sessionId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("conversations").insert({
      user_id: userId,
      message_text: messageText,
      message_type: messageType,
      session_id: sessionId || null,
    });

    if (error) {
      console.error("Error logging conversation:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in logConversationWithSession:", error);
    return false;
  }
}

// ==================== USER PREFERENCES ====================

/**
 * Get or create user preferences
 */
export async function getUserPreferences(
  userId: string
): Promise<Database["user_preferences"]["Row"] | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching preferences:", error);
      return null;
    }

    if (!data) {
      // Create default preferences
      const { data: newPrefs, error: createError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userId,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating preferences:", createError);
        return null;
      }

      return newPrefs;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserPreferences:", error);
    return null;
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: Partial<Database["user_preferences"]["Update"]>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_preferences")
      .update(updates)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating preferences:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateUserPreferences:", error);
    return false;
  }
}

// ==================== CONVERSATION SEARCH ====================

/**
 * Search past conversations by keyword
 */
export async function searchPastConversations(
  userId: string,
  keyword: string,
  limit = 20
): Promise<Database["conversations"]["Row"][]> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .ilike("message_text", `%${keyword}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error searching conversations:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in searchPastConversations:", error);
    return [];
  }
}

/**
 * Get checklists by topic keyword
 */
export async function searchPastChecklists(
  userId: string,
  keyword: string,
  limit = 10
): Promise<Database["checklists"]["Row"][]> {
  try {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .eq("user_id", userId)
      .ilike("topic", `%${keyword}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error searching checklists:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in searchPastChecklists:", error);
    return [];
  }
}

// ==================== RECURRING MEETINGS ====================

/**
 * Normalize meeting name for matching
 */
function normalizeMeetingName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Find or create recurring meeting
 */
export async function findOrCreateRecurringMeeting(
  userId: string,
  meetingType: string
): Promise<Database["recurring_meetings"]["Row"] | null> {
  try {
    const normalized = normalizeMeetingName(meetingType);

    // Try to find existing recurring meeting
    const { data: existing, error: findError } = await supabase
      .from("recurring_meetings")
      .select("*")
      .eq("user_id", userId)
      .eq("normalized_name", normalized)
      .single();

    if (existing && !findError) {
      // Update occurrence count and last occurrence
      const { data: updated } = await supabase
        .from("recurring_meetings")
        .update({
          last_occurrence: new Date().toISOString(),
          occurrence_count: existing.occurrence_count + 1,
        })
        .eq("id", existing.id)
        .select()
        .single();

      return updated || existing;
    }

    // Create new recurring meeting
    const { data: newMeeting, error: createError } = await supabase
      .from("recurring_meetings")
      .insert({
        user_id: userId,
        meeting_type: meetingType,
        normalized_name: normalized,
        first_occurrence: new Date().toISOString(),
        last_occurrence: new Date().toISOString(),
        occurrence_count: 1,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating recurring meeting:", createError);
      return null;
    }

    return newMeeting;
  } catch (error) {
    console.error("Error in findOrCreateRecurringMeeting:", error);
    return null;
  }
}

/**
 * Update recurring meeting with checklist reference
 */
export async function updateRecurringMeeting(
  meetingId: string,
  checklistId: string,
  summary?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("recurring_meetings")
      .update({
        last_checklist_id: checklistId,
        last_summary: summary || null,
      })
      .eq("id", meetingId);

    if (error) {
      console.error("Error updating recurring meeting:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateRecurringMeeting:", error);
    return false;
  }
}

/**
 * Get recurring meeting by name
 */
export async function getRecurringMeeting(
  userId: string,
  meetingType: string
): Promise<Database["recurring_meetings"]["Row"] | null> {
  try {
    const normalized = normalizeMeetingName(meetingType);

    const { data, error } = await supabase
      .from("recurring_meetings")
      .select("*")
      .eq("user_id", userId)
      .eq("normalized_name", normalized)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching recurring meeting:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getRecurringMeeting:", error);
    return null;
  }
}

// ==================== CONVERSATION SUMMARIES ====================

/**
 * Create conversation summary
 */
export async function createConversationSummary(
  userId: string,
  sessionId: string | null,
  topic: string,
  summary: string,
  keyPoints: string[],
  messageCount: number,
  startDate: string,
  endDate: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("conversation_summaries").insert({
      user_id: userId,
      session_id: sessionId,
      topic,
      summary,
      key_points: keyPoints,
      message_count: messageCount,
      start_date: startDate,
      end_date: endDate,
    });

    if (error) {
      console.error("Error creating conversation summary:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in createConversationSummary:", error);
    return false;
  }
}

/**
 * Get recent conversation summaries
 */
export async function getRecentSummaries(
  userId: string,
  limit = 5
): Promise<Database["conversation_summaries"]["Row"][]> {
  try {
    const { data, error } = await supabase
      .from("conversation_summaries")
      .select("*")
      .eq("user_id", userId)
      .order("end_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching summaries:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in getRecentSummaries:", error);
    return [];
  }
}

// ==================== CALENDAR ====================

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<Database["users"]["Row"] | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUser:", error);
    return null;
  }
}

/**
 * Get or create notification settings for user
 */
export async function getOrCreateNotificationSettings(
  userId: string
): Promise<Database["notification_settings"]["Row"] | null> {
  try {
    // Try to fetch existing settings
    const { data: existing, error: fetchError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing && !fetchError) {
      return existing;
    }

    // Create default settings
    const { data: created, error: createError } = await supabase
      .from("notification_settings")
      .insert({ user_id: userId })
      .select()
      .single();

    if (createError) {
      console.error("Error creating notification settings:", createError);
      return null;
    }

    return created;
  } catch (error) {
    console.error("Error in getOrCreateNotificationSettings:", error);
    return null;
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  userId: string,
  updates: Partial<Database["notification_settings"]["Update"]>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("notification_settings")
      .update(updates)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating notification settings:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in updateNotificationSettings:", error);
    return false;
  }
}

/**
 * Get all users with active calendar connections
 */
export async function getUsersWithActiveCalendars(): Promise<
  Array<{
    user: Database["users"]["Row"];
    connection: Database["calendar_connections"]["Row"];
    settings: Database["notification_settings"]["Row"] | null;
  }>
> {
  try {
    const { data: connections, error } = await supabase
      .from("calendar_connections")
      .select("*, users(*)")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching active calendar connections:", error);
      return [];
    }

    type ConnectionWithUser = Database["calendar_connections"]["Row"] & {
      users: Database["users"]["Row"] | Database["users"]["Row"][];
    };

    const results = await Promise.all(
      (connections || []).map(async (conn: ConnectionWithUser) => {
        const settings = await getOrCreateNotificationSettings(conn.user_id);
        const user = Array.isArray(conn.users) ? conn.users[0] : conn.users;
        return {
          user,
          connection: conn,
          settings,
        };
      })
    );

    return results.filter((r) => r.user && r.settings?.notification_enabled);
  } catch (error) {
    console.error("Error in getUsersWithActiveCalendars:", error);
    return [];
  }
}

/**
 * Save or update calendar event
 */
export async function saveCalendarEvent(
  event: Database["calendar_events"]["Insert"]
): Promise<string | null> {
  try {
    // Check if event already exists
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", event.user_id)
      .eq("event_id", event.event_id)
      .eq("calendar_id", event.calendar_id)
      .single();

    if (existing) {
      // Update existing event
      const { error } = await supabase
        .from("calendar_events")
        .update(event)
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating calendar event:", error);
        return null;
      }

      return existing.id;
    } else {
      // Insert new event
      const { data, error } = await supabase
        .from("calendar_events")
        .insert(event)
        .select("id")
        .single();

      if (error || !data) {
        console.error("Error creating calendar event:", error);
        return null;
      }

      return data.id;
    }
  } catch (error) {
    console.error("Error in saveCalendarEvent:", error);
    return null;
  }
}

/**
 * Mark event as prep notification sent
 */
export async function markPrepNotificationSent(
  eventId: string,
  sent: boolean = true
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        prep_notification_sent: sent,
        prep_notification_sent_at: sent ? new Date().toISOString() : null,
      })
      .eq("id", eventId);

    if (error) {
      console.error("Error marking prep notification sent:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in markPrepNotificationSent:", error);
    return false;
  }
}

/**
 * Link checklist to calendar event
 */
export async function linkChecklistToEvent(
  eventId: string,
  checklistId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("calendar_events")
      .update({
        checklist_id: checklistId,
        prep_generated: true,
      })
      .eq("id", eventId);

    if (error) {
      console.error("Error linking checklist to event:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in linkChecklistToEvent:", error);
    return false;
  }
}

/**
 * Get calendar event by database ID
 */
export async function getCalendarEvent(
  eventId: string
): Promise<Database["calendar_events"]["Row"] | null> {
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("Error fetching calendar event:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getCalendarEvent:", error);
    return null;
  }
}
