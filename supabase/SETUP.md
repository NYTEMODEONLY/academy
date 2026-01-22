# Supabase Setup Guide for NYTEMODE Academy News System

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `nytemode-academy`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
5. Click "Create new project"

## Step 2: Run Schema SQL

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `schema.sql` and paste it
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Verify all tables are created in the **Table Editor**

## Step 3: Get API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: For frontend (read-only access)
   - **service_role key**: For Netlify functions (full access)

## Step 4: Set Environment Variables

### Local Development (.env file)
Create `.env` in project root:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-claude-api-key
```

### Netlify Environment Variables
1. Go to Netlify dashboard → Your site → **Site settings**
2. Go to **Environment variables**
3. Add each variable:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `ANTHROPIC_API_KEY`

## Step 5: Verify Setup

### Check Tables Created
In Supabase Table Editor, you should see:
- `articles` - Published articles
- `article_queue` - Pending approval
- `sources` - RSS feeds, topics, themes
- `generation_log` - Generation tracking
- `settings` - System configuration

### Check Seed Data
The schema includes example RSS sources:
- TechCrunch AI
- The Verge
- Wired
- Ars Technica AI
- Hacker News

And scheduled themes:
- Monday: AI Tools
- Wednesday: Industry News
- Friday: Tutorial

## Step 6: Test Connection

Run this in your browser console on the Academy site:
```javascript
// Test public read access
fetch('https://YOUR-PROJECT.supabase.co/rest/v1/articles?select=*&limit=1', {
  headers: {
    'apikey': 'YOUR-ANON-KEY',
    'Authorization': 'Bearer YOUR-ANON-KEY'
  }
}).then(r => r.json()).then(console.log);
```

## Free Tier Limits

Supabase free tier includes:
- 500 MB database storage
- 2 GB bandwidth per month
- Unlimited API requests
- 50,000 monthly active users

This is more than enough for the Academy news system.

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are created correctly
- Verify you're using the correct API key (anon for public, service_role for admin)

### "Relation does not exist" errors
- Make sure you ran the full schema.sql
- Check for any SQL errors during execution

### Connection timeouts
- Verify the Supabase URL is correct
- Check if project is paused (free tier pauses after 7 days inactivity)
