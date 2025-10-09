-- PrepMyMeeting Database Schema
-- This migration creates the initial tables for storing user data, conversations, checklists, and submitted links

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table: stores Telegram user information
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on telegram_id for fast lookups
CREATE INDEX idx_users_telegram_id ON users(telegram_id);

-- Conversations table: stores all messages exchanged with users
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'bot')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Checklists table: stores generated preparation checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_checklists_user_id ON checklists(user_id);
CREATE INDEX idx_checklists_created_at ON checklists(created_at DESC);

-- Submitted links table: stores URLs submitted by users for context
CREATE TABLE submitted_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_title TEXT,
  page_content TEXT,
  link_type TEXT NOT NULL DEFAULT 'other' CHECK (link_type IN ('linkedin', 'property', 'restaurant', 'job_post', 'other')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_submitted_links_user_id ON submitted_links(user_id);
CREATE INDEX idx_submitted_links_created_at ON submitted_links(created_at DESC);
CREATE INDEX idx_submitted_links_link_type ON submitted_links(link_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Note: For a Telegram bot, you'll typically use the service role key
-- These policies are here for future reference if you add user-facing features

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE submitted_links ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for bot operations)
-- Users can only see their own data (for future user-facing features)

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own checklists" ON checklists
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own links" ON submitted_links
  FOR SELECT USING (auth.uid()::text = user_id::text);
