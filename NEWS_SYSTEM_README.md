# NYTEMODE Academy - Automated News System

This document describes the automated news article system that generates AI-powered content daily without triggering Netlify builds.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT SOURCES                          │
├─────────────┬─────────────┬─────────────────────────────────┤
│  RSS Feeds  │   Topics    │  Scheduled Themes               │
│  (Tech/AI)  │   (Manual)  │  (Mon/Wed/Fri)                  │
└──────┬──────┴──────┬──────┴──────┬──────────────────────────┘
       │             │             │
       └─────────────┴─────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
       │    AI GENERATION ENGINE     │
       │    (Netlify Function)       │
       │    Claude API + NYTEMODE    │
       │    tone of voice            │
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
       │      SUPABASE DATABASE      │
       │    - Article queue          │
       │    - Published articles     │
       │    - Sources                │
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
       │     CONTENT STUDIO ADMIN    │
       │    - Review queue           │
       │    - Edit & approve         │
       │    - Manage sources         │
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
       │      ACADEMY WEBSITE        │
       │  - Fetches from Supabase    │
       │  - Edge Function for SEO    │
       │  - No builds for content    │
       └─────────────────────────────┘
```

## Quick Start

### 1. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `/supabase/schema.sql`
3. Get your credentials from Settings → API:
   - Project URL
   - anon/public key
   - service_role key

### 2. Configure Netlify Environment Variables

In Netlify dashboard → Site settings → Environment variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-claude-api-key
```

### 3. Deploy

Push to your repository. Netlify will:
- Build the static site
- Deploy the scheduled function (runs daily at 8 AM UTC)
- Enable the Edge Function for dynamic articles

### 4. Test the System

1. **Admin Panel**: Go to `/admin` and sign in
2. **Sources**: Navigate to "Sources" tab, verify RSS feeds are active
3. **Manual Generate**: Call `POST /api/trigger-generation` with Bearer token
4. **Check Queue**: View generated articles in "News Queue"
5. **Approve**: Edit and approve an article
6. **Verify**: Check it appears on `/news`

## Files Created

### Database
- `/supabase/schema.sql` - Complete database schema
- `/supabase/SETUP.md` - Detailed setup guide

### Netlify Functions
- `/netlify/functions/generate-articles.js` - Scheduled AI generation
- `/netlify/functions/trigger-generation.js` - Manual trigger endpoint
- `/netlify/functions/config.js` - Public config endpoint

### Edge Functions
- `/netlify/edge-functions/article.js` - Dynamic article pages with SEO

### Frontend
- `/src/js/news-api.js` - Supabase client for frontend
- `/src/news.njk` - Updated news listing with dynamic loading

### Admin
- `/src/admin/index.html` - Enhanced with queue & sources management

### Configuration
- `/netlify.toml` - Updated with schedules and edge functions
- `/src/_data/supabase.js` - Config injection for 11ty

## Admin Panel Features

### News Queue (`/admin` → News Queue)
- View all AI-generated articles pending review
- Filter by status: Pending, Approved, Rejected
- Edit articles inline with full control over:
  - Title, slug, content
  - SEO title, description, keywords
  - Category, thumbnail
- Approve to publish instantly
- Reject with optional note
- Preview articles before publishing

### Published News (`/admin` → Published)
- View all live articles
- Create manual articles
- Edit existing articles
- Delete articles

### Sources (`/admin` → Sources)
- Manage RSS feeds
- Create topic prompts
- Set up scheduled themes
- Toggle sources active/inactive

## How It Works

### Daily Generation (8 AM UTC)
1. Function fetches active sources from Supabase
2. For RSS feeds: Fetches latest items, skips already processed
3. For scheduled themes: Checks if today matches schedule day
4. For topics: Randomly picks one topic prompt
5. Sends content to Claude API with NYTEMODE tone of voice
6. Saves generated articles to queue with "pending" status

### Article Approval Flow
1. Admin reviews article in Content Studio
2. Can edit title, content, SEO fields
3. On "Approve" → Article moved to published table
4. On "Reject" → Stays in queue with rejection note

### Website Display
1. News listing (`/news/`) fetches from Supabase API
2. Individual articles served by Edge Function
3. Edge Function injects SEO meta tags server-side
4. JSON-LD structured data for search engines

## NYTEMODE Tone of Voice

The AI generation uses this prompt to match your brand:

```
You are writing as NYTEMODE - a confident, tech-forward voice that:
- Uses short, punchy sentences. No fluff.
- Balances technical credibility with approachability
- Speaks directly - "Here's what matters" not "In this article we will explore"
- Uses achievement-focused framing and concrete metrics
- Respects reader intelligence - no hand-holding
- Occasionally edgy, never corporate
- References emerging tech naturally (AI, Web3, creative tech)
```

## API Endpoints

### Public
- `GET /api/config` - Returns Supabase URL and anon key

### Protected (requires service key as Bearer token)
- `POST /api/trigger-generation` - Manually trigger article generation

## Database Tables

| Table | Purpose |
|-------|---------|
| `articles` | Published articles (live on site) |
| `article_queue` | Pending approval from AI generation |
| `sources` | RSS feeds, topics, scheduled themes |
| `generation_log` | Track all generation attempts |
| `settings` | System configuration |

## Cost Estimate

| Service | Free Tier | Our Usage |
|---------|-----------|-----------|
| Supabase | 500MB DB, 2GB bandwidth | Well under |
| Claude API | ~$0.01-0.05/article | ~$1-2/month |
| Netlify Functions | 125K/month | Minimal |
| Netlify Edge | 3M/month | Minimal |

**Estimated monthly cost: $1-2** (just Claude API)

## Customization

### Change Generation Schedule
Edit `/netlify.toml`:
```toml
[functions."generate-articles"]
  schedule = "0 8 * * *"  # Cron format: minute hour day month weekday
```

### Add New RSS Sources
1. Go to Admin → Sources → Add Source
2. Select "RSS Feed"
3. Enter name and URL
4. Set default category
5. Enable

### Add Topic Prompts
1. Go to Admin → Sources → Add Source
2. Select "Topic Prompt"
3. Write a detailed topic description
4. AI will use this as inspiration

### Modify Tone of Voice
Edit the `TONE_OF_VOICE` constant in `/netlify/functions/generate-articles.js`

## Troubleshooting

### Articles not generating
1. Check Supabase credentials in Netlify env vars
2. Check Anthropic API key is valid
3. View function logs in Netlify dashboard
4. Check `generation_log` table in Supabase

### Articles not showing on site
1. Verify Supabase URL and anon key are set
2. Check browser console for errors
3. Verify articles are in `articles` table (not just queue)

### SEO not working
1. Verify Edge Function is deployed
2. Check Netlify dashboard for edge function errors
3. View page source to see if meta tags are injected

## Security Notes

- **Anon key** is safe to expose (used for public reads)
- **Service key** should ONLY be in Netlify env vars (never in frontend)
- RLS policies ensure anon users can only read public data
- Service role has full access (used only in functions)
