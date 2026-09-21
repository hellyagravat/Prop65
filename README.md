# Prop65 Shield — Static + Supabase Auth

This version keeps the existing landing-page and dashboard UI intact and adds Supabase authentication using plain HTML, CSS, and JavaScript.

## Files

- `indexlight.html` — existing landing page; only the Start Free links now point to `auth.html`.
- `auth.html` — login, signup, forgot-password, and password-reset page.
- `dashboard.html` — existing dashboard; Supabase session protection and real logout are added without redesigning the UI.
- `js/supabase-config.js` — Supabase project URL and publishable/anon key.
- `js/auth.js` — authentication logic.
- `js/dashboard.js` — dashboard authentication guard.
- `supabase/schema.sql` — optional profile table + RLS foundation for the next backend phase.

## Setup

1. Open `js/supabase-config.js`.
2. Replace `YOUR_SUPABASE_PROJECT_URL` with your Supabase Project URL.
3. Replace `YOUR_SUPABASE_PUBLISHABLE_KEY` with your Supabase Publishable key (or legacy anon key).
4. Do not use the `service_role` or secret key in browser code.
5. In Supabase Authentication settings, make sure the site's URL and redirect URL include your deployed `auth.html` URL.
6. If you want the profile foundation now, run `supabase/schema.sql` in Supabase SQL Editor.
7. Serve the folder through a web server. Do not rely on opening HTML files directly with `file://` for production auth flows.

## Local testing

For example, from the project directory:

```bash
python3 -m http.server 5500
```

Then open:

`http://localhost:5500/indexlight.html`

If you use a different local port, add that URL to Supabase's allowed redirect URLs while testing.

## Important

The database tables for products, warnings, embeds, etc. are intentionally not guessed yet. They should be designed from the actual dashboard operations before we build Phase 2.
