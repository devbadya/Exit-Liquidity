/** TokenSync — Paper Trading Engine v2 (Perps-Simulation) */

const PAPER_STORAGE_KEY = 'tokensync_paper_v2';
const PAPER_START_BALANCE = 10_000;
const PAPER_FEE_RATE = 0.0005;
const PAPER_MAX_LEVERAGE = 50;
const PAPER_LEVERAGES = [1, 2, 3, 5, 10, 20, 50];
const PAPER_MIN_SIZE_USD = 10;

const PAPER_ORDER_TYPES = ['market', 'limit', 'stop', 'take_profit', 'stop_loss'];

/** Strategie-Presets (Hyperliquid-ähnliche Workflows) */
const PAPER_STRATEGIES = {
  market_long: {
    id: 'market_long',
    name: 'Market Long',
    desc: 'Sofort Long zum Mark-Preis',
    orderType: 'market',
    side: 'long',
    sizePercent: 10,
    leverage: 10,
  },
  market_short: {
    id: 'market_short',
    name: 'Market Short',
    desc: 'Sofort Short zum Mark-Preis',
    orderType: 'market',
    side: 'short',
    sizePercent: 10,
    leverage: 10,
  },
  limit_buy_dip: {
    id: 'limit_buy_dip',
    name: 'Limit Buy Dip',
    desc: 'Long Limit 2% unter Mark',
    orderType: 'limit',
    side: 'long',
    sizePercent: 15,
    leverage: 5,
    priceOffsetPercent: -2,
  },
  limit_sell_rip: {
    id: 'limit_sell_rip',
    name: 'Limit Sell Rip',
    desc: 'Short Limit 2% über Mark',
    orderType: 'limit',
    side: 'short',
    sizePercent: 15,
    leverage: 5,
    priceOffsetPercent: 2,
  },
  breakout_long: {
    id: 'breakout_long',
    name: 'Breakout Long',
    desc: 'Stop-Entry 1% über Mark (Ausbruch)',
    orderType: 'stop',
    side: 'long',
    sizePercent: 12,
    leverage: 10,
    priceOffsetPercent: 1,
  },
  breakdown_short: {
    id: 'breakdown_short',
    name: 'Breakdown Short',
    desc: 'Stop-Entry 1% unter Mark',
    orderType: 'stop',
    side: 'short',
    sizePercent: 12,
    leverage: 10,
    priceOffsetPercent: -1,
  },
  bracket_scalp: {
    id: 'bracket_scalp',
    name: 'Bracket Scalp',
    desc: 'Market + TP 1.5% / SL 0.8%',
    orderType: 'market',
    side: 'long',
    sizePercent: 8,
    leverage: 15,
    takeProfitPercent: 1.5,
    stopLossPercent: 0.8,
  },
  bracket_swing: {
    id: 'bracket_swing',
    name: 'Bracket Swing',
    desc: 'Market + TP 5% / SL 2.5%',
    orderType: 'market',
    side: 'long',
    sizePercent: 20,
    leverage: 5,
    takeProfitPercent: 5,
    stopLossPercent: 2.5,
  },
  scalper: {
    id: 'scalper',
    name: 'Scalper',
    desc: 'Klein, hoher Hebel, schneller Market',
    orderType: 'market',
    side: 'long',
    sizePercent: 5,
    leverage: 25,
  },
  swing: {
    id: 'swing',
    name: 'Swing Trade',
    desc: 'Größere Size, moderater Hebel',
    orderType: 'market',
    side: 'long',
    sizePercent: 30,
    leverage: 3,
  },
  dca_long: {
    id: 'dca_long',
    name: 'DCA Long',
    desc: '3 Limit-Orders unter Mark (-1%, -2%, -3%)',
    orderType: 'dca',
    side: 'long',
    sizePercent: 24,
    leverage: 5,
    dcaSteps: [-1, -2, -3],
  },
  mean_reversion: {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    desc: 'Long Limit -3% (Überverkauf)',
    orderType: 'limit',
    side: 'long',
    sizePercent: 18,
    leverage: 7,
    priceOffsetPercent: -3,
  },
  momentum: {
    id: 'momentum',
    name: 'Momentum',
    desc: 'Stop Long +0.5% Trendfolge',
    orderType: 'stop',
    side: 'long',
    sizePercent: 15,
    leverage: 12,
    priceOffsetPercent: 0.5,
  },
  grid_neutral: {
    id: 'grid_neutral',
    name: 'Mini-Grid',
    desc: 'Limit Long -1.5% + Short Limit +1.5%',
    orderType: 'grid',
    sizePercent: 10,
    leverage: 5,
    priceOffsetPercent: 1.5,
  },
  trailing_trend: {
    id: 'trailing_trend',
    name: 'Trailing Stop',
    desc: 'Market Long + Trailing 1.2%',
    orderType: 'market',
    side: 'long',
    sizePercent: 12,
    leverage: 8,
    trailingStopPercent: 1.2,
  },
};

function paperId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function migrateState(raw) {
  if (raw?.version === 2) return raw;
  return {
    version: 2,
    balance: raw?.balance ?? PAPER_START_BALANCE,
    initialBalance: raw?.initialBalance ?? PAPER_START_BALANCE,
    positions: Array.isArray(raw?.positions) ? raw.positions : [],
    pendingOrders: [],
    history: Array.isArray(raw?.history) ? raw.history : [],
    createdAt: raw?.createdAt ?? new Date().toISOString(),
  };
}

function loadPaperState() {
  try {
    const raw = localStorage.getItem(PAPER_STORAGE_KEY);
    if (!raw) return createPaperState();
    const legacy = localStorage.getItem('tokensync_paper_v1');
    if (!raw && legacy) {
      const s = migrateState(JSON.parse(legacy));
      savePaperState(s);
      return s;
    }
    return migrateState(JSON.parse(raw));
  } catch {
    return createPaperState();
  }
}

function createPaperState() {
  return {
    version: 2,
    balance: PAPER_START_BALANCE,
    initialBalance: PAPER_START_BALANCE,
    positions: [],
    pendingOrders: [],
    history: [],
    createdAt: new Date().toISOString(),
  };
}

function savePaperState(state) {
  localStorage.setItem(PAPER_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('paper-account-updated'));
}

function getPaperAccount() {
  return loadPaperState();
}

function resetPaperAccount() {
  const s = createPaperState();
  savePaperState(s);
  return s;
}

function calcUnrealizedPnl(position, markPrice) {
  if (!markPrice || markPrice <= 0) return 0;
  const diff = markPrice - position.entryPrice;
  return position.side === 'long' ? diff * position.size : -diff * position.size;
}

function calcLiqPrice(position) {
  const lev = position.leverage || 1;
  const buffer = 0.92 / lev;
  if (position.side === 'long') return position.entryPrice * (1 - buffer);
  return position.entryPrice * (1 + buffer);
}

function calcTpPrice(position, tpPercent) {
  if (!tpPercent) return null;
  const m = tpPercent / 100;
  return position.side === 'long'
    ? position.entryPrice * (1 + m)
    : position.entryPrice * (1 - m);
}

function calcSlPrice(position, slPercent) {
  if (!slPercent) return null;
  const m = slPercent / 100;
  return position.side === 'long'
    ? position.entryPrice * (1 - m)
    : position.entryPrice * (1 + m);
}

/** Max. Notional (USD) = freie Balance × Hebel (≈ verfügbare Margin ausgeschöpft) */
function calcMaxSizeUsd(freeBalance, leverage) {
  const lev = Math.max(1, leverage);
  return Math.max(PAPER_MIN_SIZE_USD, freeBalance * lev * 0.98);
}

function clampSizeUsd(sizeUsd, freeBalance, leverage) {
  const max = calcMaxSizeUsd(freeBalance, leverage);
  return Math.max(PAPER_MIN_SIZE_USD, Math.min(sizeUsd, max));
}

function pushHistory(state, entry) {
  state.history.unshift({ id: paperId(), at: new Date().toISOString(), ...entry });
  if (state.history.length > 200) state.history.length = 200;
}

function findPosition(state, slug, side) {
  return state.positions.find((p) => p.slug === slug && p.side === side);
}

function findAnyPosition(state, slug) {
  return state.positions.find((p) => p.slug === slug);
}

function lockMargin(state, margin, fee) {
  const cost = margin + fee;
  if (cost > state.balance + 0.01) return { ok: false, error: `Zu wenig Margin (frei ${formatUsd(state.balance)})` };
  state.balance -= cost;
  return { ok: true, cost };
}

function openPositionCore(state, params, options = {}) {
  const { slug, symbol, name, side, leverage, sizeUsd, markPrice, stopLossPercent, takeProfitPercent, trailingStopPercent } = params;
  const lev = Math.min(PAPER_MAX_LEVERAGE, Math.max(1, Math.round(leverage)));
  const price = markPrice;

  if (!price || price <= 0) return { ok: false, error: 'Kein Mark-Preis' };
  if (!sizeUsd || sizeUsd < PAPER_MIN_SIZE_USD) return { ok: false, error: `Min. ${formatUsd(PAPER_MIN_SIZE_USD)}` };

  sizeUsd = clampSizeUsd(sizeUsd, state.balance, lev);

  const opposite = findPosition(state, slug, side === 'long' ? 'short' : 'long');
  if (opposite) return { ok: false, error: 'Zuerst Gegenposition schließen oder „Flip“ nutzen' };

  const size = sizeUsd / price;
  const notional = sizeUsd;
  const margin = notional / lev;
  const fee = notional * PAPER_FEE_RATE;
  if (!options.skipMarginLock) {
    const lock = lockMargin(state, margin, fee);
    if (!lock.ok) return lock;
  }

  const existing = findPosition(state, slug, side);
  if (existing) {
    const totalSize = existing.size + size;
    existing.entryPrice = (existing.entryPrice * existing.size + price * size) / totalSize;
    existing.size = totalSize;
    existing.margin += margin;
    existing.leverage = lev;
    existing.updatedAt = new Date().toISOString();
    if (takeProfitPercent) existing.takeProfitPercent = takeProfitPercent;
    if (stopLossPercent) existing.stopLossPercent = stopLossPercent;
    if (trailingStopPercent) {
      existing.trailingStopPercent = trailingStopPercent;
      existing.trailingExtreme = price;
    }
    pushHistory(state, { type: 'add', slug, symbol, side, size, price, notional, fee, leverage: lev });
  } else {
    state.positions.push({
      id: paperId(),
      slug,
      symbol: String(symbol).toUpperCase(),
      name: name || symbol,
      side,
      leverage: lev,
      size,
      entryPrice: price,
      margin,
      stopLossPercent: stopLossPercent ?? null,
      takeProfitPercent: takeProfitPercent ?? null,
      trailingStopPercent: trailingStopPercent ?? null,
      trailingExtreme: trailingStopPercent ? price : null,
      openedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    pushHistory(state, { type: 'open', slug, symbol, side, size, price, notional, fee, leverage: lev });
  }
  return { ok: true };
}

function submitPaperOrder(opts) {
  const state = loadPaperState();
  const {
    slug,
    symbol,
    name,
    side,
    leverage,
    sizeUsd,
    markPrice,
    orderType = 'market',
    triggerPrice,
    stopLossPercent,
    takeProfitPercent,
    trailingStopPercent,
    reduceOnly,
    positionId,
  } = opts;

  if (orderType === 'market') {
    const res = openPositionCore(state, {
      slug,
      symbol,
      name,
      side,
      leverage,
      sizeUsd,
      markPrice,
      stopLossPercent,
      takeProfitPercent,
      trailingStopPercent,
    });
    if (res.ok) savePaperState(state);
    return res;
  }

  if (!triggerPrice || triggerPrice <= 0) return { ok: false, error: 'Trigger-/Limit-Preis fehlt' };

  const lev = Math.min(PAPER_MAX_LEVERAGE, Math.max(1, Math.round(leverage)));
  sizeUsd = clampSizeUsd(sizeUsd, state.balance, lev);
  const notional = sizeUsd;
  const margin = notional / lev;
  const fee = notional * PAPER_FEE_RATE;
  const lock = lockMargin(state, margin, fee);
  if (!lock.ok) return lock;

  state.pendingOrders.push({
    id: paperId(),
    slug,
    symbol: String(symbol).toUpperCase(),
    name: name || symbol,
    side,
    leverage: lev,
    sizeUsd,
    orderType,
    triggerPrice,
    stopLossPercent: stopLossPercent ?? null,
    takeProfitPercent: takeProfitPercent ?? null,
    trailingStopPercent: trailingStopPercent ?? null,
    reduceOnly: !!reduceOnly,
    positionId: positionId ?? null,
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  pushHistory(state, {
    type: 'order',
    slug,
    symbol,
    side,
    orderType,
    triggerPrice,
    sizeUsd,
    leverage: lev,
  });
  savePaperState(state);
  return { ok: true, message: `${orderType} Order platziert` };
}

function cancelPaperOrder(orderId) {
  const state = loadPaperState();
  const idx = state.pendingOrders.findIndex((o) => o.id === orderId && o.status === 'open');
  if (idx < 0) return { ok: false, error: 'Order nicht gefunden' };

  const o = state.pendingOrders[idx];
  const margin = o.sizeUsd / o.leverage;
  const fee = o.sizeUsd * PAPER_FEE_RATE;
  state.balance += margin + fee;
  o.status = 'cancelled';
  state.pendingOrders.splice(idx, 1);
  pushHistory(state, { type: 'cancel', slug: o.slug, symbol: o.symbol, orderType: o.orderType });
  savePaperState(state);
  return { ok: true };
}

function closePaperPosition(positionId, markPrice, closeRatio = 1) {
  const state = loadPaperState();
  const idx = state.positions.findIndex((p) => p.id === positionId);
  if (idx < 0) return { ok: false, error: 'Position nicht gefunden' };

  const pos = state.positions[idx];
  const price = markPrice;
  if (!price || price <= 0) return { ok: false, error: 'Kein Mark-Preis' };

  const ratio = Math.min(1, Math.max(0.01, closeRatio));
  const closeSize = pos.size * ratio;
  const pnl = calcUnrealizedPnl({ ...pos, size: closeSize }, price);
  const notional = closeSize * price;
  const fee = notional * PAPER_FEE_RATE;
  const marginReturn = pos.margin * ratio;

  state.balance += marginReturn + pnl - fee;

  if (ratio >= 0.999) {
    state.positions.splice(idx, 1);
  } else {
    pos.size -= closeSize;
    pos.margin -= marginReturn;
    pos.updatedAt = new Date().toISOString();
  }

  pushHistory(state, {
    type: ratio >= 0.999 ? 'close' : 'reduce',
    slug: pos.slug,
    symbol: pos.symbol,
    side: pos.side,
    size: closeSize,
    price,
    pnl,
    fee,
  });
  savePaperState(state);
  return { ok: true, pnl };
}

function flipPaperPosition(slug, symbol, name, newSide, leverage, sizeUsd, markPrice) {
  const existing = findAnyPosition(loadPaperState(), slug);
  if (existing) {
    const closeRes = closePaperPosition(existing.id, markPrice, 1);
    if (!closeRes.ok) return closeRes;
  }
  const fresh = loadPaperState();
  const res = openPositionCore(fresh, { slug, symbol, name, side: newSide, leverage, sizeUsd, markPrice });
  if (res.ok) savePaperState(fresh);
  return res.ok ? { ok: true, message: 'Position gedreht' } : res;
}

function updatePositionBrackets(positionId, { takeProfitPercent, stopLossPercent, trailingStopPercent }) {
  const state = loadPaperState();
  const pos = state.positions.find((p) => p.id === positionId);
  if (!pos) return { ok: false, error: 'Position nicht gefunden' };
  if (takeProfitPercent != null) pos.takeProfitPercent = takeProfitPercent;
  if (stopLossPercent != null) pos.stopLossPercent = stopLossPercent;
  if (trailingStopPercent != null) {
    pos.trailingStopPercent = trailingStopPercent;
    pos.trailingExtreme = pos.entryPrice;
  }
  savePaperState(state);
  return { ok: true };
}

function shouldFillLimit(side, mark, trigger) {
  if (side === 'long') return mark <= trigger;
  return mark >= trigger;
}

function shouldFillStop(side, mark, trigger) {
  if (side === 'long') return mark >= trigger;
  return mark <= trigger;
}

function fillPendingOrder(state, order, mark) {
  const res = openPositionCore(
    state,
    {
      slug: order.slug,
      symbol: order.symbol,
      name: order.name,
      side: order.side,
      leverage: order.leverage,
      sizeUsd: order.sizeUsd,
      markPrice: mark,
      stopLossPercent: order.stopLossPercent,
      takeProfitPercent: order.takeProfitPercent,
      trailingStopPercent: order.trailingStopPercent,
    },
    { skipMarginLock: true },
  );
  return res.ok;
}

function processPositionExits(state, pos, mark) {
  if (pos.trailingStopPercent && pos.trailingExtreme != null) {
    const trail = pos.trailingStopPercent / 100;
    if (pos.side === 'long') {
      pos.trailingExtreme = Math.max(pos.trailingExtreme, mark);
      const stop = pos.trailingExtreme * (1 - trail);
      if (mark <= stop) return { close: true, reason: 'trailing' };
    } else {
      pos.trailingExtreme = Math.min(pos.trailingExtreme, mark);
      const stop = pos.trailingExtreme * (1 + trail);
      if (mark >= stop) return { close: true, reason: 'trailing' };
    }
  }
  if (pos.takeProfitPercent) {
    const tp = calcTpPrice(pos, pos.takeProfitPercent);
    if (tp && ((pos.side === 'long' && mark >= tp) || (pos.side === 'short' && mark <= tp))) {
      return { close: true, reason: 'take_profit' };
    }
  }
  if (pos.stopLossPercent) {
    const sl = calcSlPrice(pos, pos.stopLossPercent);
    if (sl && ((pos.side === 'long' && mark <= sl) || (pos.side === 'short' && mark >= sl))) {
      return { close: true, reason: 'stop_loss' };
    }
  }
  const liq = calcLiqPrice(pos);
  if ((pos.side === 'long' && mark <= liq) || (pos.side === 'short' && mark >= liq)) {
    return { close: true, reason: 'liquidation' };
  }
  return null;
}

function processPaperEngine(marksBySlug) {
  const state = loadPaperState();
  let changed = false;

  for (let i = state.pendingOrders.length - 1; i >= 0; i--) {
    const o = state.pendingOrders[i];
    if (o.status !== 'open') continue;
    const mark = marksBySlug[o.slug];
    if (!mark || mark <= 0) continue;

    let fill = false;
    if (o.orderType === 'limit') fill = shouldFillLimit(o.side, mark, o.triggerPrice);
    else if (o.orderType === 'stop') fill = shouldFillStop(o.side, mark, o.triggerPrice);

    if (fill) {
      if (fillPendingOrder(state, o, mark)) {
        state.pendingOrders.splice(i, 1);
        changed = true;
        pushHistory(state, { type: 'filled', slug: o.slug, symbol: o.symbol, orderType: o.orderType, price: mark });
      }
    }
  }

  for (let i = state.positions.length - 1; i >= 0; i--) {
    const pos = state.positions[i];
    const mark = marksBySlug[pos.slug];
    if (!mark || mark <= 0) continue;
    const exit = processPositionExits(state, pos, mark);
    if (exit?.close) {
      const pnl = calcUnrealizedPnl(pos, mark);
      const fee = pos.size * mark * PAPER_FEE_RATE;
      state.balance += pos.margin + pnl - fee;
      pushHistory(state, {
        type: exit.reason === 'liquidation' ? 'liquidation' : 'auto_close',
        slug: pos.slug,
        symbol: pos.symbol,
        side: pos.side,
        price: mark,
        pnl,
        reason: exit.reason,
      });
      state.positions.splice(i, 1);
      changed = true;
    }
  }

  if (changed) savePaperState(state);
  return state;
}

function applyPaperStrategy(strategyId, coin, markPrice) {
  const strat = PAPER_STRATEGIES[strategyId];
  if (!strat) return { ok: false, error: 'Strategie unbekannt' };
  if (!markPrice || markPrice <= 0) return { ok: false, error: 'Kein Mark-Preis' };

  const state = loadPaperState();
  const equity = state.balance + state.positions.reduce((s, p) => s + p.margin, 0);
  const sizeUsd = Math.max(PAPER_MIN_SIZE_USD, (equity * (strat.sizePercent || 10)) / 100);
  const lev = strat.leverage || 10;
  const base = { slug: coin.slug, symbol: coin.symbol, name: coin.name, leverage: lev, sizeUsd };

  if (strat.orderType === 'dca' && strat.dcaSteps) {
    const each = sizeUsd / strat.dcaSteps.length;
    for (const off of strat.dcaSteps) {
      const trigger = markPrice * (1 + off / 100);
      const r = submitPaperOrder({
        ...base,
        side: strat.side,
        sizeUsd: each,
        orderType: 'limit',
        triggerPrice: trigger,
        stopLossPercent: strat.stopLossPercent,
        takeProfitPercent: strat.takeProfitPercent,
      });
      if (!r.ok) return r;
    }
    return { ok: true, message: `DCA: ${strat.dcaSteps.length} Limit-Orders` };
  }

  if (strat.orderType === 'grid') {
    const half = sizeUsd / 2;
    const off = strat.priceOffsetPercent || 1.5;
    const r1 = submitPaperOrder({
      ...base,
      side: 'long',
      sizeUsd: half,
      orderType: 'limit',
      triggerPrice: markPrice * (1 - off / 100),
    });
    if (!r1.ok) return r1;
    return submitPaperOrder({
      ...base,
      side: 'short',
      sizeUsd: half,
      orderType: 'limit',
      triggerPrice: markPrice * (1 + off / 100),
    });
  }

  const offset = strat.priceOffsetPercent || 0;
  const trigger = markPrice * (1 + offset / 100);

  if (strat.orderType === 'market') {
    return submitPaperOrder({
      ...base,
      side: strat.side,
      orderType: 'market',
      markPrice,
      stopLossPercent: strat.stopLossPercent,
      takeProfitPercent: strat.takeProfitPercent,
      trailingStopPercent: strat.trailingStopPercent,
    });
  }

  return submitPaperOrder({
    ...base,
    side: strat.side,
    orderType: strat.orderType,
    triggerPrice: trigger,
    stopLossPercent: strat.stopLossPercent,
    takeProfitPercent: strat.takeProfitPercent,
  });
}

function getPaperSummary(markPricesBySlug) {
  const state = loadPaperState();
  let marginUsed = 0;
  let unrealizedPnl = 0;
  let ordersLocked = 0;

  for (const o of state.pendingOrders) {
    if (o.status === 'open') ordersLocked += o.sizeUsd / o.leverage + o.sizeUsd * PAPER_FEE_RATE;
  }

  const positions = state.positions.map((p) => {
    const mark = markPricesBySlug?.[p.slug] ?? p.entryPrice;
    const upnl = calcUnrealizedPnl(p, mark);
    const notional = p.size * mark;
    marginUsed += p.margin;
    unrealizedPnl += upnl;
    return {
      ...p,
      markPrice: mark,
      unrealizedPnl: upnl,
      notional,
      liqPrice: calcLiqPrice(p),
      tpPrice: calcTpPrice(p, p.takeProfitPercent),
      slPrice: calcSlPrice(p, p.stopLossPercent),
      pnlPercent: p.margin > 0 ? (upnl / p.margin) * 100 : 0,
    };
  });

  const equity = state.balance + marginUsed + ordersLocked + unrealizedPnl;
  const totalPnl = equity - state.initialBalance;

  return {
    balance: state.balance,
    initialBalance: state.initialBalance,
    marginUsed,
    ordersLocked,
    unrealizedPnl,
    equity,
    totalPnl,
    totalPnlPercent: state.initialBalance > 0 ? (totalPnl / state.initialBalance) * 100 : 0,
    positions,
    pendingOrders: state.pendingOrders.filter((o) => o.status === 'open'),
    history: state.history.slice(0, 80),
    positionCount: positions.length,
    openOrderCount: state.pendingOrders.filter((o) => o.status === 'open').length,
  };
}

/** Trading-Tools: Risiko & PnL-Rechner */
function paperCalcRisk({ markPrice, side, leverage, sizeUsd, stopLossPercent }) {
  const margin = sizeUsd / leverage;
  const size = sizeUsd / markPrice;
  let riskUsd = margin;
  if (stopLossPercent) {
    const slMove = (stopLossPercent / 100) * markPrice;
    riskUsd = slMove * size;
  }
  const liq = side === 'long' ? markPrice * (1 - 0.92 / leverage) : markPrice * (1 + 0.92 / leverage);
  return { margin, size, riskUsd, liqPrice: liq, notional: sizeUsd };
}

function paperCalcPnL({ entryPrice, markPrice, side, size }) {
  const pnl = side === 'long' ? (markPrice - entryPrice) * size : (entryPrice - markPrice) * size;
  const pct = entryPrice > 0 ? ((markPrice - entryPrice) / entryPrice) * 100 * (side === 'long' ? 1 : -1) : 0;
  return { pnl, pct };
}

/** Kompatibilität */
function openPaperPosition(opts) {
  return submitPaperOrder({ ...opts, orderType: 'market' });
}
