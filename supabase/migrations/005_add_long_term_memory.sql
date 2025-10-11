-- Add long-term memory features: user preferences and conversation summaries

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Checklist preferences
  preferred_length TEXT CHECK (preferred_length IN ('short', 'medium', 'long')) DEFAULT 'medium',
  preferred_tone TEXT CHECK (preferred_tone IN ('formal', 'casual', 'neutral')) DEFAULT 'neutral',
  max_bullets INTEGER DEFAULT 10,

  -- Feature preferences
  include_examples BOOLEAN DEFAULT TRUE,
  include_resources BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation summaries for efficient long-term memory
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,

  -- Summary content
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_points TEXT[], -- Array of key points discussed

  -- Metadata
  message_count INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring meetings tracking
CREATE TABLE IF NOT EXISTS recurring_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Meeting details
  meeting_type TEXT NOT NULL, -- e.g., "1:1 with Jane", "weekly standup"
  normalized_name TEXT NOT NULL, -- Lowercase, standardized version for matching
  frequency TEXT, -- e.g., "weekly", "monthly", "quarterly"

  -- Historical data
  first_occurrence TIMESTAMPTZ NOT NULL,
  last_occurrence TIMESTAMPTZ NOT NULL,
  occurrence_count INTEGER DEFAULT 1,

  -- Related data
  last_checklist_id UUID REFERENCES checklists(id) ON DELETE SET NULL,
  last_summary TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_topic ON conversation_summaries(topic);
CREATE INDEX IF NOT EXISTS idx_recurring_meetings_user ON recurring_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_meetings_normalized ON recurring_meetings(normalized_name);

-- RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service access to user_preferences" ON user_preferences;
CREATE POLICY "Allow service access to user_preferences" ON user_preferences
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service access to conversation_summaries" ON conversation_summaries;
CREATE POLICY "Allow service access to conversation_summaries" ON conversation_summaries
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service access to recurring_meetings" ON recurring_meetings;
CREATE POLICY "Allow service access to recurring_meetings" ON recurring_meetings
  FOR ALL USING (true) WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_meetings_updated_at
  BEFORE UPDATE ON recurring_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
