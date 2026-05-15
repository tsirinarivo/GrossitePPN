"use client";

import { useState } from "react";
import { Menu, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardNav } from "./dashboard-nav";

export function DashboardShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[--background] overflow-hidden">
      {/* Overlay mobile */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
          "transition-transform duration-200 ease-in-out",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <DashboardNav role={role} onClose={() => setMobileNavOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0 pt-12 lg:pt-0">
        {children}
      </main>

      {/* Topbar mobile — reprend les couleurs sidebar */}
      <div
        className="fixed top-0 left-0 right-0 z-30 lg:hidden h-12 flex items-center gap-3 px-4"
        style={{
          backgroundColor: "var(--sidebar)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--sidebar-muted)" }}
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: "var(--sidebar-primary)" }}
          >
            <Package className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--sidebar-fg)" }}>
            GrossistePPN
          </span>
        </div>
      </div>
    </div>
  );
}
