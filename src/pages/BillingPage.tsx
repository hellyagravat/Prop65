import { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const TIERS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 'Free',
    cadence: '',
    desc: 'For small shops getting compliant.',
    features: ['Up to 25 flagged products', 'Product-page warning only', 'Universal JS embed', 'Manual warning edits'],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '$29',
    cadence: '/month',
    desc: 'For growing stores shipping into California.',
    features: ['Unlimited products', 'Product + cart placement', 'Auto-updates when rules change', 'Banner color customization', 'Activity log'],
  },
  {
    key: 'agency',
    name: 'Agency',
    price: '$79',
    cadence: '/month',
    desc: 'For agencies managing multiple stores.',
    features: ['Everything in Growth', 'Multiple stores / domains', 'Per-store embed keys', 'Priority support', 'Team seats'],
  },
];

export function BillingPage() {
  const { user } = useAuth();
  const [tier, setTier] = useState('starter');
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subscriptions').select('tier, status').maybeSingle();
      setTier(data?.tier ?? 'starter');
      setLoading(false);
    })();
  }, []);

  async function upgrade(target: string) {
    if (target === 'starter') {
      await supabase.from('subscriptions').upsert({ user_id: user?.id, tier: 'starter', status: 'active' });
      setTier('starter');
      setNotice('Downgraded to Starter. Your embed will continue working within the free limits.');
      return;
    }
    setUpgrading(target);
    try {
      // Stripe checkout is not yet wired. Surface onboarding guidance.
      setNotice(
        'Paid checkout is coming soon. To enable Growth or Agency billing, Stripe needs to be connected to this project. Contact the team to finish setup — your free tier keeps working in the meantime.'
      );
    } finally {
      setUpgrading(null);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;

  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="font-headline text-3xl font-black tracking-tight text-ink">Billing</h1>
      <p className="mt-1 font-body text-sm text-ink/55">Manage your plan. Free tier works forever — upgrade for unlimited products and cart placement.</p>

      <div className="mt-5 inline-flex items-center gap-2 rounded-md border border-ink/15 bg-white px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-wider text-ink/50">Current plan</span>
        <span className="font-headline text-base font-bold capitalize text-ink">{tier}</span>
      </div>

      {notice && (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-amber/40 bg-amber/10 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-dark" />
          <p className="font-body text-sm text-ink/75">{notice}</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => {
          const isCurrent = t.key === tier;
          return (
            <div key={t.key} className={`card relative flex flex-col p-7 ${t.key === 'growth' ? 'ring-2 ring-amber' : ''}`}>
              {t.key === 'growth' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="chip bg-ink text-amber"><Sparkles className="h-3 w-3" /> Popular</span>
                </div>
              )}
              <div className="font-headline text-xl font-bold text-ink">{t.name}</div>
              <p className="mt-1 font-body text-sm text-ink/55">{t.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-ink">{t.price}</span>
                <span className="font-mono text-sm text-ink/50">{t.cadence}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-body text-sm text-ink/75">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => upgrade(t.key)}
                disabled={isCurrent || upgrading === t.key}
                className={`mt-7 ${isCurrent ? 'btn-outline cursor-default opacity-60' : t.key === 'growth' ? 'btn-amber' : 'btn-outline'}`}
              >
                {upgrading === t.key ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? 'Current plan' : t.key === 'starter' ? 'Downgrade' : `Upgrade to ${t.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
