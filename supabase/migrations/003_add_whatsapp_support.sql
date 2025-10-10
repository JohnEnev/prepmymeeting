-- Add WhatsApp support to the users table
-- This allows the bot to work on both Telegram and WhatsApp platforms

-- Add WhatsApp-specific columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'telegram' CHECK (platform IN ('telegram', 'whatsapp'));

-- Make telegram_id nullable since users can come from WhatsApp
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- Drop the existing unique constraint on telegram_id (which also drops the index)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_telegram_id_key;

-- Add constraint: user must have either telegram_id or whatsapp_id
ALTER TABLE users ADD CONSTRAINT user_has_platform_id
  CHECK (telegram_id IS NOT NULL OR whatsapp_id IS NOT NULL);

-- Create index for WhatsApp ID lookups
CREATE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id) WHERE whatsapp_id IS NOT NULL;

-- Add index on platform for analytics
CREATE INDEX IF NOT EXISTS idx_users_platform ON users(platform);

-- Recreate unique constraints that allow nulls (partial unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_key ON users(telegram_id) WHERE telegram_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_whatsapp_id_key ON users(whatsapp_id) WHERE whatsapp_id IS NOT NULL;
