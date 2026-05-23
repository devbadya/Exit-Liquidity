/** TokenSync — Hauptanwendung (Routing & Seiten) */

const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');
document.getElementById('year').textContent = String(new Date().getFullYear());

let newsCache = null;
let fgCache = null;
let newsPollId = null;
let fgPollId = null;
let newsFilters = { source: '', category: 'all' };
let chartDays = 30;

function parseRoute() {
  const hash = location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'news' && parts[1]) return { page: 'news-detail', id: parts[1] };
  if (parts[0] === 'news') return { page: 'news' };
  if (parts[0] === 'fear-greed') return { page: 'fear-greed' };
  return { page: 'dashboard' };
}

function setActiveNav(page) {
  navEl.querySelectorAll('a').forEach((a) => {
    const route = a.getAttribute('data-route');
    const active =
      (page === 'dashboard' && route === '/') ||
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

async function loadNewsFiltered() {
  newsCache = await fetchNews({
    source: newsFilters.source || undefined,
    category: newsFilters.category !== 'all' ? newsFilters.category : undefined,
  });
  return newsCache;
}

/* ——— Dashboard ——— */
async function renderDashboard() {
  showLoading('Dashboard wird geladen…');
  try {
    const [news, fg] = await Promise.all([ensureNews(), ensureFg()]);
    const featured = news.articles[0];
    const top = news.articles.slice(1, 7);
    const delta = fg.yesterday ? fg.current.value - fg.yesterday.value : null;

    appEl.innerHTML = `
      <section class="hero">
        <p class="hero-label">Crypto Intelligence Platform</p>
        <h1>Märkte verstehen.<span class="sub gradient-text">News &amp; Sentiment in Echtzeit.</span></h1>
        <p>Aggregierte Crypto-News aus ${news.sourcesActive} Quellen — jede Minute aktualisiert. Fear &amp; Greed mit Marktkontext.</p>
      </section>

      <div class="grid-2" style="margin-bottom:2rem">
        <div class="card-panel glass glow-cyan">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <h2 class="panel-title" style="margin:0">Fear &amp; Greed</h2>
            <a href="#/fear-greed" class="link-arrow">Details →</a>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:2rem;align-items:center;justify-content:center">
            ${fearGreedGauge(fg.current.value, fg.current.classification, 'lg')}
            <div style="flex:1;min-width:200px">
              ${
                delta !== null
                  ? `<div class="stat-box" style="margin-bottom:1rem">
                <div class="label">vs. gestern</div>
                <div class="value ${delta >= 0 ? 'delta-up' : 'delta-down'}">${delta >= 0 ? '+' : ''}${delta}</div>
              </div>`
                  : ''
              }
              <p style="font-size:0.85rem;color:var(--muted);line-height:1.55">Index 0–100: Extreme Fear bis Extreme Greed. Quellen: Alternative.me, CoinGecko.</p>
              <p style="font-size:0.7rem;color:#475569;margin-top:0.5rem">Aktualisiert ${timeAgo(fg.lastUpdated)}</p>
            </div>
          </div>
        </div>
        <div class="card-panel glass">
          <h2 class="panel-title">Live Status</h2>
          <ul class="status-list">
            <li><span>News-Quellen aktiv</span><span style="color:var(--cyan)">${news.sourcesActive}</span></li>
            <li><span>Artikel</span><span>${news.articles.length}</span></li>
            <li><span>News-Update</span><span>${timeAgo(news.lastUpdated)}</span></li>
            <li><span>BTC 24h</span><span class="${fg.market.btcChange24h >= 0 ? 'delta-up' : 'delta-down'}">${formatPct(fg.market.btcChange24h)}</span></li>
          </ul>
        </div>
      </div>

      ${renderMarketStrip(fg.market)}

      <section style="margin-top:3rem">
        <div class="section-head">
          <h2>Top Stories</h2>
          <a href="#/news" class="link-arrow">Alle News →</a>
        </div>
        <div class="news-grid-featured">${featured ? newsCard(featured, true) : ''}</div>
        <div class="grid-4">${top.map((a) => newsCard(a, false)).join('')}</div>
      </section>`;
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p><p>Stelle sicher, dass der Server läuft: <code>npm run dev</code></p>`;
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
          <p>${news.articles.length} Artikel · ${news.sourcesActive} Quellen · Update ${timeAgo(news.lastUpdated)}</p>
        </div>
      </div>

      <div class="filter-bar glass">
        <label>Quelle</label>
        <select id="filter-source">
          <option value="">Alle Quellen</option>
          ${sources.map(([id, name]) => `<option value="${id}" ${newsFilters.source === id ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
        </select>
        <div class="filter-chips" id="filter-cats">
          ${cats
            .map(
              (c) =>
                `<button type="button" class="chip ${newsFilters.category === c ? 'active' : ''}" data-cat="${c}">${c === 'all' ? 'Alle' : c}</button>`,
            )
            .join('')}
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

/* ——— News Detail ——— */
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
        <a href="${escapeHtml(article.url)}" class="btn-primary" target="_blank" rel="noopener noreferrer">Vollständigen Artikel lesen ↗</a>
        <p style="font-size:0.7rem;color:#475569;margin-top:1rem">Inhalt und Haftung bei der Originalquelle.</p>
        ${
          related.length
            ? `<section style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--border)">
            <h2 style="font-size:1.25rem;margin-bottom:1rem">Verwandte Meldungen</h2>
            <div class="grid-4">${related.map((a) => newsCard(a, false)).join('')}</div>
          </section>`
            : ''
        }
      </article>`;
  } catch (e) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(e.message)}</p>`;
  }
}

/* ——— Fear & Greed ——— */
async function renderFearGreed() {
  showLoading('Fear & Greed wird geladen…');
  try {
    const fg = await ensureFg();
    const delta = fg.yesterday ? fg.current.value - fg.yesterday.value : null;

    appEl.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Fear &amp; Greed Index</h2>
          <p>Gauge, Historie, Komponenten &amp; Live-Marktdaten</p>
        </div>
      </div>

      <div class="fg-layout fg-layout-top">
        <div class="card-panel glass glow-cyan">${fearGreedGauge(fg.current.value, fg.current.classification, 'lg')}
          <p style="text-align:center;font-size:0.7rem;color:#475569;margin-top:1rem">${escapeHtml(fg.current.source)} · ${timeAgo(fg.lastUpdated)}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div class="stat-row">
            <div class="stat-box glass"><div class="label">Heute</div><div class="value">${fg.current.value}</div><p style="color:var(--muted);font-size:0.85rem;margin:0.25rem 0 0">${escapeHtml(fg.current.classification)}</p></div>
            <div class="stat-box glass"><div class="label">Gestern</div><div class="value" style="color:#cbd5e1">${fg.yesterday?.value ?? '—'}</div>
              ${delta !== null ? `<p class="${delta >= 0 ? 'delta-up' : 'delta-down'}" style="margin:0.25rem 0 0">${delta >= 0 ? '+' : ''}${delta} Punkte</p>` : ''}
            </div>
          </div>
          <div class="info-box">Der Crypto Fear &amp; Greed Index misst Volatilität, Momentum, Social Media, Dominanz und Trends. TokenSync ergänzt einen Composite-Score aus Live-Marktdaten.</div>
        </div>
      </div>

      <section style="margin:2rem 0"><h2 class="panel-title">Marktkontext</h2>${renderMarketStrip(fg.market)}</section>

      <section class="card-panel glass" style="margin-bottom:1.5rem">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem">
          <h2 class="panel-title" style="margin:0">Historischer Verlauf</h2>
          <div class="chart-tabs" id="chart-tabs">
            <button type="button" class="chart-tab ${chartDays === 7 ? 'active' : ''}" data-days="7">7 Tage</button>
            <button type="button" class="chart-tab ${chartDays === 30 ? 'active' : ''}" data-days="30">30 Tage</button>
            <button type="button" class="chart-tab ${chartDays === 90 ? 'active' : ''}" data-days="90">90 Tage</button>
          </div>
        </div>
        <div id="fg-chart">${renderFearGreedChart(fg.history, chartDays)}</div>
      </section>

      <div class="fg-layout fg-layout-split">
        <section class="card-panel glass">
          <h2 class="panel-title">Index-Komponenten</h2>
          ${renderComponentBars(fg.components)}
        </section>
        <section class="card-panel glass">
          <h2 class="panel-title">Historie (Tabelle)</h2>
          <div id="fg-table">${renderHistoryTable(fg.history, chartDays)}</div>
        </section>
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
  newsPollId = setInterval(async () => {
    try {
      newsCache = await fetchNews();
      const route = parseRoute();
      if (route.page === 'dashboard') await renderDashboard();
      else if (route.page === 'news') await renderNews();
    } catch (_) { /* silent */ }
  }, 60000);
  fgPollId = setInterval(async () => {
    try {
      fgCache = await fetchFearGreed();
      if (parseRoute().page === 'fear-greed') await renderFearGreed();
      else if (parseRoute().page === 'dashboard') await renderDashboard();
    } catch (_) { /* silent */ }
  }, 300000);
}

async function router() {
  const route = parseRoute();
  setActiveNav(route.page);

  if (route.page === 'dashboard') await renderDashboard();
  else if (route.page === 'news') await renderNews();
  else if (route.page === 'news-detail') await renderNewsDetail(route.id);
  else if (route.page === 'fear-greed') await renderFearGreed();
}

document.addEventListener(
  'error',
  (e) => {
    if (e.target && e.target.tagName === 'IMG') imgOnError(e.target);
  },
  true,
);

window.addEventListener('hashchange', () => void router());
window.addEventListener('load', () => {
  void router();
  startPolling();
});
