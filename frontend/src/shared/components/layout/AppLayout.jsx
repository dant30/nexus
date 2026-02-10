import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { Footer } from "./Footer.jsx";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink text-white flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 sm:px-6 py-6">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-soft">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
