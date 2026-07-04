import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { DISCLAIMER } from '../lib/disclaimer';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, company_name: companyName || null });
        }
        navigate('/dashboard');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate(from);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-6">
        {/* Left brand panel */}
        <div className="hidden flex-1 flex-col justify-between rounded-2xl bg-ink p-10 text-paper lg:flex">
          <Link to="/" className="flex items-center gap-2 text-paper/70 hover:text-paper">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div>
            <Logo className="[&_div]:text-paper [&_.text-amber]:text-amber" />
            <h1 className="mt-8 max-w-md font-headline text-4xl font-black leading-tight tracking-tight">
              {isSignup ? 'Display compliant Prop 65 warnings on every product page.' : 'Welcome back.'}
            </h1>
            <p className="mt-4 max-w-sm font-body text-paper/60">
              {isSignup
                ? 'Add your products, confirm which need a warning, and paste one embed snippet. We handle the formatting and display.'
                : 'Sign in to manage your products, warnings, and embed.'}
            </p>
            <div className="mt-8 space-y-3">
              {['No code required', 'Works on Shopify, WooCommerce, Wix', 'Free tier, no card needed'].map((f) => (
                <div key={f} className="flex items-center gap-2 font-mono text-sm text-paper/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" /> {f}
                </div>
              ))}
            </div>
          </div>
          <p className="max-w-md font-body text-xs leading-relaxed text-paper/40">{DISCLAIMER}</p>
        </div>

        {/* Right form panel */}
        <div className="flex flex-1 flex-col justify-center px-2 py-10 lg:pl-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 lg:hidden">
              <Link to="/"><Logo /></Link>
            </div>
            <h2 className="font-headline text-3xl font-black tracking-tight text-ink">
              {isSignup ? 'Create your account' : 'Sign in'}
            </h2>
            <p className="mt-2 font-body text-sm text-ink/55">
              {isSignup ? 'Free for up to 25 products.' : 'Welcome back to Prop65 Shield.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {isSignup && (
                <div>
                  <label className="label" htmlFor="company">Company name (optional)</label>
                  <input
                    id="company"
                    className="input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Goods Co."
                  />
                </div>
              )}
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-rust/30 bg-rust/5 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rust" />
                  <p className="font-body text-sm text-rust">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-amber w-full">
                {loading ? 'Please wait\u2026' : isSignup ? 'Create account' : 'Sign in'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-6 font-body text-sm text-ink/55">
              {isSignup ? (
                <>Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-ink underline underline-offset-2 hover:text-amber">Sign in</Link>
                </>
              ) : (
                <>Don&rsquo;t have an account?{' '}
                  <Link to="/signup" className="font-semibold text-ink underline underline-offset-2 hover:text-amber">Sign up free</Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
