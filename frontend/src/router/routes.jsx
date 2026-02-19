import React from "react";
import { Navigate } from "react-router-dom";
import { Login } from "../features/auth/pages/Login.jsx";
import { OAuthCallback } from "../features/auth/pages/OAuthCallback.jsx";
import { OAuthRedirect } from "../features/auth/pages/OAuthRedirect.jsx";
import { UserDashboard } from "../features/dashboard/pages/UserDashboard.jsx";
import { TradingDashboard } from "../features/trading/pages/TradingDashboard.jsx";
import { AdminDashboard } from "../features/admin/pages/AdminDashboard.jsx";
import { NotificationCenter } from "../features/notifications/pages/NotificationCenter.jsx";
import { ReferralDashboard } from "../features/referrals/pages/ReferralDashboard.jsx";
import {
  ProfileSettings,
  SettingsHome,
  TradingSettings,
  RiskSettings,
  BillingSettings,
} from "../features/settings/index.js";

export const publicRoutes = [
  { path: "/login", element: <Login /> },
  { path: "/oauth/redirect", element: <OAuthRedirect /> },
  { path: "/oauth/callback", element: <OAuthCallback /> },
];

export const protectedRoutes = [
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
  {
    path: "/dashboard/admin",
    label: "Admin",
    meta: "Ops",
    roles: ["admin", "superadmin"],
    element: <AdminDashboard />,
  },
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

