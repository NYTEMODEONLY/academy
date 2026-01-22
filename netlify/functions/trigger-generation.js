/**
 * NYTEMODE Academy - Manual Article Generation Trigger
 * HTTP endpoint to manually trigger article generation
 *
 * POST /api/trigger-generation
 * Authorization: Bearer <service_key>
 */

// Import the main generation handler
const { handler: generateHandler } = require('./generate-articles');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Simple auth check using service key
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (token !== process.env.SUPABASE_SERVICE_KEY) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    // Trigger the generation
    console.log('Manual generation triggered');
    return await generateHandler(event, context);
};
