const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const resolveSignalSymbol = (signal = {}) =>
  signal?.symbol ||
  signal?.underlying ||
  signal?.market_symbol ||
  signal?.metadata?.symbol ||
  signal?.meta?.symbol ||
  "R_50";

export const resolveSignalDirection = (signal = {}) => {
  const raw =
    signal?.direction ||
    signal?.decision ||
    signal?.signal ||
    signal?.consensus?.decision ||
    signal?.consensus?.direction;
  const value = String(raw || "").toUpperCase();
  if (value.includes("FALL") || value.includes("PUT")) return "FALL";
  if (value.includes("RISE") || value.includes("CALL")) return "RISE";
  return "NEUTRAL";
};

export const resolveSignalConfidence = (signal = {}) =>
  toNumber(signal?.consensus?.confidence ?? signal?.confidence, 0);

const normalizeStrategyName = (value = "") =>
  String(value || "Unknown")
    .replace(/Strategy$/i, "")
    .trim() || "Unknown";

const resolveStrategyDirection = (entry = {}) =>
  resolveSignalDirection({
    direction: entry?.direction,
    decision: entry?.signal,
    consensus: { direction: entry?.direction, decision: entry?.signal },
  });

export const buildDefaultSymbolStrategyRows = (
  signals = [],
  {
    defaultSymbol = "R_50",
    recentSignals = 4,
    limit = 6,
  } = {}
) => {
  const base = (Array.isArray(signals) ? signals : [])
    .filter((signal) => resolveSignalSymbol(signal) === defaultSymbol)
    .slice(0, Math.max(1, recentSignals));

  const strategyMap = new Map();
  base.forEach((signal) => {
    const entries = Array.isArray(signal?.strategies) ? signal.strategies : [];
    entries.forEach((entry) => {
      const strategy = normalizeStrategyName(entry?.strategy);
      const confidence = toNumber(entry?.confidence, 0);
      const direction = resolveStrategyDirection(entry);
      const row = strategyMap.get(strategy) || {
        strategy,
        symbol: defaultSymbol,
        confidence: 0,
        latestConfidence: 0,
        samples: 0,
        direction,
      };
      row.confidence += confidence;
      row.samples += 1;
      row.latestConfidence = confidence;
      row.direction = direction;
      strategyMap.set(strategy, row);
    });
  });

  const rows = Array.from(strategyMap.values()).map((row) => ({
    ...row,
    confidence: row.samples > 0 ? row.confidence / row.samples : 0,
  }));

  rows.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.latestConfidence - a.latestConfidence;
  });

  const topConfidence = rows[0]?.confidence || 0;
  return rows.slice(0, Math.max(1, limit)).map((row, index) => ({
    ...row,
    rank: index + 1,
    confidencePct: row.confidence * 100,
    confidenceGapPct: Math.max(0, (topConfidence - row.confidence) * 100),
  }));
};
