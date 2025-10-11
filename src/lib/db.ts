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
