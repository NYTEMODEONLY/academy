/**
 * NYTEMODE Academy - Dynamic Article Edge Function
 * Serves article pages with proper SEO meta tags injected server-side
 *
 * This edge function intercepts requests to /news/:slug/ and:
 * 1. Fetches article data from Supabase
 * 2. Injects SEO meta tags into the HTML
 * 3. Returns the rendered page
 */

import { marked } from "https://esm.sh/marked@12.0.0";

export default async (request, context) => {
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/news\/([^\/]+)\/?$/);

    if (!pathMatch) {
        return context.next();
    }

    const slug = pathMatch[1];

    // Skip if it's a static file or the news listing page
    if (slug === 'index.html' || slug === '' || slug.includes('.')) {
        return context.next();
    }

    // Get Supabase config from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase not configured');
        return context.next();
    }

    try {
        // Fetch article from Supabase
        const response = await fetch(
            `${supabaseUrl}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&limit=1`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        if (!response.ok) {
            console.error('Supabase fetch error:', response.statusText);
            return context.next();
        }

        const articles = await response.json();
        const article = articles[0];

        if (!article) {
            // Article not found, return 404 page
            return new Response(generate404Page(slug), {
                status: 404,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // Convert Markdown content to HTML
        const contentHtml = marked.parse(article.content || '');

        // Generate full page HTML with SEO
        const html = generateArticlePage(article, contentHtml);

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
            }
        });

    } catch (error) {
        console.error('Edge function error:', error);
        return context.next();
    }
};

/**
 * Generate the full article page HTML
 */
function generateArticlePage(article, contentHtml) {
    const siteUrl = 'https://academy.nytemode.com';
    const title = article.seo_title || article.title;
    const description = article.seo_description || article.excerpt || '';
    const keywords = (article.seo_keywords || []).join(', ');
    const thumbnail = article.thumbnail || null; // No default, we'll use a gradient
    const hasThumbnail = thumbnail && thumbnail.trim() !== '';
    const publishedDate = article.published_at ? new Date(article.published_at).toISOString() : new Date().toISOString();
    const formattedDate = article.published_at
        ? new Date(article.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

    // Default OG image if no thumbnail
    const ogImage = hasThumbnail
        ? (thumbnail.startsWith('http') ? thumbnail : `${siteUrl}${thumbnail}`)
        : `${siteUrl}/images/og-default.png`;

    // JSON-LD structured data
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": description,
        "image": ogImage,
        "datePublished": publishedDate,
        "dateModified": article.updated_at || publishedDate,
        "author": {
            "@type": "Organization",
            "name": "NYTEMODE Academy"
        },
        "publisher": {
            "@type": "Organization",
            "name": "NYTEMODE Academy",
            "logo": {
                "@type": "ImageObject",
                "url": `${siteUrl}/images/logo-white.png`
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `${siteUrl}/news/${article.slug}/`
        }
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Primary Meta Tags -->
    <title>${escapeHtml(title)} | NYTEMODE Academy</title>
    <meta name="title" content="${escapeHtml(title)} | NYTEMODE Academy">
    <meta name="description" content="${escapeHtml(description)}">
    ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}">` : ''}

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${siteUrl}/news/${article.slug}/">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:site_name" content="NYTEMODE Academy">
    <meta property="article:published_time" content="${publishedDate}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${siteUrl}/news/${article.slug}/">
    <meta property="twitter:title" content="${escapeHtml(title)}">
    <meta property="twitter:description" content="${escapeHtml(description)}">
    <meta property="twitter:image" content="${ogImage}">

    <!-- Canonical -->
    <link rel="canonical" href="${siteUrl}/news/${article.slug}/">

    <!-- Structured Data -->
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/images/favicon.ico">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">

    <!-- Styles -->
    <link rel="stylesheet" href="/css/global.css">

    <style>
        .article-hero {
            position: relative;
            min-height: 40vh;
            display: flex;
            align-items: flex-end;
            padding: 80px 0 60px;
            background: ${hasThumbnail
                ? `linear-gradient(180deg, rgba(10, 10, 10, 0) 0%, rgba(10, 10, 10, 0.9) 100%), url('${escapeHtml(thumbnail)}') center/cover no-repeat`
                : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'};
        }

        .article-meta {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .article-category {
            background: var(--accent);
            color: white;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .article-date {
            color: var(--text-muted);
            font-size: 14px;
        }

        .article-title {
            font-family: 'Oswald', sans-serif;
            font-size: clamp(32px, 5vw, 56px);
            font-weight: 700;
            line-height: 1.1;
            color: var(--text-primary);
            margin-bottom: 20px;
        }

        .article-excerpt {
            font-size: 18px;
            line-height: 1.6;
            color: var(--text-secondary);
            max-width: 700px;
        }

        .article-content {
            padding: 60px 0;
        }

        .article-body {
            max-width: 720px;
            margin: 0 auto;
            font-size: 17px;
            line-height: 1.8;
            color: var(--text-secondary);
        }

        .article-body h2 {
            font-family: 'Oswald', sans-serif;
            font-size: 28px;
            color: var(--text-primary);
            margin: 48px 0 24px;
        }

        .article-body h3 {
            font-family: 'Oswald', sans-serif;
            font-size: 22px;
            color: var(--text-primary);
            margin: 36px 0 16px;
        }

        .article-body p {
            margin-bottom: 24px;
        }

        .article-body a {
            color: var(--accent);
            text-decoration: underline;
        }

        .article-body ul, .article-body ol {
            margin: 24px 0;
            padding-left: 24px;
        }

        .article-body li {
            margin-bottom: 12px;
        }

        .article-body blockquote {
            border-left: 3px solid var(--accent);
            padding-left: 24px;
            margin: 32px 0;
            font-style: italic;
            color: var(--text-muted);
        }

        .article-body code {
            background: var(--bg-card);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
        }

        .article-body pre {
            background: var(--bg-card);
            padding: 24px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 32px 0;
        }

        .article-body pre code {
            background: none;
            padding: 0;
        }

        .article-body img {
            max-width: 100%;
            border-radius: 8px;
            margin: 32px 0;
        }

        .share-buttons {
            display: flex;
            gap: 12px;
            padding-top: 40px;
            border-top: 1px solid var(--border);
            margin-top: 60px;
        }

        .share-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-secondary);
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.15s ease;
        }

        .share-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--border-hover);
        }

        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .back-link:hover {
            color: var(--accent);
        }
    </style>
</head>
<body>
    <header class="header" data-header>
        <div class="container header-inner">
            <a href="/" class="header-logo">
                <img src="/images/logo-white.png" alt="NYTEMODE Academy">
            </a>
            <nav class="header-nav" data-mobile-menu>
                <a href="/" class="nav-link">Home</a>
                <a href="/courses/" class="nav-link">Courses</a>
                <a href="/news/" class="nav-link active">News</a>
            </nav>
            <button class="menu-toggle" data-menu-toggle aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </header>

    <main>
        <section class="article-hero">
            <div class="container">
                <a href="/news/" class="back-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to News
                </a>
                <div class="article-meta">
                    <span class="article-category">${escapeHtml(article.category)}</span>
                    <span class="article-date">${formattedDate}</span>
                </div>
                <h1 class="article-title">${escapeHtml(article.title)}</h1>
                ${article.excerpt ? `<p class="article-excerpt">${escapeHtml(article.excerpt)}</p>` : ''}
            </div>
        </section>

        <section class="article-content">
            <div class="container">
                <article class="article-body">
                    ${contentHtml}

                    <div class="share-buttons">
                        <span style="color: var(--text-muted); font-size: 14px; margin-right: 8px;">Share:</span>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(siteUrl + '/news/' + article.slug + '/')}&text=${encodeURIComponent(article.title)}"
                           target="_blank" rel="noopener" class="share-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            Tweet
                        </a>
                        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl + '/news/' + article.slug + '/')}"
                           target="_blank" rel="noopener" class="share-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            LinkedIn
                        </a>
                    </div>
                </article>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-inner">
                <div class="footer-brand">
                    <img src="/images/logo-white.png" alt="NYTEMODE Academy">
                    <p>Free AI & Tech Education</p>
                </div>
                <div class="footer-links">
                    <a href="/">Home</a>
                    <a href="/courses/">Courses</a>
                    <a href="/news/">News</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; ${new Date().getFullYear()} NYTEMODE Academy. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <script src="/js/main.js"></script>
</body>
</html>`;
}

/**
 * Generate 404 page
 */
function generate404Page(slug) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Article Not Found | NYTEMODE Academy</title>
    <link rel="icon" type="image/x-icon" href="/images/favicon.ico">
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/global.css">
    <style>
        .error-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px 20px;
        }
        .error-code {
            font-family: 'Oswald', sans-serif;
            font-size: 120px;
            font-weight: 700;
            color: var(--accent);
            line-height: 1;
            margin-bottom: 16px;
        }
        .error-title {
            font-family: 'Oswald', sans-serif;
            font-size: 32px;
            color: var(--text-primary);
            margin-bottom: 16px;
        }
        .error-message {
            color: var(--text-muted);
            margin-bottom: 32px;
            max-width: 400px;
        }
        .error-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 14px 28px;
            background: var(--accent);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.15s ease;
        }
        .error-btn:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="error-page">
        <div>
            <div class="error-code">404</div>
            <h1 class="error-title">Article Not Found</h1>
            <p class="error-message">The article "${escapeHtml(slug)}" doesn't exist or has been removed.</p>
            <a href="/news/" class="error-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to News
            </a>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export const config = {
    path: "/news/*"
};
