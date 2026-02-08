import React from "react";
import { LoginPage } from "../pages/LoginPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { TradingPage } from "../pages/TradingPage.jsx";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage.jsx";
import { OAuthConnectPage } from "../pages/OAuthConnectPage.jsx";

export const routes = [
  { path: "/login", element: <LoginPage /> },
  { path: "/oauth/connect", element: <OAuthConnectPage /> },
  { path: "/oauth/callback", element: <OAuthCallbackPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/trade", element: <TradingPage /> }
];
