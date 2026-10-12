
// ============================================
// PROP65 SHIELD - SUPABASE CONFIGURATION
// ============================================

// Supabase Project URL
const SUPABASE_URL =
    'https://wnlbddsnvkfjuzvjiwnm.supabase.co';

// Supabase ANON/PUBLISHABLE key
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubGJkZHNudmtmanV6dmppd25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODQ4MzUsImV4cCI6MjA5OTI2MDgzNX0.y4JpeGFvKZz05k_y9GUl1uHHdLetA2DkBuFc9cVwkDg';

// Create the Supabase client ONLY here.
// We deliberately attach it to window so that
// auth.js and dashboard.js don't create another
// global const with the same name.
window.supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );

console.log('Supabase client initialized successfully.');