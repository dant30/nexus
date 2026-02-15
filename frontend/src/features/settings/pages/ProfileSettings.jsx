import React from "react";
import { Card } from "../../../shared/components/ui/cards/Card.jsx";
import { ProfileForm } from "../components/ProfileForm.jsx";
import { SettingsTabs } from "../components/SettingsTabs.jsx";

export function ProfileSettings() {
  return (
    <div className="space-y-6 p-6 text-white">
      <div>
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-white/60">
          Manage profile, trading behavior, risk controls, and billing visibility.
        </p>
      </div>
      <SettingsTabs />
      <Card>
        <div className="mb-3 text-sm font-semibold text-white/80">Profile</div>
        <ProfileForm />
      </Card>
    </div>
  );
}
