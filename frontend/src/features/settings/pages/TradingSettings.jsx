import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { TradingPreferences } from "../components/TradingPreferences.jsx";
import { SettingsTabs } from "../components/SettingsTabs.jsx";

export function TradingSettings() {
  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">Trading Settings</h2>
        <p className="text-sm text-white/60">
          Configure default bot behavior and strategy execution thresholds.
        </p>
      </div>
      <SettingsTabs />
      <Card>
        <div className="mb-3 text-sm font-semibold text-white/80">Preferences</div>
        <TradingPreferences />
      </Card>
    </div>
  );
}
