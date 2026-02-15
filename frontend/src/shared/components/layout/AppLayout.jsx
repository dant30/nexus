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
    <div className="flex min-h-screen flex-col bg-ink text-white">
      <NotificationToast />
      <FloatingContact />

      {/* Navbar - Fixed at top */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

      {/* Main Layout - Flex row for sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Sticky on desktop, slide-in on mobile */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content - Scrollable area */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
            {/* Footer - Outside main content, always at bottom */}
            <Footer />
          </div>
        </main>
      </div>

    </div>
  );
}