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

const pickPreferredSignal = (current, candidate) => {
  if (!current) return candidate;
  if (candidate.confidence > current.confidence) return candidate;
  if (candidate.confidence === current.confidence && candidate.__index < current.__index) return candidate;
  return current;
};

export const buildRankedSignals = (
  signals = [],
  {
    defaultSymbol = "R_50",
    mode = "all",
    limit = 6,
  } = {}
) => {
  const normalized = (Array.isArray(signals) ? signals : []).map((signal, index) => {
    const symbol = resolveSignalSymbol(signal);
    const direction = resolveSignalDirection(signal);
    const confidence = resolveSignalConfidence(signal);
    return {
      ...signal,
      symbol,
      direction,
      confidence,
      __index: index,
      isDefault: symbol === defaultSymbol,
    };
  });

  const bySymbol = normalized.reduce((acc, signal) => {
    acc.set(signal.symbol, pickPreferredSignal(acc.get(signal.symbol), signal));
    return acc;
  }, new Map());

  let rows = Array.from(bySymbol.values());
  if (mode === "default") {
    rows = rows.filter((row) => row.symbol === defaultSymbol);
  }

  rows.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.__index - b.__index;
  });

  const topConfidence = rows[0]?.confidence || 0;
  return rows.slice(0, Math.max(1, limit)).map((row, idx) => ({
    ...row,
    rank: idx + 1,
    confidencePct: row.confidence * 100,
    confidenceGapPct: Math.max(0, (topConfidence - row.confidence) * 100),
  }));
};
