import React, { useMemo } from "react";
import { Card } from "../../../../../shared/components/ui/cards/Card.jsx";

export function CandlestickChart({ candles = [], symbol }) {
  const { min, max } = useMemo(() => {
    if (!candles.length) return { min: 0, max: 1 };
    const lows = candles.map((c) => Number(c.low));
    const highs = candles.map((c) => Number(c.high));
    return { min: Math.min(...lows), max: Math.max(...highs) };
  }, [candles]);

  const height = 140;
  const width = 320;
  const padding = 8;
  const candleWidth = candles.length ? (width - padding * 2) / candles.length : 8;
  const scaleY = (value) =>
    height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);

  return (
    <Card>
      <div className="text-sm font-semibold text-white/80">Candlestick Chart</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-40 w-full rounded-md bg-slate-900/60">
        {candles.map((candle, index) => {
          const open = Number(candle.open);
          const close = Number(candle.close);
          const high = Number(candle.high);
          const low = Number(candle.low);
          const x = padding + index * candleWidth + candleWidth / 2;
          const color = close >= open ? "#34d399" : "#f43f5e";
          const yOpen = scaleY(open);
          const yClose = scaleY(close);
          const yHigh = scaleY(high);
          const yLow = scaleY(low);
          const bodyHeight = Math.max(2, Math.abs(yOpen - yClose));
          return (
            <g key={`${candle.time}-${index}`}>
              <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1" />
              <rect
                x={x - candleWidth * 0.35}
                y={Math.min(yOpen, yClose)}
                width={candleWidth * 0.7}
                height={bodyHeight}
                fill={color}
              />
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-white/50">Latest candles for {symbol || "market"}.</p>
    </Card>
  );
}

