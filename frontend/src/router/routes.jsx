import React from "react";
import { Navigate } from "react-router-dom";
import { Login } from "../features/auth/pages/Login.jsx";
import { OAuthCallback } from "../features/auth/pages/OAuthCallback.jsx";
import { OAuthRedirect } from "../features/auth/pages/OAuthRedirect.jsx";
import { UserDashboard } from "../features/dashboard/pages/UserDashboard.jsx";
import { TradingDashboard } from "../features/trading/pages/TradingDashboard.jsx";
import { AdminDashboard } from "../features/admin/pages/AdminDashboard.jsx";
import { UserManagement } from "../features/admin/pages/UserManagement.jsx";
import { AccountsManagement } from "../features/admin/pages/AccountsManagement.jsx";
import { Analytics } from "../features/admin/pages/Analytics.jsx";
import { AuditLogs } from "../features/admin/pages/AuditLogs.jsx";
import { CommissionRules } from "../features/admin/pages/CommissionRules.jsx";
import { SystemSettings } from "../features/admin/pages/SystemSettings.jsx";
import { NotificationCenter } from "../features/notifications/pages/NotificationCenter.jsx";
import { ReferralDashboard } from "../features/referrals/pages/ReferralDashboard.jsx";
import {
  ProfileSettings,
  SettingsHome,
  TradingSettings,
  RiskSettings,
  BillingSettings,
} from "../features/settings/index.js";

export const ADMIN_ROLES = ["admin", "superadmin"];
export const adminRoute = (route) => ({
  ...route,
  roles: ADMIN_ROLES,
});

export const publicRoutes = [
  { path: "/login", element: <Login /> },
  { path: "/oauth/redirect", element: <OAuthRedirect /> },
  { path: "/oauth/callback", element: <OAuthCallback /> },
];

const baseProtectedRoutes = [
  {
    path: "/dashboard",
    label: "Overview",
    meta: "Home",
    element: <UserDashboard />,
  },
  {
    path: "/dashboard/trading",
    label: "Trade",
    meta: "Live",
    element: <TradingDashboard />,
  },
];

const adminProtectedRoutes = [
  adminRoute({
    path: "/dashboard/admin",
    label: "Admin",
    meta: "Ops",
    element: <AdminDashboard />,
  }),
  adminRoute({
    path: "/dashboard/admin/users",
    label: "Admin Users",
    meta: "Users",
    element: <UserManagement />,
    hideInNav: true,
  }),
  adminRoute({
    path: "/dashboard/admin/accounts",
    label: "Admin Accounts",
    meta: "Accounts",
    element: <AccountsManagement />,
    hideInNav: true,
  }),
  adminRoute({
    path: "/dashboard/admin/analytics",
    label: "Admin Analytics",
    meta: "Analytics",
    element: <Analytics />,
    hideInNav: true,
  }),
  adminRoute({
    path: "/dashboard/admin/commissions",
    label: "Admin Commissions",
    meta: "Commissions",
    element: <CommissionRules />,
    hideInNav: true,
  }),
  adminRoute({
    path: "/dashboard/admin/audit",
    label: "Admin Audit",
    meta: "Audit",
    element: <AuditLogs />,
    hideInNav: true,
  }),
  adminRoute({
    path: "/dashboard/admin/settings",
    label: "Admin Settings",
    meta: "Settings",
    element: <SystemSettings />,
    hideInNav: true,
  }),
];

const sharedProtectedRoutes = [
  {
    path: "/dashboard/notifications",
    label: "Notifications",
    meta: "Inbox",
    element: <NotificationCenter />,
  },
  {
    path: "/dashboard/referrals",
    label: "Referrals",
    meta: "Growth",
    element: <ReferralDashboard />,
  },
];

export const protectedRoutes = [
  ...baseProtectedRoutes,
  ...adminProtectedRoutes,
  ...sharedProtectedRoutes,
  {
    path: "/settings",
    label: "Settings",
    meta: "Profile",
    element: <Navigate to="/settings/profile" replace />,
    hideInNav: true,
  },
  {
    path: "/settings/home",
    label: "Settings Home",
    meta: "Home",
    element: <SettingsHome />,
    hideInNav: true,
  },
  {
    path: "/settings/profile",
    label: "Profile Settings",
    meta: "Profile",
    element: <ProfileSettings />,
    hideInNav: true,
  },
  {
    path: "/settings/trading",
    label: "Trading Settings",
    meta: "Trading",
    element: <TradingSettings />,
    hideInNav: true,
  },
  {
    path: "/settings/risk",
    label: "Risk Settings",
    meta: "Risk",
    element: <RiskSettings />,
    hideInNav: true,
  },
  {
    path: "/settings/billing",
    label: "Billing Settings",
    meta: "Billing",
    element: <BillingSettings />,
    hideInNav: true,
  },
];

export const navigationRoutes = protectedRoutes
  .filter((route) => !route.hideInNav)
  .map(({ path, label, meta, roles }) => ({
    path,
    label,
    meta,
    roles,
  }));

