import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const publicKey = url.searchParams.get('key') ?? req.headers.get('x-prop65-key');
    if (!publicKey) {
      return new Response('/* prop65: missing key */', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
      });
    }

    // Look up the embed key + owner
    const { data: embedKey, error: keyError } = await supabase
      .from('embed_keys')
      .select('id, user_id, domain_whitelist')
      .eq('public_key', publicKey)
      .maybeSingle();

    if (keyError || !embedKey) {
      return new Response('/* prop65: invalid key */', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
      });
    }

    // Fetch all live warnings for this user joined to products.
    // We return the catalog so the client can match by URL.
    const { data: rows, error: rowsError } = await supabase
      .from('warnings')
      .select(`
        id,
        short_text,
        long_text,
        product_id,
        products!inner ( id, title, source_url )
      `)
      .eq('is_live', true)
      .eq('products.user_id', embedKey.user_id);

    if (rowsError) {
      return new Response('/* prop65: query failed */', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
      });
    }

    // Fetch user banner preferences from auth user metadata via admin API is not
    // available without admin client; instead we read from profiles is not needed.
    // We default banner styling; the client can be themed via data attributes later.
    const catalog = (rows ?? []).map((r: any) => ({
      product_id: r.product_id,
      title: r.products?.title,
      source_url: r.products?.source_url,
      short_text: r.short_text,
      long_text: r.long_text,
    }));

    // Build a self-executing script that injects the banner on the host page.
    const catalogJson = JSON.stringify(catalog).replace(/</g, '\\u003c');
    const whitelistJson = JSON.stringify(embedKey.domain_whitelist ?? []);

    const js = `
(function() {
  var CATALOG = ${catalogJson};
  var WHITELIST = ${whitelistJson};
  var BANNER_BG = '#F2A900';
  var BANNER_TEXT = '#14171C';
  var BANNER_BORDER = '#F2A900';

  function currentPath() {
    try { return window.location.pathname + window.location.search; } catch(e) { return ''; }
  }
  function currentUrl() { try { return window.location.href; } catch(e) { return ''; } }

  function normalize(u) {
    if (!u) return '';
    try {
      var x = new URL(u, window.location.origin);
      return (x.pathname + x.search).replace(/\\/$/, '');
    } catch(e) { return u; }
  }

  function findMatch() {
    var here = normalize(currentUrl());
    var hereFull = currentUrl();
    for (var i = 0; i < CATALOG.length; i++) {
      var c = CATALOG[i];
      if (!c.source_url) continue;
      var cNorm = normalize(c.source_url);
      if (cNorm && (here.indexOf(cNorm) !== -1 || hereFull.indexOf(cNorm) !== -1 || cNorm.indexOf(here) !== -1)) {
        return c;
      }
    }
    return null;
  }

  function render(match) {
    if (document.getElementById('prop65-shield-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'prop65-shield-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
      'display:flex','align-items:flex-start','gap:12px',
      'padding:14px 18px','margin:0','width:100%',
      'background:' + BANNER_BG, 'color:' + BANNER_TEXT,
      'border:2px solid ' + BANNER_BORDER, 'border-radius:8px',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      'font-size:14px','line-height:1.5','box-sizing:border-box',
      'position:relative','z-index:2147483646'
    ].join(';');

    var icon = document.createElement('span');
    icon.textContent = '\\u26A0';
    icon.style.cssText = 'font-size:18px;line-height:1;flex-shrink:0;';

    var text = document.createElement('span');
    text.textContent = match.long_text || match.short_text;
    text.style.cssText = 'flex:1;';

    banner.appendChild(icon);
    banner.appendChild(text);

    // Insert near top of body, or before main content if possible.
    var target = document.querySelector('[data-prop65-position]') ||
                 document.querySelector('main') ||
                 document.querySelector('#main') ||
                 document.body;
    if (target === document.body) {
      target.insertBefore(banner, target.firstChild);
    } else {
      target.parentNode.insertBefore(banner, target);
    }
  }

  function init() {
    if (WHITELIST && WHITELIST.length > 0) {
      var host = window.location.hostname;
      var ok = false;
      for (var i = 0; i < WHITELIST.length; i++) {
        if (host === WHITELIST[i] || host.indexOf('.' + WHITELIST[i]) !== -1) { ok = true; break; }
      }
      if (!ok) return;
    }
    var match = findMatch();
    if (match) render(match);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`.trim();

    return new Response(js, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    return new Response('/* prop65: error */', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/javascript' },
    });
  }
});
