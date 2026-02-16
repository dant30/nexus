import React from "react";
import { Link } from "react-router-dom";
import { 
  Github, 
  ExternalLink, 
  Mail, 
  Shield, 
  TrendingUp,
  Award,
  BookOpen,
  HelpCircle,
  FileText,
  Scale,
  Lock
} from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  const footerLinks = {
    Platform: [
      { label: "Dashboard", href: "/dashboard", icon: TrendingUp },
      { label: "Trading", href: "/dashboard/trading", icon: Award },
      { label: "Accounts", href: "/accounts", icon: Shield },
    ],
    Resources: [
      { label: "Documentation", href: "/docs", icon: BookOpen, external: false },
      { label: "API Reference", href: "/api-docs", icon: FileText, external: false },
      { label: "Support Center", href: "/support", icon: HelpCircle, external: false },
    ],
    Legal: [
      { label: "Privacy Policy", href: "/privacy", icon: Lock, external: false },
      { label: "Terms of Service", href: "/terms", icon: Scale, external: false },
      { label: "Risk Disclosure", href: "/disclaimer", icon: FileText, external: false },
    ],
  };

  return (
    <footer className="border-t border-white/10 bg-gradient-to-b from-slate/80 to-slate/95 backdrop-blur-sm transition-colors">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Top Grid - 4 columns on desktop */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12">
          
          {/* Brand Column - Takes 4 columns */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 text-white font-bold shadow-lg shadow-accent/20">
                NX
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/50 font-medium">
                  Nexus Trading
                </p>
                <p className="text-base font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  Precision Trading Platform
                </p>
              </div>
            </div>
            
            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              Professional-grade binary options trading platform with real-time execution, 
              advanced risk management, and institutional-grade security.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Shield size={14} className="text-accent" />
                <span className="text-xs text-white/70">Regulated</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Lock size={14} className="text-accent" />
                <span className="text-xs text-white/70">256-bit SSL</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Award size={14} className="text-accent" />
                <span className="text-xs text-white/70">ISO 27001</span>
              </div>
            </div>
          </div>

          {/* Links Columns - Each takes 2 columns on desktop */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="lg:col-span-2">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-white/80 mb-5 border-b border-white/10 pb-2 inline-block">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 text-sm text-white/60 transition-all hover:text-accent"
                    >
                      <link.icon 
                        size={14} 
                        className="text-white/30 group-hover:text-accent transition-colors" 
                      />
                      <span>{link.label}</span>
                      {link.external && (
                        <ExternalLink
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider with gradient */}
        <div className="my-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Bottom Footer - 3 columns on large screens */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-center text-sm">
          
          {/* Copyright - Left */}
          <div className="text-center lg:text-left order-3 lg:order-1">
            <p className="text-sm text-white/40">
              © {year} Nexus Trading Platform. 
              <span className="hidden sm:inline"> All rights reserved.</span>
            </p>
            <p className="text-xs text-white/30 mt-1">
              Precision. Discipline. Clarity.
            </p>
          </div>

          {/* Contact Info - Center */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 order-1 lg:order-2">
            <a 
              href="mailto:support@nexustrading.com"
              className="flex items-center gap-2 text-xs text-white/50 hover:text-accent transition-colors group"
            >
              <Mail size={14} className="group-hover:scale-110 transition-transform" />
              <span>support@nexustrading.com</span>
            </a>
            <span className="hidden lg:inline text-white/20">|</span>
            <span className="text-xs text-white/30">
              v2.1.0 · Production
            </span>
          </div>

          {/* Social & Trust - Right */}
          <div className="flex items-center justify-center lg:justify-end gap-3 order-2 lg:order-3">
            <a
              href="https://github.com/nexus-trading"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all hover:border-accent/30 hover:text-accent hover:bg-accent/5 hover:scale-110"
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
            <div className="h-8 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span>All systems operational</span>
            </div>
          </div>
        </div>

        {/* Additional Legal Links - Mobile Only */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/30 lg:hidden border-t border-white/5 pt-6">
          <a href="/privacy" className="hover:text-white/50">Privacy</a>
          <a href="/terms" className="hover:text-white/50">Terms</a>
          <a href="/cookies" className="hover:text-white/50">Cookies</a>
          <a href="/sitemap" className="hover:text-white/50">Sitemap</a>
        </div>
      </div>
    </footer>
  );
}