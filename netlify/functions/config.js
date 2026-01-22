/**
 * NYTEMODE Academy - Configuration Endpoint
 * Returns public configuration values for the frontend
 *
 * GET /api/config
 */

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Return public configuration
    // Only include values that are safe to expose to the client
    const config = {
        supabase: {
            url: process.env.SUPABASE_URL || '',
            anonKey: process.env.SUPABASE_ANON_KEY || ''
        },
        site: {
            name: 'NYTEMODE Academy',
            url: process.env.URL || 'https://academy.nytemode.com'
        }
    };

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(config)
    };
};
