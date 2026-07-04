import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Code2,
  ClipboardCheck,
  Eye,
  Check,
  ArrowRight,
  Zap,
  Lock,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { CATEGORIES, CATEGORY_KEYS } from '../lib/categories';

function useScrollAnimation(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

const PRICING = [
  {
    name: 'Starter',
    price: 'Free',
    cadence: '',
    desc: 'For small shops getting compliant.',
    features: ['Up to 25 flagged products', 'Product-page warning only', 'Universal JS embed', 'Manual warning edits'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$29',
    cadence: '/month',
    desc: 'For growing stores shipping into California.',
    features: ['Unlimited products', 'Product + cart placement', 'Auto-updates when rules change', 'Banner color customization', 'Activity log'],
    cta: 'Start Growth',
    highlight: true,
  },
  {
    name: 'Agency',
    price: '$79',
    cadence: '/month',
    desc: 'For agencies managing multiple stores.',
    features: ['Everything in Growth', 'Multiple stores / domains', 'Per-store embed keys', 'Priority support', 'Team seats'],
    cta: 'Start Agency',
    highlight: false,
  },
];

const STEPS = [
  {
    icon: ClipboardCheck,
    title: 'Add your products',
    body: 'Paste a URL, upload a CSV, or add products by hand. Pick a category and we suggest chemicals commonly associated with it — you confirm.',
  },
  {
    icon: Eye,
    title: 'Generate & preview',
    body: 'We format the legally-structured warning text (short and long form) using the chemicals and harm type you confirmed. Edit before it goes live.',
  },
  {
    icon: Code2,
    title: 'Paste once, done',
    body: 'Copy a single script tag into your site header. The widget matches each product page to your catalog and renders the warning automatically.',
  },
];

export function LandingPage() {
  const heroAnim = useScrollAnimation();
  const statsAnim = useScrollAnimation();
  const howAnim = useScrollAnimation();
  const coverageAnim = useScrollAnimation();
  const pricingAnim = useScrollAnimation();
  const featuresAnim = useScrollAnimation();
  const faqAnim = useScrollAnimation();
  const ctaAnim = useScrollAnimation();

  return (
    <div className="min-h-screen bg-paper">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 font-mono text-sm text-ink/70 md:flex">
            <a href="#how" className="relative transition-colors hover:text-ink group">
              How it works
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-amber transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#pricing" className="relative transition-colors hover:text-ink group">
              Pricing
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-amber transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#faq" className="relative transition-colors hover:text-ink group">
              FAQ
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-amber transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost transition-all duration-200 hover:scale-[1.02]">Sign in</Link>
            <Link to="/signup" className="btn-amber transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">Get started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroAnim.ref} className="relative overflow-hidden preserve-3d">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className={`transition-all duration-700 ${heroAnim.visible ? 'animate-slide-3d-left' : 'opacity-0 -translate-x-12'}`}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rust/30 bg-rust/5 px-3 py-1.5 transition-transform duration-300 hover:scale-105">
                <AlertTriangle className="h-4 w-4 text-rust animate-pulse" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-rust">
                  Up to $2,500 / day per violation
                </span>
              </div>
              <h1 className="font-headline text-5xl font-black leading-[1.02] tracking-tight text-ink md:text-6xl lg:text-7xl">
                Display Prop 65 warnings.
                <span className="block text-amber">Without writing code.</span>
              </h1>
              <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-ink/70">
                Prop65 Shield generates correctly formatted California Prop 65 warning labels for your product pages and renders them automatically with one embed snippet. You decide which products need a warning — we handle the formatting and display.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/signup" className="btn-amber">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#how" className="btn-outline">See how it works</a>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-ink/50">
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber" /> No code required</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber" /> Works on Shopify, WooCommerce, Wix</span>
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber" /> Free tier, no card</span>
              </div>
            </div>

            {/* Hero visual: a mock product card with a warning banner */}
            <div className={`relative transition-all duration-700 delay-100 ${heroAnim.visible ? 'animate-card-entrance' : 'opacity-0 translate-y-12'}`} style={{ animationDelay: '0.15s' }}>
              <div className="card overflow-hidden shadow-3d-lg animate-tilt-3d">
                <div className="flex items-center justify-between border-b border-ink/10 bg-stone-50 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-rust/40" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber/50" />
                    <div className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">yourstore.com / products / ceramic-mug</span>
                </div>
                <div className="p-6">
                  {/* The warning banner — what the embed renders */}
                  <div className="mb-5 rounded-md border-2 border-amber bg-amber/10 px-4 py-3 transition-all duration-300 hover:border-amber-dark hover:shadow-md animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rust animate-pulse" />
                      <p className="font-body text-sm leading-relaxed text-ink">
                        <span className="font-semibold">WARNING:</span> This product can expose you to chemicals including Lead, Cadmium, which are known to the State of California to cause cancer. For more information go to www.P65Warnings.ca.gov.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-square rounded-md bg-stone-100" />
                    <div className="space-y-3">
                      <div className="h-3 w-3/4 rounded bg-stone-200" />
                      <div className="h-3 w-1/2 rounded bg-stone-200" />
                      <div className="h-8 w-24 rounded bg-ink" />
                      <div className="h-3 w-full rounded bg-stone-100" />
                      <div className="h-3 w-5/6 rounded bg-stone-100" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-lg border-2 border-amber/30 shadow-3d-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Stat band */}
      <section ref={statsAnim.ref} className="border-y border-ink/10 bg-ink text-paper overflow-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-paper/10 md:grid-cols-4">
          {[
            { stat: '$2,500', label: 'Max fine per day, per violation' },
            { stat: '12', label: 'Product categories pre-mapped' },
            { stat: '1', label: 'Script tag to install' },
            { stat: '0', label: 'Lines of code you write' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-8 text-center transition-all duration-500 ${statsAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="font-mono text-3xl font-bold text-amber md:text-4xl transition-transform duration-300 hover:scale-110">{s.stat}</div>
              <div className="mt-1 font-body text-xs text-paper/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" ref={howAnim.ref} className="mx-auto max-w-6xl px-6 py-20 md:py-28 scroll-mt-20">
        <div className={`mx-auto max-w-2xl text-center transition-all duration-700 ${howAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber">How it works</div>
          <h2 className="mt-3 font-headline text-4xl font-black tracking-tight text-ink md:text-5xl">
            Three steps to compliant product pages.
          </h2>
          <p className="mt-4 font-body text-ink/65">
            You make the legal call on which products need a warning. We make sure the warning that shows up is formatted correctly and placed where it needs to be.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3 preserve-3d">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`card relative p-7 shadow-3d-md hover-lift-3d ${howAnim.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{
                animation: howAnim.visible ? `flip-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 150 + 200}ms both` : 'none'
              }}
            >
              <div className="absolute right-5 top-5 font-mono text-5xl font-bold text-ink/[0.06]">
                0{i + 1}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-amber/15 text-amber-dark transition-transform duration-300 group-hover:scale-110">
                <step.icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-5 font-headline text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink/65">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Category coverage */}
      <section ref={coverageAnim.ref} className="bg-stone-50 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] preserve-3d">
            <div className={`transition-all duration-700 ${coverageAnim.visible ? 'animate-slide-3d-left' : 'opacity-0 -translate-x-12'}`}>
              <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber">Coverage</div>
              <h2 className="mt-3 font-headline text-4xl font-black tracking-tight text-ink">
                Pre-mapped categories, sourced from public OEHHA data.
              </h2>
              <p className="mt-4 font-body text-ink/65">
                When you pick a category, we show the chemicals <span className="font-semibold">commonly associated</span> with that type of product as a starting suggestion — never a definitive claim that your specific product requires a warning. You confirm before anything goes live.
              </p>
              <div className="mt-6 flex items-start gap-3 rounded-md border border-ink/10 bg-white p-4 shadow-3d-sm transition-all duration-300 hover:shadow-3d-md hover:border-amber/30">
                <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rust" />
                <p className="font-body text-sm text-ink/70">
                  Prop65 Shield is a display tool, not legal advice. The suggestions below are based on public OEHHA information and do not determine whether your specific products require a warning.
                </p>
              </div>
            </div>
            <div className={`grid gap-2 sm:grid-cols-2 transition-all duration-700 delay-200 ${coverageAnim.visible ? 'animate-slide-3d-right' : 'opacity-0 translate-x-12'}`}>
              {CATEGORY_KEYS.map((key, i) => {
                const c = CATEGORIES[key];
                return (
                  <div
                    key={key}
                    className={`rounded-md border border-ink/10 bg-white p-4 shadow-3d-sm transition-all duration-300 hover:shadow-3d-lg hover:-translate-y-1 hover-lift-3d`}
                    style={{ transitionDelay: `${i * 50 + 300}ms` }}
                  >
                    <div className="font-headline text-sm font-bold text-ink">{c.label}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.chemicals.map((ch) => (
                        <span key={ch} className="chip bg-amber/15 text-ink transition-colors duration-200 hover:bg-amber/25">{ch}</span>
                      ))}
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-rust">
                      {c.harm === 'both' ? 'Cancer + Reproductive' : c.harm === 'cancer' ? 'Cancer' : 'Reproductive'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" ref={pricingAnim.ref} className="mx-auto max-w-6xl px-6 py-20 md:py-28 scroll-mt-20">
        <div className={`mx-auto max-w-2xl text-center transition-all duration-700 ${pricingAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber">Pricing</div>
          <h2 className="mt-3 font-headline text-4xl font-black tracking-tight text-ink md:text-5xl">
            Start free. Upgrade when you grow.
          </h2>
          <p className="mt-4 font-body text-ink/65">
            Every plan includes the universal JS embed and correctly formatted warning text. Paid tiers add cart placement, auto-updates, and multi-store support.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3 preserve-3d">
          {PRICING.map((tier, i) => (
            <div
              key={tier.name}
              className={`card relative flex flex-col p-7 shadow-3d-md ${tier.highlight ? 'ring-2 ring-amber shadow-3d-lg hover-lift-3d' : 'hover-3d'} ${pricingAnim.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{
                animation: pricingAnim.visible ? `zoom-3d 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${i * 150 + 200}ms both` : 'none'
              }}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-float">
                  <span className="chip bg-ink text-amber shadow-sm">Most popular</span>
                </div>
              )}
              <div className="font-headline text-xl font-bold text-ink">{tier.name}</div>
              <p className="mt-1 font-body text-sm text-ink/55">{tier.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-bold text-ink">{tier.price}</span>
                <span className="font-mono text-sm text-ink/50">{tier.cadence}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-body text-sm text-ink/75">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className={`mt-7 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${tier.highlight ? 'btn-amber' : 'btn-outline'}`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feature band */}
      <section ref={featuresAnim.ref} className="bg-ink py-20 text-paper md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Zap, title: 'Lightweight embed', body: 'A single script tag, no dependencies. Loads fast on your live storefront.' },
              { icon: Globe, title: 'Works anywhere', body: 'Shopify, WooCommerce, Wix, or any custom site — if it runs HTML, it runs the widget.' },
              { icon: RefreshCw, title: 'Auto-updates', body: 'When you change a warning in your dashboard, it updates on your store automatically.' },
              { icon: Lock, title: 'Multi-tenant', body: 'Each account only ever sees its own products. Your catalog stays private.' },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`transition-all duration-500 group ${featuresAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <f.icon className="h-7 w-7 text-amber transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" strokeWidth={1.75} />
                <h3 className="mt-4 font-headline text-lg font-bold">{f.title}</h3>
                <p className="mt-1.5 font-body text-sm leading-relaxed text-paper/60">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" ref={faqAnim.ref} className="mx-auto max-w-3xl px-6 py-20 md:py-24 scroll-mt-20">
        <div className={`text-center transition-all duration-700 ${faqAnim.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber">FAQ</div>
          <h2 className="mt-3 font-headline text-4xl font-black tracking-tight text-ink">Questions</h2>
        </div>
        <div className="mt-10 space-y-4 preserve-3d">
          {[
            {
              q: 'Does Prop65 Shield tell me whether my product needs a warning?',
              a: 'No. Prop65 Shield is a display and automation tool, not legal advice. We suggest chemicals commonly associated with a product category based on public OEHHA data, but the legal determination of whether your specific product requires a warning is yours to make — ideally with qualified counsel.',
            },
            {
              q: 'I\u2019m a solo seller with under 10 employees. Do I need this?',
              a: 'Businesses with fewer than 10 employees are generally exempt from Prop 65 warning requirements. Prop65 Shield is built for growing sellers (roughly 10+ employees) who ship into California and want a consistent way to display warnings across their catalog.',
            },
            {
              q: 'How does the embed work?',
              a: 'You copy a single script tag from your dashboard and paste it once into your site header or theme. The script checks each product page against your Prop65 Shield catalog and renders a warning banner where a match is found. No app store install, no per-platform plugin.',
            },
            {
              q: 'Can I edit the warning text?',
              a: 'Yes. We generate the default short and long form text from the chemicals and harm type you confirm, and you can edit either before it goes live.',
            },
          ].map((item, i) => (
            <div
              key={item.q}
              className={`card p-6 shadow-3d-sm hover-3d ${faqAnim.visible ? 'opacity-100' : 'opacity-0'}`}
              style={{
                animation: faqAnim.visible ? `rotate-3d-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${i * 100 + 150}ms both` : 'none'
              }}
            >
              <h3 className="font-headline text-base font-bold text-ink">{item.q}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink/65">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaAnim.ref} className="mx-auto max-w-6xl px-6 pb-20 preserve-3d">
        <div className={`relative overflow-hidden rounded-2xl bg-ink px-8 py-14 text-center shadow-3d-xl transition-all duration-700 md:px-16 md:py-20 ${ctaAnim.visible ? '' : 'opacity-0'}`}
          style={{
            animation: ctaAnim.visible ? 'flip-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) both' : 'none'
          }}
        >
          <div className="hazard-stripe absolute left-0 right-0 top-0 h-2 animate-shimmer" />
          <h2 className="font-headline text-4xl font-black tracking-tight text-paper md:text-5xl">
            Get warnings on your product pages today.
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-paper/65">
            Start free with 25 products. Upgrade when you need cart placement or multi-store support.
          </p>
          <Link to="/signup" className="btn-amber mt-8 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
            Create your free account <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <DisclaimerFooter />
    </div>
  );
}
