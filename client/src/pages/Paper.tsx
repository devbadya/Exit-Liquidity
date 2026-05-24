import { useEffect, useRef, useState } from 'react';
import { Card, Button, Chip } from '@heroui/react';
import { fetchBinancePrice, fetchCmcCoins } from '../lib/api';
import type { BinancePriceResponse, CmcCoin } from '../types';
import { formatUsd, formatPct } from '../lib/format';
import { SectionHeader } from '../components/SectionHeader';
import { TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'tokensync_paper_v3';
const START_BALANCE = 10000;
const FEE = 0.0005;

interface Position {
  id: string;
  slug: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  size: number;
  leverage: number;
  openedAt: string;
}

function loadState(): { balance: number; positions: Position[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as { balance: number; positions: Position[] };
  } catch { /* */ }
  return { balance: START_BALANCE, positions: [] };
}

function saveState(s: { balance: number; positions: Position[] }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function calcPnl(pos: Position, markPrice: number) {
  const diff = pos.side === 'long' ? markPrice - pos.entryPrice : pos.entryPrice - markPrice;
  return (diff / pos.entryPrice) * pos.size * pos.leverage;
}

export function Paper() {
  const [coins,   setCoins]   = useState<CmcCoin[]>([]);
  const [slug,    setSlug]    = useState('bitcoin');
  const [live,    setLive]    = useState<BinancePriceResponse | null>(null);
  const [state,   setState_]  = useState(loadState);
  const [side,    setSide]    = useState<'long' | 'short'>('long');
  const [lev,     setLev]     = useState(10);
  const [sizePct, setSizePct] = useState(10);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const setState = (s: { balance: number; positions: Position[] }) => {
    setState_(s);
    saveState(s);
  };

  useEffect(() => {
    void fetchCmcCoins({ page: 1, limit: 20 }).then((d) => setCoins(d.coins));
  }, []);

  useEffect(() => {
    void fetchBinancePrice(slug).then(setLive).catch(() => {});
    liveTimer.current = setInterval(() => {
      void fetchBinancePrice(slug).then(setLive).catch(() => {});
    }, 3000);
    return () => { if (liveTimer.current) clearInterval(liveTimer.current); };
  }, [slug]);

  const mark     = live?.price ?? 0;
  const totalPnl = state.positions.reduce((acc, p) => acc + calcPnl(p, mark), 0);
  const equity   = state.balance + totalPnl;

  function openPosition() {
    if (!mark || mark <= 0) return;
    const sizeUsd = (equity * sizePct) / 100;
    const fee = sizeUsd * FEE;
    if (sizeUsd < 10 || state.balance < sizeUsd + fee) return;
    const coin = coins.find((c) => c.slug === slug);
    const pos: Position = {
      id: Math.random().toString(36).slice(2),
      slug, symbol: coin?.symbol ?? slug.toUpperCase(),
      side, entryPrice: mark, size: sizeUsd, leverage: lev,
      openedAt: new Date().toISOString(),
    };
    setState({ balance: state.balance - fee, positions: [...state.positions, pos] });
  }

  function closePosition(id: string) {
    const pos = state.positions.find((p) => p.id === id);
    if (!pos || !mark) return;
    const pnl = calcPnl(pos, mark);
    const fee = pos.size * FEE;
    setState({
      balance: state.balance + pos.size + pnl - fee,
      positions: state.positions.filter((p) => p.id !== id),
    });
  }

  function reset() {
    if (!confirm('Portfolio zurücksetzen?')) return;
    setState({ balance: START_BALANCE, positions: [] });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Paper Trading"
        subtitle="Simulations-Portfolio · Kein echtes Geld · Binance Spot-Preise"
        action={
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#22d3ee] px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order panel */}
        <div className="space-y-4">
          {/* Portfolio */}
          <Card className="glass border-0 rounded-2xl p-5">
            {[
              { label: 'Kontostand',  value: formatUsd(state.balance), color: 'text-white'    },
              { label: 'Offene PnL',  value: formatUsd(totalPnl),      color: totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Eigenkapital',value: formatUsd(equity),        color: 'text-white font-bold text-lg' },
            ].map(({ label, value, color }, i, arr) => (
              <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? 'border-b border-slate-800' : 'border-t border-slate-800 mt-1 pt-3'}`}>
                <span className="text-slate-500 text-sm">{label}</span>
                <span className={`tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </Card>

          {/* Market selector */}
          <Card className="glass border-0 rounded-2xl p-5">
            <p className="text-sm text-slate-500 mb-2">Markt</p>
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#22d3ee]/50"
            >
              {coins.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.symbol})</option>)}
            </select>
            {live && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xl font-bold text-white tabular-nums">{formatUsd(live.price)}</span>
                {live.change24h != null && (
                  <Chip size="sm" variant="soft"
                    className={live.change24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
                    {formatPct(live.change24h)}
                  </Chip>
                )}
              </div>
            )}
          </Card>

          {/* Order form */}
          <Card className="glass border-0 rounded-2xl p-5 space-y-4">
            {/* Side buttons */}
            <div className="flex gap-2">
              {(['long', 'short'] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                    side === s
                      ? s === 'long'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}>
                  {s === 'long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {s === 'long' ? 'Long' : 'Short'}
                </button>
              ))}
            </div>

            {/* Leverage */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Hebel</span>
                <span className="text-white font-medium">{lev}×</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[1, 2, 5, 10, 20, 50].map((l) => (
                  <button key={l} onClick={() => setLev(l)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${
                      lev === l
                        ? 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30'
                        : 'border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}>
                    {l}×
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">Größe</span>
                <span className="text-white">{sizePct}% ≈ {formatUsd((equity * sizePct) / 100)}</span>
              </div>
              <input type="range" min={1} max={50} value={sizePct}
                onChange={(e) => setSizePct(Number(e.target.value))}
                className="w-full accent-[#22d3ee]" />
            </div>

            <button
              onClick={openPosition}
              disabled={!mark}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-40 ${
                side === 'long'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
              }`}
            >
              {side === 'long' ? 'Long eröffnen' : 'Short eröffnen'}
            </button>
          </Card>
        </div>

        {/* Positions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-white">Offene Positionen</h2>
          {state.positions.length === 0 ? (
            <Card className="glass border-0 rounded-2xl p-8 text-center">
              <p className="text-slate-500">Keine offenen Positionen.</p>
              <p className="text-slate-600 text-sm mt-1">Eröffne links eine Position.</p>
            </Card>
          ) : (
            state.positions.map((pos) => {
              const pnl    = mark > 0 ? calcPnl(pos, mark) : 0;
              const pnlPct = (pnl / pos.size) * 100;
              return (
                <Card key={pos.id} className="glass border-0 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip size="sm" variant="soft"
                        className={pos.side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}>
                        {pos.side === 'long' ? '↑ Long' : '↓ Short'}
                      </Chip>
                      <span className="font-semibold text-white">{pos.symbol}/USD</span>
                      <Chip size="sm" variant="soft" className="bg-slate-800 text-slate-400">{pos.leverage}×</Chip>
                    </div>
                    <Button size="sm" variant="ghost"
                      className="text-red-400 hover:bg-red-500/10"
                      onPress={() => closePosition(pos.id)}>
                      Schließen
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                    {[
                      { label: 'Einstieg', value: formatUsd(pos.entryPrice), color: 'text-white' },
                      { label: 'Mark',     value: mark ? formatUsd(mark) : '—', color: 'text-white' },
                      { label: 'Größe',    value: formatUsd(pos.size), color: 'text-white' },
                      { label: 'PnL',      value: `${formatUsd(pnl)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`,
                        color: pnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className="text-slate-500 text-xs mb-0.5">{label}</p>
                        <p className={`tabular-nums ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
