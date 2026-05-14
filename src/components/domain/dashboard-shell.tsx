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
      {/* Mobile overlay backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, normal flow on lg+ */}
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

      {/* Mobile top bar — fixed, shown only below lg */}
      <div className="fixed top-0 left-0 right-0 z-30 lg:hidden h-12 flex items-center gap-3 px-4 bg-[--card] border-b border-[--border]">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-1.5 rounded-lg text-[--foreground-muted] hover:bg-[--accent] transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[--primary] flex items-center justify-center">
            <Package className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-[--foreground]">GrossistePPN</span>
        </div>
      </div>
    </div>
  );
}
