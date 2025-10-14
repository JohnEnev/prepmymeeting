-- Calendar Integration Schema
-- This migration adds tables for Google Calendar OAuth and event tracking

-- Calendar connections table: stores OAuth tokens for calendar providers
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google' CHECK (provider IN ('google', 'outlook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['https://www.googleapis.com/auth/calendar.readonly'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create indexes for efficient queries
CREATE INDEX idx_calendar_connections_user_id ON calendar_connections(user_id);
CREATE INDEX idx_calendar_connections_provider ON calendar_connections(provider);
CREATE INDEX idx_calendar_connections_active ON calendar_connections(is_active);

-- Calendar events table: tracks events and whether prep has been sent
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  attendees JSONB,
  meeting_link TEXT,
  prep_notification_sent BOOLEAN DEFAULT FALSE,
  prep_notification_sent_at TIMESTAMP WITH TIME ZONE,
  prep_generated BOOLEAN DEFAULT FALSE,
  checklist_id UUID REFERENCES checklists(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id, calendar_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_prep_sent ON calendar_events(prep_notification_sent);
CREATE INDEX idx_calendar_events_event_id ON calendar_events(event_id);

-- Notification settings table: user preferences for calendar notifications
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  notification_enabled BOOLEAN DEFAULT TRUE,
  advance_notice_hours INTEGER DEFAULT 24 CHECK (advance_notice_hours >= 1 AND advance_notice_hours <= 168),
  notification_time_preference TEXT DEFAULT 'morning' CHECK (notification_time_preference IN ('morning', 'afternoon', 'evening', 'anytime')),
  auto_generate_prep BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- Trigger to automatically update updated_at on calendar_connections table
CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on calendar_events table
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on notification_settings table
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own calendar data
CREATE POLICY "Users can view own calendar connections" ON calendar_connections
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own notification settings" ON notification_settings
  FOR SELECT USING (auth.uid()::text = user_id::text);
