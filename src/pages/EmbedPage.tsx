import { useEffect, useState } from 'react';
import { Copy, Check, Loader2, Code2, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function EmbedPage() {
  const { user } = useAuth();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from('embed_keys')
        .select('public_key')
        .maybeSingle();
      if (existing?.public_key) {
        setPublicKey(existing.public_key);
        setLoading(false);
        return;
      }
      const key = `pk_${crypto.randomUUID().replace(/-/g, '')}`;
      const { error } = await supabase.from('embed_keys').insert({ public_key: key });
      if (error) { alert(error.message); return; }
      setPublicKey(key);
      setLoading(false);
    })();
  }, [user]);

  const snippet = publicKey
    ? `<script src="${SUPABASE_URL}/functions/v1/prop65-widget" data-prop65-key="${publicKey}" async></script>`
    : '';

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="font-headline text-3xl font-black tracking-tight text-ink">Embed snippet</h1>
      <p className="mt-1 font-body text-sm text-ink/55">
        Paste this single script tag once into your site&rsquo;s <code className="rounded bg-stone-100 px-1 font-mono text-xs">&lt;head&gt;</code> or theme. It matches each product page to your Prop65 Shield catalog and renders a warning banner automatically.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Snippet */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 bg-stone-50 px-4 py-2.5">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-ink/50">
              <Code2 className="h-4 w-4" /> Your unique embed
            </div>
            <button onClick={copy} className="btn-ghost px-3 py-1.5 text-xs">
              {copied ? <><Check className="h-3.5 w-3.5 text-amber" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <pre className="overflow-x-auto bg-ink p-5 font-mono text-xs leading-relaxed text-paper">
            <code>{snippet}</code>
          </pre>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-headline text-base font-bold text-ink">Where to paste it</h3>
            <ol className="mt-3 space-y-2.5">
              {[
                ['Shopify', 'Online Store \u2192 Themes \u2192 Edit code \u2192 theme.liquid \u2192 paste before </head>'],
                ['WooCommerce', 'Appearance \u2192 Theme Editor \u2192 header.php \u2192 paste before </head>'],
                ['Wix', 'Settings \u2192 Custom code \u2192 Add new \u2192 paste in Head section'],
                ['Custom HTML', 'Paste before the closing </head> tag of your page template'],
              ].map(([p, d]) => (
                <li key={p} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber" />
                  <div>
                    <div className="font-mono text-xs font-semibold uppercase tracking-wide text-ink">{p}</div>
                    <div className="font-body text-sm text-ink/60">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-dark" />
              <div>
                <h3 className="font-headline text-base font-bold text-ink">Test it first</h3>
                <p className="mt-1 font-body text-sm text-ink/65">
                  We include a test store page with the embed already installed so you can see the widget render without touching your live site.
                </p>
                <a href="/test-store.html" target="_blank" rel="noreferrer" className="btn-outline mt-3 inline-flex text-xs">
                  <ExternalLink className="h-3.5 w-3.5" /> Open test store
                </a>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-headline text-base font-bold text-ink">How matching works</h3>
            <p className="mt-1 font-body text-sm text-ink/65">
              The widget reads the current page URL and looks for a product in your catalog whose <code className="rounded bg-stone-100 px-1 font-mono text-xs">source_url</code> matches. If a live warning exists, it renders the banner. No match, no banner.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-ink/10 bg-stone-50 p-4">
        <p className="font-body text-xs text-ink/55">
          Your public key is safe to expose in client-side HTML — it can only read live warnings for products in your catalog. It cannot write data or access your account.
        </p>
      </div>
    </div>
  );
}
