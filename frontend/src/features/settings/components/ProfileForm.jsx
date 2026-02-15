import React from "react";
import { Input } from "../../../shared/components/ui/inputs/Input.jsx";
import { useAuth } from "../../auth/contexts/AuthContext.jsx";
import { useToast } from "../../notifications/hooks/useToast.js";
import {
  changePassword,
  getUserProfile,
  updateUserProfile,
} from "../services/settingsService.js";

export function ProfileForm() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [profile, setProfile] = React.useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    affiliate_code: "",
    markup_percentage: 0,
  });
  const [passwordState, setPasswordState] = React.useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getUserProfile();
        if (!mounted) return;
        setProfile({
          username: data?.username || user?.username || "",
          email: data?.email || user?.email || "",
          first_name: data?.first_name || "",
          last_name: data?.last_name || "",
          affiliate_code: data?.affiliate_code || "",
          markup_percentage: Number(data?.markup_percentage || 0),
        });
      } catch (error) {
        toast.error("Failed to load profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [toast, user?.email, user?.username]);

  const onSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        email: profile.email,
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
      };
      await updateUserProfile(payload);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (event) => {
    event.preventDefault();
    if (!passwordState.oldPassword || !passwordState.newPassword) {
      toast.warning("Current and new password are required.");
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      toast.warning("New passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        old_password: passwordState.oldPassword,
        new_password: passwordState.newPassword,
      });
      setPasswordState({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error?.message || "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSaveProfile} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Username</label>
            <Input value={profile.username} disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Email</label>
            <Input
              type="email"
              value={profile.email}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, email: event.target.value }))
              }
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">First Name</label>
            <Input
              value={profile.first_name}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, first_name: event.target.value }))
              }
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Last Name</label>
            <Input
              value={profile.last_name}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, last_name: event.target.value }))
              }
              disabled={loading}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Affiliate Code</label>
            <Input value={profile.affiliate_code || "-"} disabled />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Markup %</label>
            <Input value={String(profile.markup_percentage)} disabled />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || loading}
          className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-sm font-semibold text-white/80">Security</p>
        <form onSubmit={onChangePassword} className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Current Password</label>
            <Input
              type="password"
              value={passwordState.oldPassword}
              onChange={(event) =>
                setPasswordState((prev) => ({ ...prev, oldPassword: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">New Password</label>
            <Input
              type="password"
              value={passwordState.newPassword}
              onChange={(event) =>
                setPasswordState((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-white/70">Confirm New</label>
            <Input
              type="password"
              value={passwordState.confirmPassword}
              onChange={(event) =>
                setPasswordState((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              required
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={changingPassword}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingPassword ? "Updating Password..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
