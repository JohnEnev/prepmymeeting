import { supabase } from "./supabase";

const INACTIVITY_DAYS = 14; // Send re-engagement message after 14 days

export const WELCOME_MESSAGE = `Hey there! 👋 Welcome to PrepMyMeeting!

I'm your AI meeting prep assistant. Here's what I can help you with:

📋 **Meeting Prep**: Just tell me about your upcoming meeting and I'll create a personalized preparation checklist for you

🎤 **Voice Notes**: Send me a voice message - I can transcribe and work with audio

🔍 **Web Search**: I can search the web for real-time information to make your prep more relevant

⚙️ **Customizable**: Just tell me how you want me to respond! Ask for shorter/longer answers, more formal or casual tone, more or less detail - I'll adapt

**Try saying:**
- "I have a client meeting tomorrow about our new product"
- "Help me prepare for my 1-on-1 with my manager"
- "Search the web for latest trends in AI"

Ready to get started? Tell me about your next meeting! 🚀`;

/**
 * Check if a user needs to receive the welcome message
 * Returns true if:
 * 1. User has never received the intro (intro_sent is false)
 * 2. User hasn't messaged in INACTIVITY_DAYS days
 */
export async function shouldSendWelcomeMessage(
  userId: string
): Promise<boolean> {
  const { data: user, error } = await supabase
    .from("users")
    .select("intro_sent, last_message_at")
    .eq("id", userId)
    .single();

  if (error || !user) {
    console.error("Error fetching user for welcome message check:", error);
    return false;
  }

  // First time user - hasn't received intro
  if (!user.intro_sent) {
    return true;
  }

  // Check for inactivity
  if (user.last_message_at) {
    const lastMessage = new Date(user.last_message_at);
    const now = new Date();
    const daysSinceLastMessage =
      (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60 * 24);

    return daysSinceLastMessage >= INACTIVITY_DAYS;
  }

  return false;
}

/**
 * Mark that the welcome message has been sent to a user
 */
export async function markWelcomeMessageSent(userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({
      intro_sent: true,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Error marking welcome message as sent:", error);
  }
}

/**
 * Update the user's last message timestamp
 */
export async function updateUserLastMessage(userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user last message:", error);
  }
}
