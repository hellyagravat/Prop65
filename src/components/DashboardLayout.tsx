import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Code2, Settings, CreditCard, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { DisclaimerFooter } from './DisclaimerFooter';

const NAV = [
  { to: '/dashboard', label: 'Products', icon: LayoutDashboard, end: true },
  { to: '/dashboard/embed', label: 'Embed snippet', icon: Code2, end: false },
  { to: '/dashboard/billing', label: 'Billing', icon: CreditCard, end: false },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, end: false },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-ink/10 bg-stone-50 px-4 py-6 md:flex animate-fade-in">
          <div className="px-2">
            <Logo />
          </div>
          <nav className="mt-8 flex-1 space-y-1">
            {NAV.map((item, i) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 font-mono text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-ink/65 hover:bg-ink/[0.04] hover:text-ink hover:translate-x-0.5'
                  }`
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="space-y-3 border-t border-ink/10 pt-4">
            <a
              href="/test-store.html"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs text-ink/55 hover:text-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open test store
            </a>
            <div className="px-3">
              <div className="truncate font-mono text-xs text-ink/45">{user?.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-mono text-sm text-ink/65 hover:bg-rust/5 hover:text-rust"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Mobile top nav */}
        <div className="flex flex-1 flex-col">
          <div className="sticky top-0 z-40 border-b border-ink/10 bg-paper/30 backdrop-blur-xl px-4 py-3 md:hidden animate-fade-in">
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={handleSignOut} className="btn-ghost px-3 py-2 text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
            <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs transition-all duration-200 ${
                      isActive ? 'bg-ink/90 text-paper shadow-sm' : 'text-ink/60 hover:bg-ink/10'
                    }`
                  }
                >
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <main className="flex-1">
            <Outlet />
          </main>
          <DisclaimerFooter />
        </div>
      </div>
    </div>
  );
}
