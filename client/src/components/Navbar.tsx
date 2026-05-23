import { NavLink } from 'react-router-dom';
import { Activity, BarChart3, Newspaper, Zap } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: Zap },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/fear-greed', label: 'Fear & Greed', icon: BarChart3 },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:glow-cyan transition-shadow">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white">TokenSync</span>
            <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-500">Crypto Intelligence</span>
          </div>
        </NavLink>

        <nav className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
          Live
        </div>
      </div>
    </header>
  );
}
