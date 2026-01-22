/**
 * NYTEMODE Academy - AI Article Generation Function
 * Scheduled Netlify function that generates news articles from various sources
 *
 * Schedule: Runs daily at 8:00 AM UTC (configurable in netlify.toml)
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// NYTEMODE tone of voice prompt
const TONE_OF_VOICE = `You are writing as NYTEMODE - a confident, tech-forward voice that:
- Uses short, punchy sentences. No fluff.
- Balances technical credibility with approachability
- Speaks directly - "Here's what matters" not "In this article we will explore"
- Uses achievement-focused framing and concrete metrics
- Respects reader intelligence - no hand-holding
- Occasionally edgy, never corporate
- References emerging tech naturally (AI, Web3, creative tech)

Write in a way that would fit on a cutting-edge tech education platform. Be informative but engaging. Skip the boring intros - get to the point.`;

/**
 * Main handler for the scheduled function
 */
exports.handler = async (event, context) => {
    console.log('Starting article generation...');

    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
        console.error('Missing required environment variables');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Missing configuration' })
        };
    }

    try {
        // Get today's day of week for scheduled themes
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];

        // Fetch active sources
        const { data: sources, error: sourcesError } = await supabase
            .from('sources')
            .select('*')
            .eq('active', true);

        if (sourcesError) throw sourcesError;

        console.log(`Found ${sources.length} active sources`);

        // Get settings
        const { data: settingsData } = await supabase
            .from('settings')
            .select('*');

        const settings = (settingsData || []).reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});

        const maxArticles = settings.max_articles_per_day || 3;
        let articlesGenerated = 0;
        const results = [];

        // Process RSS feeds first
        const rssSources = sources.filter(s => s.type === 'rss');
        for (const source of rssSources) {
            if (articlesGenerated >= maxArticles) break;

            try {
                const result = await processRSSSource(source);
                if (result) {
                    results.push(result);
                    articlesGenerated++;
                }
            } catch (error) {
                console.error(`Error processing RSS source ${source.name}:`, error);
                await logGeneration(source.id, 'rss', null, null, 'failed', error.message);
            }
        }

        // Process scheduled themes for today
        const scheduledSources = sources.filter(s => s.type === 'scheduled' && s.schedule_day === today);
        for (const source of scheduledSources) {
            if (articlesGenerated >= maxArticles) break;

            try {
                const result = await processScheduledSource(source);
                if (result) {
                    results.push(result);
                    articlesGenerated++;
                }
            } catch (error) {
                console.error(`Error processing scheduled source ${source.name}:`, error);
                await logGeneration(source.id, 'scheduled', null, null, 'failed', error.message);
            }
        }

        // Process topic prompts (pick one random if we have capacity)
        const topicSources = sources.filter(s => s.type === 'topic');
        if (articlesGenerated < maxArticles && topicSources.length > 0) {
            const randomTopic = topicSources[Math.floor(Math.random() * topicSources.length)];
            try {
                const result = await processTopicSource(randomTopic);
                if (result) {
                    results.push(result);
                    articlesGenerated++;
                }
            } catch (error) {
                console.error(`Error processing topic source ${randomTopic.name}:`, error);
                await logGeneration(randomTopic.id, 'topic', null, null, 'failed', error.message);
            }
        }

        console.log(`Generated ${articlesGenerated} articles`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                articlesGenerated,
                results
            })
        };

    } catch (error) {
        console.error('Generation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * Process an RSS feed source
 */
async function processRSSSource(source) {
    console.log(`Processing RSS: ${source.name}`);

    // Fetch and parse RSS feed
    const feedItems = await fetchRSSFeed(source.url);
    if (!feedItems || feedItems.length === 0) {
        console.log(`No items in feed: ${source.name}`);
        return null;
    }

    // Check which items we've already processed
    const { data: existingArticles } = await supabase
        .from('article_queue')
        .select('source_url')
        .eq('source_type', 'rss');

    const { data: publishedArticles } = await supabase
        .from('articles')
        .select('source_ref')
        .eq('source_type', 'rss');

    const processedUrls = new Set([
        ...(existingArticles || []).map(a => a.source_url),
        ...(publishedArticles || []).map(a => a.source_ref)
    ]);

    // Find first unprocessed item
    const newItem = feedItems.find(item => !processedUrls.has(item.link));
    if (!newItem) {
        console.log(`No new items in feed: ${source.name}`);
        return null;
    }

    // Generate article from RSS item
    const article = await generateArticleFromRSS(newItem, source);

    if (article) {
        // Save to queue
        const { data, error } = await supabase
            .from('article_queue')
            .insert([{
                ...article,
                source_type: 'rss',
                source_ref: source.id,
                source_title: newItem.title,
                source_url: newItem.link,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        // Update source last_fetched_at
        await supabase
            .from('sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', source.id);

        // Log success
        await logGeneration(source.id, 'rss', newItem.link, data.id, 'success');

        return { source: source.name, title: article.title };
    }

    return null;
}

/**
 * Process a scheduled theme source
 */
async function processScheduledSource(source) {
    console.log(`Processing scheduled theme: ${source.name}`);

    const article = await generateArticleFromTheme(source);

    if (article) {
        const { data, error } = await supabase
            .from('article_queue')
            .insert([{
                ...article,
                source_type: 'scheduled',
                source_ref: source.id,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', source.id);

        await logGeneration(source.id, 'scheduled', null, data.id, 'success');

        return { source: source.name, title: article.title };
    }

    return null;
}

/**
 * Process a topic prompt source
 */
async function processTopicSource(source) {
    console.log(`Processing topic: ${source.name}`);

    const article = await generateArticleFromTopic(source);

    if (article) {
        const { data, error } = await supabase
            .from('article_queue')
            .insert([{
                ...article,
                source_type: 'topic',
                source_ref: source.id,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        await supabase
            .from('sources')
            .update({ last_fetched_at: new Date().toISOString() })
            .eq('id', source.id);

        await logGeneration(source.id, 'topic', null, data.id, 'success');

        return { source: source.name, title: article.title };
    }

    return null;
}

/**
 * Fetch and parse RSS feed
 */
async function fetchRSSFeed(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();

        // Simple RSS parsing (for production, consider using a proper RSS parser library)
        const items = [];
        const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) ||
            text.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

        for (const itemXml of itemMatches.slice(0, 10)) {
            const title = extractXmlTag(itemXml, 'title');
            const link = extractXmlTag(itemXml, 'link') || extractAtomLink(itemXml);
            const description = extractXmlTag(itemXml, 'description') ||
                extractXmlTag(itemXml, 'summary') ||
                extractXmlTag(itemXml, 'content');
            const pubDate = extractXmlTag(itemXml, 'pubDate') ||
                extractXmlTag(itemXml, 'published') ||
                extractXmlTag(itemXml, 'updated');

            if (title && link) {
                items.push({
                    title: cleanHtml(title),
                    link: link.trim(),
                    description: cleanHtml(description || ''),
                    pubDate
                });
            }
        }

        return items;
    } catch (error) {
        console.error(`Error fetching RSS feed ${url}:`, error);
        return [];
    }
}

/**
 * Extract XML tag content
 */
function extractXmlTag(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    if (match) {
        return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
    }
    return null;
}

/**
 * Extract Atom link
 */
function extractAtomLink(xml) {
    const match = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
    return match ? match[1] : null;
}

/**
 * Clean HTML from text
 */
function cleanHtml(text) {
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

/**
 * Generate article from RSS item using Claude
 */
async function generateArticleFromRSS(item, source) {
    const prompt = `Based on the following news item, write an original article for NYTEMODE Academy (a tech education platform).

Original Title: ${item.title}
Original Description: ${item.description}
Source URL: ${item.link}

${TONE_OF_VOICE}

Create a completely original article that:
1. Provides your own analysis and perspective on this news
2. Explains why this matters for tech professionals and learners
3. Adds educational value and practical insights
4. Does NOT copy the original content verbatim

Respond in JSON format with these fields:
{
    "title": "Your engaging, original title",
    "slug": "url-friendly-slug",
    "excerpt": "2-3 sentence summary for previews",
    "content": "Full article in Markdown format (500-800 words)",
    "category": "${source.category || 'AI'}",
    "seo_title": "SEO optimized title (50-60 chars)",
    "seo_description": "Meta description (150-160 chars)",
    "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    return await callClaude(prompt);
}

/**
 * Generate article from scheduled theme using Claude
 */
async function generateArticleFromTheme(source) {
    const prompt = `Write an article for NYTEMODE Academy based on this theme:

Theme: ${source.schedule_theme}
Day: ${source.schedule_day}
Category: ${source.category || 'AI'}

${TONE_OF_VOICE}

Create an engaging, educational article that:
1. Covers current trends and developments in this area
2. Provides actionable insights for readers
3. Includes specific examples and tools when relevant
4. Is timely and relevant to what's happening in tech right now

Respond in JSON format with these fields:
{
    "title": "Your engaging title",
    "slug": "url-friendly-slug",
    "excerpt": "2-3 sentence summary for previews",
    "content": "Full article in Markdown format (600-1000 words)",
    "category": "${source.category || 'AI'}",
    "seo_title": "SEO optimized title (50-60 chars)",
    "seo_description": "Meta description (150-160 chars)",
    "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    return await callClaude(prompt);
}

/**
 * Generate article from topic prompt using Claude
 */
async function generateArticleFromTopic(source) {
    const prompt = `Write an article for NYTEMODE Academy based on this topic:

Topic: ${source.topic_prompt}
Category: ${source.category || 'AI'}

${TONE_OF_VOICE}

Create an educational article that thoroughly covers this topic with:
1. Clear explanations for learners at various levels
2. Practical examples and use cases
3. Current tools, techniques, or best practices
4. Actionable takeaways

Respond in JSON format with these fields:
{
    "title": "Your engaging title",
    "slug": "url-friendly-slug",
    "excerpt": "2-3 sentence summary for previews",
    "content": "Full article in Markdown format (600-1000 words)",
    "category": "${source.category || 'AI'}",
    "seo_title": "SEO optimized title (50-60 chars)",
    "seo_description": "Meta description (150-160 chars)",
    "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    return await callClaude(prompt);
}

/**
 * Call Claude API to generate content
 */
async function callClaude(prompt) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.content[0].text;

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Claude response');
        }

        const article = JSON.parse(jsonMatch[0]);

        // Validate required fields
        if (!article.title || !article.content) {
            throw new Error('Missing required fields in Claude response');
        }

        // Generate slug if not provided
        if (!article.slug) {
            article.slug = article.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }

        return article;

    } catch (error) {
        console.error('Claude API error:', error);
        throw error;
    }
}

/**
 * Log generation attempt to database
 */
async function logGeneration(sourceId, sourceType, sourceRef, articleQueueId, status, errorMessage = null) {
    try {
        await supabase.from('generation_log').insert([{
            source_id: sourceId,
            source_type: sourceType,
            source_ref: sourceRef,
            article_queue_id: articleQueueId,
            status,
            error_message: errorMessage
        }]);
    } catch (error) {
        console.error('Error logging generation:', error);
    }
}
