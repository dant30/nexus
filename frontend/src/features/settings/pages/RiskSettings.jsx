import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { RiskLimits } from "../components/RiskLimits.jsx";
import { SettingsTabs } from "../components/SettingsTabs.jsx";

export function RiskSettings() {
  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">Risk Settings</h2>
        <p className="text-sm text-white/60">
          Set drawdown thresholds and protective constraints for auto trading.
        </p>
      </div>
      <SettingsTabs />
      <Card>
        <div className="mb-3 text-sm font-semibold text-white/80">Risk Limits</div>
        <RiskLimits />
      </Card>
    </div>
  );
}
