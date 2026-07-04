"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, ShoppingBag, Package, Users, Truck,
  BarChart3, DollarSign, Settings, Store,
  Wifi, WifiOff, Receipt, History, LogOut, User,
  X, ChevronLeft, ClipboardList, RotateCcw, Route,
  Building, Mail, LayoutDashboard, CreditCard, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useSession, signOut } from "@/lib/auth/client";
import { toast } from "sonner";
import { canAccess, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;
  newTab?: boolean;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/pos/agent",  label: "Point de vente",   icon: ShoppingCart, color: "#FF4D00" },
  { href: "/pos/caisse", label: "Caisse",            icon: Receipt,      color: "#8B5CF6" },
  { href: "/historique", label: "Historique",        icon: History,      color: "#6B7280" },
  { href: "/commandes",  label: "Commandes",          icon: ClipboardList, color: "#EC4899" },
  { href: "/retours",    label: "Retours & avoirs",   icon: RotateCcw,    color: "#EF4444" },
  { href: "/finances",   label: "Finances",          icon: DollarSign,   color: "#10B981" },
  { href: "/stock",      label: "Stock",             icon: Package,      color: "#3B82F6" },
  { href: "/clients",    label: "Clients",           icon: Users,        color: "#F59E0B" },
  { href: "/livraisons", label: "Livraisons",        icon: Truck,        color: "#6B7280" },
  { href: "/tournees",   label: "Tournées",          icon: Route,        color: "#3B82F6" },
  { href: "/achats",     label: "Achats",            icon: ShoppingBag,  color: "#6B7280" },
  { href: "/rapports",   label: "Rapports",          icon: BarChart3,    color: "#6B7280" },
  { href: "/shop",       label: "Boutique",          icon: Store,        color: "#6B7280", newTab: true },
  { href: "/admin",      label: "Admin",             icon: Settings,     color: "#6B7280" },
];

// Console master : uniquement la gestion plateforme (aucune donnée de vente/ERP).
const PLATFORM_NAV_ITEMS: NavItem[] = [
  { href: "/admin/plateforme",  label: "Tableau de bord", icon: LayoutDashboard, color: "#10B981" },
  { href: "/admin/tenants",     label: "Tenants",         icon: Building,         color: "#FF4D00" },
  { href: "/admin/abonnements", label: "Abonnements",     icon: CreditCard,      color: "#8B5CF6" },
  { href: "/admin/paiements",   label: "Paiement",        icon: Smartphone,      color: "#22C55E" },
  { href: "/admin/smtp",        label: "Email / SMTP",    icon: Mail,             color: "#3B82F6" },
];

type Props = {
  role?: string;
  isMaster?: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
};

export function DashboardNav({ role, isMaster = false, collapsed, onToggle, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const connexion = useAppStore((s) => s.connexion);
  const { data: session } = useSession();
  const [nbAlertes, setNbAlertes] = useState(0);
  const [nbCaisse, setNbCaisse] = useState(0);

  useEffect(() => {
    // Pas de badges ERP sur la console master.
    if (isMaster) return;
    const fetchBadges = () => {
      fetch("/api/stock/alertes-count").then((r) => r.json()).then((d) => setNbAlertes(d.nbAlertes ?? 0)).catch(() => {});
      fetch("/api/caisse/commandes").then((r) => r.json()).then((d) => setNbCaisse(Array.isArray(d) ? d.length : 0)).catch(() => {});
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 60_000);
    return () => clearInterval(interval);
  }, [isMaster]);

  const BADGES: Record<string, number> = {
    "/stock": nbAlertes,
    "/pos/caisse": nbCaisse,
  };

  const navItems = isMaster
    ? PLATFORM_NAV_ITEMS
    : ALL_NAV_ITEMS.filter((item) => canAccess(role, item.href));

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const userName = session?.user?.name ?? session?.user?.email ?? "Utilisateur";
  const userInitials = userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <motion.nav
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="h-screen flex flex-col shrink-0 overflow-hidden relative"
      style={{
        backgroundColor: "#232630",
        borderRight: "1px solid #333744",
        minWidth: collapsed ? 72 : 240,
      }}
    >
      {/* ── Logo ── */}
      <div
        className="h-14 flex items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid #333744" }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          {/* Logo icon avec gradient */}
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: "linear-gradient(135deg, #FF4D00 0%, #FFB800 100%)" }}
          >
            <Package className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 overflow-hidden"
              >
                <div className="text-sm font-bold text-white truncate leading-tight">
                  GrossistePPN
                </div>
                <div className="text-[10px] text-brand-muted truncate">{isMaster ? "Console plateforme" : "Madagascar"}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Close on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/5 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Nav items ── */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              target={item.newTab ? "_blank" : undefined}
              rel={item.newTab ? "noopener noreferrer" : undefined}
              className={cn(
                "sidebar-item relative group",
                isActive && "active"
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Icône colorée selon section */}
              <div
                className="w-5 h-5 shrink-0 flex items-center justify-center"
                style={isActive ? { color: item.color } : {}}
              >
                <item.icon className="w-5 h-5" />
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={{ duration: 0.12 }}
                    className="truncate text-sm flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* Badge alerte */}
              {(BADGES[item.href] ?? 0) > 0 && (
                <span className={cn(
                  "flex items-center justify-center rounded-full text-white font-bold leading-none shrink-0",
                  collapsed ? "absolute top-1 right-1 w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px] ml-auto"
                )} style={{ backgroundColor: "#EF4444" }}>
                  {BADGES[item.href]! > 99 ? "99+" : BADGES[item.href]}
                </span>
              )}

              {/* Tooltip en mode réduit */}
              {collapsed && (
                <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                  style={{
                    backgroundColor: "#14161B",
                    color: "white",
                    border: "1px solid #333744",
                  }}
                >
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Toggle collapse (desktop) ── */}
      <div className="hidden lg:flex justify-center py-2 px-2" style={{ borderTop: "1px solid #333744" }}>
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-brand-muted hover:text-white hover:bg-white/5 transition-colors"
          title={collapsed ? "Développer" : "Réduire"}
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* ── Langue (mode expanded seulement) ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pb-2"
          >
            <LocaleSwitcher className="w-full justify-around" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Connexion ── */}
      <div className="px-3 py-2" style={{ borderTop: "1px solid #333744" }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium">
          {connexion === "offline" ? (
            <WifiOff className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0 text-green-400" />
          )}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: connexion === "online" ? "#4ade80"
                       : connexion === "slow"   ? "#fbbf24"
                       : "#f87171",
                }}
              >
                {connexion === "online" ? "En ligne"
                 : connexion === "slow" ? "Réseau lent"
                 : "Hors ligne"}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Profil ── */}
      <div className="p-3" style={{ borderTop: "1px solid #333744" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
            style={{
              background: "linear-gradient(135deg, #FF4D00 0%, #FFB800 100%)",
              color: "white",
            }}
          >
            {userInitials || <User className="w-3.5 h-3.5" />}
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={{ duration: 0.12 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <div className="text-xs font-semibold text-white truncate">{userName}</div>
                <div className="text-[10px] text-brand-muted truncate">
                  {role ? (ROLE_LABELS[role as AppRole] ?? role) : ""}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            title="Se déconnecter"
            className="p-1.5 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 group relative"
          >
            <LogOut className="w-4 h-4" />
            {collapsed && (
              <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                style={{ backgroundColor: "#14161B", color: "white", border: "1px solid #333744" }}
              >
                Se déconnecter
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
