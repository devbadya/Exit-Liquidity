/** TokenSync — UI-Komponenten (HTML-Strings) */

function sentimentBadge(sentiment) {
  if (!sentiment) return '';
  const cls =
    sentiment === 'bullish' ? 'badge-bull' : sentiment === 'bearish' ? 'badge-bear' : 'badge-gray';
  return `<span class="badge ${cls}">${escapeHtml(sentiment)}</span>`;
}

function categoryBadges(categories, max) {
  return (categories || [])
    .slice(0, max ?? 2)
    .map((c) => `<span class="badge badge-gray">${escapeHtml(c)}</span>`)
    .join('');
}

function newsCard(article, featured) {
  const img = escapeHtml(article.imageUrl || PLACEHOLDER_IMG);
  const href = `#/news/${article.id}`;
  const cls = featured ? 'news-card featured glass' : 'news-card glass';
  return `
    <a href="${href}" class="${cls}">
      <div class="news-card-img">
        <img src="${img}" alt="" loading="lazy" />
      </div>
      <div class="news-card-body">
        <div class="news-meta">
          <span class="badge badge-cyan">${escapeHtml(article.source)}</span>
          ${categoryBadges(article.categories)}
          <span class="badge badge-gray" style="margin-left:auto">${timeAgo(article.publishedAt)}</span>
        </div>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="summary">${escapeHtml(article.summary)}</p>
        ${featured ? `<div style="margin-top:0.75rem">${sentimentBadge(article.sentiment)}</div>` : ''}
      </div>
    </a>`;
}

function renderNewsGrid(articles, featuredCount) {
  if (!articles.length) return '<p class="error-msg">Keine Artikel gefunden.</p>';
  const featured = articles[0];
  const rest = articles.slice(1);
  let html = '';
  if (featuredCount > 0 && featured) {
    html += `<div class="news-grid-featured">${newsCard(featured, true)}</div>`;
  }
  html += `<div class="grid-4">${rest.map((a) => newsCard(a, false)).join('')}</div>`;
  return html;
}

function fearGreedGauge(value, classification, size) {
  const dim = size === 'lg' ? 220 : 160;
  const stroke = size === 'lg' ? 14 : 10;
  const r = dim / 2 - stroke;
  const cx = dim / 2;
  const cy = dim / 2;
  const color = fgColor(value);
  const rotation = (value / 100) * 180 - 90;
  const arcLen = Math.PI * r;
  const offset = arcLen * (1 - value / 100);
  const fontSize = size === 'lg' ? '3rem' : '2rem';

  return `
    <div class="gauge-wrap">
      <svg class="gauge-svg" width="${dim}" height="${dim / 2 + 24}" viewBox="0 0 ${dim} ${dim / 2 + 24}">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="25%" stop-color="#f97316"/>
            <stop offset="50%" stop-color="#eab308"/>
            <stop offset="75%" stop-color="#84cc16"/>
            <stop offset="100%" stop-color="#22c55e"/>
          </linearGradient>
        </defs>
        <path d="M ${stroke} ${cy} A ${r} ${r} 0 0 1 ${dim - stroke} ${cy}" fill="none" stroke="rgba(30,41,59,0.8)" stroke-width="${stroke}" stroke-linecap="round"/>
        <path d="M ${stroke} ${cy} A ${r} ${r} 0 0 1 ${dim - stroke} ${cy}" fill="none" stroke="url(#gaugeGrad)" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${arcLen}" stroke-dashoffset="${offset}"/>
        <g transform="rotate(${rotation} ${cx} ${cy})">
          <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${stroke + 8}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="${cx}" cy="${cy}" r="6" fill="${color}"/>
        </g>
      </svg>
      <p class="gauge-value" style="color:${color};font-size:${fontSize}">${value}</p>
      <p class="gauge-label">${escapeHtml(classification)}</p>
    </div>`;
}

function renderMarketStrip(market) {
  const items = [
    { label: 'Bitcoin', price: formatUsd(market.btcPrice), chg: market.btcChange24h },
    { label: 'Ethereum', price: formatUsd(market.ethPrice), chg: market.ethChange24h },
    { label: 'Market Cap', price: formatUsd(market.totalMarketCap, true), chg: market.marketCapChange24h },
    { label: 'BTC Dominance', price: `${market.btcDominance.toFixed(1)}%`, chg: null },
  ];
  return `<div class="market-strip">${items
    .map(
      (it) => `
    <div class="market-item glass">
      <div class="label">${escapeHtml(it.label)}</div>
      <div class="price">${escapeHtml(it.price)}</div>
      ${
        it.chg !== null
          ? `<div class="chg ${it.chg >= 0 ? 'delta-up' : 'delta-down'}">${formatPct(it.chg)} (24h)</div>`
          : ''
      }
    </div>`,
    )
    .join('')}</div>`;
}

function renderComponentBars(components) {
  return Object.entries(components)
    .map(([label, value]) => {
      const color = fgColor(value);
      return `
      <div class="bar-row">
        <div class="bar-head">
          <span>${escapeHtml(label)}</span>
          <span style="color:${color}">${value}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${value}%;background:${color}"></div>
        </div>
      </div>`;
    })
    .join('');
}

function renderFearGreedChart(history, days) {
  const data = [...history].slice(0, days).reverse();
  if (data.length < 2) return '<p class="error-msg">Nicht genug Daten für Chart.</p>';

  const w = 600;
  const h = 200;
  const pad = { t: 12, r: 12, b: 28, l: 36 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const values = data.map((d) => d.value);
  const min = 0;
  const max = 100;

  const points = values.map((v, i) => {
    const x = pad.l + (i / (values.length - 1)) * iw;
    const y = pad.t + ih - ((v - min) / (max - min)) * ih;
    return `${x},${y}`;
  });

  const areaPoints = `${pad.l},${pad.t + ih} ${points.join(' ')} ${pad.l + iw},${pad.t + ih}`;
  const last = values[values.length - 1];

  const labels = data
    .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
    .map((d) => {
      const idx = data.indexOf(d);
      const x = pad.l + (idx / (values.length - 1)) * iw;
      const lbl = new Date(d.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
      return `<text x="${x}" y="${h - 6}" fill="#64748b" font-size="10" text-anchor="middle">${lbl}</text>`;
    })
    .join('');

  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${[0, 25, 50, 75, 100]
          .map((v) => {
            const y = pad.t + ih - (v / 100) * ih;
            return `<line x1="${pad.l}" y1="${y}" x2="${pad.l + iw}" y2="${y}" stroke="#1e293b" stroke-dasharray="4"/>`;
          })
          .join('')}
        <polygon points="${areaPoints}" fill="url(#chartFill)"/>
        <polyline points="${points.join(' ')}" fill="none" stroke="#22d3ee" stroke-width="2"/>
        <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="5" fill="${fgColor(last)}"/>
        ${labels}
      </svg>
    </div>`;
}

function renderHistoryTable(history, days) {
  const rows = history.slice(0, days);
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Datum</th><th class="num">Wert</th><th>Stimmung</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${new Date(r.timestamp).toLocaleDateString('de-DE')}</td>
              <td class="num">${r.value}</td>
              <td>${escapeHtml(r.classification)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}
