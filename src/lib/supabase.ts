import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database tables
export type Database = {
  users: {
    Row: {
      id: string;
      telegram_id: number;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      telegram_id: number;
      username?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      telegram_id?: number;
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
      message_text: string;
      message_type: "user" | "bot";
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      message_text: string;
      message_type: "user" | "bot";
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      message_text?: string;
      message_type?: "user" | "bot";
      created_at?: string;
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
};
