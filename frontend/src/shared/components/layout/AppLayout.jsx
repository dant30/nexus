import React from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { Footer } from "./Footer.jsx";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 pb-10 pt-6">
        <Sidebar />
        <main className="min-h-[60vh] flex-1 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-soft">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}