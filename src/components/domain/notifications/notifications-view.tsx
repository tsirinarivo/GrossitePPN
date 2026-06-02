"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, AlertCircle, AlertTriangle, Info, Check, CheckCheck, Loader2, Filter } from "lucide-react";
import Link from "next/link";

type Notification = {
  type: "stock" | "credit" | "commandes";
  id: string;
  message: string;
  level: "error" | "warning" | "info";
};

const LEVEL_META = {
  error: { label: "Critique", color: "#ef4444", icon: AlertCircle },
  warning: { label: "Attention", color: "#f59e0b", icon: AlertTriangle },
  info: { label: "Info", color: "#3b82f6", icon: Info },
} as const;

const TYPE_HREF: Record<Notification["type"], string> = {
  stock: "/stock",
  credit: "/clients/encours",
  commandes: "/commandes",
};

const READ_KEY = "ppn-notifications-read";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<string>("tous");
  const [showRead, setShowRead] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const d = await r.json();
      setNotifications(d.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReadIds(getReadIds());
    load();
  }, [load]);

  // Maj du titre de l'onglet
  useEffect(() => {
    const unread = notifications.filter((n) => !readIds.has(n.id));
    if (typeof document !== "undefined") {
      const base = "GrossistePPN";
      document.title = unread.length > 0 ? `(${unread.length}) ${base} — Notifications` : `${base} — Notifications`;
    }
    return () => { if (typeof document !== "undefined") document.title = "GrossistePPN"; };
  }, [notifications, readIds]);

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  const markAllRead = () => {
    const next = new Set(notifications.map((n) => n.id));
    setReadIds(next);
    saveReadIds(next);
  };

  const filtered = notifications.filter((n) => {
    if (filterLevel !== "tous" && n.level !== filterLevel) return false;
    if (!showRead && readIds.has(n.id)) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[--background]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[--border] bg-[--card] flex-wrap gap-y-2">
        <Bell className="w-5 h-5 text-[--primary]" />
        <h1 className="text-lg font-bold flex-1">Notifications {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">{unreadCount}</span>}</h1>
        <div className="flex items-center gap-1 bg-[--muted]/40 rounded-lg p-0.5">
          {["tous", "error", "warning", "info"].map((l) => (
            <button key={l} onClick={() => setFilterLevel(l)} className={`px-2.5 py-1 text-[11px] rounded-md font-medium ${filterLevel === l ? "bg-[--card] shadow-sm" : "text-[--foreground-subtle]"}`}>
              {l === "tous" ? "Tous" : LEVEL_META[l as keyof typeof LEVEL_META]?.label}
            </button>
          ))}
        </div>
        <label className="text-xs flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={showRead} onChange={(e) => setShowRead(e.target.checked)} className="accent-[--primary]" />
          Inclure lus
        </label>
        <button onClick={markAllRead} disabled={unreadCount === 0} className="flex items-center gap-1.5 px-3 py-2 border border-[--border] rounded-lg text-xs font-medium hover:bg-[--muted] disabled:opacity-50">
          <CheckCheck className="w-3.5 h-3.5" /> Tout marquer lu
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
        {loading ? (
          <div className="text-center py-16"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[--foreground-subtle]">
            <Bell className="w-12 h-12 mx-auto opacity-30 mb-3" />
            <p className="text-sm">{unreadCount === 0 ? "Toutes les notifications sont lues 🎉" : "Aucune notification correspondante"}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            {filtered.map((n, i) => {
              const meta = LEVEL_META[n.level];
              const Icon = meta.icon;
              const isRead = readIds.has(n.id);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`bg-[--card] border border-[--border] rounded-xl p-4 flex items-start gap-3 ${isRead ? "opacity-60" : ""}`}
                >
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: meta.color + "20" }}>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{n.message}</div>
                    <div className="text-[11px] text-[--foreground-subtle] mt-0.5">
                      Type : {n.type} · Priorité : {meta.label}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Link href={TYPE_HREF[n.type]} className="text-[11px] text-[--primary] hover:underline">Voir</Link>
                    {!isRead && (
                      <button onClick={() => markRead(n.id)} className="text-[11px] text-[--foreground-subtle] hover:text-[--foreground] flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Lu
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
