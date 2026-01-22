-- NYTEMODE Academy - Automated News System Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ARTICLES TABLE (Published articles)
-- ============================================
CREATE TABLE articles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    thumbnail TEXT,
    category TEXT NOT NULL DEFAULT 'AI',
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    source_type TEXT, -- 'rss', 'topic', 'scheduled', 'manual'
    source_ref TEXT, -- Reference to original source (RSS URL, topic ID, etc.)
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster slug lookups
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_category ON articles(category);

-- ============================================
-- ARTICLE QUEUE TABLE (Pending approval)
-- ============================================
CREATE TABLE article_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    thumbnail TEXT,
    category TEXT NOT NULL DEFAULT 'AI',
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    source_type TEXT NOT NULL, -- 'rss', 'topic', 'scheduled', 'social'
    source_ref TEXT, -- Original source reference
    source_title TEXT, -- Original article title (for RSS)
    source_url TEXT, -- Original article URL (for RSS)
    rejection_note TEXT, -- Note when rejected
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queue management
CREATE INDEX idx_queue_status ON article_queue(status);
CREATE INDEX idx_queue_generated_at ON article_queue(generated_at DESC);

-- ============================================
-- SOURCES TABLE (RSS feeds, topics, themes)
-- ============================================
CREATE TABLE sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'rss', 'topic', 'scheduled'
    url TEXT, -- For RSS feeds
    topic_prompt TEXT, -- For topic-based generation
    schedule_day TEXT, -- For scheduled: 'monday', 'wednesday', 'friday', etc.
    schedule_theme TEXT, -- Theme description for scheduled content
    category TEXT DEFAULT 'AI', -- Default category for generated articles
    active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active sources
CREATE INDEX idx_sources_active ON sources(active) WHERE active = true;
CREATE INDEX idx_sources_type ON sources(type);

-- ============================================
-- GENERATION LOG TABLE (Track generations)
-- ============================================
CREATE TABLE generation_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL,
    source_ref TEXT,
    article_queue_id UUID REFERENCES article_queue(id) ON DELETE SET NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
    error_message TEXT,
    tokens_used INTEGER,
    cost_estimate DECIMAL(10, 4),
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX idx_generation_log_generated_at ON generation_log(generated_at DESC);
CREATE INDEX idx_generation_log_status ON generation_log(status);

-- ============================================
-- SETTINGS TABLE (System configuration)
-- ============================================
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('generation_frequency', '"daily"'),
    ('generation_time', '"08:00"'),
    ('max_articles_per_day', '3'),
    ('tone_of_voice', '"You are writing as NYTEMODE - a confident, tech-forward voice that uses short, punchy sentences. No fluff. Balances technical credibility with approachability. Speaks directly. Uses achievement-focused framing and concrete metrics. Respects reader intelligence. Occasionally edgy, never corporate. References emerging tech naturally (AI, Web3, creative tech)."'),
    ('default_thumbnail', '"/images/news/default-thumbnail.jpg"'),
    ('seo_site_name', '"NYTEMODE Academy"');

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ access for published articles
CREATE POLICY "Public can read published articles"
    ON articles FOR SELECT
    USING (true);

-- SERVICE ROLE can do everything (for Netlify functions)
CREATE POLICY "Service role full access to articles"
    ON articles FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to queue"
    ON article_queue FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to sources"
    ON sources FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to logs"
    ON generation_log FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access to settings"
    ON settings FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ANON/PUBLIC read access for queue (for admin preview)
CREATE POLICY "Anon can read queue"
    ON article_queue FOR SELECT
    USING (true);

CREATE POLICY "Anon can read sources"
    ON sources FOR SELECT
    USING (true);

CREATE POLICY "Anon can read settings"
    ON settings FOR SELECT
    USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sources_updated_at
    BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to approve article (moves from queue to articles)
CREATE OR REPLACE FUNCTION approve_article(queue_id UUID)
RETURNS UUID AS $$
DECLARE
    new_article_id UUID;
    queue_record article_queue%ROWTYPE;
BEGIN
    -- Get the queue record
    SELECT * INTO queue_record FROM article_queue WHERE id = queue_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Article not found in queue';
    END IF;

    IF queue_record.status != 'pending' THEN
        RAISE EXCEPTION 'Article is not pending approval';
    END IF;

    -- Insert into articles
    INSERT INTO articles (
        title, slug, excerpt, content, thumbnail, category,
        seo_title, seo_description, seo_keywords,
        source_type, source_ref, published_at
    ) VALUES (
        queue_record.title,
        queue_record.slug,
        queue_record.excerpt,
        queue_record.content,
        queue_record.thumbnail,
        queue_record.category,
        queue_record.seo_title,
        queue_record.seo_description,
        queue_record.seo_keywords,
        queue_record.source_type,
        queue_record.source_ref,
        NOW()
    ) RETURNING id INTO new_article_id;

    -- Update queue status
    UPDATE article_queue
    SET status = 'approved', reviewed_at = NOW()
    WHERE id = queue_id;

    RETURN new_article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject article
CREATE OR REPLACE FUNCTION reject_article(queue_id UUID, note TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE article_queue
    SET status = 'rejected',
        reviewed_at = NOW(),
        rejection_note = note
    WHERE id = queue_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Article not found or not pending';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA (Example RSS sources)
-- ============================================

INSERT INTO sources (name, type, url, category, active) VALUES
    ('TechCrunch AI', 'rss', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'AI', true),
    ('The Verge', 'rss', 'https://www.theverge.com/rss/index.xml', 'Tech', true),
    ('Wired', 'rss', 'https://www.wired.com/feed/rss', 'Tech', true),
    ('Ars Technica AI', 'rss', 'https://feeds.arstechnica.com/arstechnica/technology-lab', 'AI', true),
    ('Hacker News', 'rss', 'https://hnrss.org/frontpage', 'Tech', true);

-- Example scheduled themes
INSERT INTO sources (name, type, schedule_day, schedule_theme, category, active) VALUES
    ('AI Tools Monday', 'scheduled', 'monday', 'Review and analysis of new AI tools, products, and services launched recently', 'AI', true),
    ('Industry News Wednesday', 'scheduled', 'wednesday', 'Roundup of major tech industry news, funding announcements, and market trends', 'Industry', true),
    ('Tutorial Friday', 'scheduled', 'friday', 'Practical how-to guide or tutorial related to AI, Web3, or creative technology', 'Tutorial', true);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for pending articles
CREATE VIEW pending_articles AS
SELECT * FROM article_queue
WHERE status = 'pending'
ORDER BY generated_at DESC;

-- View for recent generations
CREATE VIEW recent_generations AS
SELECT
    gl.*,
    s.name as source_name,
    aq.title as article_title
FROM generation_log gl
LEFT JOIN sources s ON gl.source_id = s.id
LEFT JOIN article_queue aq ON gl.article_queue_id = aq.id
ORDER BY gl.generated_at DESC
LIMIT 100;

-- ============================================
-- GRANTS FOR FUNCTIONS
-- ============================================

GRANT EXECUTE ON FUNCTION approve_article(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reject_article(UUID, TEXT) TO service_role;
