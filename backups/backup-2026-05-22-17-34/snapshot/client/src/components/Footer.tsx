import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="relative border-t border-slate-800/80 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <p className="font-display text-2xl text-slate-300 italic">TokenSync</p>
            <p className="text-sm text-slate-500 mt-2 max-w-md">
              Informationsplattform für Crypto-News und Marktstimmung. Keine Anlageberatung.
              Daten von Drittanbietern (RSS, Alternative.me, CoinGecko).
            </p>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-slate-400 font-medium">Navigation</p>
              <Link to="/" className="block text-slate-500 hover:text-cyan-400">Dashboard</Link>
              <Link to="/news" className="block text-slate-500 hover:text-cyan-400">News</Link>
              <Link to="/fear-greed" className="block text-slate-500 hover:text-cyan-400">Fear & Greed</Link>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-8">© {new Date().getFullYear()} TokenSync · Nur zu Informationszwecken</p>
      </div>
    </footer>
  );
}
