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

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on resize to desktop
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

      {/* Navbar - Fixed */}
      <Navbar
        onMenuClick={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      {/* Main Layout - Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-ink">
          <div className="mx-auto w-full max-w-7xl px-2 py-4 sm:px-4 lg:px-6">
            <Outlet />
          </div>

          {/* Footer inside scroll area */}
          <Footer />
        </main>
      </div>
    </div>
  );
}