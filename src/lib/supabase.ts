import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for server-side operations (bot)
// Falls back to anon key if service role key is not set
export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Type definitions for our database tables
export type Database = {
  users: {
    Row: {
      id: string;
      telegram_id: number | null;
      whatsapp_id: string | null;
      platform: "telegram" | "whatsapp";
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      telegram_id?: number | null;
      whatsapp_id?: string | null;
      platform?: "telegram" | "whatsapp";
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      telegram_id?: number | null;
      whatsapp_id?: string | null;
      platform?: "telegram" | "whatsapp";
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  conversations: {
    Row: {
      id: string;
      user_id: string;
      session_id: string | null;
      message_text: string;
      message_type: "user" | "bot";
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      session_id?: string | null;
      message_text: string;
      message_type: "user" | "bot";
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      session_id?: string | null;
      message_text?: string;
      message_type?: "user" | "bot";
      created_at?: string;
    };
  };
  conversation_sessions: {
    Row: {
      id: string;
      user_id: string;
      topic: string | null;
      last_activity_at: string;
      created_at: string;
      is_active: boolean;
    };
    Insert: {
      id?: string;
      user_id: string;
      topic?: string | null;
      last_activity_at?: string;
      created_at?: string;
      is_active?: boolean;
    };
    Update: {
      id?: string;
      user_id?: string;
      topic?: string | null;
      last_activity_at?: string;
      created_at?: string;
      is_active?: boolean;
    };
  };
  checklists: {
    Row: {
      id: string;
      user_id: string;
      topic: string;
      content: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      topic: string;
      content: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      topic?: string;
      content?: string;
      created_at?: string;
    };
  };
  submitted_links: {
    Row: {
      id: string;
      user_id: string;
      url: string;
      page_title: string | null;
      page_content: string | null;
      link_type: "linkedin" | "property" | "restaurant" | "job_post" | "other";
      metadata: Record<string, unknown> | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      url: string;
      page_title?: string | null;
      page_content?: string | null;
      link_type?: "linkedin" | "property" | "restaurant" | "job_post" | "other";
      metadata?: Record<string, unknown> | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      url?: string;
      page_title?: string | null;
      page_content?: string | null;
      link_type?: "linkedin" | "property" | "restaurant" | "job_post" | "other";
      metadata?: Record<string, unknown> | null;
      created_at?: string;
    };
  };
  user_preferences: {
    Row: {
      id: string;
      user_id: string;
      preferred_length: "short" | "medium" | "long";
      preferred_tone: "formal" | "casual" | "neutral";
      max_bullets: number;
      include_examples: boolean;
      include_resources: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      preferred_length?: "short" | "medium" | "long";
      preferred_tone?: "formal" | "casual" | "neutral";
      max_bullets?: number;
      include_examples?: boolean;
      include_resources?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      preferred_length?: "short" | "medium" | "long";
      preferred_tone?: "formal" | "casual" | "neutral";
      max_bullets?: number;
      include_examples?: boolean;
      include_resources?: boolean;
      created_at?: string;
      updated_at?: string;
    };
  };
  conversation_summaries: {
    Row: {
      id: string;
      user_id: string;
      session_id: string | null;
      topic: string;
      summary: string;
      key_points: string[];
      message_count: number;
      start_date: string;
      end_date: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      session_id?: string | null;
      topic: string;
      summary: string;
      key_points?: string[];
      message_count?: number;
      start_date: string;
      end_date: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      session_id?: string | null;
      topic?: string;
      summary?: string;
      key_points?: string[];
      message_count?: number;
      start_date?: string;
      end_date?: string;
      created_at?: string;
    };
  };
  recurring_meetings: {
    Row: {
      id: string;
      user_id: string;
      meeting_type: string;
      normalized_name: string;
      frequency: string | null;
      first_occurrence: string;
      last_occurrence: string;
      occurrence_count: number;
      last_checklist_id: string | null;
      last_summary: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      meeting_type: string;
      normalized_name: string;
      frequency?: string | null;
      first_occurrence: string;
      last_occurrence: string;
      occurrence_count?: number;
      last_checklist_id?: string | null;
      last_summary?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      meeting_type?: string;
      normalized_name?: string;
      frequency?: string | null;
      first_occurrence?: string;
      last_occurrence?: string;
      occurrence_count?: number;
      last_checklist_id?: string | null;
      last_summary?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  calendar_connections: {
    Row: {
      id: string;
      user_id: string;
      provider: "google" | "outlook";
      access_token: string;
      refresh_token: string;
      token_expires_at: string;
      scopes: string[];
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      provider?: "google" | "outlook";
      access_token: string;
      refresh_token: string;
      token_expires_at: string;
      scopes?: string[];
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      provider?: "google" | "outlook";
      access_token?: string;
      refresh_token?: string;
      token_expires_at?: string;
      scopes?: string[];
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
  };
  calendar_events: {
    Row: {
      id: string;
      user_id: string;
      connection_id: string;
      event_id: string;
      calendar_id: string;
      summary: string;
      description: string | null;
      location: string | null;
      start_time: string;
      end_time: string;
      attendees: Record<string, unknown> | null;
      meeting_link: string | null;
      prep_notification_sent: boolean;
      prep_notification_sent_at: string | null;
      prep_generated: boolean;
      checklist_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      connection_id: string;
      event_id: string;
      calendar_id: string;
      summary: string;
      description?: string | null;
      location?: string | null;
      start_time: string;
      end_time: string;
      attendees?: Record<string, unknown> | null;
      meeting_link?: string | null;
      prep_notification_sent?: boolean;
      prep_notification_sent_at?: string | null;
      prep_generated?: boolean;
      checklist_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      connection_id?: string;
      event_id?: string;
      calendar_id?: string;
      summary?: string;
      description?: string | null;
      location?: string | null;
      start_time?: string;
      end_time?: string;
      attendees?: Record<string, unknown> | null;
      meeting_link?: string | null;
      prep_notification_sent?: boolean;
      prep_notification_sent_at?: string | null;
      prep_generated?: boolean;
      checklist_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
  };
  notification_settings: {
    Row: {
      id: string;
      user_id: string;
      notification_enabled: boolean;
      advance_notice_hours: number;
      notification_time_preference: "morning" | "afternoon" | "evening" | "anytime";
      auto_generate_prep: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      notification_enabled?: boolean;
      advance_notice_hours?: number;
      notification_time_preference?: "morning" | "afternoon" | "evening" | "anytime";
      auto_generate_prep?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      notification_enabled?: boolean;
      advance_notice_hours?: number;
      notification_time_preference?: "morning" | "afternoon" | "evening" | "anytime";
      auto_generate_prep?: boolean;
      created_at?: string;
      updated_at?: string;
    };
  };
};
