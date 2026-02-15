import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { BillingInfo } from "../components/BillingInfo.jsx";
import { SettingsTabs } from "../components/SettingsTabs.jsx";

export function BillingSettings() {
  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">Billing Settings</h2>
        <p className="text-sm text-white/60">
          Review balance summary and transaction history across accounts.
        </p>
      </div>
      <SettingsTabs />
      <Card>
        <div className="mb-3 text-sm font-semibold text-white/80">Billing Overview</div>
        <BillingInfo />
      </Card>
    </div>
  );
}
