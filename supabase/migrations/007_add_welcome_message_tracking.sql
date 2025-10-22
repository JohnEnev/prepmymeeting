-- Add welcome message and activity tracking to users table
-- This migration adds columns to track when users last messaged and whether they've received the intro

ALTER TABLE users
ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN intro_sent BOOLEAN DEFAULT FALSE;

-- Create index on last_message_at for efficient inactivity queries
CREATE INDEX idx_users_last_message_at ON users(last_message_at);

-- Update existing users to have last_message_at set to their created_at
UPDATE users SET last_message_at = created_at WHERE last_message_at IS NULL;

-- Comment on new columns
COMMENT ON COLUMN users.last_message_at IS 'Timestamp of the last message received from this user';
COMMENT ON COLUMN users.intro_sent IS 'Whether the welcome/intro message has been sent to this user';
