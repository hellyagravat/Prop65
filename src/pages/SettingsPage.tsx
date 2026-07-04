import { useEffect, useState } from 'react';
import { Check, Loader2, Palette, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const PRESETS = [
  { name: 'Caution', bg: '#F2A900', text: '#14171C', border: '#F2A900' },
  { name: 'Ink', bg: '#14171C', text: '#F5F1E8', border: '#14171C' },
  { name: 'Rust', bg: '#B23A2E', text: '#F5F1E8', border: '#B23A2E' },
  { name: 'Paper', bg: '#F5F1E8', text: '#14171C', border: '#14171C' },
];

export function SettingsPage() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [bg, setBg] = useState('#F2A900');
  const [text, setText] = useState('#14171C');
  const [border, setBorder] = useState('#F2A900');
  const [position, setPosition] = useState<'top' | 'cart'>('top');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_name').maybeSingle();
      setCompanyName(profile?.company_name ?? '');
      const meta = user.user_metadata ?? {};
      setBg(meta.banner_bg ?? '#F2A900');
      setText(meta.banner_text ?? '#14171C');
      setBorder(meta.banner_border ?? '#F2A900');
      setPosition(meta.banner_position ?? 'top');
      setLoading(false);
    })();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').upsert({ id: user.id, company_name: companyName || null });
      await supabase.auth.updateUser({
        data: { banner_bg: bg, banner_text: text, banner_border: border, banner_position: position },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="font-headline text-3xl font-black tracking-tight text-ink">Settings</h1>
      <p className="mt-1 font-body text-sm text-ink/55">Company info and banner appearance.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Company info */}
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-dark" />
            <h2 className="font-headline text-lg font-bold">Company</h2>
          </div>
          <div className="mt-4">
            <label className="label">Company name</label>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Goods Co." />
          </div>
          <div className="mt-4">
            <label className="label">Account email</label>
            <input className="input opacity-60" value={user?.email ?? ''} disabled />
          </div>
        </div>

        {/* Banner customization */}
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-amber-dark" />
            <h2 className="font-headline text-lg font-bold">Banner appearance</h2>
          </div>

          <div className="mt-4">
            <label className="label">Preset</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setBg(p.bg); setText(p.text); setBorder(p.border); }}
                  className="rounded-md border-2 border-ink/10 p-2 text-center transition hover:border-ink/30"
                  style={{ borderColor: bg === p.bg ? '#14171C' : undefined }}
                >
                  <div className="mx-auto h-8 w-full rounded" style={{ background: p.bg, border: `2px solid ${p.border}` }}>
                    <div className="flex h-full items-center justify-center font-mono text-[10px]" style={{ color: p.text }}>A</div>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-ink/55">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <label className="label">Background</label>
              <input type="color" className="h-10 w-full rounded-md border border-ink/15" value={bg} onChange={(e) => setBg(e.target.value)} />
            </div>
            <div>
              <label className="label">Text</label>
              <input type="color" className="h-10 w-full rounded-md border border-ink/15" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div>
              <label className="label">Border</label>
              <input type="color" className="h-10 w-full rounded-md border border-ink/15" value={border} onChange={(e) => setBorder(e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Position</label>
            <div className="grid grid-cols-2 gap-2">
              {(['top', 'cart'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPosition(pos)}
                  className={`rounded-md border-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wide transition ${
                    position === pos ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink/60 hover:border-ink/30'
                  }`}
                >
                  {pos === 'top' ? 'Top of product page' : 'Near add-to-cart'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-6 card p-6">
        <h2 className="font-headline text-lg font-bold">Live preview</h2>
        <p className="mt-1 font-body text-sm text-ink/55">This is how the warning banner will appear on your storefront.</p>
        <div className="mt-4 rounded-md border-2 p-4" style={{ background: bg, borderColor: border, color: text }}>
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none">&#9888;</span>
            <p className="font-body text-sm leading-relaxed">
              <span className="font-semibold">WARNING:</span> This product can expose you to chemicals including Lead, Cadmium, which are known to the State of California to cause cancer. For more information go to www.P65Warnings.ca.gov.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-amber">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save changes
        </button>
        {saved && <span className="font-mono text-sm text-amber-dark">Saved</span>}
      </div>
    </div>
  );
}
