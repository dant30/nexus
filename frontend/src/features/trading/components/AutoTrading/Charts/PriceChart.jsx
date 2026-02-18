import React, { useMemo } from "react";
import { Card } from "../../../../../shared/components/ui/cards/Card.jsx";

const buildPath = (points, width, height, padding) => {
  if (!points.length) return "";
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scaleX = (x) => padding + ((x - minX) / (maxX - minX || 1)) * (width - padding * 2);
  const scaleY = (y) =>
    height - padding - ((y - minY) / (maxY - minY || 1)) * (height - padding * 2);

  return points
    .map((point, index) => {
      const x = scaleX(point.x);
      const y = scaleY(point.y);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
};

export function PriceChart({ symbol, ticks = [] }) {
  const { path, latest } = useMemo(() => {
    const points = ticks.map((tick, index) => ({
      x: tick.time || index,
      y: Number(tick.price),
    }));
    return {
      path: buildPath(points, 320, 140, 10),
      latest: points.at(-1)?.y,
    };
  }, [ticks]);

  return (
    <Card>
      <div className="flex items-center justify-between text-sm font-semibold text-white/80">
        <span>Price Chart</span>
        <span className="text-xs text-emerald-300">{latest ? latest.toFixed(4) : "--"}</span>
      </div>
      <svg viewBox="0 0 320 140" className="mt-3 h-40 w-full rounded-md bg-slate-900/60">
        <path d={path} fill="none" stroke="#34d399" strokeWidth="2" />
      </svg>
      <p className="mt-2 text-xs text-white/50">Live view for {symbol || "selected market"}.</p>
    </Card>
  );
}

