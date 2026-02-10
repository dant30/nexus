import React from "react";
import { Link } from "react-router-dom";
import { Github, ExternalLink } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Trading", href: "/dashboard/trading" },
      { label: "Accounts", href: "/accounts" },
    ],
    Resources: [
      { label: "Documentation", href: "#" },
      { label: "API Docs", href: "#" },
      { label: "Status", href: "#" },
    ],
    Legal: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Disclaimer", href: "#" },
    ],
  };

  return (
    <footer className="border-t border-white/10 bg-slate/50 backdrop-blur-sm transition-colors">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent font-bold text-sm">
                NX
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50">
                  Nexus
                </p>
                <p className="text-sm font-semibold">Trading Bot</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/60 leading-relaxed max-w-xs">
              Professional binary trading platform with real-time execution and
              advanced risk management.
            </p>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs uppercase tracking-wider font-semibold text-white/80 mb-4">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-white/60 transition-colors hover:text-accent flex items-center gap-1 group"
                    >
                      {link.label}
                      {link.href.startsWith("http") && (
                        <ExternalLink
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-6 border-t border-white/10" />

        {/* Bottom Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div className="text-center sm:text-left">
            <p>© {year} Nexus Trading Platform. All rights reserved.</p>
            <p className="mt-1 text-white/40">
              Precision. Discipline. Clarity.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#"
              className="p-2 rounded-lg border border-white/10 text-white/60 transition-all hover:border-accent/40 hover:text-accent hover:bg-accent/5"
              aria-label="GitHub"
            >
              <Github size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
