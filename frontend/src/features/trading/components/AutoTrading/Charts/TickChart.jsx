import React, { useMemo } from "react";
import { Card } from "../../../../../shared/components/ui/cards/Card.jsx";

export function TickChart({ ticks = [] }) {
  const { path } = useMemo(() => {
    if (!ticks.length) return { path: "" };
    const points = ticks.slice(-40).map((tick, index) => ({
      x: index,
      y: Number(tick.price),
    }));
    const ys = points.map((p) => p.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const scaleX = (x) => (x / (points.length - 1 || 1)) * 320;
    const scaleY = (y) => 80 - ((y - min) / (max - min || 1)) * 70 - 5;
    const d = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x)},${scaleY(point.y)}`)
      .join(" ");
    return { path: d };
  }, [ticks]);

  return (
    <Card>
      <div className="text-sm font-semibold text-white/80">Tick Chart</div>
      <svg viewBox="0 0 320 80" className="mt-3 h-24 w-full rounded-md bg-slate-900/60">
        <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" />
      </svg>
    </Card>
  );
}

