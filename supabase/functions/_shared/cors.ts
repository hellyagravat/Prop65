// supabase/functions/_shared/cors.js
// Shared CORS headers for all edge functions.
// Change * to your domain before going live.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};