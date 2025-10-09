import { supabase } from "./supabase";
import type { Database } from "./supabase";

type User = Database["users"]["Row"];
type Conversation = Database["conversations"]["Insert"];
type Checklist = Database["checklists"]["Insert"];
type SubmittedLink = Database["submitted_links"]["Insert"];

/**
 * Get or create a user by their Telegram ID
 */
export async function getOrCreateUser(telegramUser: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}): Promise<User | null> {
  try {
    // Try to find existing user
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramUser.id)
      .single();

    if (existingUser && !fetchError) {
      // Update user info if it changed
      const needsUpdate =
        existingUser.username !== telegramUser.username ||
        existingUser.first_name !== telegramUser.first_name ||
        existingUser.last_name !== telegramUser.last_name;

      if (needsUpdate) {
        const { data: updatedUser } = await supabase
          .from("users")
          .update({
            username: telegramUser.username,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
          })
          .eq("telegram_id", telegramUser.id)
          .select()
          .single();

        return updatedUser || existingUser;
      }

      return existingUser;
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
      })
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
