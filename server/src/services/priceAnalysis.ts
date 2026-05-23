import type { LivePriceQuote, LivePriceSource, SourceComparison } from '../types/livePrice.js';

const SOURCE_LABELS: Record<LivePriceSource, string> = {
  coingecko: 'CoinGecko',
  coinmarketcap: 'CoinMarketCap',
  binance: 'Binance',
  hyperliquid: 'Hyperliquid',
  uniswap: 'Uniswap',
};

/** Median */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[m]! : (sorted[m - 1]! + sorted[m]!) / 2;
}

/** Median Absolute Deviation */
function mad(values: number[], med: number): number {
  const devs = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  return median(devs) || 0;
}

export interface RobustReferenceResult {
  referencePrice: number;
  spreadPercent: number;
  spreadUsd: number;
  syncStatus: 'excellent' | 'good' | 'divergence' | 'partial';
  syncLabel: string;
  comparison: SourceComparison[];
  outliersExcluded: string[];
  accuracyScore: number;
  usedQuotes: LivePriceQuote[];
}

/**
 * Robuster Mark-Preis: Median nach Entfernen statistischer Ausreißer (MAD).
 * Genauer als einfacher Median bei einzelnen fehlerhaften Feeds.
 */
export function buildRobustReference(allQuotes: LivePriceQuote[]): RobustReferenceResult {
  if (!allQuotes.length) {
    return {
      referencePrice: 0,
      spreadPercent: 0,
      spreadUsd: 0,
      syncStatus: 'partial',
      syncLabel: 'Keine Live-Daten',
      comparison: [],
      outliersExcluded: [],
      accuracyScore: 0,
      usedQuotes: [],
    };
  }

  const prices = allQuotes.map((q) => q.price);
  let med = median(prices);
  let used = [...allQuotes];
  const outliersExcluded: string[] = [];

  if (allQuotes.length >= 3) {
    const m = mad(prices, med);
    const threshold = Math.max(m * 3.5, med * 0.025);
    const filtered = allQuotes.filter((q) => {
      const dev = Math.abs(q.price - med);
      if (dev > threshold) {
        outliersExcluded.push(SOURCE_LABELS[q.source]);
        return false;
      }
      return true;
    });
    if (filtered.length >= 2) {
      used = filtered;
      med = median(used.map((q) => q.price));
    }
  }

  const usedPrices = used.map((q) => q.price);
  const ref = median(usedPrices);
  const min = Math.min(...usedPrices);
  const max = Math.max(...usedPrices);
  const spreadUsd = max - min;
  const spreadPercent = ref > 0 ? (spreadUsd / ref) * 100 : 0;

  const comparison: SourceComparison[] = allQuotes.map((q) => {
    const deviationPercent = ref > 0 ? ((q.price - ref) / ref) * 100 : 0;
    const isOutlier = outliersExcluded.includes(SOURCE_LABELS[q.source]);
    let status: SourceComparison['status'] = 'aligned';
    if (isOutlier) status = 'outlier';
    else if (Math.abs(deviationPercent) > 0.35) status = 'divergence';
    else if (Math.abs(deviationPercent) <= 0.08) status = 'aligned';
    else status = 'minor';

    return {
      source: q.source,
      label: SOURCE_LABELS[q.source],
      price: q.price,
      deviationPercent,
      deviationUsd: q.price - ref,
      status,
    };
  });

  let syncStatus: RobustReferenceResult['syncStatus'] = 'divergence';
  let syncLabel = `Spread ${spreadPercent.toFixed(3)}%`;

  if (used.length === 1) {
    syncStatus = 'partial';
    syncLabel = `Nur ${SOURCE_LABELS[used[0]!.source]}`;
  } else if (spreadPercent < 0.06 && outliersExcluded.length === 0) {
    syncStatus = 'excellent';
    syncLabel = `${used.length} Quellen · ±0.06%`;
  } else if (spreadPercent < 0.25) {
    syncStatus = 'good';
    syncLabel =
      outliersExcluded.length > 0
        ? `${used.length} Quellen · ${outliersExcluded.length} Ausreißer entfernt`
        : `${used.length} Quellen · ${spreadPercent.toFixed(3)}%`;
  } else if (outliersExcluded.length > 0) {
    syncLabel = `${used.length} Quellen · Ausreißer: ${outliersExcluded.join(', ')}`;
  }

  const sourceFactor = Math.min(used.length / 5, 1) * 40;
  const spreadFactor = Math.max(0, 40 - spreadPercent * 80);
  const outlierPenalty = outliersExcluded.length * 8;
  const accuracyScore = Math.round(
    Math.min(100, Math.max(0, sourceFactor + spreadFactor + 20 - outlierPenalty)),
  );

  return {
    referencePrice: ref,
    spreadPercent,
    spreadUsd,
    syncStatus,
    syncLabel,
    comparison,
    outliersExcluded,
    accuracyScore,
    usedQuotes: used,
  };
}
