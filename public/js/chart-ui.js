/** TokenSync — Professioneller Trading-Chart & Live-Kurs (Hyperliquid-Style) */

/** CoinGecko-Style Zeiträume */
const CHART_RANGE_OPTIONS = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '7d', label: '7D' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: 'max', label: 'MAX' },
];

function renderCgChartRangeTabs(activeId, dataAttr = 'data-range') {
  return `
    <div class="cg-range-tabs" role="tablist" aria-label="Chart-Zeitraum">
      ${CHART_RANGE_OPTIONS.map(
        (r) =>
          `<button type="button" role="tab" class="cg-range-tab ${activeId === r.id ? 'active' : ''}" ${dataAttr}="${r.id}" aria-selected="${activeId === r.id}">${r.label}</button>`,
      ).join('')}
    </div>`;
}

const TV_BULL = '#26a69a';
const TV_BEAR = '#ef5350';
const TV_BG = '#131722';
const TV_GRID = '#2a2e39';

const LIVE_SOURCES = [
  { key: 'binance', label: 'Binance', badge: 'BN', badgeClass: 'tv-bn', sub: 'Spot Mid/Last' },
  { key: 'uniswap', label: 'Uniswap', badge: 'UNI', badgeClass: 'tv-uni', sub: 'ETH Mainnet Pool' },
  { key: 'hyperliquid', label: 'Hyperliquid', badge: 'HL', badgeClass: 'tv-hl', sub: 'Perp Mid' },
  { key: 'coingecko', label: 'CoinGecko', badge: 'CG', badgeClass: 'tv-gecko', sub: 'Aggregiert' },
  { key: 'coinmarketcap', label: 'CoinMarketCap', badge: 'CMC', badgeClass: '', sub: 'Aggregiert' },
];

function quoteMeta(q, src) {
  if (!q) return escapeHtml(src.sub) + ' — nicht verfügbar';
  const ch = q.change24h != null ? formatPctOrDash(q.change24h) : '—';
  const detail = q.detail ? ' · ' + escapeHtml(q.detail) : '';
  return ch + ' · ' + timeAgo(q.updatedAt) + detail;
}

function comparisonStatusClass(status) {
  if (status === 'aligned') return 'cmp-aligned';
  if (status === 'minor') return 'cmp-minor';
  if (status === 'outlier') return 'cmp-outlier';
  return 'cmp-divergence';
}

function renderComparisonTable(live) {
  const rows = (live.comparison || [])
    .map(
      (c) => `
      <tr class="${comparisonStatusClass(c.status)}">
        <td>${escapeHtml(c.label)}</td>
        <td class="num">${formatUsd(c.price)}</td>
        <td class="num">${c.deviationPercent >= 0 ? '+' : ''}${c.deviationPercent.toFixed(3)}%</td>
        <td class="num">${c.deviationUsd >= 0 ? '+' : ''}${formatUsd(Math.abs(c.deviationUsd))}</td>
        <td><span class="cmp-tag">${escapeHtml(c.status)}</span></td>
      </tr>`,
    )
    .join('');

  if (!rows) return '';

  const outlierNote =
    live.outliersExcluded?.length > 0
      ? `<p class="tv-outlier-note">Ausreißer vom Mark-Preis ausgeschlossen: <strong>${live.outliersExcluded.map(escapeHtml).join(', ')}</strong></p>`
      : '';

  return `
    <div class="tv-comparison-block">
      <h4 class="tv-comparison-title">Quellenvergleich (vs. Mark-Preis)</h4>
      <div class="table-scroll">
        <table class="coin-table tv-comparison-table">
          <thead>
            <tr>
              <th>Quelle</th>
              <th class="num">Preis</th>
              <th class="num">Abweichung</th>
              <th class="num">Δ USD</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${outlierNote}
    </div>`;
}

function liveChange24h(live) {
  return (
    live.binance?.change24h ??
    live.coingecko?.change24h ??
    live.coinmarketcap?.change24h ??
    0
  );
}

function renderSourceCard(src, quote) {
  const id = `live-${src.key}-price`;
  return `
    <div class="tv-source-card">
      <div class="tv-source-head">
        <span class="tv-src-badge ${src.badgeClass}">${src.badge}</span>
        <span>${escapeHtml(src.label)}</span>
      </div>
      <div class="tv-src-price" id="${id}">${quote ? formatUsd(quote.price) : '—'}</div>
      <div class="tv-src-meta" id="${id}-meta">${quote ? quoteMeta(quote, src) : escapeHtml(src.sub) + ' — nicht verfügbar'}</div>
    </div>`;
}

function renderLivePricePanel(live) {
  const ch = liveChange24h(live);
  const chClass = ch >= 0 ? 'tv-bull' : 'tv-bear';
  const syncClass =
    live.syncStatus === 'excellent'
      ? 'sync-excellent'
      : live.syncStatus === 'good'
        ? 'sync-good'
        : live.syncStatus === 'divergence'
          ? 'sync-warn'
          : 'sync-partial';

  const sourceCards = LIVE_SOURCES.map((src) =>
    renderSourceCard(src, live[src.key]),
  ).join('');

  return `
    <div class="tv-live-panel">
      <div class="tv-live-main">
        <div class="tv-pair">
          <span class="tv-live-dot"></span>
          <span class="tv-live-label">LIVE</span>
          <span class="tv-symbol">${escapeHtml(live.symbol)}/USD</span>
        </div>
        <div class="tv-price-block">
          <span class="tv-main-price" id="live-main-price">${formatUsd(live.referencePrice)}</span>
          <span class="tv-change ${chClass}" id="live-main-change">${formatPct(ch)}</span>
        </div>
        <div class="tv-ref-note">
          <span>Mark-Preis (robuster Median · ${live.sourceCount ?? 0} Quellen)</span>
          <span class="accuracy-badge" id="live-accuracy-badge" title="Datenqualität 0–100">Genauigkeit ${live.accuracyScore ?? 0}%</span>
          <span class="sync-badge ${syncClass}" id="live-sync-badge">${escapeHtml(live.syncLabel)}</span>
        </div>
      </div>
      <div class="tv-source-grid">${sourceCards}</div>
      <div class="tv-spread-row">
        <span>Spread (bereinigte Quellen)</span>
        <strong class="${syncClass}" id="live-spread-val">${live.spreadUsd > 0 ? formatUsd(live.spreadUsd) : '—'}</strong>
        <span class="tv-src-meta" id="live-spread-meta">${
          live.spreadPercent > 0 ? live.spreadPercent.toFixed(4) + '% Max−Min' : 'Einzelquelle'
        }</span>
      </div>
      <div id="live-comparison-wrap">${renderComparisonTable(live)}</div>
    </div>`;
}

function updateLivePricePanel(live) {
  const main = document.getElementById('live-main-price');
  if (!main) {
    const panel = document.getElementById('live-price-panel');
    if (panel) panel.innerHTML = renderLivePricePanel(live);
    return;
  }

  const ch = liveChange24h(live);
  main.textContent = formatUsd(live.referencePrice);
  main.classList.add('price-flash');
  setTimeout(() => main.classList.remove('price-flash'), 400);

  const change = document.getElementById('live-main-change');
  if (change) {
    change.textContent = formatPct(ch);
    change.className = `tv-change ${ch >= 0 ? 'tv-bull' : 'tv-bear'}`;
  }

  const badge = document.getElementById('live-sync-badge');
  if (badge) {
    badge.textContent = live.syncLabel;
    badge.className = `sync-badge ${
      live.syncStatus === 'excellent'
        ? 'sync-excellent'
        : live.syncStatus === 'good'
          ? 'sync-good'
          : live.syncStatus === 'divergence'
            ? 'sync-warn'
            : 'sync-partial'
    }`;
  }

  const acc = document.getElementById('live-accuracy-badge');
  if (acc) acc.textContent = `Genauigkeit ${live.accuracyScore ?? 0}%`;

  for (const src of LIVE_SOURCES) {
    const q = live[src.key];
    const priceEl = document.getElementById(`live-${src.key}-price`);
    const metaEl = document.getElementById(`live-${src.key}-price-meta`);
    if (priceEl) priceEl.textContent = q ? formatUsd(q.price) : '—';
    if (metaEl) metaEl.textContent = q ? quoteMeta(q, src) : src.sub + ' — nicht verfügbar';
  }

  const spreadV = document.getElementById('live-spread-val');
  const spreadM = document.getElementById('live-spread-meta');
  if (spreadV) spreadV.textContent = live.spreadUsd > 0 ? formatUsd(live.spreadUsd) : '—';
  if (spreadM) {
    spreadM.textContent =
      live.spreadPercent > 0 ? `${live.spreadPercent.toFixed(4)}% Max−Min` : 'Einzelquelle';
  }

  const cmpWrap = document.getElementById('live-comparison-wrap');
  if (cmpWrap) cmpWrap.innerHTML = renderComparisonTable(live);
}

function renderCandlestickChart(candles, range) {
  if (!candles?.length) return '<p class="error-msg">Keine Kerzen-Daten</p>';

  const w = 1000;
  const h = 460;
  const pad = { t: 32, r: 88, b: 52, l: 92 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  let minP = Math.min(...lows);
  let maxP = Math.max(...highs);
  const margin = (maxP - minP) * 0.05 || maxP * 0.008;
  minP -= margin;
  maxP += margin;
  const span = maxP - minP || 1;

  const y = (price) => pad.t + ih - ((price - minP) / span) * ih;
  const slotW = iw / candles.length;
  const bodyW = Math.max(4, Math.min(18, slotW * 0.7));
  const last = candles[candles.length - 1];

  const gridLines = Array.from({ length: 7 }, (_, i) => {
    const price = minP + (span * i) / 6;
    const yy = y(price);
    return `
      <line x1="${pad.l}" y1="${yy}" x2="${pad.l + iw}" y2="${yy}" stroke="${TV_GRID}" stroke-width="1"/>
      <text x="${pad.l - 8}" y="${yy + 4}" fill="#787b86" font-size="11" text-anchor="end" font-family="DM Sans,sans-serif">${formatUsd(price, price >= 1e6)}</text>`;
  }).join('');

  const volMax = Math.max(...candles.map((c) => Math.abs(c.close - c.open)));
  const volH = 48;
  const volBase = pad.t + ih + 8;

  const candleShapes = candles
    .map((c, i) => {
      const cx = pad.l + (i + 0.5) * slotW;
      const bull = c.close >= c.open;
      const color = bull ? TV_BULL : TV_BEAR;
      const yO = y(c.open);
      const yC = y(c.close);
      const yH = y(c.high);
      const yL = y(c.low);
      const top = Math.min(yO, yC);
      const bodyH = Math.max(2, Math.abs(yC - yO));
      const volBar = (Math.abs(c.close - c.open) / (volMax || 1)) * volH;
      const tip = new Date(c.timestamp).toLocaleString('de-DE');
      return `
        <g class="candle" data-i="${i}">
          <title>${tip} | O:${c.open} H:${c.high} L:${c.low} C:${c.close}</title>
          <rect x="${(cx - bodyW / 2).toFixed(1)}" y="${(volBase + volH - volBar).toFixed(1)}" width="${bodyW.toFixed(1)}" height="${volBar.toFixed(1)}" fill="${color}" opacity="0.35"/>
          <line x1="${cx}" y1="${yH}" x2="${cx}" y2="${yL}" stroke="${color}" stroke-width="1.5"/>
          <rect x="${(cx - bodyW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}"/>
        </g>`;
    })
    .join('');

  const xStep = Math.max(1, Math.floor(candles.length / 7));
  const xLabels = candles
    .filter((_, i) => i % xStep === 0 || i === candles.length - 1)
    .map((c) => {
      const i = candles.indexOf(c);
      const cx = pad.l + (i + 0.5) * slotW;
      const d = new Date(c.timestamp);
      const lbl =
        range === '7d'
          ? d.toLocaleDateString('de-DE', { day: '2-digit', hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
      return `<text x="${cx}" y="${h - 14}" fill="#787b86" font-size="11" text-anchor="middle">${lbl}</text>`;
    })
    .join('');

  const lastY = y(last.close);
  const lastColor = last.close >= last.open ? TV_BULL : TV_BEAR;

  return `
    <div class="trading-chart tv-chart" id="trading-chart-root">
      <div class="tv-chart-toolbar">
        <span class="tv-toolbar-title">OHLC · Kerzenchart</span>
        <span class="tv-toolbar-ohlc" id="tv-ohlc-display">
          O <b>${formatUsd(last.open)}</b> H <b class="tv-bull">${formatUsd(last.high)}</b>
          L <b class="tv-bear">${formatUsd(last.low)}</b> C <b style="color:${lastColor}">${formatUsd(last.close)}</b>
        </span>
      </div>
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" class="candlestick-svg" id="candlestick-svg">
        <rect width="${w}" height="${h}" fill="${TV_BG}"/>
        <rect x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih + volH + 12}" fill="#1e222d" rx="2"/>
        ${gridLines}
        <line x1="${pad.l}" y1="${lastY}" x2="${pad.l + iw}" y2="${lastY}" stroke="${lastColor}" stroke-width="1" stroke-dasharray="4 6" opacity="0.85"/>
        ${candleShapes}
        ${xLabels}
      </svg>
    </div>`;
}

function initCandlestickHover() {
  const root = document.getElementById('trading-chart-root');
  const svg = document.getElementById('candlestick-svg');
  const ohlcDisplay = document.getElementById('tv-ohlc-display');
  if (!root || !svg || root.dataset.hoverBound) return;
  root.dataset.hoverBound = '1';

  root.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const candles = svg.querySelectorAll('.candle');
    if (!candles.length || !ohlcDisplay) return;
    const padL = 92;
    const iw = 1000 - 92 - 88;
    const slotW = iw / candles.length;
    const idx = Math.min(candles.length - 1, Math.max(0, Math.floor((x - padL) / slotW)));
    const title = candles[idx]?.querySelector('title')?.textContent;
    if (!title) return;
    const parts = title.split(' | ');
    if (parts[1]) {
      const o = parts[1].match(/O:([\d.eE+-]+)/);
      const h = parts[1].match(/H:([\d.eE+-]+)/);
      const l = parts[1].match(/L:([\d.eE+-]+)/);
      const c = parts[1].match(/C:([\d.eE+-]+)/);
      if (o && h && l && c) {
        const cv = parseFloat(c[1]);
        const ov = parseFloat(o[1]);
        const col = cv >= ov ? TV_BULL : TV_BEAR;
        ohlcDisplay.innerHTML = `${parts[0]} — O <b>${formatUsd(parseFloat(o[1]))}</b> H <b class="tv-bull">${formatUsd(parseFloat(h[1]))}</b> L <b class="tv-bear">${formatUsd(parseFloat(l[1]))}</b> C <b style="color:${col}">${formatUsd(cv)}</b>`;
      }
    }
  });
}
