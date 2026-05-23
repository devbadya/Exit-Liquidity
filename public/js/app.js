/** TokenSync — Routing & Seiten */

const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');
document.getElementById('year').textContent = String(new Date().getFullYear());

let newsCache = null;
let fgCache = null;
let marketCache = null;
let newsPollId = null;
let fgPollId = null;
let marketPollId = null;
let newsFilters = { source: '', category: 'all' };
let chartDays = 30;
let marketTab = 'overview';
let cmcPage = 1;
let cmcSearch = '';
let cmcSearchTimer = null;
let cmcAllCoins = null;
let cmcListMeta = null;
let cmcCoinsPageMounted = false;
let cmcViewMode = 'table';
let cmcLiveFilter = 'page';
let cmcLivePollId = null;
let cmcLiveMeta = null;
let cmcPrevPrices = new Map();
let coinChartRange = '24h';
let coinLiveInterval = null;
let coinLiveSlug = null;
let coinLiveMarkPrice = 0;
let paperPollId = null;

function parseRoute() {
  const raw = location.hash.slice(1) || '/';
  const [path, sub] = raw.split('#');
  const parts = path.split('/').filter(Boolean);

  if (sub === 'asi') marketTab = 'asi';
  else if (sub === 'avg') marketTab = 'avg';
  else if (sub === 'rankings') marketTab = 'rankings';
  else if (parts[0] === 'markets' && !sub) marketTab = 'overview';

  if (parts[0] === 'news' && parts[1]) return { page: 'news-detail', id: parts[1] };
  if (parts[0] === 'news') return { page: 'news' };
  if (parts[0] === 'coin' && parts[1]) return { page: 'coin-detail', slug: parts[1] };
  if (parts[0] === 'coins') return { page: 'coins' };
  if (parts[0] === 'markets') return { page: 'markets', tab: marketTab };
  if (parts[0] === 'fear-greed') return { page: 'fear-greed' };
  if (parts[0] === 'paper') return { page: 'paper' };
  return { page: 'dashboard' };
}

function setActiveNav(page) {
  navEl.querySelectorAll('a').forEach((a) => {
    const route = a.getAttribute('data-route');
    const active =
      (page === 'dashboard' && route === '/') ||
      (page === 'markets' && route === '/markets') ||
      (page === 'coins' && route === '/coins') ||
      (page === 'coin-detail' && route === '/coins') ||
      (page === 'news' && route === '/news') ||
      (page === 'news-detail' && route === '/news') ||
      (page === 'fear-greed' && route === '/fear-greed') ||
      (page === 'paper' && route === '/paper');
    a.classList.toggle('active', active);
  });
}

function showLoading(msg) {
  appEl.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>${escapeHtml(msg || 'Lädt…')}</p></div>`;
}

async function ensureNews() {
  if (!newsCache) newsCache = await fetchNews();
  return newsCache;
}

async function ensureFg() {
  if (!fgCache) fgCache = await fetchFearGreed();
  return fgCache;
}

async function ensureMarkets() {
  if (marketCache) return marketCache;
  try {
    marketCache = await fetchMarkets();
    return marketCache;
  } catch {
    return null;
  }
}

async function loadDashboardData() {
  const [newsR, fgR, mkR, cmcR] = await Promise.allSettled([
    ensureNews(),
    ensureFg(),
    ensureMarkets(),
    fetchCmcSummary(),
  ]);
  if (newsR.status === 'rejected') throw newsR.reason;
  if (fgR.status === 'rejected') throw fgR.reason;
  const news = newsR.value;
  const fg = fgR.value;
  const mk = mkR.status === 'fulfilled' ? mkR.value : null;
  const cmc = cmcR.status === 'fulfilled' ? cmcR.value : null;
  return { news, fg, mk, cmc };
}

async function loadNewsFiltered() {
  newsCache = await fetchNews({
    source: newsFilters.source || undefined,
    category: newsFilters.category !== 'all' ? newsFilters.category : undefined,
  });
  return newsCache;
}

function marketTabsHtml(active) {
  const tabs = [
    { id: 'overview', label: 'Übersicht', hash: '#/markets' },
    { id: 'rankings', label: 'Top Coins', hash: '#/markets#rankings' },
    { id: 'asi', label: 'Altcoin Season', hash: '#/markets#asi' },
    { id: 'avg', label: 'Average Crypto', hash: '#/markets#avg' },
  ];
  return `<div class="page-tabs">${tabs
    .map(
      (t) =>
        `<button type="button" class="page-tab ${active === t.id ? 'active' : ''}" data-tab="${t.id}" data-hash="${t.hash}">${t.label}</button>`,
    )
    .join('')}</div>`;
}

/* ——— Dashboard ——— */
async function renderDashboard() {
  showLoading('Dashboard wird geladen…');
  try {
    const { news, fg, mk, cmc } = await loadDashboardData();
    const featured = news.articles[0];
    const top = news.articles.slice(1, 5);
    const delta = fg.yesterday ? fg.current.value - fg.yesterday.value : null;

    const cap = mk?.global ?? (cmc ? {
      totalMarketCap: cmc.totalMarketCap,
      marketCapChange24h: cmc.btcChange24h,
      btcDominance: cmc.btcDominance,
      totalVolume24h: cmc.totalVolume24h,
    } : null);

    const mcapCard = cap
      ? `<a href="${mk ? '#/markets' : '#/coins'}" class="index-card glass">
          <p class="index-card-label">Market Cap ${mk ? '' : '<span class="badge badge-cyan" style="margin-left:0.35rem">CMC</span>'}</p>
          <p class="index-card-value" style="font-size:1.35rem">${formatUsd(cap.totalMarketCap, true)}</p>
          <p class="index-card-class ${pctClass(cap.marketCapChange24h)}">${formatPctOrDash(cap.marketCapChange24h)} 24h</p>
          <p class="index-card-sub">BTC ${cap.btcDominance.toFixed(1)}% · ${cmc ? cmc.coinCount + ' Coins' : 'Vol ' + formatUsd(cap.totalVolume24h, true)}</p>
          <span class="index-card-link">${mk ? 'Market Hub →' : 'Alle Coins →'}</span>
        </a>`
      : `<div class="index-card glass"><p class="index-card-label">Market Cap</p><p class="index-card-sub">Daten werden geladen…</p></div>`;

    const asiCard = mk
      ? `<a href="#/markets#asi" class="index-card glass">
          <p class="index-card-label">Altcoin Season (ASI)</p>
          <p class="index-card-value" style="color:${mk.altcoinSeason.index >= 75 ? '#22c55e' : mk.altcoinSeason.index <= 25 ? '#f97316' : '#eab308'}">${mk.altcoinSeason.index}</p>
          <p class="index-card-class">${escapeHtml(mk.altcoinSeason.classification)}</p>
          <p class="index-card-sub">${mk.altcoinSeason.outperformingCount}/${mk.altcoinSeason.sampleSize} vs BTC 90d</p>
          <span class="index-card-link">ASI Details →</span>
        </a>`
      : `<a href="#/coins" class="index-card glass">
          <p class="index-card-label">Alle Coins</p>
          <p class="index-card-value" style="font-size:1.5rem;color:var(--cyan)">${cmc?.coinCount ?? '…'}</p>
          <p class="index-card-class">CoinMarketCap</p>
          <p class="index-card-sub">Live Rankings &amp; Preise</p>
          <span class="index-card-link">Coins öffnen →</span>
        </a>`;

    const avgBlock = mk
      ? `<a href="#/markets#avg" class="index-card glass" style="margin-bottom:2rem;display:block">
          <p class="index-card-label">Average Crypto Index</p>
          <div style="display:flex;align-items:center;gap:2rem;flex-wrap:wrap">
            <p class="index-card-value" style="color:${fgColor(mk.averageCrypto.score)};margin:0">${mk.averageCrypto.score}</p>
            <div>
              <p class="index-card-class">${escapeHtml(mk.averageCrypto.classification)}</p>
              <p class="index-card-sub">Ø 24h ${formatPctOrDash(mk.averageCrypto.change24h)} · Top ${mk.averageCrypto.weightedCoins} gewichtet</p>
            </div>
          </div>
        </a>`
      : '';

    appEl.innerHTML = `
      <section class="hero">
        <p class="hero-label">Crypto Intelligence</p>
        <h1>TokenSync<span class="sub gradient-text">Markets · News · Sentiment</span></h1>
        <p>Professionelle Marktdaten, Altcoin Season Index, Average Crypto &amp; aggregierte News — mehrere Quellen, schnell aktualisiert.</p>
      </section>

      ${renderQuickNavCards()}

      <div class="dashboard-grid">
        ${mcapCard}
        ${asiCard}
        <a href="#/fear-greed" class="index-card glass">
          <p class="index-card-label">Fear &amp; Greed</p>
          <p class="index-card-value" style="color:${fgColor(fg.current.value)}">${fg.current.value}</p>
          <p class="index-card-class">${escapeHtml(fg.current.classification)}</p>
          <p class="index-card-sub">${delta !== null ? `${delta >= 0 ? '+' : ''}${delta} vs gestern` : 'Sentiment-Index'}</p>
          <span class="index-card-link">F&amp;G Hub →</span>
        </a>
      </div>

      ${avgBlock}

      <section>
        <div class="section-head">
          <h2>Top Stories</h2>
          <a href="#/news" class="link-arrow">Alle News →</a>
        </div>
        <div class="news-grid-featured">${featured ? newsCard(featured, true) : ''}</div>
        <div class="grid-4">${top.map((a) => newsCard(a, false)).join('')}</div>
      </section>`;
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p><p>Server starten: <code>npm run dev</code></p>`;
  }
}

/* ——— Markets ——— */
async function renderMarkets(tab) {
  showLoading('Marktdaten werden geladen…');
  try {
    const mk = await ensureMarkets();
    const activeTab = tab || 'overview';

    let content = '';
    if (activeTab === 'overview') {
      content = `
        ${renderGlobalStatsBar(mk.global)}
        <div class="markets-side">
          <div>
            <h3 class="panel-title">Dominanz</h3>
            ${renderDominanceChart(mk.dominanceChart)}
            ${renderGainersLosers(mk.gainers, mk.losers)}
            <h3 class="panel-title">Sektoren &amp; Kategorien</h3>
            ${renderCategories(mk.categories)}
          </div>
          <div>
            <h3 class="panel-title">Indizes</h3>
            ${renderAltcoinSeasonMeter(mk.altcoinSeason)}
            <div style="margin-top:1rem">${renderAverageCryptoMeter(mk.averageCrypto)}</div>
          </div>
        </div>`;
    } else if (activeTab === 'rankings') {
      content = `
        ${renderGlobalStatsBar(mk.global)}
        <h3 class="panel-title">Top 50 nach Market Cap</h3>
        ${renderCoinTable(mk.topCoins, 50)}`;
    } else if (activeTab === 'asi') {
      content = `
        <div class="section-head"><div>
          <h2>Altcoin Season Index (ASI)</h2>
          <p>CMC-ähnlich: Anteil der Top-Altcoins, die Bitcoin auf 90 Tage outperformen</p>
        </div></div>
        <div class="card-panel glass glow-cyan" style="text-align:center;padding:2rem">
          <p style="font-size:4rem;font-weight:700;margin:0;color:${mk.altcoinSeason.index >= 75 ? '#22c55e' : mk.altcoinSeason.index <= 25 ? '#f97316' : '#eab308'}">${mk.altcoinSeason.index}</p>
          <p style="font-size:1.25rem;color:var(--muted)">${escapeHtml(mk.altcoinSeason.classification)}</p>
        </div>
        ${renderAltcoinSeasonMeter(mk.altcoinSeason)}
        <h3 class="panel-title" style="margin-top:2rem">Top Altcoins — 90-Tage Performance</h3>
        ${renderCoinTable(mk.topCoins.filter((c) => c.symbol !== 'BTC' && c.symbol !== 'USDT' && c.symbol !== 'USDC').slice(0, 30), 30)}`;
    } else if (activeTab === 'avg') {
      content = `
        <div class="section-head"><div>
          <h2>Average Crypto Index</h2>
          <p>Market-Cap-gewichteter Durchschnitt der Top-50 — Gesamtmarkt-Stimmung</p>
        </div></div>
        ${renderAverageCryptoMeter(mk.averageCrypto)}
        <div class="grid-2" style="margin-top:1.5rem">
          <div class="stat-box glass"><div class="label">Score (0–100)</div><div class="value">${mk.averageCrypto.score}</div></div>
          <div class="stat-box glass"><div class="label">Einstufung</div><div class="value" style="font-size:1.1rem">${escapeHtml(mk.averageCrypto.classification)}</div></div>
        </div>
        <h3 class="panel-title" style="margin-top:2rem">Basis: Top Coins</h3>
        ${renderCoinTable(mk.topCoins.slice(0, 20), 20)}`;
    }

    appEl.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Market Cap Hub</h2>
          <p>Global · Rankings · ASI · Average Crypto · ${mk.sources.length} Quellen · ${timeAgo(mk.lastUpdated)}</p>
          <div class="sources-pill">${mk.sources.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}</div>
        </div>
      </div>
      ${marketTabsHtml(activeTab)}
      <div class="markets-layout">${content}</div>`;

    appEl.querySelectorAll('.page-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const h = btn.getAttribute('data-hash');
        if (h) location.hash = h.slice(1);
      });
    });
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
  }
}

/* ——— CoinMarketCap — Alle Coins (clientseitige Suche, kein Lag) ——— */
const CMC_PAGE_SIZE = 50;

function filterCmcCoinsLocal(coins, search) {
  const q = search.trim().toLowerCase();
  if (!q) return coins;
  return coins.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q),
  );
}

function paginateCmcCoins(coins, page, limit) {
  const total = coins.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * limit;
  return {
    items: coins.slice(start, start + limit),
    total,
    page: p,
    totalPages,
  };
}

function getCmcListForView() {
  if (!cmcAllCoins) return [];
  const filtered = filterCmcCoinsLocal(cmcAllCoins, cmcSearch);
  if (cmcViewMode !== 'live24') return filtered;

  const sorted = [...cmcAllCoins].sort((a, b) => a.rank - b.rank);
  if (cmcLiveFilter === 'top50') return sorted.slice(0, 50);
  if (cmcLiveFilter === 'top100') return sorted.slice(0, 100);
  if (cmcLiveFilter === 'gainers') {
    return [...cmcAllCoins]
      .filter((c) => c.change24h != null)
      .sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0))
      .slice(0, 50);
  }
  if (cmcLiveFilter === 'losers') {
    return [...cmcAllCoins]
      .filter((c) => c.change24h != null)
      .sort((a, b) => (a.change24h ?? 0) - (b.change24h ?? 0))
      .slice(0, 50);
  }
  return filtered;
}

function mergeCmcLiveIntoCache(liveCoins) {
  const byId = new Map(liveCoins.map((c) => [c.id, c]));
  cmcAllCoins = cmcAllCoins.map((c) => (byId.has(c.id) ? { ...c, ...byId.get(c.id) } : c));
  if (cmcLiveMeta) cmcListMeta.lastUpdated = cmcLiveMeta.lastUpdated;
}

function stopCmcLivePoll() {
  if (cmcLivePollId) clearInterval(cmcLivePollId);
  cmcLivePollId = null;
}

async function refreshCmcLiveData() {
  const statusEl = document.getElementById('cmc-live-status');
  try {
    const data = await fetchCmcLive(200);
    const prev = new Map(cmcAllCoins.map((c) => [c.id, c.price]));
    cmcLiveMeta = data;
    mergeCmcLiveIntoCache(data.coins);
    data.coins.forEach((c) => cmcPrevPrices.set(c.id, c.price));
    if (statusEl) {
      statusEl.innerHTML = `<span class="cmc-live-dot"></span> Live · ${timeAgo(data.lastUpdated)} · nächstes Update ~30s`;
    }
    if (cmcViewMode === 'live24') updateCmcCoinsView(prev);
  } catch (e) {
    if (statusEl) statusEl.textContent = `Live-Fehler: ${e.message}`;
  }
}

function startCmcLivePoll() {
  stopCmcLivePoll();
  void refreshCmcLiveData();
  cmcLivePollId = setInterval(() => void refreshCmcLiveData(), 30000);
}

function setCmcViewMode(mode) {
  if (mode === cmcViewMode) return;
  cmcViewMode = mode;
  cmcPage = 1;
  document.querySelectorAll('[data-cmc-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cmcView === mode);
  });
  const filtersEl = document.getElementById('cmc-live-filters');
  if (filtersEl) filtersEl.classList.toggle('hidden', mode !== 'live24');
  if (mode === 'live24') startCmcLivePoll();
  else stopCmcLivePoll();
  updateCmcCoinsView();
}

function setCmcLiveFilter(filter) {
  if (filter === cmcLiveFilter) return;
  cmcLiveFilter = filter;
  cmcPage = 1;
  document.querySelectorAll('[data-cmc-live-filter]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cmcLiveFilter === filter);
  });
  updateCmcCoinsView();
}

function bindCmcViewMenu() {
  const menu = document.getElementById('cmc-view-menu');
  if (!menu || menu.dataset.bound) return;
  menu.dataset.bound = '1';
  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmc-view]');
    if (!btn) return;
    setCmcViewMode(btn.dataset.cmcView);
  });

  const filters = document.getElementById('cmc-live-filters');
  filters?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cmc-live-filter]');
    if (!chip) return;
    setCmcLiveFilter(chip.dataset.cmcLiveFilter);
  });
}

function updateCmcCoinsView(prevPricesForFlash) {
  if (!cmcAllCoins) return;
  const list = getCmcListForView();
  const paginate = cmcViewMode === 'table' || cmcLiveFilter === 'page';
  const { items, total, page, totalPages } = paginate
    ? paginateCmcCoins(list, cmcPage, CMC_PAGE_SIZE)
    : { items: list, total: list.length, page: 1, totalPages: 1 };

  const tableEl = document.getElementById('cmc-table');
  const pagEl = document.getElementById('cmc-pagination');
  const metaEl = document.getElementById('cmc-meta');
  if (!tableEl) return;

  if (cmcViewMode === 'live24') {
    tableEl.innerHTML = renderCmcLiveTable(items);
    if (prevPricesForFlash) {
      items.forEach((c) => {
        const el = document.querySelector(`[data-live-price-id="${c.id}"]`);
        const prev = prevPricesForFlash.get(c.id);
        if (!el || prev == null || prev === c.price) return;
        el.classList.remove('flash-up', 'flash-down');
        void el.offsetWidth;
        el.classList.add(c.price > prev ? 'flash-up' : 'flash-down');
        setTimeout(() => el.classList.remove('flash-up', 'flash-down'), 600);
      });
    }
  } else {
    tableEl.innerHTML = renderCmcCoinTable(items);
  }

  if (pagEl) {
    pagEl.innerHTML = paginate && totalPages > 1 ? renderPagination(page, totalPages, total) : '';
    pagEl.style.display = paginate && totalPages > 1 ? '' : 'none';
  }

  if (metaEl) {
    if (cmcViewMode === 'live24') {
      metaEl.textContent = cmcSearch
        ? `${total.toLocaleString('de-DE')} Treffer (Live) · Top 200 aktualisiert`
        : `Live 24h · ${cmcAllCoins.length.toLocaleString('de-DE')} Coins · ${timeAgo(cmcLiveMeta?.lastUpdated ?? cmcListMeta?.lastUpdated ?? '')}`;
    } else {
      metaEl.textContent = cmcSearch
        ? `${total.toLocaleString('de-DE')} Treffer · ${cmcAllCoins.length.toLocaleString('de-DE')} gesamt`
        : `${cmcAllCoins.length.toLocaleString('de-DE')} Kryptowährungen · ${timeAgo(cmcListMeta?.lastUpdated ?? '')}`;
    }
  }

  pagEl?.querySelectorAll('.page-btn[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = Number(btn.getAttribute('data-page'));
      if (!p) return;
      cmcPage = p;
      updateCmcCoinsView();
      document.getElementById('cmc-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  bindCmcRowClicks();
}

function bindCmcRowClicks() {
  document.getElementById('cmc-table')?.querySelectorAll('.coin-row-click').forEach((row) => {
    if (row.dataset.clickBound) return;
    row.dataset.clickBound = '1';
    const go = () => {
      const slug = row.getAttribute('data-slug');
      if (slug) location.hash = `/coin/${slug}`;
    };
    row.addEventListener('click', go);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  });
}

function bindCmcSearchEvents() {
  const input = document.getElementById('cmc-search');
  const btn = document.getElementById('cmc-search-btn');
  if (!input || input.dataset.bound) return;
  input.dataset.bound = '1';

  const applySearch = () => {
    cmcSearch = input.value.trim();
    cmcPage = 1;
    updateCmcCoinsView();
  };

  btn?.addEventListener('click', applySearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applySearch();
  });
  input.addEventListener('input', () => {
    cmcSearch = input.value.trim();
    cmcPage = 1;
    clearTimeout(cmcSearchTimer);
    cmcSearchTimer = setTimeout(updateCmcCoinsView, 120);
  });
}

async function renderCoins() {
  if (cmcCoinsPageMounted && !document.getElementById('cmc-table')) {
    cmcCoinsPageMounted = false;
  }
  const needsLoad = !cmcAllCoins;

  if (needsLoad) {
    showLoading('Coins von CoinMarketCap werden geladen…');
    cmcCoinsPageMounted = false;
  }

  try {
    if (needsLoad) {
      const data = await fetchCmcList();
      cmcAllCoins = data.coins.map((c) => ({
        ...c,
        imageUrl: c.imageUrl || `https://s2.coinmarketcap.com/static/img/coins/64x64/${c.id}.png`,
      }));
      cmcListMeta = { lastUpdated: data.lastUpdated, total: data.total };
    }

    if (!cmcCoinsPageMounted) {
      appEl.innerHTML = `
        <div class="section-head">
          <div>
            <h2>Alle Coins</h2>
            <p id="cmc-meta">CoinMarketCap · ${cmcAllCoins.length.toLocaleString('de-DE')} Kryptowährungen</p>
            <div class="sources-pill"><span>CoinMarketCap Pro API</span><span>Schnellsuche lokal</span></div>
          </div>
        </div>
        ${renderCmcViewMenu(cmcViewMode)}
        ${renderCmcLiveFilters(cmcLiveFilter, cmcViewMode !== 'live24')}
        <div class="cmc-search-bar glass">
          <label for="cmc-search">Suche</label>
          <input type="search" id="cmc-search" placeholder="Name oder Symbol (z.B. BTC, Ethereum)…" value="${escapeHtml(cmcSearch)}" autocomplete="off" />
          <button type="button" class="page-btn" id="cmc-search-btn">Suchen</button>
        </div>
        <div id="cmc-table"></div>
        <div id="cmc-pagination"></div>`;
      bindCmcSearchEvents();
      bindCmcViewMenu();
      if (cmcViewMode === 'live24') startCmcLivePoll();
      cmcCoinsPageMounted = true;
    } else {
      const input = document.getElementById('cmc-search');
      if (input && input.value !== cmcSearch) input.value = cmcSearch;
    }

    updateCmcCoinsView();
  } catch (e) {
    cmcAllCoins = null;
    cmcCoinsPageMounted = false;
    appEl.innerHTML = `
      <p class="error-msg">${escapeHtml(e.message)}</p>
      <p style="color:var(--muted);font-size:0.85rem">Prüfe <code>server/.env</code>: <code>CMC_API_KEY</code>. Erster Abruf kann 10–30 Sekunden dauern.</p>
      <button type="button" class="page-btn" onclick="location.reload()">Neu laden</button>`;
  }
}

/* ——— Coin Detail & Kurs-Chart ——— */

function mountCoinDetailChart(chartEl, candles, range, livePrice) {
  if (!chartEl) return null;
  destroyInteractiveChart(chartEl);
  const ctrl = mountInteractiveCandlestickChart(chartEl, {
    candles,
    range,
    liveLabel: 'Live · Mark-Preis',
  });
  if (ctrl && livePrice > 0) ctrl.setLivePrice(livePrice);
  return ctrl;
}

async function loadCoinChartOnly(slug, range) {
  const chart = await fetchCoinChart(slug, range);
  const chartEl = document.getElementById('coin-chart');
  const changeEl = document.getElementById('coin-range-change');
  if (chartEl) {
    mountCoinDetailChart(chartEl, chart.candles, range, coinLiveMarkPrice);
  }
  if (changeEl) {
    changeEl.textContent = formatPct(chart.changePercent);
    changeEl.className = chart.changePercent >= 0 ? 'delta-up' : 'delta-down';
  }
  document.querySelectorAll('.cg-range-tab[data-range]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.range === range);
    btn.setAttribute('aria-selected', String(btn.dataset.range === range));
  });
}

function stopCoinLivePoll() {
  if (coinLiveInterval) clearInterval(coinLiveInterval);
  coinLiveInterval = null;
  coinLiveSlug = null;
  coinLiveMarkPrice = 0;
  const chartEl = document.getElementById('coin-chart');
  if (chartEl) destroyInteractiveChart(chartEl);
}

function startCoinLivePoll(slug) {
  stopCoinLivePoll();
  coinLiveSlug = slug;
  const tick = async () => {
    if (coinLiveSlug !== slug) return;
    try {
      const live = await fetchCoinLive(slug);
      updateLivePricePanel(live);
      if (live?.referencePrice > 0) {
        coinLiveMarkPrice = live.referencePrice;
        updateInteractiveChartLive('coin-chart', live.referencePrice);
      }
    } catch (_) { /* stillen Fehler bei Poll */ }
  };
  void tick();
  coinLiveInterval = setInterval(tick, 3000);
}

async function renderCoinDetail(slug) {
  stopCoinLivePoll();
  showLoading('Coin wird geladen…');
  try {
    const [coin, chart, live] = await Promise.all([
      fetchCoinDetail(slug),
      fetchCoinChart(slug, coinChartRange),
      fetchCoinLive(slug),
    ]);

    const img = cmcImageUrl(coin);
    const rangeTabs = renderCgChartRangeTabs(coinChartRange, 'data-range');

    appEl.innerHTML = `
      <a href="#/coins" class="back-link">← Alle Coins</a>

      <div class="tv-terminal glass">
        <div class="tv-terminal-head">
          <img class="coin-detail-logo" src="${escapeHtml(img)}" alt="" width="48" height="48" />
          <div>
            <h1 class="tv-coin-name">${escapeHtml(coin.name)} <span>${escapeHtml(coin.symbol)}</span></h1>
            <p class="tv-coin-meta">Rang #${coin.rank} · MCap ${formatUsd(coin.marketCap, true)} · Vol ${formatUsd(coin.volume24h, true)}</p>
          </div>
          <a href="#/paper" class="paper-head-link">Paper Trading →</a>
        </div>

        <div class="tv-layout-main">
          <div id="live-price-panel">${renderLivePricePanel(live)}</div>

          <div class="tv-stats-row">
            <div class="tv-mini-stat"><span>24h</span><strong class="${pctClass(coin.change24h)}">${formatPctOrDash(coin.change24h)}</strong></div>
            <div class="tv-mini-stat"><span>7d</span><strong class="${pctClass(coin.change7d)}">${formatPctOrDash(coin.change7d)}</strong></div>
            <div class="tv-mini-stat"><span>30d</span><strong class="${pctClass(coin.change30d)}">${formatPctOrDash(coin.change30d)}</strong></div>
            <div class="tv-mini-stat"><span>Range High</span><strong>${formatUsd(chart.high)}</strong></div>
            <div class="tv-mini-stat"><span>Range Low</span><strong>${formatUsd(chart.low)}</strong></div>
            <div class="tv-mini-stat"><span>Chart Δ</span><strong id="coin-range-change" class="${chart.changePercent >= 0 ? 'tv-bull' : 'tv-bear'}">${formatPct(chart.changePercent)}</strong></div>
          </div>

          <div class="tv-chart-section">
            ${rangeTabs}
            <div id="coin-chart" class="coin-chart-mount"></div>
          </div>
        </div>
      </div>`;

    document.querySelectorAll('.cg-range-tab[data-range]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const range = btn.dataset.range;
        if (!range || range === coinChartRange) return;
        coinChartRange = range;
        document.querySelectorAll('.cg-range-tab[data-range]').forEach((b) => {
          b.classList.toggle('active', b.dataset.range === range);
          b.setAttribute('aria-selected', String(b.dataset.range === range));
        });
        btn.disabled = true;
        try {
          await loadCoinChartOnly(slug, range);
        } catch (e) {
          document.getElementById('coin-chart').innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
        }
        btn.disabled = false;
      });
    });
    coinLiveMarkPrice = live.referencePrice;
    const chartEl = document.getElementById('coin-chart');
    mountCoinDetailChart(chartEl, chart.candles, coinChartRange, live.referencePrice);
    startCoinLivePoll(slug);
  } catch (e) {
    stopCoinLivePoll();
    appEl.innerHTML = `
      <a href="#/coins" class="back-link">← Alle Coins</a>
      <p class="error-msg">${escapeHtml(e.message)}</p>
      <p style="color:var(--muted);font-size:0.85rem">Manche Coins haben auf CoinGecko einen anderen Namen. Versuche einen Top-Coin wie Bitcoin oder Ethereum.</p>`;
  }
}

/* ——— News ——— */
async function renderNews() {
  showLoading('News werden aggregiert…');
  try {
    await loadNewsFiltered();
    const news = newsCache;
    const sources = [...new Map(news.articles.map((a) => [a.sourceId, a.source])).entries()].sort((a, b) =>
      a[1].localeCompare(b[1]),
    );
    const cats = ['all', 'crypto', 'bitcoin', 'defi', 'regulation', 'macro', 'markets', 'nft'];

    appEl.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Crypto News Hub</h2>
          <p>${news.articles.length} Artikel · ${news.sourcesActive} Quellen · ${timeAgo(news.lastUpdated)}</p>
        </div>
      </div>
      <div class="filter-bar glass">
        <label>Quelle</label>
        <select id="filter-source">
          <option value="">Alle Quellen</option>
          ${sources.map(([id, name]) => `<option value="${id}" ${newsFilters.source === id ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
        </select>
        <div class="filter-chips" id="filter-cats">
          ${cats.map((c) => `<button type="button" class="chip ${newsFilters.category === c ? 'active' : ''}" data-cat="${c}">${c === 'all' ? 'Alle' : c}</button>`).join('')}
        </div>
      </div>
      <div id="news-results">${renderNewsGrid(news.articles, 1)}</div>`;

    document.getElementById('filter-source').addEventListener('change', async (e) => {
      newsFilters.source = e.target.value;
      await loadNewsFiltered();
      document.getElementById('news-results').innerHTML = renderNewsGrid(newsCache.articles, 1);
    });
    document.getElementById('filter-cats').addEventListener('click', async (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      newsFilters.category = btn.dataset.cat;
      btn.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      await loadNewsFiltered();
      document.getElementById('news-results').innerHTML = renderNewsGrid(newsCache.articles, 1);
    });
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
  }
}

async function renderNewsDetail(id) {
  showLoading('Artikel wird geladen…');
  try {
    const news = await ensureNews();
    const article = news.articles.find((a) => a.id === id);
    if (!article) {
      appEl.innerHTML = `<p class="error-msg">Artikel nicht gefunden.</p><a href="#/news" class="back-link">← News</a>`;
      return;
    }
    const related = news.articles
      .filter((a) => a.id !== id && a.categories.some((c) => article.categories.includes(c)))
      .slice(0, 4);
    const img = escapeHtml(article.imageUrl || PLACEHOLDER_IMG);

    appEl.innerHTML = `
      <article class="article-detail">
        <a href="#/news" class="back-link">← Alle News</a>
        <div class="hero-img"><img src="${img}" alt="" /></div>
        <div class="news-meta">
          <span class="badge badge-cyan">${escapeHtml(article.source)}</span>
          ${categoryBadges(article.categories, 5)}
          <span class="badge badge-gray">${timeAgo(article.publishedAt)}</span>
        </div>
        <h1>${escapeHtml(article.title)}</h1>
        <p style="font-size:1.1rem;line-height:1.65;color:#cbd5e1;margin-top:1rem">${escapeHtml(article.summary)}</p>
        <a href="${escapeHtml(article.url)}" class="btn-primary" target="_blank" rel="noopener noreferrer">Artikel bei ${escapeHtml(article.source)} ↗</a>
        ${related.length ? `<section style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border)"><h2 style="font-size:1.25rem;margin-bottom:1rem">Verwandte Meldungen</h2><div class="grid-4">${related.map((a) => newsCard(a, false)).join('')}</div></section>` : ''}
      </article>`;
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
  }
}

async function renderFearGreed() {
  showLoading('Fear & Greed wird geladen…');
  try {
    const fg = await ensureFg();
    const delta = fg.yesterday ? fg.current.value - fg.yesterday.value : null;

    appEl.innerHTML = `
      <div class="section-head">
        <div><h2>Fear &amp; Greed Index</h2><p>Sentiment · Historie · Marktkontext</p></div>
      </div>
      <div class="fg-layout fg-layout-top">
        <div class="card-panel glass glow-cyan">${fearGreedGauge(fg.current.value, fg.current.classification, 'lg')}
          <p style="text-align:center;font-size:0.7rem;color:#475569;margin-top:1rem">${timeAgo(fg.lastUpdated)}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="stat-row">
            <div class="stat-box glass"><div class="label">Heute</div><div class="value">${fg.current.value}</div></div>
            <div class="stat-box glass"><div class="label">Gestern</div><div class="value">${fg.yesterday?.value ?? '—'}</div>
              ${delta !== null ? `<p class="${delta >= 0 ? 'delta-up' : 'delta-down'}">${delta >= 0 ? '+' : ''}${delta}</p>` : ''}
            </div>
          </div>
          <div class="info-box">Der Index misst die Marktstimmung von 0 (Extreme Fear) bis 100 (Extreme Greed).</div>
        </div>
      </div>
      <section style="margin:2rem 0"><h2 class="panel-title">Marktkontext</h2>${renderMarketStrip(fg.market)}</section>
      <section class="card-panel glass">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;margin-bottom:1rem">
          <h2 class="panel-title" style="margin:0">Historie</h2>
          <div class="chart-tabs" id="chart-tabs">
            <button type="button" class="chart-tab ${chartDays === 7 ? 'active' : ''}" data-days="7">7T</button>
            <button type="button" class="chart-tab ${chartDays === 30 ? 'active' : ''}" data-days="30">30T</button>
            <button type="button" class="chart-tab ${chartDays === 90 ? 'active' : ''}" data-days="90">90T</button>
          </div>
        </div>
        <div id="fg-chart">${renderFearGreedChart(fg.history, chartDays)}</div>
      </section>
      <div class="fg-layout fg-layout-split">
        <section class="card-panel glass"><h2 class="panel-title">Komponenten</h2>${renderComponentBars(fg.components)}</section>
        <section class="card-panel glass"><h2 class="panel-title">Tabelle</h2><div id="fg-table">${renderHistoryTable(fg.history, chartDays)}</div></section>
      </div>`;

    document.getElementById('chart-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.chart-tab');
      if (!btn) return;
      chartDays = Number(btn.dataset.days);
      document.querySelectorAll('.chart-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('fg-chart').innerHTML = renderFearGreedChart(fg.history, chartDays);
      document.getElementById('fg-table').innerHTML = renderHistoryTable(fg.history, chartDays);
    });
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
  }
}

function startPolling() {
  clearInterval(newsPollId);
  clearInterval(fgPollId);
  clearInterval(marketPollId);

  newsPollId = setInterval(async () => {
    try {
      newsCache = await fetchNews();
      const r = parseRoute();
      if (r.page === 'dashboard') await renderDashboard();
      else if (r.page === 'news') await renderNews();
    } catch (_) {}
  }, 60000);

  fgPollId = setInterval(async () => {
    try {
      fgCache = await fetchFearGreed();
      const r = parseRoute();
      if (r.page === 'fear-greed') await renderFearGreed();
      else if (r.page === 'dashboard') await renderDashboard();
    } catch (_) {}
  }, 300000);

  marketPollId = setInterval(async () => {
    try {
      marketCache = await fetchMarkets();
      const r = parseRoute();
      if (r.page === 'markets') await renderMarkets(r.tab);
      else if (r.page === 'dashboard') await renderDashboard();
    } catch (_) {}
  }, 180000);
}

async function router() {
  const route = parseRoute();
  if (route.page !== 'coins') {
    cmcCoinsPageMounted = false;
    stopCmcLivePoll();
  }
  if (route.page !== 'coin-detail') stopCoinLivePoll();
  if (route.page !== 'paper') stopPaperPoll();
  setActiveNav(route.page);

  if (route.page === 'dashboard') await renderDashboard();
  else if (route.page === 'markets') await renderMarkets(route.tab);
  else if (route.page === 'coin-detail') await renderCoinDetail(route.slug);
  else if (route.page === 'coins') await renderCoins();
  else if (route.page === 'news') await renderNews();
  else if (route.page === 'news-detail') await renderNewsDetail(route.id);
  else if (route.page === 'fear-greed') await renderFearGreed();
  else if (route.page === 'paper') await renderPaperPageRoute();
}

function stopPaperPoll() {
  if (paperPollId) clearInterval(paperPollId);
  paperPollId = null;
  if (typeof stopPaperPageEngine === 'function') stopPaperPageEngine();
}

function startPaperPoll() {
  stopPaperPoll();
  if (typeof startPaperPageEngine === 'function') startPaperPageEngine();
}

async function renderPaperPageRoute() {
  showLoading('Paper Portfolio…');
  await renderPaperPage();
  startPaperPoll();
}

document.addEventListener(
  'error',
  (e) => {
    const el = e.target;
    if (!el || el.tagName !== 'IMG') return;
    if (el.classList.contains('coin-logo')) {
      el.onerror = null;
      const sym = el.closest('.coin-cell')?.querySelector('small')?.textContent?.slice(0, 3) || '?';
      const span = document.createElement('span');
      span.className = 'cmc-icon';
      span.textContent = sym;
      el.parentNode?.replaceChild(span, el);
      return;
    }
    imgOnError(el);
  },
  true,
);

function renderBootError(html) {
  appEl.innerHTML = `<div class="boot-error glass" style="padding:2rem;margin:1rem 0">${html}</div>`;
}

async function ensureBackend() {
  const origin = window.TOKENSYNC_API_ORIGIN || location.origin;
  try {
    const res = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

window.addEventListener('hashchange', () => void router());
window.addEventListener('load', async () => {
  if (!(await ensureBackend())) {
    renderBootError(`
      <h2 style="margin:0 0 1rem;color:#f87171">Backend nicht erreichbar</h2>
      <p style="color:#94a3b8;line-height:1.6">TokenSync braucht den Node-Server auf Port <strong>3001</strong>.</p>
      <ol style="color:#cbd5e1;line-height:1.8;margin:1rem 0 0 1.2rem">
        <li>Terminal: <code style="background:#1e293b;padding:2px 6px;border-radius:4px">npm run dev</code></li>
        <li>Browser: <a href="http://localhost:3001" style="color:#22d3ee">http://localhost:3001</a></li>
      </ol>
      <p style="margin-top:1rem;font-size:0.85rem;color:#64748b">Repo: <a href="https://github.com/devbadya/Exit-Liquidity" style="color:#22d3ee">github.com/devbadya/Exit-Liquidity</a></p>
      <p style="margin-top:0.5rem;font-size:0.8rem;color:#64748b">Nicht <code>index.html</code> direkt öffnen und nicht Live Server — nur <code>npm run dev</code>.</p>`);
    return;
  }
  void router();
  startPolling();
});
