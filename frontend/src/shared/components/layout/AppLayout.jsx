import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar.jsx";
import { Sidebar } from "./Sidebar.jsx";
import { Footer } from "./Footer.jsx";
import FloatingContact from "./FloatingContact.jsx";
import { NotificationToast } from "../../../features/notifications/components/NotificationToast.jsx";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-ink text-white overflow-hidden">
      <NotificationToast />
      <FloatingContact />

      {/* Navbar */}
      <Navbar
        onMenuClick={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-ink">
          <div className="min-h-full px-3 py-5 sm:px-5 lg:px-6">
            <Outlet />
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
