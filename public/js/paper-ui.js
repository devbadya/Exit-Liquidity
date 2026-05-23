/** TokenSync — Paper Trading UI v2 */

const paperUi = {
  side: 'long',
  leverage: 10,
  sizeUsd: 500,
  sizePercent: 10,
  orderType: 'market',
  limitPrice: 0,
  stopPrice: 0,
  tpPercent: 0,
  slPercent: 0,
  activeTab: 'trade',
  selectedSlug: 'bitcoin',
  markPrice: 0,
  prevMark: 0,
  coin: null,
  live: null,
  liveSlug: null,
};

let paperDelegateRoot = null;
let paperGetMark = () => paperUi.markPrice || 0;
let paperEngineInterval = null;
let paperChartRange = '24h';

const TOP_MARKETS = [
  { slug: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { slug: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { slug: 'solana', symbol: 'SOL', name: 'Solana' },
  { slug: 'ripple', symbol: 'XRP', name: 'XRP' },
  { slug: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { slug: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
];

function getActiveCoin() {
  return (
    paperUi.coin || {
      slug: paperUi.selectedSlug,
      symbol: paperUi.selectedSlug.toUpperCase().slice(0, 4),
      name: paperUi.selectedSlug,
    }
  );
}

function coinFromSlug(slug) {
  const hit = TOP_MARKETS.find((m) => m.slug === slug);
  return hit || { slug, symbol: slug.toUpperCase().slice(0, 5), name: slug };
}

function syncLimitStopFromMark(mark, force) {
  if (!mark || mark <= 0) return;
  if (force || !paperUi.limitPrice) paperUi.limitPrice = mark;
  if (force || !paperUi.stopPrice) paperUi.stopPrice = mark;
}

function isLiveForCoin(coin) {
  return (
    paperUi.liveSlug === coin.slug &&
    paperUi.markPrice > 0 &&
    paperUi.live?.binance?.price > 0
  );
}

/** Binance-API-Antwort → Anzeige-Objekt für Paper-UI */
function binanceToLiveShape(bn) {
  const methodLabel = bn.method === 'mid' ? 'Bid/Ask Mitte' : 'Last Trade';
  return {
    slug: bn.slug,
    referencePrice: bn.price,
    sourceCount: 1,
    lastUpdated: bn.lastUpdated,
    pair: bn.pair,
    change24h: bn.change24h,
    binance: {
      price: bn.price,
      change24h: bn.change24h,
      detail: `${bn.pair} · ${methodLabel}`,
    },
  };
}

function showPaperTickerLoading(coin) {
  const mount = document.getElementById('paper-live-ticker-mount');
  if (!mount) return;
  mount.innerHTML = `
    <div class="paper-live-ticker paper-live-loading">
      <div class="paper-live-top">
        <span class="paper-live-dot"></span>
        <div class="paper-live-title">
          <strong class="paper-live-pair">${escapeHtml(coin.symbol)}/USD</strong>
          <span class="paper-live-name">${escapeHtml(coin.name)}</span>
        </div>
      </div>
      <p class="paper-live-label">Binance Spot wird geladen…</p>
      <p class="paper-live-price" id="paper-live-price">—</p>
    </div>`;
}

/** Live-Kurs von Binance Spot für aktuellen Markt */
async function fetchAndApplyLive(coin) {
  const bn = await fetchBinancePrice(coin.slug);
  if (!bn?.price || bn.price <= 0) {
    throw new Error(`Binance-Kurs für ${coin.symbol} nicht verfügbar`);
  }
  const live = binanceToLiveShape(bn);
  paperUi.live = live;
  paperUi.liveSlug = coin.slug;
  paperUi.markPrice = bn.price;
  paperUi.coin = coin;
  paperUi.selectedSlug = coin.slug;
  syncLimitStopFromMark(bn.price, true);
  paperGetMark = () => (paperUi.liveSlug === coin.slug ? paperUi.markPrice : 0);
  updatePaperLiveTicker(coin, live);
  updatePaperInteractiveChart(bn.price);
  return bn.price;
}

/** Vor jedem Trade: frischer Kurs des richtigen Tokens */
async function getMarkForTrade(coin) {
  if (isLiveForCoin(coin)) return paperUi.markPrice;
  return fetchAndApplyLive(coin);
}

function updatePaperMarketChips(activeSlug) {
  document.querySelectorAll('.paper-market-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.slug === activeSlug);
  });
}

async function switchPaperMarket(coin) {
  paperUi.selectedSlug = coin.slug;
  paperUi.coin = coin;
  paperUi.live = null;
  paperUi.liveSlug = null;
  paperUi.markPrice = 0;
  paperUi.prevMark = 0;
  updatePaperMarketChips(coin.slug);
  showPaperTickerLoading(coin);
  const chartWrap = document.getElementById('paper-chart-wrap');
  if (chartWrap) {
    chartWrap.innerHTML = renderPaperChartShell(coin, paperChartRange);
    bindPaperChartTabs();
  }
  showPaperMsg(`${coin.symbol} wird geladen…`, true);
  try {
    const mark = await fetchAndApplyLive(coin);
    const slugs = new Set([
      coin.slug,
      ...getPaperAccount().positions.map((p) => p.slug),
      ...getPaperAccount().pendingOrders.map((o) => o.slug),
    ]);
    const marks = { [coin.slug]: mark };
    await Promise.all(
      [...slugs]
        .filter((s) => s !== coin.slug)
        .map(async (s) => {
          try {
            const bn = await fetchBinancePrice(s);
            marks[s] = bn.price;
          } catch {
            marks[s] = 0;
          }
        }),
    );
    processPaperEngine(marks);
    recalcSizeFromPercent();
    refreshPaperTerminalMount(false);
    void loadPaperChart(coin.slug, paperChartRange);
    showPaperMsg(`${coin.symbol} · ${formatUsd(mark)}`, true);
  } catch (e) {
    showPaperMsg(e.message || 'Kurs nicht verfügbar', false);
  }
}

function getPaperSizingContext() {
  const mark = paperGetMark();
  const coin = getActiveCoin();
  const summary = getPaperSummary({ [coin.slug]: mark });
  return {
    equity: summary.equity,
    balance: summary.balance,
    maxNotional: calcMaxSizeUsd(summary.balance, paperUi.leverage),
  };
}

/** Größe aus Equity-% (Slider), begrenzt auf max. Notional bei aktuellem Hebel */
function recalcSizeFromPercent() {
  const { equity, balance, maxNotional } = getPaperSizingContext();
  const target = (equity * paperUi.sizePercent) / 100;
  paperUi.sizeUsd = Math.max(PAPER_MIN_SIZE_USD, Math.min(target, maxNotional));
}

function syncPercentFromSizeUsd() {
  const { equity, balance, maxNotional } = getPaperSizingContext();
  paperUi.sizeUsd = Math.max(PAPER_MIN_SIZE_USD, Math.min(paperUi.sizeUsd, maxNotional));
  paperUi.sizePercent = equity > 0 ? Math.min(100, Math.max(1, Math.round((paperUi.sizeUsd / equity) * 100))) : 10;
}

function renderPaperSizeHint() {
  const { equity, balance, maxNotional } = getPaperSizingContext();
  const margin = paperUi.sizeUsd / Math.max(1, paperUi.leverage);
  const pctVal = (equity * paperUi.sizePercent) / 100;
  return `Max Notional ${formatUsd(maxNotional)} · ${paperUi.sizePercent}% Equity ≈ ${formatUsd(pctVal)} · Margin ${formatUsd(margin)}`;
}

function showPaperMsg(text, ok) {
  const el = document.getElementById('paper-msg');
  if (!el) return;
  el.textContent = text;
  el.className = `paper-msg ${ok ? 'ok' : 'err'}`;
}

function refreshPaperUiFull() {
  const mark = paperGetMark();
  paperUi.markPrice = mark;
  const coin = getActiveCoin();
  const summary = getPaperSummary({ [coin.slug]: mark });
  syncLimitStopFromMark(mark);

  const strip = document.getElementById('paper-account-strip');
  if (strip) strip.innerHTML = renderPaperAccountStrip(summary);

  const est = document.getElementById('paper-estimate');
  if (est) est.innerHTML = renderPaperEstimate(coin, mark);

  const hint = document.getElementById('paper-size-hint');
  if (hint) hint.textContent = renderPaperSizeHint();

  const sizeInput = document.getElementById('paper-size-usd');
  const range = document.getElementById('paper-size-range');
  const pctLbl = document.getElementById('paper-size-pct-label');
  if (sizeInput) sizeInput.value = String(Math.round(paperUi.sizeUsd));
  if (range) range.value = String(paperUi.sizePercent);
  if (pctLbl) pctLbl.textContent = `${paperUi.sizePercent}%`;

  const posBlock = document.getElementById('paper-position-block');
  if (posBlock) posBlock.innerHTML = renderPaperPositionsForCoin(summary, coin.slug, mark);

  const ordersBlock = document.getElementById('paper-orders-block');
  if (ordersBlock) ordersBlock.innerHTML = renderPaperOpenOrders(summary, coin.slug);

  const toolsOut = document.getElementById('paper-tools-output');
  if (toolsOut) toolsOut.innerHTML = renderPaperToolsOutput(coin, mark);

  updatePaperLiveTicker(coin, paperUi.live || { referencePrice: mark, slug: coin.slug });
}

function renderPaperAccountStrip(summary) {
  const pnlClass = summary.totalPnl >= 0 ? 'tv-bull' : 'tv-bear';
  return `
    <div class="paper-stat"><span>Equity</span><strong>${formatUsd(summary.equity)}</strong></div>
    <div class="paper-stat"><span>Frei</span><strong>${formatUsd(summary.balance)}</strong></div>
    <div class="paper-stat"><span>uPnL</span><strong class="${summary.unrealizedPnl >= 0 ? 'tv-bull' : 'tv-bear'}">${formatUsd(summary.unrealizedPnl)}</strong></div>
    <div class="paper-stat"><span>PnL</span><strong class="${pnlClass}">${formatPct(summary.totalPnlPercent)}</strong></div>`;
}

function renderPaperEstimate(coin, mark) {
  if (!mark || mark <= 0) return '<span class="muted">Warte auf Mark-Preis…</span>';
  const sizeUsd = paperUi.sizeUsd;
  const risk = paperCalcRisk({
    markPrice: mark,
    side: paperUi.side,
    leverage: paperUi.leverage,
    sizeUsd,
    stopLossPercent: paperUi.slPercent || null,
  });
  const size = sizeUsd / mark;
  return `
    <div>≈ <strong>${size.toFixed(6)}</strong> ${escapeHtml(coin.symbol)} @ ${formatUsd(mark)}</div>
    <div>Notional <strong>${formatUsd(sizeUsd)}</strong> · Margin <strong>${formatUsd(risk.margin)}</strong></div>
    <div>Fee ~<strong>${formatUsd(sizeUsd * PAPER_FEE_RATE)}</strong> · Liq. ~<strong>${formatUsd(risk.liqPrice)}</strong></div>
    ${paperUi.slPercent ? `<div>Risiko (SL) ~<strong>${formatUsd(risk.riskUsd)}</strong></div>` : ''}`;
}

function renderPaperOrderForm(coin, mark) {
  recalcSizeFromPercent();
  return `
    <div class="paper-order-types">
      ${['market', 'limit', 'stop']
        .map(
          (t) =>
            `<button type="button" class="paper-otype ${paperUi.orderType === t ? 'active' : ''}" data-paper-action="set-order-type" data-type="${t}">${t}</button>`,
        )
        .join('')}
    </div>

    <div class="paper-side-tabs">
      <button type="button" class="paper-side-btn long ${paperUi.side === 'long' ? 'active' : ''}" data-paper-action="set-side" data-side="long">Long</button>
      <button type="button" class="paper-side-btn short ${paperUi.side === 'short' ? 'active' : ''}" data-paper-action="set-side" data-side="short">Short</button>
    </div>

    <label class="paper-label">Hebel</label>
    <div class="paper-lev-btns">
      ${PAPER_LEVERAGES.map(
        (l) =>
          `<button type="button" class="paper-lev-btn ${paperUi.leverage === l ? 'active' : ''}" data-paper-action="set-lev" data-lev="${l}">${l}x</button>`,
      ).join('')}
    </div>

    <label class="paper-label">Größe · <span id="paper-size-pct-label">${paperUi.sizePercent}%</span> Equity</label>
    <input type="range" class="paper-range" id="paper-size-range" min="1" max="100" value="${paperUi.sizePercent}" />
    <div class="paper-size-row">
      <input type="number" class="paper-input" id="paper-size-usd" min="${PAPER_MIN_SIZE_USD}" step="10" value="${Math.round(paperUi.sizeUsd)}" />
      <button type="button" class="paper-mini-btn" data-paper-action="size-max">Max</button>
      <button type="button" class="paper-mini-btn" data-paper-action="size-25">25%</button>
      <button type="button" class="paper-mini-btn" data-paper-action="size-50">50%</button>
    </div>
    <p class="paper-hint" id="paper-size-hint">${renderPaperSizeHint()}</p>

    <div class="paper-conditional-fields ${paperUi.orderType === 'limit' ? '' : 'hidden'}" id="paper-limit-fields">
      <label class="paper-label">Limit-Preis</label>
      <input type="number" class="paper-input" id="paper-limit-price" step="any" value="${paperUi.limitPrice || mark || ''}" />
    </div>
    <div class="paper-conditional-fields ${paperUi.orderType === 'stop' ? '' : 'hidden'}" id="paper-stop-fields">
      <label class="paper-label">Stop-Trigger</label>
      <input type="number" class="paper-input" id="paper-stop-price" step="any" value="${paperUi.stopPrice || mark || ''}" />
    </div>

    <div class="paper-bracket-row">
      <label class="paper-label">TP %</label>
      <input type="number" class="paper-input sm" id="paper-tp-pct" min="0" step="0.1" value="${paperUi.tpPercent || ''}" placeholder="—" />
      <label class="paper-label">SL %</label>
      <input type="number" class="paper-input sm" id="paper-sl-pct" min="0" step="0.1" value="${paperUi.slPercent || ''}" placeholder="—" />
    </div>

    <div class="paper-estimate" id="paper-estimate">${renderPaperEstimate(coin, mark)}</div>

    <button type="button" class="paper-submit ${paperUi.side}" id="paper-submit-btn" data-paper-action="submit-order">
      ${paperUi.orderType === 'market' ? 'Market' : paperUi.orderType === 'limit' ? 'Limit' : 'Stop'} · ${paperUi.side === 'long' ? 'Long' : 'Short'}
    </button>
    <div class="paper-quick-row">
      <button type="button" class="paper-mini-btn" data-paper-action="flip">Flip</button>
      <button type="button" class="paper-mini-btn" data-paper-action="close-all-coin">Alles schließen</button>
    </div>
    <p class="paper-msg" id="paper-msg"></p>`;
}

function renderPaperPositionsForCoin(summary, slug, mark) {
  const positions = summary.positions.filter((p) => p.slug === slug);
  if (!positions.length) return '<p class="paper-empty">Keine Position auf diesem Markt</p>';
  return positions
    .map((pos) => {
      const pnlClass = pos.unrealizedPnl >= 0 ? 'tv-bull' : 'tv-bear';
      return `
      <div class="paper-open-pos">
        <div class="paper-pos-head">
          <span class="paper-pos-side ${pos.side}">${pos.side.toUpperCase()}</span>
          <span>${pos.leverage}x</span>
        </div>
        <div class="paper-pos-grid">
          <div><span>Size</span><strong>${pos.size.toFixed(6)}</strong></div>
          <div><span>Entry</span><strong>${formatUsd(pos.entryPrice)}</strong></div>
          <div><span>Mark</span><strong>${formatUsd(mark)}</strong></div>
          <div><span>uPnL</span><strong class="${pnlClass}">${formatUsd(pos.unrealizedPnl)}</strong></div>
          <div><span>Liq</span><strong class="tv-bear">${formatUsd(pos.liqPrice)}</strong></div>
          ${pos.tpPrice ? `<div><span>TP</span><strong>${formatUsd(pos.tpPrice)}</strong></div>` : ''}
          ${pos.slPrice ? `<div><span>SL</span><strong>${formatUsd(pos.slPrice)}</strong></div>` : ''}
        </div>
        <div class="paper-close-row">
          <button type="button" class="paper-mini-btn" data-paper-action="close-pct" data-pos-id="${escapeHtml(pos.id)}" data-pct="0.25">25%</button>
          <button type="button" class="paper-mini-btn" data-paper-action="close-pct" data-pos-id="${escapeHtml(pos.id)}" data-pct="0.5">50%</button>
          <button type="button" class="paper-mini-btn" data-paper-action="close-pos" data-pos-id="${escapeHtml(pos.id)}">100%</button>
        </div>
      </div>`;
    })
    .join('');
}

function renderPaperOpenOrders(summary, slug) {
  const orders = summary.pendingOrders.filter((o) => o.slug === slug);
  if (!orders.length) return '<p class="paper-empty">Keine offenen Orders</p>';
  return `<ul class="paper-order-list">${orders
    .map(
      (o) => `
    <li>
      <span class="paper-pos-side ${o.side}">${o.orderType}</span>
      ${formatUsd(o.sizeUsd)} @ ${formatUsd(o.triggerPrice)}
      <button type="button" class="paper-mini-btn" data-paper-action="cancel-order" data-order-id="${escapeHtml(o.id)}">✕</button>
    </li>`,
    )
    .join('')}</ul>`;
}

function renderPaperStrategies() {
  return `<div class="paper-strategy-grid">${Object.values(PAPER_STRATEGIES)
    .map(
      (s) => `
    <button type="button" class="paper-strategy-card" data-paper-action="apply-strategy" data-strategy="${s.id}" title="${escapeHtml(s.desc)}">
      <strong>${escapeHtml(s.name)}</strong>
      <small>${escapeHtml(s.desc)}</small>
    </button>`,
    )
    .join('')}</div>`;
}

function renderPaperToolsOutput(coin, mark) {
  if (!mark || mark <= 0) return '<p class="muted">Mark-Preis laden…</p>';
  const risk = paperCalcRisk({
    markPrice: mark,
    side: paperUi.side,
    leverage: paperUi.leverage,
    sizeUsd: paperUi.sizeUsd,
    stopLossPercent: paperUi.slPercent || 5,
  });
  const pnlLong = paperCalcPnL({ entryPrice: mark, markPrice: mark * 1.02, side: 'long', size: paperUi.sizeUsd / mark });
  return `
    <div class="paper-tools-grid">
      <div><span>R/R Rechner</span><p>Bei +2%: <strong class="tv-bull">${formatUsd(pnlLong.pnl)}</strong></p></div>
      <div><span>Margin</span><p><strong>${formatUsd(risk.margin)}</strong></p></div>
      <div><span>Liq (Schätzung)</span><p><strong>${formatUsd(risk.liqPrice)}</strong></p></div>
      <div><span>Position Size</span><p><strong>${(paperUi.sizeUsd / mark).toFixed(6)} ${escapeHtml(coin.symbol)}</strong></p></div>
    </div>`;
}

function paperLiveChange24h(live) {
  if (!live) return null;
  return live.change24h ?? live.binance?.change24h ?? null;
}

function renderPaperLiveTicker(coin, live) {
  const mark = live?.referencePrice ?? paperUi.markPrice ?? 0;
  const ch = paperLiveChange24h(live);
  const chClass = ch != null ? (ch >= 0 ? 'tv-bull' : 'tv-bear') : '';
  return `
    <div class="paper-live-ticker" id="paper-live-ticker">
      <div class="paper-live-top">
        <span class="paper-live-dot" aria-hidden="true"></span>
        <div class="paper-live-title">
          <strong class="paper-live-pair">${escapeHtml(coin.symbol)}/USD</strong>
          <span class="paper-live-name">${escapeHtml(coin.name)}</span>
        </div>
        <span class="paper-binance-badge">BINANCE</span>
        <span class="paper-demo-badge">SIM</span>
      </div>
      <p class="paper-live-label">Binance Spot · Live</p>
      <p class="paper-live-price" id="paper-live-price">${mark > 0 ? formatUsd(mark) : '—'}</p>
      <div class="paper-live-meta" id="paper-live-meta">
        <span id="paper-live-chg" class="${chClass}">${ch != null ? formatPct(ch) + ' · 24h' : '—'}</span>
        <span id="paper-live-sources">${live?.binance?.detail || live?.pair || 'Spot USDT'}</span>
      </div>
      <p class="paper-live-src-row" id="paper-live-src-row">Ausführung &amp; Mark = Binance API</p>
      <p class="paper-live-upd" id="paper-live-upd">${live?.lastUpdated ? 'Aktualisiert ' + timeAgo(live.lastUpdated) : 'Verbinde…'}</p>
    </div>`;
}

function updatePaperLiveTicker(coin, live) {
  if (!live || !coin) return;
  if (live.referencePrice > 0 && coin.slug !== paperUi.liveSlug && paperUi.liveSlug) {
    return;
  }
  paperUi.live = live;
  paperUi.liveSlug = coin.slug;
  const mark = live.referencePrice ?? 0;
  if (mark > 0) paperUi.markPrice = mark;

  const ticker = document.getElementById('paper-live-ticker');
  if (!ticker) return;

  const pairEl = ticker.querySelector('.paper-live-pair');
  const nameEl = ticker.querySelector('.paper-live-name');
  if (pairEl) pairEl.textContent = `${coin.symbol}/USD`;
  if (nameEl) nameEl.textContent = coin.name;

  const priceEl = document.getElementById('paper-live-price');
  if (!priceEl) {
    const wrap = document.getElementById('paper-live-ticker-mount');
    if (wrap) wrap.innerHTML = renderPaperLiveTicker(coin, live);
    return;
  }

  const prev = paperUi.prevMark || mark;
  if (mark > 0 && mark !== prev) {
    priceEl.classList.remove('flash-up', 'flash-down');
    void priceEl.offsetWidth;
    priceEl.classList.add(mark > prev ? 'flash-up' : 'flash-down');
    setTimeout(() => priceEl.classList.remove('flash-up', 'flash-down'), 500);
  }
  paperUi.prevMark = mark;

  priceEl.textContent = mark > 0 ? formatUsd(mark) : '—';

  const ch = paperLiveChange24h(live);
  const chEl = document.getElementById('paper-live-chg');
  if (chEl) {
    chEl.textContent = ch != null ? `${formatPct(ch)} · 24h` : '—';
    chEl.className = ch != null ? (ch >= 0 ? 'tv-bull' : 'tv-bear') : '';
  }

  const srcEl = document.getElementById('paper-live-sources');
  if (srcEl) srcEl.textContent = live?.binance?.detail || live?.pair || 'Binance Spot';

  const rowEl = document.getElementById('paper-live-src-row');
  if (rowEl) rowEl.textContent = 'Ausführung & Mark = Binance API';

  const updEl = document.getElementById('paper-live-upd');
  if (updEl) {
    updEl.textContent = live?.lastUpdated ? `Aktualisiert ${timeAgo(live.lastUpdated)}` : 'Verbinde…';
  }
}

function renderPaperTerminalInner(coin, mark, live) {
  const summary = getPaperSummary({ [coin.slug]: mark });
  const liveBlock = renderPaperLiveTicker(coin, live || paperUi.live || { referencePrice: mark });
  return `
    <div class="paper-terminal" id="paper-terminal">
      <div id="paper-live-ticker-mount">${liveBlock}</div>
      <div class="paper-head">
        <h3>Paper Perps</h3>
        <span class="paper-demo-badge">$10k</span>
      </div>
      <div class="paper-account-strip" id="paper-account-strip">${renderPaperAccountStrip(summary)}</div>

      <div class="paper-tabs">
        <button type="button" class="${paperUi.activeTab === 'trade' ? 'active' : ''}" data-paper-action="tab" data-tab="trade">Trade</button>
        <button type="button" class="${paperUi.activeTab === 'strategies' ? 'active' : ''}" data-paper-action="tab" data-tab="strategies">Strategien</button>
        <button type="button" class="${paperUi.activeTab === 'tools' ? 'active' : ''}" data-paper-action="tab" data-tab="tools">Tools</button>
      </div>

      <div class="paper-tab-panel ${paperUi.activeTab === 'trade' ? '' : 'hidden'}" id="paper-tab-trade">
        ${renderPaperOrderForm(coin, mark)}
        <h4 class="paper-subhead">Position</h4>
        <div id="paper-position-block">${renderPaperPositionsForCoin(summary, coin.slug, mark)}</div>
        <h4 class="paper-subhead">Offene Orders</h4>
        <div id="paper-orders-block">${renderPaperOpenOrders(summary, coin.slug)}</div>
      </div>
      <div class="paper-tab-panel ${paperUi.activeTab === 'strategies' ? '' : 'hidden'}" id="paper-tab-strategies">
        <p class="paper-hint">Preset ausführen — nutzt aktuellen Markt &amp; Equity</p>
        ${renderPaperStrategies()}
      </div>
      <div class="paper-tab-panel ${paperUi.activeTab === 'tools' ? '' : 'hidden'}" id="paper-tab-tools">
        <div id="paper-tools-output">${renderPaperToolsOutput(coin, mark)}</div>
      </div>
    </div>`;
}

async function handlePaperAction(e) {
  const btn = e.target.closest('[data-paper-action]');
  if (!btn) return;

  const action = btn.dataset.paperAction;
  const coin = getActiveCoin();

  if (action === 'select-market') {
    const next = {
      slug: btn.dataset.slug,
      symbol: btn.dataset.symbol,
      name: btn.dataset.name,
    };
    if (next.slug === paperUi.selectedSlug && isLiveForCoin(next)) return;
    await switchPaperMarket(next);
    return;
  }

  let mark = paperGetMark();
  if (
    action === 'submit-order' ||
    action === 'flip' ||
    action === 'apply-strategy' ||
    action === 'close-pos' ||
    action === 'close-pct' ||
    action === 'close-all-coin'
  ) {
    try {
      mark = await getMarkForTrade(coin);
    } catch (err) {
      showPaperMsg(err.message || 'Kein Live-Kurs', false);
      return;
    }
  }

  if (action === 'set-side') {
    paperUi.side = btn.dataset.side;
    refreshPaperTerminalMount();
    return;
  }
  if (action === 'set-lev') {
    paperUi.leverage = Number(btn.dataset.lev);
    recalcSizeFromPercent();
    refreshPaperTerminalMount();
    return;
  }
  if (action === 'set-order-type') {
    paperUi.orderType = btn.dataset.type;
    refreshPaperTerminalMount();
    return;
  }
  if (action === 'tab') {
    paperUi.activeTab = btn.dataset.tab;
    refreshPaperTerminalMount();
    return;
  }
  if (action === 'size-max') {
    paperUi.sizePercent = 100;
    recalcSizeFromPercent();
    refreshPaperUiFull();
    return;
  }
  if (action === 'size-25' || action === 'size-50') {
    paperUi.sizePercent = action === 'size-25' ? 25 : 50;
    recalcSizeFromPercent();
    refreshPaperUiFull();
    return;
  }
  if (action === 'submit-order') {
    readFormInputs();
    recalcSizeFromPercent();
    syncPercentFromSizeUsd();
    const tp = paperUi.tpPercent || null;
    const sl = paperUi.slPercent || null;
    let res;
    if (paperUi.orderType === 'market') {
      res = submitPaperOrder({
        slug: coin.slug,
        symbol: coin.symbol,
        name: coin.name,
        side: paperUi.side,
        leverage: paperUi.leverage,
        sizeUsd: paperUi.sizeUsd,
        markPrice: mark,
        orderType: 'market',
        takeProfitPercent: tp,
        stopLossPercent: sl,
      });
    } else {
      const trigger = paperUi.orderType === 'limit' ? paperUi.limitPrice : paperUi.stopPrice;
      res = submitPaperOrder({
        slug: coin.slug,
        symbol: coin.symbol,
        name: coin.name,
        side: paperUi.side,
        leverage: paperUi.leverage,
        sizeUsd: paperUi.sizeUsd,
        markPrice: mark,
        orderType: paperUi.orderType,
        triggerPrice: trigger,
        takeProfitPercent: tp,
        stopLossPercent: sl,
      });
    }
    showPaperMsg(
      res.ok ? `${res.message || 'Order OK'} @ ${formatUsd(mark)}` : res.error,
      res.ok,
    );
    refreshPaperUiFull();
    return;
  }
  if (action === 'close-pos') {
    const res = closePaperPosition(btn.dataset.posId, mark, 1);
    showPaperMsg(res.ok ? `PnL ${formatUsd(res.pnl)}` : res.error, res.ok);
    refreshPaperUiFull();
    return;
  }
  if (action === 'close-pct') {
    const res = closePaperPosition(btn.dataset.posId, mark, Number(btn.dataset.pct));
    showPaperMsg(res.ok ? `Teil-Close · PnL ${formatUsd(res.pnl)}` : res.error, res.ok);
    refreshPaperUiFull();
    return;
  }
  if (action === 'cancel-order') {
    const res = cancelPaperOrder(btn.dataset.orderId);
    showPaperMsg(res.ok ? 'Order storniert' : res.error, res.ok);
    refreshPaperUiFull();
    return;
  }
  if (action === 'flip') {
    readFormInputs();
    const newSide = paperUi.side === 'long' ? 'short' : 'long';
    const res = flipPaperPosition(coin.slug, coin.symbol, coin.name, newSide, paperUi.leverage, paperUi.sizeUsd, mark);
    showPaperMsg(res.ok ? res.message || 'Geflippt' : res.error, res.ok);
    refreshPaperUiFull();
    return;
  }
  if (action === 'close-all-coin') {
    const state = getPaperAccount();
    for (const p of state.positions.filter((x) => x.slug === coin.slug)) {
      closePaperPosition(p.id, mark, 1);
    }
    showPaperMsg('Positionen geschlossen', true);
    refreshPaperUiFull();
    return;
  }
  if (action === 'apply-strategy') {
    const res = applyPaperStrategy(btn.dataset.strategy, coin, mark);
    showPaperMsg(res.ok ? res.message || 'Strategie aktiv' : res.error, res.ok);
    refreshPaperUiFull();
    return;
  }
}

function readFormInputs() {
  const sizeInput = document.getElementById('paper-size-usd');
  const range = document.getElementById('paper-size-range');
  const lim = document.getElementById('paper-limit-price');
  const stp = document.getElementById('paper-stop-price');
  const tp = document.getElementById('paper-tp-pct');
  const sl = document.getElementById('paper-sl-pct');
  if (range) paperUi.sizePercent = Number(range.value);
  if (sizeInput) paperUi.sizeUsd = Number(sizeInput.value) || PAPER_MIN_SIZE_USD;
  syncPercentFromSizeUsd();
  if (lim) paperUi.limitPrice = Number(lim.value);
  if (stp) paperUi.stopPrice = Number(stp.value);
  if (tp) paperUi.tpPercent = Number(tp.value) || 0;
  if (sl) paperUi.slPercent = Number(sl.value) || 0;
}

function renderPaperChartShell(coin, range) {
  return `
    <section class="paper-chart-section" aria-label="Kerzenchart">
      <div class="paper-chart-head">
        <h3>${escapeHtml(coin.symbol)} · Kerzenchart</h3>
        <span id="paper-chart-change" class="muted">Lädt…</span>
      </div>
      ${renderCgChartRangeTabs(range, 'data-paper-chart-range')}
      <div id="paper-chart" class="paper-chart-mount"><p class="muted">Chart lädt…</p></div>
    </section>`;
}

async function loadPaperChart(slug, range) {
  const chartEl = document.getElementById('paper-chart');
  const changeEl = document.getElementById('paper-chart-change');
  if (!chartEl) return;
  destroyInteractiveChart(chartEl);
  chartEl.innerHTML = '<p class="muted">Chart lädt…</p>';
  try {
    const chart = await fetchCoinChart(slug, range);
    if (slug !== paperUi.selectedSlug) return;
    paperUi.chartCtrl = mountInteractiveCandlestickChart(chartEl, {
      candles: chart.candles,
      range,
      liveLabel: 'Live · Binance',
    });
    if (paperUi.markPrice > 0) paperUi.chartCtrl?.setLivePrice(paperUi.markPrice);
    if (changeEl) {
      changeEl.textContent = `Range Δ ${formatPct(chart.changePercent)} · Live Binance`;
      changeEl.className = chart.changePercent >= 0 ? 'tv-bull' : 'tv-bear';
    }
    document.querySelectorAll('.cg-range-tab[data-paper-chart-range]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.paperChartRange === range);
      btn.setAttribute('aria-selected', String(btn.dataset.paperChartRange === range));
    });
  } catch (e) {
    paperUi.chartCtrl = null;
    chartEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
    if (changeEl) {
      changeEl.textContent = '—';
      changeEl.className = 'muted';
    }
  }
}

function bindPaperChartTabs() {
  document.querySelectorAll('.cg-range-tab[data-paper-chart-range]').forEach((btn) => {
    btn.onclick = async () => {
      const range = btn.dataset.paperChartRange;
      if (!range || range === paperChartRange) return;
      paperChartRange = range;
      document.querySelectorAll('.cg-range-tab[data-paper-chart-range]').forEach((b) => {
        b.classList.toggle('active', b.dataset.paperChartRange === range);
        b.setAttribute('aria-selected', String(b.dataset.paperChartRange === range));
      });
      await loadPaperChart(paperUi.selectedSlug, range);
    };
  });
}

function refreshPaperTerminalMount(rebindDelegation) {
  const mount = document.getElementById('paper-terminal-root');
  if (!mount) return;
  const coin = getActiveCoin();
  const mark = paperUi.markPrice || paperUi.live?.referencePrice || 0;
  mount.innerHTML = renderPaperTerminalInner(coin, mark, paperUi.live);
  if (rebindDelegation !== false) {
    setupPaperDelegation(mount, () => paperUi.markPrice, coin);
  }
  bindPaperFormInputs();
  refreshPaperUiFull();
}

function bindPaperFormInputs() {
  const range = document.getElementById('paper-size-range');
  const sizeInput = document.getElementById('paper-size-usd');
  if (range) {
    range.oninput = () => {
      paperUi.sizePercent = Number(range.value);
      recalcSizeFromPercent();
      refreshPaperUiFull();
    };
  }
  if (sizeInput) {
    sizeInput.oninput = () => {
      paperUi.sizeUsd = Number(sizeInput.value) || PAPER_MIN_SIZE_USD;
      syncPercentFromSizeUsd();
      refreshPaperUiFull();
    };
  }
}

function initPaperGlobalDelegation() {
  if (window.__paperGlobalBound) return;
  window.__paperGlobalBound = true;
  document.addEventListener('click', (e) => {
    void handlePaperAction(e);
  });
  window.addEventListener('paper-account-updated', refreshPaperUiFull);
}

function setupPaperDelegation(root, getMarkPrice, coin) {
  paperDelegateRoot = root;
  paperGetMark = getMarkPrice;
  if (coin) {
    paperUi.coin = coin;
    paperUi.selectedSlug = coin.slug;
  }
  initPaperGlobalDelegation();
}

function renderPaperMarketsBar(activeSlug) {
  return `<div class="paper-markets-bar">${TOP_MARKETS.map(
    (m) =>
      `<button type="button" class="paper-market-chip ${m.slug === activeSlug ? 'active' : ''}" data-paper-action="select-market" data-slug="${m.slug}" data-symbol="${m.symbol}" data-name="${escapeHtml(m.name)}">${m.symbol}</button>`,
  ).join('')}</div>`;
}

async function renderPaperPage() {
  const app = document.getElementById('app');
  if (!app) return;

  paperUi.selectedSlug = paperUi.selectedSlug || 'bitcoin';
  let mark = 0;
  let live = null;
  const coin = coinFromSlug(paperUi.selectedSlug);
  paperUi.coin = coin;
  try {
    mark = await fetchAndApplyLive(coin);
    paperUi.prevMark = mark;
    live = paperUi.live;
  } catch (_) {
    showPaperTickerLoading(coin);
  }

  const summary = getPaperSummary({ [coin.slug]: mark });

  app.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Paper Trading Terminal</h2>
        <p>Perp-Simulation · Market, Limit, Stop · Strategien · TP/SL · Liquidation</p>
      </div>
      <button type="button" class="btn-secondary" id="paper-reset-btn">Reset $10k</button>
    </div>
    ${renderPaperMarketsBar(paperUi.selectedSlug)}
    <div class="paper-full-layout">
      <div class="paper-full-main glass">
        <p class="paper-hint">Chart: ziehen &amp; scrollen (wie Hyperliquid) · Live-Kurs bewegt letzte Kerze · Trade rechts</p>
        <div id="paper-chart-wrap">${renderPaperChartShell(coin, paperChartRange)}</div>
        <div id="paper-portfolio-wrap">${renderPaperPortfolioTables(summary)}</div>
      </div>
      <div id="paper-terminal-root" class="paper-full-side">${renderPaperTerminalInner(coin, mark, live)}</div>
    </div>`;

  const root = document.getElementById('paper-terminal-root');
  paperGetMark = () => (paperUi.liveSlug === coin.slug ? paperUi.markPrice : 0);
  setupPaperDelegation(root, paperGetMark, coin);
  bindPaperFormInputs();
  bindPaperChartTabs();
  void loadPaperChart(coin.slug, paperChartRange);

  document.getElementById('paper-reset-btn')?.addEventListener('click', () => {
    if (confirm('Konto auf $10.000 zurücksetzen?')) {
      resetPaperAccount();
      void renderPaperPage();
    }
  });

  startPaperPageEngine();
}

function renderPaperPortfolioTables(summary) {
  const posRows =
    summary.positions.length === 0
      ? '<tr><td colspan="9" class="muted">Keine Positionen</td></tr>'
      : summary.positions
          .map((p) => {
            const cls = p.unrealizedPnl >= 0 ? 'tv-bull' : 'tv-bear';
            return `<tr>
              <td><a href="#/coin/${p.slug}">${p.symbol}</a> <span class="paper-pos-side ${p.side}">${p.side}</span></td>
              <td class="num">${p.leverage}x</td>
              <td class="num">${p.size.toFixed(4)}</td>
              <td class="num">${formatUsd(p.entryPrice)}</td>
              <td class="num">${formatUsd(p.markPrice)}</td>
              <td class="num ${cls}">${formatUsd(p.unrealizedPnl)}</td>
              <td class="num">${formatUsd(p.margin)}</td>
              <td class="num">${formatUsd(p.liqPrice)}</td>
              <td><button type="button" class="paper-mini-btn" data-paper-action="close-pos" data-pos-id="${p.id}">Close</button></td>
            </tr>`;
          })
          .join('');

  const ordRows =
    summary.pendingOrders.length === 0
      ? '<tr><td colspan="6" class="muted">Keine offenen Orders</td></tr>'
      : summary.pendingOrders
          .map(
            (o) => `<tr>
              <td>${o.symbol}</td><td>${o.orderType}</td><td class="paper-pos-side ${o.side}">${o.side}</td>
              <td class="num">${formatUsd(o.triggerPrice)}</td><td class="num">${formatUsd(o.sizeUsd)}</td>
              <td><button type="button" class="paper-mini-btn" data-paper-action="cancel-order" data-order-id="${o.id}">Cancel</button></td>
            </tr>`,
          )
          .join('');

  return `
    <div class="paper-portfolio-stats">
      <div class="paper-stat hero"><span>Equity</span><strong>${formatUsd(summary.equity)}</strong></div>
      <div class="paper-stat"><span>Frei</span><strong>${formatUsd(summary.balance)}</strong></div>
      <div class="paper-stat"><span>Orders locked</span><strong>${formatUsd(summary.ordersLocked)}</strong></div>
      <div class="paper-stat"><span>Offene Orders</span><strong>${summary.openOrderCount}</strong></div>
    </div>
    <h3>Alle Positionen</h3>
    <div class="table-scroll"><table class="coin-table"><thead><tr>
      <th>Markt</th><th>Lev</th><th>Size</th><th>Entry</th><th>Mark</th><th>uPnL</th><th>Margin</th><th>Liq</th><th></th>
    </tr></thead><tbody>${posRows}</tbody></table></div>
    <h3>Offene Orders</h3>
    <div class="table-scroll"><table class="coin-table"><thead><tr>
      <th>Symbol</th><th>Typ</th><th>Side</th><th>Trigger</th><th>Size</th><th></th>
    </tr></thead><tbody>${ordRows}</tbody></table></div>`;
}

async function runPaperEngineTick() {
  const state = getPaperAccount();
  const activeCoin = getActiveCoin();
  const slugs = new Set([
    paperUi.selectedSlug,
    ...state.positions.map((p) => p.slug),
    ...state.pendingOrders.map((o) => o.slug),
  ]);
  const marks = {};
  await Promise.all(
    [...slugs].map(async (slug) => {
      try {
        const bn = await fetchBinancePrice(slug);
        marks[slug] = bn.price;
        if (slug === paperUi.selectedSlug && slug === activeCoin.slug) {
          const live = binanceToLiveShape(bn);
          paperUi.markPrice = bn.price;
          paperUi.live = live;
          paperUi.liveSlug = slug;
          updatePaperLiveTicker(activeCoin, live);
          updatePaperInteractiveChart(bn.price);
        }
      } catch {
        marks[slug] = 0;
      }
    }),
  );
  processPaperEngine(marks);
  refreshPaperUiFull();
  const wrap = document.getElementById('paper-portfolio-wrap');
  if (wrap) {
    wrap.innerHTML = renderPaperPortfolioTables(getPaperSummary(marks));
  }
}

function startPaperPageEngine() {
  if (paperEngineInterval) clearInterval(paperEngineInterval);
  void runPaperEngineTick();
  paperEngineInterval = setInterval(() => void runPaperEngineTick(), 3000);
}

function stopPaperPageEngine() {
  if (paperEngineInterval) clearInterval(paperEngineInterval);
  paperEngineInterval = null;
}

initPaperGlobalDelegation();
