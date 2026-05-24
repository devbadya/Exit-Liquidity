import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const LINKS = [
  { to: '/',           label: 'Dashboard'    },
  { to: '/markets',    label: 'Markets'      },
  { to: '/coins',      label: 'Alle Coins'   },
  { to: '/news',       label: 'News'         },
  { to: '/fear-greed', label: 'Fear & Greed' },
  { to: '/paper',      label: 'Paper Trade'  },
];

const SOURCES = [
  'Binance', 'CoinGecko', 'CoinMarketCap', 'Hyperliquid', 'Alternative.me',
];

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[var(--b1)] mt-20 bg-[var(--bg-1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--cyan)]/10 border border-[var(--cyan)]/25 flex items-center justify-center">
                <Activity className="w-4 h-4 text-[var(--cyan)]" />
              </div>
              <span className="font-semibold text-[var(--t0)]">TokenSync</span>
            </Link>
            <p className="text-sm text-[var(--t1)] leading-relaxed max-w-xs">
              Professionelle Crypto-Informationsplattform. Aggregierte News,
              Live-Kurse und Sentiment-Analyse in Echtzeit.
            </p>
            <p className="text-xs text-[var(--t2)] mt-4">
              Keine Anlageberatung. Kurse nur zu Informationszwecken.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="t-label mb-4">Navigation</p>
            <div className="grid grid-cols-2 gap-2">
              {LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm text-[var(--t1)] hover:text-[var(--cyan)] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div>
            <p className="t-label mb-4">Datenquellen</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-md text-xs text-[var(--t1)] bg-[var(--bg-3)] border border-[var(--b1)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--b0)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-[var(--t2)]">
            © {new Date().getFullYear()} TokenSync. Nur zu Informationszwecken.
          </p>
          <a
            href="https://github.com/devbadya/Exit-Liquidity"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--t2)] hover:text-[var(--t0)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>
            Open Source auf GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
