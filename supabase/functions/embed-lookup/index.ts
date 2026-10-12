// supabase/functions/embed-lookup/index.ts
//
// PUBLIC endpoint — no JWT required.
// Called from customer storefronts via embed.js.
//
// Returns the warning for a product identified by SKU or URL.
// Silent on all failure modes (returns 200 with empty payload).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================
// CORS — any origin, because customers embed this on their
// own domains. We can't whitelist in advance.
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// ============================================================
// Handler
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const url = new URL(req.url);
    const embedKey = url.searchParams.get('key');
    const sku = url.searchParams.get('sku');
    const pageUrl = url.searchParams.get('url');

    // Silently return empty if no key
    if (!embedKey) {
      return jsonResponse({ ok: false, reason: 'no_key' });
    }

    // Supabase admin client (bypasses RLS for the lookup)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // --------------------------------------------------
    // 1. Look up the embed key
    // --------------------------------------------------
    const { data: keyRow, error: keyErr } = await supabase
      .from('embed_keys')
      .select('id, user_id, is_active')
      .eq('key', embedKey)
      .maybeSingle();

    if (keyErr || !keyRow || !keyRow.is_active) {
      return jsonResponse({ ok: false, reason: 'invalid_key' });
    }

    // Fire-and-forget: update last_used_at
    supabase
      .from('embed_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id)
      .then(() => {})
      .catch(() => {});

    // --------------------------------------------------
    // 2. Find the user_product by SKU or URL
    // --------------------------------------------------
    let userProduct = null;

    if (sku) {
      const { data } = await supabase
        .from('user_products')
        .select('id')
        .eq('user_id', keyRow.user_id)
        .eq('product_sku', sku)
        .maybeSingle();
      userProduct = data;
    }

    if (!userProduct && pageUrl) {
      // Normalize the incoming URL — strip trailing slash, query, hash
      const normalized = normalizeUrl(pageUrl);

      const { data } = await supabase
        .from('user_products')
        .select('id, product_url')
        .eq('user_id', keyRow.user_id)
        .not('product_url', 'is', null);

      // Find a matching URL in the user's list
      if (data) {
        for (const row of data) {
          if (normalizeUrl(row.product_url) === normalized) {
            userProduct = row;
            break;
          }
        }
      }
    }

    if (!userProduct) {
      return jsonResponse({ ok: false, reason: 'no_product' });
    }

    // --------------------------------------------------
    // 3. Fetch the warning
    // --------------------------------------------------
    const { data: warning } = await supabase
      .from('warnings')
      .select('warning_text, warning_type, chemical_names')
      .eq('user_product_id', userProduct.id)
      .maybeSingle();

    if (!warning || !warning.warning_text) {
      return jsonResponse({ ok: false, reason: 'no_warning' });
    }

    return jsonResponse({
      ok: true,
      warning: {
        text: warning.warning_text,
        type: warning.warning_type,
        chemicals: warning.chemical_names || [],
      },
    });

  } catch (err) {
    // Never leak errors to the storefront
    console.error('[embed-lookup] error:', err.message);
    return jsonResponse({ ok: false, reason: 'server_error' });
  }
});

// ============================================================
// Helpers
// ============================================================

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function normalizeUrl(u: string): string {
  if (!u) return '';
  try {
    const parsed = new URL(u);
    // Lowercase host, strip trailing slash from pathname, drop query/hash
    let path = parsed.pathname.replace(/\/+$/, '');
    return (parsed.host + path).toLowerCase();
  } catch {
    return u.toLowerCase().replace(/\/+$/, '');
  }
}