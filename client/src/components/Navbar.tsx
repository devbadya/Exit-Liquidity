import { NavLink } from 'react-router-dom';
import {
  Activity, BarChart3, Coins, LayoutDashboard,
  Newspaper, TrendingUp, Zap,
} from 'lucide-react';

const links = [
  { to: '/',           label: 'Dashboard', icon: LayoutDashboard, end: true  },
  { to: '/markets',    label: 'Markets',   icon: TrendingUp,      end: false },
  { to: '/coins',      label: 'Coins',     icon: Coins,           end: false },
  { to: '/news',       label: 'News',      icon: Newspaper,       end: false },
  { to: '/fear-greed', label: 'F&G',       icon: BarChart3,       end: false },
  { to: '/paper',      label: 'Trade',     icon: Zap,             end: false },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--b1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center gap-6">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--cyan)]/20 to-[var(--violet)]/20 group-hover:from-[var(--cyan)]/30 transition-all duration-300" />
            <div className="absolute inset-0 rounded-xl border border-[var(--cyan)]/25" />
            <div className="relative w-full h-full flex items-center justify-center">
              <Activity className="w-[18px] h-[18px] text-[var(--cyan)]" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[15px] font-semibold tracking-tight text-[var(--t0)] leading-none">
              TokenSync
            </div>
            <div className="t-label mt-[3px]">Intelligence</div>
          </div>
        </NavLink>

        {/* Divider */}
        <div className="hidden md:block h-4 w-px bg-[var(--b1)]" />

        {/* Nav */}
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--cyan)]/10 text-[var(--cyan)] border border-[var(--cyan)]/20'
                    : 'text-[var(--t1)] hover:text-[var(--t0)] hover:bg-[var(--bg-4)]'
                }`
              }
            >
              <Icon className="w-[14px] h-[14px] shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://github.com/devbadya/Exit-Liquidity"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-[7px] rounded-lg text-[13px] text-[var(--t2)] hover:text-[var(--t0)] hover:bg-[var(--bg-4)] transition-all border border-[var(--b1)]"
          >
            <svg className="w-[14px] h-[14px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
