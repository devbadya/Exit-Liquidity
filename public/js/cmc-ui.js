/** TokenSync — CoinMarketCap Coins UI */

const CMC_VIEW_MODES = [
  { id: 'table', label: 'Tabelle' },
  { id: 'live24', label: 'Live · 24h' },
];

const CMC_LIVE_FILTERS = [
  { id: 'page', label: 'Aktuelle Seite' },
  { id: 'top50', label: 'Top 50' },
  { id: 'top100', label: 'Top 100' },
  { id: 'gainers', label: 'Gewinner 24h' },
  { id: 'losers', label: 'Verlierer 24h' },
];

function cmcImageUrl(coin) {
  return coin.imageUrl || `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`;
}

function renderCmcCoinTable(coins) {
  if (!coins.length) return '<p class="error-msg">Keine Coins gefunden.</p>';
  return `
    <div class="table-scroll">
      <table class="coin-table cmc-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Coin</th>
            <th class="num">Preis</th>
            <th class="num">Market Cap</th>
            <th class="num">24h</th>
            <th class="num">7d</th>
            <th class="num">30d</th>
            <th class="num">Vol 24h</th>
            <th class="num">Supply</th>
          </tr>
        </thead>
        <tbody>
          ${coins
            .map(
              (c) => `
            <tr class="coin-row-click" data-slug="${escapeHtml(c.slug)}" role="link" tabindex="0" title="Kurs &amp; Chart anzeigen">
              <td class="rank">${c.rank}</td>
              <td class="coin-cell">
                <img class="coin-logo" src="${escapeHtml(cmcImageUrl(c))}" alt="" width="32" height="32" loading="lazy" decoding="async" />
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
              <td class="num muted supply-cell">${formatSupply(c.circulatingSupply, c.maxSupply)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function formatSupply(circ, max) {
  const fmt = (n) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
  };
  if (max) return `${fmt(circ)} / ${fmt(max)}`;
  return fmt(circ);
}

function renderCmcViewMenu(activeView) {
  return `
    <nav class="cmc-view-menu glass" id="cmc-view-menu" aria-label="Ansicht">
      ${CMC_VIEW_MODES.map(
        (m) =>
          `<button type="button" class="cmc-view-tab ${m.id === activeView ? 'active' : ''}" data-cmc-view="${m.id}">${m.label}</button>`,
      ).join('')}
      <span class="cmc-view-hint" id="cmc-live-status"></span>
    </nav>`;
}

function renderCmcLiveFilters(activeFilter, hidden) {
  return `
    <div class="cmc-live-filters glass ${hidden ? 'hidden' : ''}" id="cmc-live-filters">
      <span class="cmc-live-filters-label">Live-Filter</span>
      ${CMC_LIVE_FILTERS.map(
        (f) =>
          `<button type="button" class="cmc-live-chip ${f.id === activeFilter ? 'active' : ''}" data-cmc-live-filter="${f.id}">${f.label}</button>`,
      ).join('')}
      <span class="cmc-live-note muted">Top 200 · Auto-Refresh 30s · CoinMarketCap</span>
    </div>`;
}

function renderCmcLiveTable(coins) {
  if (!coins.length) return '<p class="error-msg">Keine Coins gefunden.</p>';
  return `
    <div class="table-scroll cmc-live-table-wrap">
      <table class="coin-table cmc-table cmc-live-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Coin</th>
            <th class="num">Live-Preis</th>
            <th class="num">Market Cap</th>
            <th class="num cmc-th-live">24h %</th>
            <th class="num">7d %</th>
            <th class="num">Vol 24h</th>
          </tr>
        </thead>
        <tbody>
          ${coins
            .map(
              (c) => `
            <tr class="coin-row-click" data-slug="${escapeHtml(c.slug)}" role="link" tabindex="0">
              <td class="rank">${c.rank}</td>
              <td class="coin-cell">
                <img class="coin-logo" src="${escapeHtml(cmcImageUrl(c))}" alt="" width="32" height="32" loading="lazy" />
                <span>
                  <strong>${escapeHtml(c.name)}</strong>
                  <small>${escapeHtml(c.symbol)}</small>
                </span>
              </td>
              <td class="num cmc-live-price" data-live-price-id="${c.id}">${formatUsd(c.price)}</td>
              <td class="num">${formatUsd(c.marketCap, true)}</td>
              <td class="num ${pctClass(c.change24h)} cmc-live-chg">${formatPctOrDash(c.change24h)}</td>
              <td class="num ${pctClass(c.change7d)}">${formatPctOrDash(c.change7d)}</td>
              <td class="num muted">${formatUsd(c.volume24h, true)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function renderPagination(page, totalPages, total) {
  if (totalPages <= 1) return '';
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  return `
    <div class="pagination glass">
      <button type="button" class="page-btn" data-page="${prev || ''}" ${!prev ? 'disabled' : ''}>← Zurück</button>
      <span class="page-info">Seite <strong>${page}</strong> von <strong>${totalPages}</strong> · ${total.toLocaleString('de-DE')} Coins</span>
      <button type="button" class="page-btn" data-page="${next || ''}" ${!next ? 'disabled' : ''}>Weiter →</button>
    </div>`;
}
