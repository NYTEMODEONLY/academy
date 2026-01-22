/**
 * NYTEMODE Academy - Generate Article from URL
 * Takes a URL, fetches the content, and generates an article using Claude
 *
 * POST /api/generate-from-url
 * Body: { url: "https://example.com/article", category: "AI" }
 * Authorization: Via Netlify Identity (user must be logged in)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TONE_OF_VOICE = `You are writing as NYTEMODE - a confident, tech-forward voice that:
- Uses short, punchy sentences. No fluff.
- Balances technical credibility with approachability
- Speaks directly - "Here's what matters" not "In this article we will explore"
- Uses achievement-focused framing and concrete metrics
- Respects reader intelligence - no hand-holding
- Occasionally edgy, never corporate
- References emerging tech naturally (AI, Web3, creative tech)

Write in a way that would fit on a cutting-edge tech education platform. Be informative but engaging. Skip the boring intros - get to the point.`;

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Auth check - require Netlify Identity user
    // context.clientContext is populated when user is logged in via Netlify Identity
    const user = context.clientContext && context.clientContext.user;
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized - please log in' })
        };
    }

    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANTHROPIC_API_KEY) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Missing configuration' })
        };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { url, category = 'AI' } = body;

        if (!url) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'URL is required' })
            };
        }

        console.log(`Generating article from URL: ${url}`);

        // Fetch the URL content
        const pageContent = await fetchPageContent(url);
        if (!pageContent) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Could not fetch content from URL' })
            };
        }

        // Generate article using Claude
        const article = await generateArticle(url, pageContent, category);
        if (!article) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to generate article' })
            };
        }

        // Save to queue
        const { data, error } = await supabase
            .from('article_queue')
            .insert([{
                ...article,
                source_type: 'url',
                source_url: url,
                source_title: pageContent.title || url,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Article generated and added to queue',
                article: {
                    id: data.id,
                    title: data.title,
                    category: data.category,
                    status: data.status
                }
            })
        };

    } catch (error) {
        console.error('Error generating article:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

/**
 * Fetch and parse page content from URL
 */
async function fetchPageContent(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; NYTEMODE-Bot/1.0)'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : '';

        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
        const description = descMatch ? cleanText(descMatch[1]) : '';

        // Extract article content (try common selectors)
        let content = '';

        // Try to find article body
        const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        if (articleMatch) {
            content = stripHtml(articleMatch[1]);
        } else {
            // Try main content area
            const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
            if (mainMatch) {
                content = stripHtml(mainMatch[1]);
            } else {
                // Fallback: extract all paragraph text
                const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
                content = paragraphs.map(p => stripHtml(p)).join('\n\n');
            }
        }

        // Limit content length for Claude
        if (content.length > 10000) {
            content = content.substring(0, 10000) + '...';
        }

        return {
            title,
            description,
            content: content || description || title
        };

    } catch (error) {
        console.error(`Error fetching URL ${url}:`, error);
        return null;
    }
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Clean text (decode entities, trim)
 */
function cleanText(text) {
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Generate article using Claude
 */
async function generateArticle(url, pageContent, category) {
    const prompt = `Based on the following article/page content, write an ORIGINAL article for NYTEMODE Academy (a tech education platform).

SOURCE URL: ${url}
SOURCE TITLE: ${pageContent.title}
SOURCE DESCRIPTION: ${pageContent.description}
SOURCE CONTENT:
${pageContent.content}

${TONE_OF_VOICE}

Create a completely ORIGINAL article that:
1. Provides your own unique analysis and perspective
2. Explains why this matters for tech professionals and learners
3. Adds educational value and practical insights
4. Does NOT copy the original content - rewrite everything in your own words
5. References the source naturally if relevant

Respond in JSON format with these fields:
{
    "title": "Your engaging, original title (different from source)",
    "slug": "url-friendly-slug",
    "excerpt": "2-3 sentence summary for previews",
    "content": "Full article in Markdown format (500-800 words)",
    "category": "${category}",
    "seo_title": "SEO optimized title (50-60 chars)",
    "seo_description": "Meta description (150-160 chars)",
    "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}`;

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
