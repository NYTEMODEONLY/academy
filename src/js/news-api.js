/**
 * NYTEMODE Academy - News API Client
 * Handles fetching news articles from Supabase
 */

const NewsAPI = {
    // Configuration - will be set from environment or inline
    config: {
        supabaseUrl: window.SUPABASE_URL || '',
        supabaseKey: window.SUPABASE_ANON_KEY || '',
    },

    /**
     * Initialize the API with Supabase credentials
     */
    init(url, key) {
        this.config.supabaseUrl = url;
        this.config.supabaseKey = key;
    },

    /**
     * Make a request to Supabase REST API
     */
    async request(endpoint, options = {}) {
        const url = `${this.config.supabaseUrl}/rest/v1/${endpoint}`;

        const headers = {
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': options.prefer || 'return=representation',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('NewsAPI Error:', error);
            throw error;
        }
    },

    /**
     * Get published articles with optional filters
     */
    async getArticles(options = {}) {
        const {
            category = null,
            limit = 20,
            offset = 0,
            orderBy = 'published_at',
            orderDesc = true
        } = options;

        let query = `articles?select=id,title,slug,excerpt,thumbnail,category,published_at`;

        // Apply category filter
        if (category && category !== 'all') {
            query += `&category=eq.${encodeURIComponent(category)}`;
        }

        // Apply ordering
        query += `&order=${orderBy}.${orderDesc ? 'desc' : 'asc'}`;

        // Apply pagination
        query += `&limit=${limit}&offset=${offset}`;

        return await this.request(query);
    },

    /**
     * Get a single article by slug
     */
    async getArticleBySlug(slug) {
        const query = `articles?slug=eq.${encodeURIComponent(slug)}&limit=1`;
        const articles = await this.request(query);
        return articles[0] || null;
    },

    /**
     * Get a single article by ID
     */
    async getArticleById(id) {
        const query = `articles?id=eq.${encodeURIComponent(id)}&limit=1`;
        const articles = await this.request(query);
        return articles[0] || null;
    },

    /**
     * Get related articles (same category, excluding current)
     */
    async getRelatedArticles(currentSlug, category, limit = 3) {
        let query = `articles?select=id,title,slug,excerpt,thumbnail,category,published_at`;
        query += `&slug=neq.${encodeURIComponent(currentSlug)}`;

        if (category) {
            query += `&category=eq.${encodeURIComponent(category)}`;
        }

        query += `&order=published_at.desc&limit=${limit}`;

        return await this.request(query);
    },

    /**
     * Get articles count (for pagination)
     */
    async getArticlesCount(category = null) {
        let query = `articles?select=id`;

        if (category && category !== 'all') {
            query += `&category=eq.${encodeURIComponent(category)}`;
        }

        const response = await this.request(query, {
            headers: { 'Prefer': 'count=exact' }
        });

        // Count is returned in header, but we approximate from array length
        return response.length;
    },

    /**
     * Get all unique categories
     */
    async getCategories() {
        const articles = await this.request('articles?select=category');
        const categories = [...new Set(articles.map(a => a.category))];
        return categories.filter(Boolean).sort();
    },

    /**
     * Search articles by title or content
     */
    async searchArticles(query, limit = 10) {
        // Use Supabase text search
        const searchQuery = `articles?or=(title.ilike.*${encodeURIComponent(query)}*,excerpt.ilike.*${encodeURIComponent(query)}*)`;
        return await this.request(`${searchQuery}&limit=${limit}&order=published_at.desc`);
    },

    // ==========================================
    // ADMIN FUNCTIONS (Queue Management)
    // ==========================================

    /**
     * Get pending articles from queue
     */
    async getQueuedArticles(status = 'pending') {
        let query = `article_queue?select=*`;

        if (status !== 'all') {
            query += `&status=eq.${encodeURIComponent(status)}`;
        }

        query += `&order=generated_at.desc`;

        return await this.request(query);
    },

    /**
     * Get a single queued article by ID
     */
    async getQueuedArticleById(id) {
        const query = `article_queue?id=eq.${encodeURIComponent(id)}&limit=1`;
        const articles = await this.request(query);
        return articles[0] || null;
    },

    /**
     * Update a queued article
     */
    async updateQueuedArticle(id, updates) {
        const query = `article_queue?id=eq.${encodeURIComponent(id)}`;
        return await this.request(query, {
            method: 'PATCH',
            body: updates
        });
    },

    /**
     * Approve an article (call the database function)
     */
    async approveArticle(queueId) {
        // Call the RPC function
        return await this.request('rpc/approve_article', {
            method: 'POST',
            body: { queue_id: queueId }
        });
    },

    /**
     * Reject an article
     */
    async rejectArticle(queueId, note = null) {
        return await this.request('rpc/reject_article', {
            method: 'POST',
            body: { queue_id: queueId, note: note }
        });
    },

    /**
     * Delete a queued article
     */
    async deleteQueuedArticle(id) {
        const query = `article_queue?id=eq.${encodeURIComponent(id)}`;
        return await this.request(query, {
            method: 'DELETE'
        });
    },

    // ==========================================
    // SOURCES MANAGEMENT
    // ==========================================

    /**
     * Get all sources
     */
    async getSources(type = null) {
        let query = `sources?select=*`;

        if (type) {
            query += `&type=eq.${encodeURIComponent(type)}`;
        }

        query += `&order=created_at.desc`;

        return await this.request(query);
    },

    /**
     * Create a new source
     */
    async createSource(source) {
        return await this.request('sources', {
            method: 'POST',
            body: source
        });
    },

    /**
     * Update a source
     */
    async updateSource(id, updates) {
        const query = `sources?id=eq.${encodeURIComponent(id)}`;
        return await this.request(query, {
            method: 'PATCH',
            body: updates
        });
    },

    /**
     * Delete a source
     */
    async deleteSource(id) {
        const query = `sources?id=eq.${encodeURIComponent(id)}`;
        return await this.request(query, {
            method: 'DELETE'
        });
    },

    /**
     * Toggle source active status
     */
    async toggleSource(id, active) {
        return await this.updateSource(id, { active });
    },

    // ==========================================
    // SETTINGS MANAGEMENT
    // ==========================================

    /**
     * Get all settings
     */
    async getSettings() {
        const settings = await this.request('settings?select=*');
        // Convert to key-value object
        return settings.reduce((acc, s) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
    },

    /**
     * Get a single setting
     */
    async getSetting(key) {
        const query = `settings?key=eq.${encodeURIComponent(key)}&limit=1`;
        const settings = await this.request(query);
        return settings[0]?.value || null;
    },

    /**
     * Update a setting
     */
    async updateSetting(key, value) {
        const query = `settings?key=eq.${encodeURIComponent(key)}`;
        return await this.request(query, {
            method: 'PATCH',
            body: { value, updated_at: new Date().toISOString() }
        });
    },

    // ==========================================
    // GENERATION LOG
    // ==========================================

    /**
     * Get recent generation logs
     */
    async getGenerationLogs(limit = 50) {
        return await this.request(`generation_log?select=*&order=generated_at.desc&limit=${limit}`);
    },

    // ==========================================
    // PUBLISHED ARTICLES MANAGEMENT (Admin)
    // ==========================================

    /**
     * Create a manual article (bypasses queue)
     */
    async createArticle(article) {
        return await this.request('articles', {
            method: 'POST',
            body: {
                ...article,
                source_type: 'manual',
                published_at: article.published_at || new Date().toISOString()
            }
        });
    },

    /**
     * Update a published article
     */
    async updateArticle(id, updates) {
        const query = `articles?id=eq.${encodeURIComponent(id)}`;
        return await this.request(query, {
            method: 'PATCH',
            body: updates
        });
    },

    /**
     * Delete a published article
     */
    async deleteArticle(id) {
        const query = `articles?id=eq.${encodeURIComponent(id)}`;
        return await this.request(query, {
            method: 'DELETE'
        });
    },

    /**
     * Unpublish an article (move back to queue as pending)
     */
    async unpublishArticle(id) {
        // Get the article first
        const article = await this.getArticleById(id);
        if (!article) throw new Error('Article not found');

        // Create queue entry
        await this.request('article_queue', {
            method: 'POST',
            body: {
                title: article.title,
                slug: article.slug,
                excerpt: article.excerpt,
                content: article.content,
                thumbnail: article.thumbnail,
                category: article.category,
                seo_title: article.seo_title,
                seo_description: article.seo_description,
                seo_keywords: article.seo_keywords,
                source_type: article.source_type || 'manual',
                source_ref: article.source_ref,
                status: 'pending'
            }
        });

        // Delete from published
        await this.deleteArticle(id);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsAPI;
}
