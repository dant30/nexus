import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";

const toMoney = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function StatsCards({ stats = {} }) {
  const cards = [
    {
      title: "Referral Codes",
      value: stats.referral_codes ?? 0,
      meta: "Active code variants",
    },
    {
      title: "Total Uses",
      value: stats.total_uses ?? 0,
      meta: "Total code activations",
    },
    {
      title: "Total Referrals",
      value: stats.total_referrals ?? 0,
      meta: "Users referred",
    },
    {
      title: "Commission Earned",
      value: `$${toMoney(stats.commission_earned ?? 0)}`,
      meta: "Lifetime commission",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <p className="text-xs uppercase tracking-wider text-white/50">{card.title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          <p className="mt-1 text-xs text-white/50">{card.meta}</p>
        </Card>
      ))}
    </div>
  );
}
