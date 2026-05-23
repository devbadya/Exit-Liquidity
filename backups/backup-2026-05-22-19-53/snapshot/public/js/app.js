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
  if (parts[0] === 'coins') return { page: 'coins' };
  if (parts[0] === 'markets') return { page: 'markets', tab: marketTab };
  if (parts[0] === 'fear-greed') return { page: 'fear-greed' };
  return { page: 'dashboard' };
}

function setActiveNav(page) {
  navEl.querySelectorAll('a').forEach((a) => {
    const route = a.getAttribute('data-route');
    const active =
      (page === 'dashboard' && route === '/') ||
      (page === 'markets' && route === '/markets') ||
      (page === 'coins' && route === '/coins') ||
      (page === 'news' && route === '/news') ||
      (page === 'news-detail' && route === '/news') ||
      (page === 'fear-greed' && route === '/fear-greed');
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
  if (!marketCache) marketCache = await fetchMarkets();
  return marketCache;
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
    const [news, fg, mk] = await Promise.all([ensureNews(), ensureFg(), ensureMarkets()]);
    const featured = news.articles[0];
    const top = news.articles.slice(1, 5);
    const delta = fg.yesterday ? fg.current.value - fg.yesterday.value : null;

    appEl.innerHTML = `
      <section class="hero">
        <p class="hero-label">Crypto Intelligence</p>
        <h1>TokenSync<span class="sub gradient-text">Markets · News · Sentiment</span></h1>
        <p>Professionelle Marktdaten, Altcoin Season Index, Average Crypto &amp; aggregierte News — mehrere Quellen, schnell aktualisiert.</p>
      </section>

      ${renderQuickNavCards()}

      <div class="dashboard-grid">
        <a href="#/markets" class="index-card glass">
          <p class="index-card-label">Market Cap</p>
          <p class="index-card-value" style="font-size:1.35rem">${formatUsd(mk.global.totalMarketCap, true)}</p>
          <p class="index-card-class ${pctClass(mk.global.marketCapChange24h)}">${formatPct(mk.global.marketCapChange24h)} 24h</p>
          <p class="index-card-sub">BTC ${mk.global.btcDominance.toFixed(1)}% · Vol ${formatUsd(mk.global.totalVolume24h, true)}</p>
          <span class="index-card-link">Market Hub →</span>
        </a>
        <a href="#/markets#asi" class="index-card glass">
          <p class="index-card-label">Altcoin Season (ASI)</p>
          <p class="index-card-value" style="color:${mk.altcoinSeason.index >= 75 ? '#22c55e' : mk.altcoinSeason.index <= 25 ? '#f97316' : '#eab308'}">${mk.altcoinSeason.index}</p>
          <p class="index-card-class">${escapeHtml(mk.altcoinSeason.classification)}</p>
          <p class="index-card-sub">${mk.altcoinSeason.outperformingCount}/${mk.altcoinSeason.sampleSize} vs BTC 90d</p>
          <span class="index-card-link">ASI Details →</span>
        </a>
        <a href="#/fear-greed" class="index-card glass">
          <p class="index-card-label">Fear &amp; Greed</p>
          <p class="index-card-value" style="color:${fgColor(fg.current.value)}">${fg.current.value}</p>
          <p class="index-card-class">${escapeHtml(fg.current.classification)}</p>
          <p class="index-card-sub">${delta !== null ? `${delta >= 0 ? '+' : ''}${delta} vs gestern` : 'Sentiment-Index'}</p>
          <span class="index-card-link">F&amp;G Hub →</span>
        </a>
      </div>

      <a href="#/markets#avg" class="index-card glass" style="margin-bottom:2rem;display:block">
        <p class="index-card-label">Average Crypto Index</p>
        <div style="display:flex;align-items:center;gap:2rem;flex-wrap:wrap">
          <p class="index-card-value" style="color:${fgColor(mk.averageCrypto.score)};margin:0">${mk.averageCrypto.score}</p>
          <div>
            <p class="index-card-class">${escapeHtml(mk.averageCrypto.classification)}</p>
            <p class="index-card-sub">Ø 24h ${formatPctOrDash(mk.averageCrypto.change24h)} · Ø 7d ${formatPctOrDash(mk.averageCrypto.change7d)} · Top ${mk.averageCrypto.weightedCoins} gewichtet</p>
          </div>
        </div>
      </a>

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

/* ——— CoinMarketCap — Alle Coins ——— */
async function renderCoins() {
  showLoading('Coins von CoinMarketCap werden geladen…');
  try {
    const data = await fetchCmcCoins({ page: cmcPage, limit: 50, search: cmcSearch || undefined });

    appEl.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Alle Coins</h2>
          <p>CoinMarketCap · ${data.total.toLocaleString('de-DE')} Kryptowährungen · ${timeAgo(data.lastUpdated)}</p>
          <div class="sources-pill"><span>CoinMarketCap Pro API</span></div>
        </div>
      </div>

      <div class="cmc-search-bar glass">
        <label for="cmc-search">Suche</label>
        <input type="search" id="cmc-search" placeholder="Name oder Symbol (z.B. BTC, Ethereum)…" value="${escapeHtml(cmcSearch)}" autocomplete="off" />
        <button type="button" class="page-btn" id="cmc-search-btn">Suchen</button>
      </div>

      <div id="cmc-table">${renderCmcCoinTable(data.coins)}</div>
      <div id="cmc-pagination">${renderPagination(data.page, data.totalPages, data.total)}</div>`;

    const runSearch = () => {
      cmcSearch = document.getElementById('cmc-search').value.trim();
      cmcPage = 1;
      void renderCoins();
    };

    document.getElementById('cmc-search-btn').addEventListener('click', runSearch);
    document.getElementById('cmc-search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSearch();
    });
    document.getElementById('cmc-search').addEventListener('input', () => {
      clearTimeout(cmcSearchTimer);
      cmcSearchTimer = setTimeout(runSearch, 400);
    });

    appEl.querySelectorAll('.page-btn[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = Number(btn.getAttribute('data-page'));
        if (!p) return;
        cmcPage = p;
        void renderCoins();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  } catch (e) {
    appEl.innerHTML = `
      <p class="error-msg">${escapeHtml(e.message)}</p>
      <p style="color:var(--muted);font-size:0.85rem">Stelle sicher, dass <code>CMC_API_KEY</code> in <code>server/.env</code> gesetzt ist und der Server läuft. Der erste Abruf kann 10–30 Sekunden dauern.</p>
      <button type="button" class="page-btn" onclick="location.reload()">Neu laden</button>`;
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
  setActiveNav(route.page);

  if (route.page === 'dashboard') await renderDashboard();
  else if (route.page === 'markets') await renderMarkets(route.tab);
  else if (route.page === 'coins') await renderCoins();
  else if (route.page === 'news') await renderNews();
  else if (route.page === 'news-detail') await renderNewsDetail(route.id);
  else if (route.page === 'fear-greed') await renderFearGreed();
}

document.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'IMG') imgOnError(e.target);
}, true);

window.addEventListener('hashchange', () => void router());
window.addEventListener('load', () => {
  void router();
  startPolling();
});
