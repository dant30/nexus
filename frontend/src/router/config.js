/**
 * Route Configuration
 * Centralized routing configuration with metadata
 */

import React from "react";
import { LoginPage } from "../pages/LoginPage.jsx";
import { OAuthConnectPage } from "../pages/OAuthConnectPage.jsx";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { TradingPage } from "../pages/TradingPage.jsx";

export const routes = [
  {
    path: "/",
    name: "Home",
    redirect: true,
    redirectTo: "/dashboard",
  },

  // Auth Routes
  {
    path: "/login",
    name: "Login",
    component: LoginPage,
    public: true,
    auth: false, // Don't show if authenticated
  },
  {
    path: "/oauth/connect",
    name: "Deriv OAuth Connect",
    component: OAuthConnectPage,
    public: true,
  },
  {
    path: "/oauth/callback",
    name: "OAuth Callback",
    component: OAuthCallbackPage,
    public: true,
  },

  // Protected Routes
  {
    path: "/dashboard",
    name: "Dashboard",
    component: DashboardPage,
    protected: true,
    showInNav: true,
    icon: "dashboard",
  },
  {
    path: "/trade",
    name: "Trading",
    component: TradingPage,
    protected: true,
    showInNav: true,
    icon: "trading",
  },

  // Future routes
  {
    path: "/accounts",
    name: "Accounts",
    component: null, // TODO: Create AccountsPage
    protected: true,
    showInNav: true,
    icon: "accounts",
    todo: true,
  },
  {
    path: "/profile",
    name: "Profile",
    component: null, // TODO: Create ProfilePage
    protected: true,
    showInNav: true,
    icon: "profile",
    todo: true,
  },
  {
    path: "/affiliate",
    name: "Affiliate",
    component: null, // TODO: Create AffiliatePage
    protected: true,
    showInNav: true,
    icon: "affiliate",
    todo: true,
  },
  {
    path: "/help",
    name: "Help",
    component: null, // TODO: Create HelpPage
    protected: true,
    showInNav: false,
    todo: true,
  },
];

/**
 * Get all navigation routes
 */
export function getNavRoutes() {
  return routes.filter((r) => r.showInNav && r.protected && !r.todo);
}

/**
 * Get route by path
 */
export function getRoute(path) {
  return routes.find((r) => r.path === path);
}

/**
 * Check if route requires authentication
 */
export function isProtectedRoute(path) {
  const route = getRoute(path);
  return route?.protected || false;
}

/**
 * Check if route is public
 */
export function isPublicRoute(path) {
  const route = getRoute(path);
  return route?.public || false;
}
