// // supabase/functions/_shared/cors.js
// // Shared CORS headers for all edge functions.
// // Change * to your domain before going live.

// export const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers':
//     'authorization, x-client-info, apikey, content-type',
//   'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
// };

// supabase/functions/_shared/cors.ts
//
// CORS headers used by all edge functions.
//
// In production we allow only known origins. Add new ones
// to the array if you deploy to additional domains.

const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:5500',
  'http://127.0.0.1:5500',

  // Production — Vercel
  'https://prop65-shield.vercel.app',

  // Vercel preview deployments (auto-generated URLs).
  // Vercel uses a regex pattern; we match it manually below.
  // e.g., https://prop65-shield-git-branch-username.vercel.app

  // Add your real domain here once you have one:
  // 'https://prop65shield.com',
  // 'https://www.prop65shield.com',
];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;

  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow any Vercel preview deployment of this project
  if (/^https:\/\/prop65-shield(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowed = isAllowedOrigin(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

// Backwards-compatible static export. Uses the production
// origin as default for cases where we can't read the request.
export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://prop65-shield.vercel.app',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};