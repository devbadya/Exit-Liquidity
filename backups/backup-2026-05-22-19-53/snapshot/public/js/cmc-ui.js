/** TokenSync — CoinMarketCap Coins UI */

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
            <tr>
              <td class="rank">${c.rank}</td>
              <td class="coin-cell">
                <span class="cmc-icon">${escapeHtml(c.symbol.slice(0, 3))}</span>
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
