-- Create conversation_sessions table for tracking active chat sessions
-- Sessions expire after 10 minutes of inactivity

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON conversation_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON conversation_sessions(last_activity_at);

-- RLS policies (allow service access)
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service access to conversation_sessions" ON conversation_sessions;
CREATE POLICY "Allow service access to conversation_sessions" ON conversation_sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Add session_id to conversations table (optional, for linking)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
