/** Interaktiver Kerzenchart — Pan, Zoom (Hyperliquid-Style), Live-Preis */

const IC_BULL = '#26a69a';
const IC_BEAR = '#ef5350';
const IC_BG = '#131722';
const IC_GRID = '#2a2e39';

const icRegistry = new WeakMap();

function icClamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function icFormatXLabel(ts, range) {
  const d = new Date(ts);
  if (range === '1h' || range === '24h') {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '7d' || range === '1m' || range === '3m') {
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (range === 'ytd' || range === '1y' || range === 'max') {
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}

function icUpdateOhlcDisplay(el, c, extra) {
  if (!el || !c) return;
  const col = c.close >= c.open ? IC_BULL : IC_BEAR;
  const live = extra ? ` · <span class="ic-live-tag">LIVE ${formatUsd(extra)}</span>` : '';
  el.innerHTML = `O <b>${formatUsd(c.open)}</b> H <b class="tv-bull">${formatUsd(c.high)}</b> L <b class="tv-bear">${formatUsd(c.low)}</b> C <b style="color:${col}">${formatUsd(c.close)}</b>${live}`;
}

function destroyInteractiveChart(mountEl) {
  const api = icRegistry.get(mountEl);
  if (api) {
    api.destroy();
    icRegistry.delete(mountEl);
  }
}

function mountInteractiveCandlestickChart(mountEl, { candles, range, liveLabel }) {
  if (!mountEl || !candles?.length) {
    if (mountEl) mountEl.innerHTML = '<p class="error-msg">Keine Kerzen-Daten</p>';
    return null;
  }

  destroyInteractiveChart(mountEl);

  const state = {
    candles: candles.map((c) => ({ ...c })),
    range: range || '1m',
    viewStart: 0,
    viewCount: 0,
    w: 1000,
    h: 460,
    pad: { t: 32, r: 88, b: 52, l: 92 },
    livePrice: null,
    drag: null,
  };

  const defaultVis = Math.min(72, Math.max(state.candles.length, 1));
  state.viewCount = Math.min(defaultVis, state.candles.length);
  state.viewStart = Math.max(0, state.candles.length - state.viewCount);

  mountEl.classList.add('ic-mount');
  mountEl.innerHTML = `
    <div class="trading-chart tv-chart ic-chart" id="trading-chart-root">
      <div class="tv-chart-toolbar ic-toolbar">
        <span class="tv-toolbar-title">OHLC · ${escapeHtml(liveLabel || 'Live')}</span>
        <span class="ic-chart-hint">Ziehen · Scroll zoomen · Doppelklick Reset</span>
        <span class="tv-toolbar-ohlc" id="tv-ohlc-display"></span>
      </div>
      <div class="ic-viewport" tabindex="0" aria-label="Kerzenchart — ziehen und zoomen">
        <svg viewBox="0 0 ${state.w} ${state.h}" preserveAspectRatio="none" class="candlestick-svg ic-svg" id="candlestick-svg"></svg>
      </div>
    </div>`;

  const root = mountEl.querySelector('#trading-chart-root');
  const viewport = mountEl.querySelector('.ic-viewport');
  const svg = mountEl.querySelector('.ic-svg');
  const ohlcDisplay = mountEl.querySelector('#tv-ohlc-display');

  function visibleSlice() {
    const end = Math.min(state.candles.length, state.viewStart + state.viewCount);
    return state.candles.slice(state.viewStart, end);
  }

  function resetView() {
    const n = Math.min(72, state.candles.length);
    state.viewCount = n;
    state.viewStart = Math.max(0, state.candles.length - n);
    draw();
  }

  function draw() {
    const vis = visibleSlice();
    if (!vis.length) return;

    const pad = state.pad;
    const iw = state.w - pad.l - pad.r;
    const ih = state.h - pad.t - pad.b;
    const volH = 48;
    const volBase = pad.t + ih + 8;

    let minP = Math.min(...vis.map((c) => c.low));
    let maxP = Math.max(...vis.map((c) => c.high));
    if (state.livePrice > 0) {
      minP = Math.min(minP, state.livePrice);
      maxP = Math.max(maxP, state.livePrice);
    }
    const margin = (maxP - minP) * 0.06 || maxP * 0.008;
    minP -= margin;
    maxP += margin;
    const span = maxP - minP || 1;

    const y = (price) => pad.t + ih - ((price - minP) / span) * ih;
    const slotW = iw / vis.length;
    const bodyW = Math.max(3, Math.min(20, slotW * 0.72));
    const last = vis[vis.length - 1];
    const lastGlobalIdx = state.viewStart + vis.length - 1;

    const volMax = Math.max(...vis.map((c) => Math.abs(c.close - c.open)), 1);

    const gridLines = Array.from({ length: 7 }, (_, i) => {
      const price = minP + (span * i) / 6;
      const yy = y(price);
      return `
        <line x1="${pad.l}" y1="${yy}" x2="${pad.l + iw}" y2="${yy}" stroke="${IC_GRID}" stroke-width="1"/>
        <text x="${pad.l - 8}" y="${yy + 4}" fill="#787b86" font-size="11" text-anchor="end" font-family="DM Sans,sans-serif">${formatUsd(price, price >= 1e6)}</text>`;
    }).join('');

    const candleShapes = vis
      .map((c, i) => {
        const cx = pad.l + (i + 0.5) * slotW;
        const bull = c.close >= c.open;
        const color = bull ? IC_BULL : IC_BEAR;
        const yO = y(c.open);
        const yC = y(c.close);
        const yH = y(c.high);
        const yL = y(c.low);
        const top = Math.min(yO, yC);
        const bodyH = Math.max(2, Math.abs(yC - yO));
        const volBar = (Math.abs(c.close - c.open) / volMax) * volH;
        const isLast = i === vis.length - 1;
        const pulse = isLast && state.livePrice > 0 ? ' ic-candle-live' : '';
        return `
          <g class="candle${pulse}" data-i="${state.viewStart + i}" data-ohlc="${c.open},${c.high},${c.low},${c.close}">
            <rect x="${(cx - bodyW / 2).toFixed(1)}" y="${(volBase + volH - volBar).toFixed(1)}" width="${bodyW.toFixed(1)}" height="${volBar.toFixed(1)}" fill="${color}" opacity="0.35"/>
            <line x1="${cx}" y1="${yH}" x2="${cx}" y2="${yL}" stroke="${color}" stroke-width="1.5"/>
            <rect x="${(cx - bodyW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bodyW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${color}"/>
          </g>`;
      })
      .join('');

    const xStep = Math.max(1, Math.floor(vis.length / 8));
    const xLabels = vis
      .filter((_, i) => i % xStep === 0 || i === vis.length - 1)
      .map((c, _fi, arr) => {
        const i = vis.indexOf(c);
        const cx = pad.l + (i + 0.5) * slotW;
        return `<text x="${cx}" y="${state.h - 14}" fill="#787b86" font-size="11" text-anchor="middle">${icFormatXLabel(c.timestamp, state.range)}</text>`;
      })
      .join('');

    const liveY = state.livePrice > 0 ? y(state.livePrice) : y(last.close);
    const liveColor = state.livePrice >= last.open ? IC_BULL : IC_BEAR;

    svg.innerHTML = `
      <rect width="${state.w}" height="${state.h}" fill="${IC_BG}"/>
      <rect x="${pad.l}" y="${pad.t}" width="${iw}" height="${ih + volH + 12}" fill="#1e222d" rx="2"/>
      ${gridLines}
      ${candleShapes}
      ${xLabels}
      <line x1="${pad.l}" y1="${liveY}" x2="${pad.l + iw}" y2="${liveY}" stroke="${liveColor}" stroke-width="1.5" stroke-dasharray="6 4" class="ic-price-line"/>
      <circle cx="${pad.l + iw}" cy="${liveY}" r="4" fill="${liveColor}" class="ic-price-dot"/>`;

    const hoverC = state.livePrice > 0 ? { ...last, close: state.livePrice } : last;
    icUpdateOhlcDisplay(ohlcDisplay, hoverC, state.livePrice > 0 ? state.livePrice : null);

    state._layout = { pad, iw, slotW, visLen: vis.length, minP, maxP };
    state._lastGlobalIdx = lastGlobalIdx;
  }

  function panByCandles(delta) {
    const maxStart = Math.max(0, state.candles.length - state.viewCount);
    state.viewStart = icClamp(state.viewStart + delta, 0, maxStart);
    draw();
  }

  function zoomAt(factor, ratio) {
    const focus = state.viewStart + ratio * state.viewCount;
    let newCount = Math.round(state.viewCount / factor);
    newCount = icClamp(newCount, 12, state.candles.length);
    let newStart = Math.round(focus - ratio * newCount);
    newStart = icClamp(newStart, 0, Math.max(0, state.candles.length - newCount));
    state.viewCount = newCount;
    state.viewStart = newStart;
    draw();
  }

  function pointerToRatio(clientX) {
    const rect = viewport.getBoundingClientRect();
    return icClamp((clientX - rect.left) / rect.width, 0, 1);
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.14 : 0.88;
    zoomAt(factor, pointerToRatio(e.clientX));
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add('ic-dragging');
    state.drag = { x0: e.clientX, start0: state.viewStart };
  }

  function onPointerMove(e) {
    if (!state.drag) {
      hoverAt(e.clientX);
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const dx = e.clientX - state.drag.x0;
    const candlesPerPx = state.viewCount / rect.width;
    const delta = Math.round(-dx * candlesPerPx);
    const maxStart = Math.max(0, state.candles.length - state.viewCount);
    const next = icClamp(state.drag.start0 + delta, 0, maxStart);
    if (next !== state.viewStart) {
      state.viewStart = next;
      draw();
    }
  }

  function onPointerUp(e) {
    if (state.drag) {
      state.drag = null;
      viewport.classList.remove('ic-dragging');
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  }

  function hoverAt(clientX) {
    const layout = state._layout;
    const vis = visibleSlice();
    if (!layout || !vis.length || !ohlcDisplay) return;
    const rect = viewport.getBoundingClientRect();
    const scaleX = state.w / rect.width;
    const x = (clientX - rect.left) * scaleX;
    const idx = icClamp(Math.floor((x - layout.pad.l) / layout.slotW), 0, vis.length - 1);
    const c = vis[idx];
    const live = idx === vis.length - 1 && state.livePrice > 0 ? state.livePrice : null;
    icUpdateOhlcDisplay(ohlcDisplay, c, live);
  }

  function setLivePrice(price) {
    if (!price || price <= 0 || !state.candles.length) return;
    state.livePrice = price;
    const last = state.candles[state.candles.length - 1];
    last.close = price;
    last.high = Math.max(last.high, price);
    last.low = Math.min(last.low, price);
    const atLiveEdge = state.viewStart + state.viewCount >= state.candles.length - 2;
    if (atLiveEdge) {
      state.viewStart = Math.max(0, state.candles.length - state.viewCount);
    }
    draw();
    const line = svg.querySelector('.ic-price-line');
    if (line) {
      line.classList.remove('ic-flash');
      void line.offsetWidth;
      line.classList.add('ic-flash');
    }
  }

  function setCandles(newCandles, newRange) {
    state.candles = newCandles.map((c) => ({ ...c }));
    state.range = newRange || state.range;
    state.livePrice = null;
    resetView();
  }

  const listeners = [
    [viewport, 'wheel', onWheel, { passive: false }],
    [viewport, 'pointerdown', onPointerDown],
    [viewport, 'pointermove', onPointerMove],
    [viewport, 'pointerup', onPointerUp],
    [viewport, 'pointercancel', onPointerUp],
    [viewport, 'dblclick', () => resetView()],
    [viewport, 'mouseleave', () => {
      const vis = visibleSlice();
      if (vis.length) {
        const last = vis[vis.length - 1];
        icUpdateOhlcDisplay(ohlcDisplay, last, state.livePrice > 0 ? state.livePrice : null);
      }
    }],
  ];

  listeners.forEach(([el, ev, fn, opts]) => el.addEventListener(ev, fn, opts));

  function destroy() {
    listeners.forEach(([el, ev, fn, opts]) => el.removeEventListener(ev, fn, opts));
    mountEl.innerHTML = '';
    mountEl.classList.remove('ic-mount');
  }

  const api = { draw, setLivePrice, setCandles, resetView, destroy };
  icRegistry.set(mountEl, api);
  draw();
  return api;
}

function updateInteractiveChartLive(target, price) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  const api = icRegistry.get(el);
  if (api) api.setLivePrice(price);
}

function updatePaperInteractiveChart(price) {
  updateInteractiveChartLive('paper-chart', price);
}
