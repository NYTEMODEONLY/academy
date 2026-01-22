/**
 * Supabase Configuration Data
 *
 * This file reads Supabase credentials from environment variables
 * and makes them available to 11ty templates.
 *
 * Set these environment variables in Netlify:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_ANON_KEY: Your Supabase anon/public key (safe to expose)
 *
 * The anon key is safe to expose to the client as it only allows
 * operations permitted by your Row Level Security policies.
 */

module.exports = function() {
    return {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || ''
    };
};
