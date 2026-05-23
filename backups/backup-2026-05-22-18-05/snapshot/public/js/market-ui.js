/** TokenSync — Market Cap & Index UI */

function pctClass(v) {
  if (v == null) return '';
  return v >= 0 ? 'delta-up' : 'delta-down';
}

function formatPctOrDash(v) {
  if (v == null || Number.isNaN(v)) return '—';
  return formatPct(v);
}

function renderGlobalStatsBar(g) {
  return `
    <div class="global-bar glass">
      <div class="global-stat hero-stat">
        <span class="gs-label">Gesamt Market Cap</span>
        <span class="gs-value">${formatUsd(g.totalMarketCap, true)}</span>
        <span class="gs-chg ${pctClass(g.marketCapChange24h)}">${formatPct(g.marketCapChange24h)} (24h)</span>
      </div>
      <div class="global-stat">
        <span class="gs-label">24h Volumen</span>
        <span class="gs-value">${formatUsd(g.totalVolume24h, true)}</span>
      </div>
      <div class="global-stat">
        <span class="gs-label">BTC Dominanz</span>
        <span class="gs-value">${g.btcDominance.toFixed(1)}%</span>
      </div>
      <div class="global-stat">
        <span class="gs-label">ETH Dominanz</span>
        <span class="gs-value">${g.ethDominance.toFixed(1)}%</span>
      </div>
      <div class="global-stat">
        <span class="gs-label">Aktive Coins</span>
        <span class="gs-value">${g.activeCryptos.toLocaleString('de-DE')}</span>
      </div>
      <div class="global-stat">
        <span class="gs-label">DeFi Cap</span>
        <span class="gs-value">${formatUsd(g.defiMarketCap, true)}</span>
        <span class="gs-chg ${pctClass(g.defiChange24h)}">${formatPctOrDash(g.defiChange24h)}</span>
      </div>
      <div class="global-stat">
        <span class="gs-label">Stablecoin Cap</span>
        <span class="gs-value">${formatUsd(g.stablecoinMarketCap, true)}</span>
        <span class="gs-chg ${pctClass(g.stablecoinChange24h)}">${formatPctOrDash(g.stablecoinChange24h)}</span>
      </div>
    </div>`;
}

function renderDominanceChart(chart) {
  const segments = chart
    .map(
      (s) =>
        `<div class="dom-seg" style="width:${s.value}%;background:${s.color}" title="${escapeHtml(s.name)} ${s.value.toFixed(1)}%"></div>`,
    )
    .join('');
  const legend = chart
    .map(
      (s) =>
        `<span class="dom-legend-item"><i style="background:${s.color}"></i>${escapeHtml(s.name)} ${s.value.toFixed(1)}%</span>`,
    )
    .join('');
  return `<div class="dominance-wrap"><div class="dominance-bar">${segments}</div><div class="dominance-legend">${legend}</div></div>`;
}

function renderIndexCard(title, index, classification, subtitle, href, colorFn) {
  const color = colorFn ? colorFn(index) : fgColor(index);
  return `
    <a href="${href}" class="index-card glass">
      <p class="index-card-label">${escapeHtml(title)}</p>
      <p class="index-card-value" style="color:${color}">${index}</p>
      <p class="index-card-class">${escapeHtml(classification)}</p>
      <p class="index-card-sub">${escapeHtml(subtitle)}</p>
      <span class="index-card-link">Details →</span>
    </a>`;
}

function renderCoinTable(coins, limit) {
  const rows = coins.slice(0, limit ?? 50);
  return `
    <div class="table-scroll">
      <table class="coin-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Coin</th>
            <th class="num">Preis</th>
            <th class="num">Market Cap</th>
            <th class="num">24h %</th>
            <th class="num">7d %</th>
            <th class="num">30d %</th>
            <th class="num">Vol 24h</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (c) => `
            <tr>
              <td class="rank">${c.rank}</td>
              <td class="coin-cell">
                <img src="${escapeHtml(c.image)}" alt="" width="24" height="24" loading="lazy" />
                <span>
                  <strong>${escapeHtml(c.name)}</strong>
                  <small>${escapeHtml(c.symbol)}</small>
                </span>
              </td>
              <td class="num">${formatUsd(c.price)}</td>
              <td class="num">${formatUsd(c.marketCap, true)}</td>
              <td class="num ${pctClass(c.change24h)}">${formatPctOrDash(c.change24h)}</td>
              <td class="num ${pctClass(c.change7d)}">${formatPctOrDash(c.change7d)}</td>
              <td class="num ${pctClass(c.change30d)}">${formatPctOrDash(c.change30d)}</td>
              <td class="num muted">${formatUsd(c.volume24h, true)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function renderGainersLosers(gainers, losers) {
  const mini = (coins, title) => `
    <div class="movers-col">
      <h4>${escapeHtml(title)}</h4>
      <ul class="movers-list">
        ${coins
          .slice(0, 5)
          .map(
            (c) => `
          <li>
            <img src="${escapeHtml(c.image)}" alt="" width="20" height="20" />
            <span class="mv-name">${escapeHtml(c.symbol)}</span>
            <span class="mv-price">${formatUsd(c.price)}</span>
            <span class="mv-chg ${pctClass(c.change24h)}">${formatPctOrDash(c.change24h)}</span>
          </li>`,
          )
          .join('')}
      </ul>
    </div>`;
  return `<div class="movers-grid glass">${mini(gainers, 'Top Gainers 24h')}${mini(losers, 'Top Losers 24h')}</div>`;
}

function renderCategories(categories) {
  return `
    <div class="cat-grid">
      ${categories
        .map(
          (c) => `
        <div class="cat-card glass">
          <h4>${escapeHtml(c.name)}</h4>
          <p class="cat-cap">${formatUsd(c.marketCap, true)}</p>
          <p class="cat-chg ${pctClass(c.marketCapChange24h)}">${formatPctOrDash(c.marketCapChange24h)} (24h)</p>
          <p class="cat-vol">Vol: ${formatUsd(c.volume24h, true)}</p>
        </div>`,
        )
        .join('')}
    </div>`;
}

function renderAltcoinSeasonMeter(asi) {
  const pct = asi.index;
  const labels = ['Bitcoin Season', 'Neutral', 'Altcoin Season'];
  return `
    <div class="season-meter glass">
      <div class="season-track">
        <div class="season-fill" style="width:${pct}%"></div>
        <div class="season-marker" style="left:${pct}%"></div>
      </div>
      <div class="season-labels">
        <span>0</span><span>${labels[0]}</span><span>50 ${labels[1]}</span><span>${labels[2]}</span><span>100</span>
      </div>
      <div class="season-stats">
        <div><span class="label">Index</span><strong style="color:${pct >= 75 ? '#22c55e' : pct <= 25 ? '#f97316' : '#eab308'}">${asi.index}</strong></div>
        <div><span class="label">Outperform BTC (90d)</span><strong>${asi.outperformingCount} / ${asi.sampleSize}</strong></div>
        <div><span class="label">BTC 90d</span><strong class="${pctClass(asi.btcChange90d)}">${formatPctOrDash(asi.btcChange90d)}</strong></div>
      </div>
      <p class="season-desc">${escapeHtml(asi.description)}</p>
    </div>`;
}

function renderAverageCryptoMeter(avg) {
  return `
    <div class="avg-meter glass">
      <div class="avg-score-ring" style="--score:${avg.score}">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" stroke-width="10"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#avgGrad)" stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${326.7}" stroke-dashoffset="${326.7 * (1 - avg.score / 100)}" transform="rotate(-90 60 60)"/>
          <defs>
            <linearGradient id="avgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ef4444"/>
              <stop offset="50%" stop-color="#eab308"/>
              <stop offset="100%" stop-color="#22c55e"/>
            </linearGradient>
          </defs>
          <text x="60" y="58" text-anchor="middle" fill="#e2e8f0" font-size="28" font-weight="700">${avg.score}</text>
          <text x="60" y="78" text-anchor="middle" fill="#94a3b8" font-size="10">${escapeHtml(avg.classification)}</text>
        </svg>
      </div>
      <div class="avg-changes">
        <div><span>Ø 24h (gewichtet)</span><strong class="${pctClass(avg.change24h)}">${formatPctOrDash(avg.change24h)}</strong></div>
        <div><span>Ø 7d</span><strong class="${pctClass(avg.change7d)}">${formatPctOrDash(avg.change7d)}</strong></div>
        <div><span>Ø 30d</span><strong class="${pctClass(avg.change30d)}">${formatPctOrDash(avg.change30d)}</strong></div>
        <div><span>Basis</span><strong>Top ${avg.weightedCoins} Coins</strong></div>
      </div>
      <p class="season-desc">${escapeHtml(avg.description)}</p>
    </div>`;
}

function renderQuickNavCards() {
  return `
    <div class="quick-nav">
      <a href="#/markets" class="quick-card glass">
        <span class="qc-icon">📊</span>
        <strong>Market Cap</strong>
        <small>Global, Top 50, Kategorien</small>
      </a>
      <a href="#/markets#asi" class="quick-card glass">
        <span class="qc-icon">🔄</span>
        <strong>Altcoin Season</strong>
        <small>ASI Index · CMC-Stil</small>
      </a>
      <a href="#/markets#avg" class="quick-card glass">
        <span class="qc-icon">📈</span>
        <strong>Average Crypto</strong>
        <small>Gewichteter Markt-Ø</small>
      </a>
      <a href="#/fear-greed" class="quick-card glass">
        <span class="qc-icon">😱</span>
        <strong>Fear &amp; Greed</strong>
        <small>Sentiment &amp; Historie</small>
      </a>
      <a href="#/news" class="quick-card glass">
        <span class="qc-icon">📰</span>
        <strong>News Hub</strong>
        <small>8+ Quellen · 60s</small>
      </a>
    </div>`;
}
