import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Trash2,
  Pencil,
  Upload,
  Link as LinkIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, CATEGORY_KEYS, categoryLabel, categoryInfo } from '../lib/categories';
import { generateWarning } from '../lib/warnings';
import type { HarmType } from '../lib/categories';

interface Product {
  id: string;
  title: string;
  source_url: string | null;
  category: string | null;
  status: string;
  created_at: string;
}

interface Warning {
  id: string;
  product_id: string;
  chemicals: string[];
  harm_type: HarmType;
  short_text: string;
  long_text: string;
  is_live: boolean;
}

interface Activity {
  id: string;
  action: string;
  detail: string | null;
  created_at: string;
}

type Tab = 'list' | 'add' | 'csv';

export function DashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [warnings, setWarnings] = useState<Record<string, Warning>>({});
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('list');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'none'>('all');
  const [tier, setTier] = useState<string>('starter');

  // Add product form
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');

  // CSV form
  const [csvText, setCsvText] = useState('');

  // Flagging modal
  const [flagging, setFlagging] = useState<Product | null>(null);
  const [confirmChemicals, setConfirmChemicals] = useState<string[]>([]);
  const [confirmHarm, setConfirmHarm] = useState<HarmType>('both');
  const [editingLong, setEditingLong] = useState('');
  const [flagLoading, setFlagLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prods }, { data: warns }, { data: subs }] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('warnings').select('*'),
      supabase.from('subscriptions').select('tier').maybeSingle(),
    ]);
    setProducts(prods ?? []);
    const wmap: Record<string, Warning> = {};
    (warns ?? []).forEach((w: Warning) => { wmap[w.product_id] = w; });
    setWarnings(wmap);
    setTier(subs?.tier ?? 'starter');

    const { data: acts } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setActivity(acts ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const flaggedCount = products.filter((p) => p.status === 'flagged').length;
  const productLimit = tier === 'starter' ? 25 : Infinity;
  const atLimit = flaggedCount >= productLimit;

  async function addProduct() {
    if (!newTitle.trim()) return;
    const { error } = await supabase.from('products').insert({
      title: newTitle.trim(),
      source_url: newUrl.trim() || null,
      category: newCategory || null,
    });
    if (error) { alert(error.message); return; }
    setNewTitle(''); setNewUrl(''); setNewCategory('');
    setTab('list');
    await load();
  }

  async function addCsv() {
    const lines = csvText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return;
    // Skip header if it looks like one
    const start = /title|url|category/i.test(lines[0]) ? 1 : 0;
    const rows = lines.slice(start).map((line) => {
      const parts = line.split(',').map((s) => s.trim());
      return { title: parts[0], source_url: parts[1] || null, category: parts[2] || null };
    }).filter((r) => r.title);
    if (rows.length === 0) return;
    const { error } = await supabase.from('products').insert(rows);
    if (error) { alert(error.message); return; }
    setCsvText('');
    setTab('list');
    await load();
  }

  async function deleteProduct(p: Product) {
    if (!confirm(`Delete "${p.title}"? This also removes its warning.`)) return;
    await supabase.from('products').delete().eq('id', p.id);
    await load();
  }

  function openFlagModal(p: Product) {
    setFlagging(p);
    const info = categoryInfo(p.category);
    const chems = info?.chemicals ?? [];
    const harm = info?.harm ?? 'both';
    setConfirmChemicals(chems);
    setConfirmHarm(harm);
    setEditingLong(generateWarning(chems, harm).long_text);
  }

  async function saveFlag(live: boolean) {
    if (!flagging) return;
    setFlagLoading(true);
    const short = generateWarning(confirmChemicals, confirmHarm).short_text;
    const existing = warnings[flagging.id];
    try {
      if (existing) {
        await supabase.from('warnings').update({
          chemicals: confirmChemicals,
          harm_type: confirmHarm,
          short_text: short,
          long_text: editingLong,
          is_live: live,
        }).eq('id', existing.id);
      } else {
        await supabase.from('warnings').insert({
          product_id: flagging.id,
          chemicals: confirmChemicals,
          harm_type: confirmHarm,
          short_text: short,
          long_text: editingLong,
          is_live: live,
        });
      }
      await supabase.from('products').update({ status: 'flagged' }).eq('id', flagging.id);
      await supabase.from('activity_log').insert({
        product_id: flagging.id,
        action: live ? 'warning_published' : 'warning_generated',
        detail: `${flagging.title} — ${confirmChemicals.join(', ')}`,
      });
      setFlagging(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save warning');
    } finally {
      setFlagLoading(false);
    }
  }

  async function unflag(p: Product) {
    if (!confirm(`Remove the warning from "${p.title}"?`)) return;
    await supabase.from('warnings').delete().eq('product_id', p.id);
    await supabase.from('products').update({ status: 'none' }).eq('id', p.id);
    await supabase.from('activity_log').insert({
      product_id: p.id,
      action: 'warning_removed',
      detail: p.title,
    });
    await load();
  }

  async function toggleLive(p: Product) {
    const w = warnings[p.id];
    if (!w) return;
    await supabase.from('warnings').update({ is_live: !w.is_live }).eq('id', w.id);
    await supabase.from('activity_log').insert({
      product_id: p.id,
      action: !w.is_live ? 'warning_published' : 'warning_unpublished',
      detail: p.title,
    });
    await load();
  }

  const filtered = products.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="px-6 py-8 md:px-10 animate-zoom-3d">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-black tracking-tight text-ink">Products</h1>
          <p className="mt-1 font-body text-sm text-ink/55">
            {flaggedCount} flagged {tier === 'starter' && `of ${productLimit} free-tier limit`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('add')} className="btn-amber transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Add product
          </button>
          <button onClick={() => setTab('csv')} className="btn-outline transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            <Upload className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {tier === 'starter' && atLimit && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-4 py-3 shadow-3d-sm animate-fade-in">
          <AlertTriangle className="h-4 w-4 text-amber-dark" />
          <p className="font-body text-sm text-ink/75">
            You&rsquo;ve reached the 25-product free limit.{' '}
            <a href="/dashboard/billing" className="font-semibold underline underline-offset-2">Upgrade to Growth</a> for unlimited products.
          </p>
        </div>
      )}

      {/* Add / CSV panels */}
      {tab === 'add' && (
        <div className="mt-6 card p-6 shadow-3d-lg animate-card-entrance hover-3d">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold">Add a product</h2>
            <button onClick={() => setTab('list')} className="btn-ghost px-3 py-1.5 text-xs transition-transform duration-200 hover:scale-105"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Product title</label>
              <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Hand-painted ceramic mug" />
            </div>
            <div>
              <label className="label">Product URL (optional)</label>
              <input className="input" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://store.com/products/mug" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Category</label>
              <select className="input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                <option value="">Pick a category&hellip;</option>
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>{CATEGORIES[k].label}</option>
                ))}
              </select>
              {newCategory && (
                <div className="mt-3 rounded-md border border-amber/30 bg-amber/5 p-3 shadow-3d-sm">
                  <p className="font-body text-sm text-ink/75">
                    <span className="font-semibold">Products like this commonly require warnings for:</span>{' '}
                    {CATEGORIES[newCategory].chemicals.join(', ')}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-ink/45">
                    Suggestion only — not a determination that your product needs a warning.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={addProduct} disabled={!newTitle.trim()} className="btn-amber">Add product</button>
            <button onClick={() => setTab('list')} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {tab === 'csv' && (
        <div className="mt-6 card p-6 shadow-3d-lg animate-card-entrance hover-3d">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold">Bulk add via CSV</h2>
            <button onClick={() => setTab('list')} className="btn-ghost px-3 py-1.5 text-xs transition-transform duration-200 hover:scale-105"><X className="h-4 w-4" /></button>
          </div>
          <p className="mb-3 font-body text-sm text-ink/60">
            Paste rows as <code className="rounded bg-stone-100 px-1 font-mono text-xs">title, url, category</code>. Category must match one of the dropdown keys (e.g. <code className="rounded bg-stone-100 px-1 font-mono text-xs">ceramics</code>). A header row is optional.
          </p>
          <textarea
            className="input min-h-[160px] font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'title,url,category\nCeramic Mug,https://store.com/mug,ceramics\nPVC Raincoat,https://store.com/raincoat,vinyl_pvc'}
          />
          <div className="mt-4 flex gap-2">
            <button onClick={addCsv} disabled={!csvText.trim()} className="btn-amber">Import rows</button>
            <button onClick={() => setTab('list')} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
          <input
            className="input pl-10"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex rounded-md border border-ink/15 bg-white p-0.5">
          {(['all', 'flagged', 'none'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-2 font-mono text-xs uppercase tracking-wide transition ${
                statusFilter === s ? 'bg-ink text-paper' : 'text-ink/55 hover:text-ink'
              }`}
            >
              {s === 'all' ? 'All' : s === 'flagged' ? 'Flagged' : 'Unflagged'}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ink/40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <AlertTriangle className="h-6 w-6 text-ink/30" />
            </div>
            <h3 className="mt-4 font-headline text-lg font-bold text-ink">
              {products.length === 0 ? 'No products yet' : 'No matches'}
            </h3>
            <p className="mt-1 font-body text-sm text-ink/55">
              {products.length === 0 ? 'Add your first product to start generating warnings.' : 'Try a different search or filter.'}
            </p>
            {products.length === 0 && (
              <button onClick={() => setTab('add')} className="btn-amber mt-5">
                <Plus className="h-4 w-4" /> Add a product
              </button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden shadow-3d-md">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/10 bg-stone-50 text-left">
                  <th className="px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/50">Product</th>
                  <th className="hidden px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/50 md:table-cell">Category</th>
                  <th className="px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/50">Status</th>
                  <th className="px-5 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {filtered.map((p) => {
                  const w = warnings[p.id];
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition-colors duration-200">
                      <td className="px-5 py-4">
                        <div className="font-body font-medium text-ink">{p.title}</div>
                        {p.source_url && (
                          <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs text-ink/45 hover:text-amber transition-colors duration-200">
                            <LinkIcon className="h-3 w-3" /> {new URL(p.source_url).pathname}
                          </a>
                        )}
                      </td>
                      <td className="hidden px-5 py-4 md:table-cell">
                        <span className="font-body text-sm text-ink/65">{categoryLabel(p.category)}</span>
                      </td>
                      <td className="px-5 py-4">
                        {p.status === 'flagged' && w ? (
                          <button
                            onClick={() => toggleLive(p)}
                            className={`chip transition-all duration-200 ${w.is_live ? 'bg-amber/20 text-amber-dark hover:bg-amber/30' : 'bg-stone-100 text-ink/50 hover:bg-stone-200'}`}
                            title={w.is_live ? 'Live on storefront — click to unpublish' : 'Not live — click to publish'}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${w.is_live ? 'bg-amber animate-pulse-amber' : 'bg-ink/30'}`} />
                            {w.is_live ? 'Live' : 'Draft'}
                          </button>
                        ) : (
                          <span className="chip bg-stone-100 text-ink/40">No warning</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === 'flagged' && w ? (
                            <>
                              <button onClick={() => openFlagModal(p)} className="rounded p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink transition-colors duration-200" title="Edit warning">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => unflag(p)} className="rounded p-1.5 text-ink/50 hover:bg-rust/5 hover:text-rust transition-colors duration-200" title="Remove warning">
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openFlagModal(p)}
                              disabled={tier === 'starter' && atLimit}
                              className="btn-amber px-3 py-1.5 text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                              title={tier === 'starter' && atLimit ? 'Free tier limit reached' : 'Generate warning'}
                            >
                              <AlertTriangle className="h-3.5 w-3.5" /> Flag
                            </button>
                          )}
                          <button onClick={() => deleteProduct(p)} className="rounded p-1.5 text-ink/40 hover:bg-rust/5 hover:text-rust transition-colors duration-200" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="mt-10">
        <h2 className="font-headline text-lg font-bold text-ink">Activity log</h2>
        <div className="mt-3 card divide-y divide-ink/[0.06] shadow-3d-sm">
          {activity.length === 0 ? (
            <div className="px-5 py-8 text-center font-body text-sm text-ink/40">No activity yet.</div>
          ) : (
            activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${a.action.includes('publish') ? 'bg-amber' : a.action.includes('remov') ? 'bg-rust' : 'bg-stone-400'}`} />
                  <div>
                    <div className="font-body text-sm text-ink">{actionLabel(a.action)}</div>
                    {a.detail && <div className="font-mono text-xs text-ink/45">{a.detail}</div>}
                  </div>
                </div>
                <div className="font-mono text-xs text-ink/40">{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Flag modal */}
      {flagging && (
        <FlagModal
          product={flagging}
          chemicals={confirmChemicals}
          setChemicals={setConfirmChemicals}
          harm={confirmHarm}
          setHarm={setConfirmHarm}
          longText={editingLong}
          setLongText={setEditingLong}
          existing={warnings[flagging.id]}
          loading={flagLoading}
          onCancel={() => setFlagging(null)}
          onSave={saveFlag}
        />
      )}
    </div>
  );
}

function actionLabel(a: string) {
  switch (a) {
    case 'warning_generated': return 'Warning generated';
    case 'warning_published': return 'Warning published';
    case 'warning_unpublished': return 'Warning unpublished';
    case 'warning_removed': return 'Warning removed';
    default: return a;
  }
}

interface FlagModalProps {
  product: Product;
  chemicals: string[];
  setChemicals: (c: string[]) => void;
  harm: HarmType;
  setHarm: (h: HarmType) => void;
  longText: string;
  setLongText: (s: string) => void;
  existing?: Warning;
  loading: boolean;
  onCancel: () => void;
  onSave: (live: boolean) => void;
}

function FlagModal({ product, chemicals, setChemicals, harm, setHarm, longText, setLongText, existing, loading, onCancel, onSave }: FlagModalProps) {
  const info = categoryInfo(product.category);
  const suggested = info?.chemicals ?? [];

  function toggleChem(c: string) {
    setChemicals(chemicals.includes(c) ? chemicals.filter((x) => x !== c) : [...chemicals, c]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-paper shadow-3d-xl animate-flip-in">
        <div className="sticky top-0 flex items-center justify-between border-b border-ink/10 bg-paper px-6 py-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-ink/45">Generate warning</div>
            <h3 className="font-headline text-lg font-bold text-ink">{product.title}</h3>
          </div>
          <button onClick={onCancel} className="rounded p-1.5 text-ink/50 hover:bg-ink/5 transition-colors duration-200"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Suggestion */}
          <div className="rounded-md border border-amber/30 bg-amber/5 p-4 shadow-3d-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-dark" />
              <div>
                <p className="font-body text-sm text-ink/80">
                  Products in the <span className="font-semibold">{categoryLabel(product.category)}</span> category commonly require warnings for:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {suggested.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleChem(c)}
                      className={`chip border transition-all duration-200 ${chemicals.includes(c) ? 'border-amber bg-amber text-ink scale-105' : 'border-ink/15 bg-white text-ink/60 hover:border-amber/50 hover:scale-105'}`}
                    >
                      {chemicals.includes(c) && <Check className="h-3 w-3 animate-scale-in" />} {c}
                    </button>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[11px] text-ink/45">
                  Suggestion only. Confirm the chemicals that apply to your specific product.
                </p>
              </div>
            </div>
          </div>

          {/* Harm type */}
          <div>
            <label className="label">Harm type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['cancer', 'reproductive', 'both'] as HarmType[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHarm(h)}
                  className={`rounded-md border-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition ${
                    harm === h ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink/60 hover:border-ink/30'
                  }`}
                >
                  {h === 'both' ? 'Cancer + Reproductive' : h === 'cancer' ? 'Cancer' : 'Reproductive'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom chemical input */}
          <div>
            <label className="label">Chemicals (edit list)</label>
            <input
              className="input font-mono text-sm"
              value={chemicals.join(', ')}
              onChange={(e) => setChemicals(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="Lead, Cadmium"
            />
            <p className="mt-1 font-mono text-[11px] text-ink/45">Comma-separated. These appear in the generated warning text.</p>
          </div>

          {/* Preview */}
          <div>
            <label className="label">Warning text (editable)</label>
            <div className="mb-2 rounded-md border-2 border-amber bg-amber/10 p-3">
              <p className="font-body text-sm leading-relaxed text-ink">{longText}</p>
            </div>
            <textarea
              className="input min-h-[100px] font-body text-sm"
              value={longText}
              onChange={(e) => setLongText(e.target.value)}
            />
          </div>

          {/* Short form preview */}
          <div>
            <label className="label">Short form (compact spaces)</label>
            <div className="rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-sm text-ink">
              {generateWarning(chemicals, harm).short_text}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-ink/10 bg-stone-50 px-6 py-4">
          <button onClick={onCancel} className="btn-ghost transition-all duration-200 hover:scale-[1.02]">Cancel</button>
          <button onClick={() => onSave(false)} disabled={loading} className="btn-outline transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            {existing ? 'Save as draft' : 'Save draft'}
          </button>
          <button onClick={() => onSave(true)} disabled={loading} className="btn-amber transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {existing?.is_live ? 'Update & keep live' : 'Save & publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
