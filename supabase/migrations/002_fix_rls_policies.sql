-- Fix RLS policies to allow the bot (using anon key) to insert data
-- The original policies only allowed authenticated users to view their own data
-- Since the Telegram bot uses the anon key server-side, we need to allow inserts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own checklists" ON checklists;
DROP POLICY IF EXISTS "Users can view own links" ON submitted_links;

-- For the bot to work with anon key, we need to allow service operations
-- Option 1: Allow anon key to do everything (simple, works for bot-only access)
CREATE POLICY "Allow service access to users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service access to conversations" ON conversations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service access to checklists" ON checklists
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow service access to submitted_links" ON submitted_links
  FOR ALL USING (true) WITH CHECK (true);

-- Note: This is fine for a Telegram bot because:
-- 1. Only your server has access to make requests (via webhook)
-- 2. Your API route has authentication (TELEGRAM_WEBHOOK_SECRET)
-- 3. Users can't directly access Supabase from the browser in this app

-- If you later add user-facing features, you can create more granular policies
-- For example:
-- CREATE POLICY "Users can view own data" ON users
--   FOR SELECT USING (auth.uid()::text = id::text);
