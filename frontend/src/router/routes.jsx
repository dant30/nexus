import React from "react";
import { Login } from "../features/auth/pages/Login.jsx";
import { OAuthCallback } from "../features/auth/pages/OAuthCallback.jsx";
import { OAuthRedirect } from "../features/auth/pages/OAuthRedirect.jsx";
import { UserDashboard } from "../features/dashboard/pages/UserDashboard.jsx";
import { TradingDashboard } from "../features/dashboard/pages/TradingDashboard.jsx";
import { AdminDashboard } from "../features/dashboard/pages/AdminDashboard.jsx";
import { NotificationCenter } from "../features/notifications/pages/NotificationCenter.jsx";

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
    label: "Trading",
    meta: "Live",
    element: <TradingDashboard />,
  },
  {
    path: "/dashboard/admin",
    label: "Admin",
    meta: "Ops",
    element: <AdminDashboard />,
  },
  {
    path: "/dashboard/notifications",
    label: "Notifications",
    meta: "Inbox",
    element: <NotificationCenter />,
  },
];

export const navigationRoutes = protectedRoutes.map(({ path, label, meta }) => ({
  path,
  label,
  meta,
}));
