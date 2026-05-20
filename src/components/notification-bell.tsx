"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  type: "stock" | "credit" | "commandes";
  id: string;
  message: string;
  level: "error" | "warning" | "info";
}

// ── Config par type ──────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  error:   { color: "#EF4444", bg: "#2D1B1B", icon: AlertCircle },
  warning: { color: "#F59E0B", bg: "#2D2410", icon: AlertTriangle },
  info:    { color: "#3B82F6", bg: "#1A2035", icon: Info },
} as const;

const TYPE_HREF: Record<Notification["type"], string> = {
  stock:     "/stock",
  credit:    "/clients",
  commandes: "/historique",
};

// ── Composant principal ───────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  // Hydration guard for portal
  useEffect(() => setMounted(true), []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setCount(data.count ?? 0);
    } catch {
      // Silently fail — bell stays with last known state
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Position panel below bell button
  useEffect(() => {
    if (open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        bellRef.current?.contains(e.target as Node) ||
        panelRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const panel = open && mounted ? (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: panelPos.top,
        right: panelPos.right,
        zIndex: 9999,
        width: 320,
        backgroundColor: "#111118",
        border: "1px solid #1E1E2E",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #1E1E2E",
        }}
      >
        <span style={{ color: "#E5E7EB", fontWeight: 600, fontSize: 14 }}>
          Alertes
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{
            color: "#6B7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "flex",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div style={{ maxHeight: 360, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "#6B7280",
              fontSize: 13,
            }}
          >
            Aucune alerte active
          </div>
        ) : (
          notifications.map((n, idx) => {
            const cfg = LEVEL_CONFIG[n.level];
            const Icon = cfg.icon;
            const href = TYPE_HREF[n.type];
            return (
              <Link
                key={`${n.type}-${n.id}-${idx}`}
                href={href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 16px",
                  borderBottom: "1px solid #1A1A28",
                  backgroundColor: "transparent",
                  textDecoration: "none",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1A1A28")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    backgroundColor: cfg.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Icon size={14} color={cfg.color} />
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: "#D1D5DB",
                    lineHeight: "1.4",
                    flex: 1,
                  }}
                >
                  {n.message}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #1E1E2E",
          textAlign: "center",
        }}
      >
        <Link
          href="/historique"
          onClick={() => setOpen(false)}
          style={{
            fontSize: 12,
            color: "#6B7280",
            textDecoration: "none",
            display: "inline-block",
            padding: "4px 8px",
            borderRadius: 4,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#E5E7EB")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
        >
          Tout voir
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          border: "none",
          background: open ? "rgba(255,255,255,0.08)" : "transparent",
          cursor: "pointer",
          color: count > 0 ? "#E5E7EB" : "#6B7280",
          transition: "background-color 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "transparent";
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              borderRadius: 8,
              backgroundColor: "#EF4444",
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {mounted && panel && createPortal(panel, document.body)}
    </>
  );
}
