# Supabase Setup Guide

## Database Schema

The PrepMyMeeting app uses four main tables:

### 1. **users**
Stores Telegram user information
- `id` (UUID, primary key)
- `telegram_id` (BIGINT, unique) - The Telegram user ID
- `username` (TEXT) - Telegram username
- `first_name` (TEXT)
- `last_name` (TEXT)
- `created_at`, `updated_at` (TIMESTAMP)

### 2. **conversations**
Stores all message exchanges
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key → users)
- `message_text` (TEXT)
- `message_type` (ENUM: 'user' or 'bot')
- `created_at` (TIMESTAMP)

### 3. **checklists**
Stores generated preparation checklists
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key → users)
- `topic` (TEXT) - What the checklist is for
- `content` (TEXT) - The generated checklist content
- `created_at` (TIMESTAMP)

### 4. **submitted_links**
Stores URLs submitted by users for context
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key → users)
- `url` (TEXT)
- `page_title` (TEXT)
- `page_content` (TEXT) - Scraped/fetched content
- `link_type` (ENUM: 'linkedin', 'property', 'restaurant', 'job_post', 'other')
- `metadata` (JSONB) - Additional structured data
- `created_at` (TIMESTAMP)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization and fill in:
   - Project name: `prepmymeeting`
   - Database password: (generate a strong password and save it)
   - Region: Choose closest to your users
5. Wait for the project to initialize (~2 minutes)

### 2. Run the Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration

### 3. Get Your Environment Variables

1. In Supabase dashboard, go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys" → anon public)

### 4. Update Your .env.local

Add these variables to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Deploy to Vercel

Add the same environment variables in your Vercel project settings:
- Go to your Vercel dashboard
- Select your project
- Go to **Settings** → **Environment Variables**
- Add both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Verifying the Setup

You can test the database connection by running a simple query in the SQL Editor:

```sql
SELECT * FROM users;
```

It should return an empty result set (no errors).

## Row Level Security (RLS)

The migration enables RLS on all tables. For the Telegram bot to work, you have two options:

### Option 1: Use Service Role Key (Recommended for Bot)
In server-side code, use the service role key (found in Project Settings → API → service_role):
- This bypasses RLS and is safe for server-side operations
- Never expose this key to the client

### Option 2: Adjust RLS Policies
If you need more granular control, modify the RLS policies in the SQL Editor.

## Next Steps

After setup:
1. The bot will automatically create user records on first interaction
2. All conversations will be logged
3. Generated checklists will be saved for reference
4. Users can submit links for context (coming soon)
