"use client";

import { useState } from "react";
import { Menu, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardNav } from "./dashboard-nav";

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const [mobileNavOpen, setMobileNavOpen]   = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#0A0A0F" }}>

      {/* ── Overlay mobile ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar desktop ── */}
      <div className="hidden lg:block shrink-0">
        <DashboardNav
          role={role}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* ── Sidebar mobile (drawer) ── */}
      <motion.div
        initial={false}
        animate={{ x: mobileNavOpen ? 0 : "-100%" }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="fixed lg:hidden inset-y-0 left-0 z-50 overflow-y-auto"
      >
        <DashboardNav
          role={role}
          collapsed={false}
          onToggle={() => {}}
          onClose={() => setMobileNavOpen(false)}
        />
      </motion.div>

      {/* ── Contenu principal ── */}
      <main className="flex-1 overflow-auto min-w-0 pt-14 lg:pt-0">
        {children}
      </main>

      {/* ── Topbar mobile ── */}
      <div
        className="fixed top-0 left-0 right-0 z-30 lg:hidden h-14 flex items-center gap-3 px-4"
        style={{ backgroundColor: "#111118", borderBottom: "1px solid #1E1E2E" }}
      >
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 rounded-lg text-brand-muted hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #FF4D00 0%, #FFB800 100%)" }}
          >
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">GrossistePPN</span>
        </div>
      </div>
    </div>
  );
}
