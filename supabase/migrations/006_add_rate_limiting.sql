-- Add rate limiting and usage tracking

-- User usage tracking table
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Request counts
  requests_last_minute INTEGER DEFAULT 0,
  requests_last_hour INTEGER DEFAULT 0,
  requests_last_day INTEGER DEFAULT 0,

  -- Cost tracking (in cents)
  cost_last_hour INTEGER DEFAULT 0,
  cost_last_day INTEGER DEFAULT 0,
  cost_total INTEGER DEFAULT 0,

  -- Timestamps for reset
  minute_reset_at TIMESTAMPTZ DEFAULT NOW(),
  hour_reset_at TIMESTAMPTZ DEFAULT NOW(),
  day_reset_at TIMESTAMPTZ DEFAULT NOW(),

  -- Block status
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_usage_user ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_blocked ON user_usage(is_blocked);

-- RLS policies
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow service access to user_usage" ON user_usage;
CREATE POLICY "Allow service access to user_usage" ON user_usage
  FOR ALL USING (true) WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
