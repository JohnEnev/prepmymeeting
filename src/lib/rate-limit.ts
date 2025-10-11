/**
 * Rate limiting and usage tracking
 */

import { supabase } from "./supabase";

// Rate limits
const LIMITS = {
  REQUESTS_PER_MINUTE: 5,
  REQUESTS_PER_HOUR: 20,
  REQUESTS_PER_DAY: 50,
  COST_PER_HOUR_CENTS: 50, // $0.50
  COST_PER_DAY_CENTS: 200, // $2.00
};

// Cost estimates in cents
export const COSTS = {
  O4_MINI: 0.2, // ~$0.002 per request
  GPT4O_MINI: 0.01, // ~$0.0001 per request
  JINA_READER: 0.01, // ~$0.0001 per URL
};

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  resetIn?: number; // seconds until reset
  limit?: string; // which limit was hit
}

/**
 * Check if user is within rate limits
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const now = new Date();

    // Get or create user usage record
    let { data: usage, error } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // No record exists, create one
      const { data: newUsage, error: createError } = await supabase
        .from("user_usage")
        .insert({
          user_id: userId,
          requests_last_minute: 0,
          requests_last_hour: 0,
          requests_last_day: 0,
          minute_reset_at: now.toISOString(),
          hour_reset_at: now.toISOString(),
          day_reset_at: now.toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating user usage:", createError);
        // Allow request if we can't track (fail open)
        return { allowed: true };
      }

      usage = newUsage;
    } else if (error) {
      console.error("Error fetching user usage:", error);
      // Allow request if we can't track (fail open)
      return { allowed: true };
    }

    if (!usage) {
      return { allowed: true };
    }

    // Check if user is blocked
    if (usage.is_blocked) {
      return {
        allowed: false,
        reason: usage.blocked_reason || "Your account has been temporarily blocked due to unusual activity. Please try again later.",
        limit: "blocked",
      };
    }

    // Reset counters if time windows have passed
    const minuteResetTime = new Date(usage.minute_reset_at);
    const hourResetTime = new Date(usage.hour_reset_at);
    const dayResetTime = new Date(usage.day_reset_at);

    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    // Reset minute counter
    if (now.getTime() - minuteResetTime.getTime() >= 60 * 1000) {
      updates.requests_last_minute = 0;
      updates.minute_reset_at = now.toISOString();
      needsUpdate = true;
    }

    // Reset hour counter
    if (now.getTime() - hourResetTime.getTime() >= 60 * 60 * 1000) {
      updates.requests_last_hour = 0;
      updates.cost_last_hour = 0;
      updates.hour_reset_at = now.toISOString();
      needsUpdate = true;
    }

    // Reset day counter
    if (now.getTime() - dayResetTime.getTime() >= 24 * 60 * 60 * 1000) {
      updates.requests_last_day = 0;
      updates.cost_last_day = 0;
      updates.day_reset_at = now.toISOString();
      needsUpdate = true;
    }

    // Apply resets if needed
    if (needsUpdate) {
      await supabase
        .from("user_usage")
        .update(updates)
        .eq("user_id", userId);

      // Reload usage with updated values
      const { data: updatedUsage } = await supabase
        .from("user_usage")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (updatedUsage) {
        usage = updatedUsage;
      }
    }

    // Check rate limits
    const minutesRemaining = Math.ceil(
      (60 * 1000 - (now.getTime() - new Date(usage.minute_reset_at).getTime())) / 1000
    );
    const hoursRemaining = Math.ceil(
      (60 * 60 * 1000 - (now.getTime() - new Date(usage.hour_reset_at).getTime())) / 1000
    );
    const daysRemaining = Math.ceil(
      (24 * 60 * 60 * 1000 - (now.getTime() - new Date(usage.day_reset_at).getTime())) / 1000
    );

    // Check minute limit
    if (usage.requests_last_minute >= LIMITS.REQUESTS_PER_MINUTE) {
      return {
        allowed: false,
        reason: `You're sending requests too quickly. Please wait ${minutesRemaining} seconds and try again.`,
        resetIn: minutesRemaining,
        limit: "per_minute",
      };
    }

    // Check hour limit
    if (usage.requests_last_hour >= LIMITS.REQUESTS_PER_HOUR) {
      return {
        allowed: false,
        reason: `You've reached the hourly limit of ${LIMITS.REQUESTS_PER_HOUR} requests. Please try again in ${Math.ceil(hoursRemaining / 60)} minutes.`,
        resetIn: hoursRemaining,
        limit: "per_hour",
      };
    }

    // Check day limit
    if (usage.requests_last_day >= LIMITS.REQUESTS_PER_DAY) {
      return {
        allowed: false,
        reason: `You've reached the daily limit of ${LIMITS.REQUESTS_PER_DAY} requests. Please try again tomorrow.`,
        resetIn: daysRemaining,
        limit: "per_day",
      };
    }

    // Check cost limits
    if (usage.cost_last_hour >= LIMITS.COST_PER_HOUR_CENTS) {
      return {
        allowed: false,
        reason: `You've reached the hourly usage limit. Please try again in ${Math.ceil(hoursRemaining / 60)} minutes.`,
        resetIn: hoursRemaining,
        limit: "cost_per_hour",
      };
    }

    if (usage.cost_last_day >= LIMITS.COST_PER_DAY_CENTS) {
      return {
        allowed: false,
        reason: `You've reached the daily usage limit. Please try again tomorrow.`,
        resetIn: daysRemaining,
        limit: "cost_per_day",
      };
    }

    // All checks passed
    return { allowed: true };
  } catch (error) {
    console.error("Error in checkRateLimit:", error);
    // Fail open - allow request if rate limit check fails
    return { allowed: true };
  }
}

/**
 * Increment request counters
 */
export async function incrementRequestCount(userId: string): Promise<void> {
  try {
    const { data: usage } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!usage) return;

    await supabase
      .from("user_usage")
      .update({
        requests_last_minute: usage.requests_last_minute + 1,
        requests_last_hour: usage.requests_last_hour + 1,
        requests_last_day: usage.requests_last_day + 1,
      })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error incrementing request count:", error);
  }
}

/**
 * Track API cost
 */
export async function trackCost(
  userId: string,
  costInCents: number
): Promise<void> {
  try {
    const { data: usage } = await supabase
      .from("user_usage")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!usage) return;

    await supabase
      .from("user_usage")
      .update({
        cost_last_hour: usage.cost_last_hour + costInCents,
        cost_last_day: usage.cost_last_day + costInCents,
        cost_total: usage.cost_total + costInCents,
      })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error tracking cost:", error);
  }
}

/**
 * Block a user
 */
export async function blockUser(
  userId: string,
  reason: string
): Promise<void> {
  try {
    await supabase
      .from("user_usage")
      .update({
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error blocking user:", error);
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<void> {
  try {
    await supabase
      .from("user_usage")
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
      })
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error unblocking user:", error);
  }
}
