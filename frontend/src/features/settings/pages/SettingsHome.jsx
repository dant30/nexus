import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";

const sections = [
  {
    title: "Profile",
    description: "Update account identity, contact info, and password.",
    to: "/settings/profile",
  },
  {
    title: "Trading",
    description: "Set default stake, confidence, cooldown, and session limits.",
    to: "/settings/trading",
  },
  {
    title: "Risk",
    description: "Configure daily loss caps and protective risk controls.",
    to: "/settings/risk",
  },
  {
    title: "Billing",
    description: "Review balance summary and recent transaction history.",
    to: "/settings/billing",
  },
];

export function SettingsHome() {
  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">Settings Home</h2>
        <p className="text-sm text-white/60">
          Choose an area to configure your account and trading behavior.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white/90">{section.title}</p>
                <p className="mt-1 text-xs text-white/60">{section.description}</p>
              </div>
              <Link
                to={section.to}
                className="inline-flex rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
              >
                Open {section.title}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

