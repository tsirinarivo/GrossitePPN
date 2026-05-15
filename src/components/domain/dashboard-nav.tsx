"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  ShoppingBag,
  Package,
  Users,
  Truck,
  BarChart3,
  DollarSign,
  Settings,
  Store,
  ChevronRight,
  Wifi,
  WifiOff,
  Receipt,
  History,
  LogOut,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useSession, signOut } from "@/lib/auth/client";
import { toast } from "sonner";
import { canAccess, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";

const ALL_NAV_ITEMS = [
  { href: "/pos/agent",  label: "Point de vente",  icon: ShoppingCart, accent: "#f59e0b" },
  { href: "/pos/caisse", label: "Caisse",           icon: Receipt,      accent: "#a78bfa" },
  { href: "/historique", label: "Historique ventes",icon: History,      accent: null },
  { href: "/finances",   label: "Finances",         icon: DollarSign,   accent: "#34d399" },
  { href: "/stock",      label: "Stock",            icon: Package,      accent: "#60a5fa" },
  { href: "/clients",    label: "Clients",          icon: Users,        accent: null },
  { href: "/livraisons", label: "Livraisons",       icon: Truck,        accent: null },
  { href: "/achats",     label: "Achats",           icon: ShoppingBag,  accent: null },
  { href: "/rapports",   label: "Rapports",         icon: BarChart3,    accent: null },
  { href: "/shop",       label: "Boutique",         icon: Store,        accent: null },
  { href: "/admin",      label: "Admin",            icon: Settings,     accent: null },
];

export function DashboardNav({ role, onClose }: { role?: string; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const connexion = useAppStore((s) => s.connexion);
  const { data: session } = useSession();

  const navItems = ALL_NAV_ITEMS.filter((item) => canAccess(role, item.href));

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
    <nav
      className="w-64 lg:w-16 xl:w-56 h-screen flex flex-col shrink-0 transition-all duration-200"
      style={{ backgroundColor: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-4"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: "var(--sidebar-primary)" }}
          >
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="lg:hidden xl:block min-w-0 flex-1">
            <div className="text-sm font-bold tracking-tight truncate" style={{ color: "var(--sidebar-fg)" }}>
              GrossistePPN
            </div>
            <div className="text-[10px]" style={{ color: "var(--sidebar-muted)" }}>Madagascar</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--sidebar-muted)" }}
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const activeColor = item.accent ?? "var(--sidebar-primary)";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2 rounded-lg",
                "text-sm font-medium transition-all duration-150 group relative"
              )}
              style={
                isActive
                  ? { backgroundColor: "rgba(245,158,11,0.12)", color: "var(--sidebar-primary)" }
                  : { color: "var(--sidebar-muted)" }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-accent)";
                  (e.currentTarget as HTMLElement).style.color = "var(--sidebar-accent-fg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "";
                  (e.currentTarget as HTMLElement).style.color = "var(--sidebar-muted)";
                }
              }}
            >
              <item.icon
                className="w-5 h-5 shrink-0"
                style={isActive ? { color: activeColor } : {}}
              />
              <span className="lg:hidden xl:block truncate">{item.label}</span>
              {isActive && (
                <ChevronRight
                  className="lg:hidden xl:block w-3.5 h-3.5 ml-auto opacity-50"
                  style={{ color: "var(--sidebar-primary)" }}
                />
              )}
              {/* Tooltip mode icône (lg) */}
              <div
                className="hidden lg:block xl:hidden absolute left-full ml-3 px-2.5 py-1.5 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl"
                style={{
                  backgroundColor: "var(--sidebar-deeper)",
                  color: "var(--sidebar-fg)",
                  border: "1px solid var(--sidebar-border)",
                }}
              >
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Langue + plein écran */}
      <div className="px-3 pb-2 lg:hidden xl:block space-y-1">
        <LocaleSwitcher className="w-full justify-around" />
        <FullscreenToggle className="w-full justify-center" />
      </div>
      <div className="hidden lg:flex xl:hidden justify-center pb-2">
        <FullscreenToggle iconOnly />
      </div>

      {/* Statut connexion */}
      <div className="px-3 py-2" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium">
          {connexion === "offline" ? (
            <WifiOff className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0 text-green-400" />
          )}
          <span
            className="lg:hidden xl:block"
            style={{
              color: connexion === "online" ? "#4ade80"
                   : connexion === "slow"   ? "#fbbf24"
                   : "#f87171",
            }}
          >
            {connexion === "online" ? "En ligne"
             : connexion === "slow" ? "Réseau lent"
             : "Hors ligne"}
          </span>
        </div>
      </div>

      {/* Profil */}
      <div className="p-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
            style={{ backgroundColor: "rgba(245,158,11,0.18)", color: "var(--sidebar-primary)" }}
          >
            {userInitials || <User className="w-4 h-4" />}
          </div>
          <div className="lg:hidden xl:flex flex-col flex-1 min-w-0">
            <span className="text-xs font-semibold truncate" style={{ color: "var(--sidebar-fg)" }}>
              {userName}
            </span>
            <span className="text-[10px]" style={{ color: "var(--sidebar-muted)" }}>
              {role ? (ROLE_LABELS[role as AppRole] ?? role) : ""}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Se déconnecter"
            className="p-1.5 rounded-lg transition-colors group relative"
            style={{ color: "var(--sidebar-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(248,113,113,0.15)";
              (e.currentTarget as HTMLElement).style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "";
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-muted)";
            }}
          >
            <LogOut className="w-4 h-4" />
            <div
              className="hidden lg:block xl:hidden absolute left-full ml-3 px-2.5 py-1.5 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl"
              style={{
                backgroundColor: "var(--sidebar-deeper)",
                color: "var(--sidebar-fg)",
                border: "1px solid var(--sidebar-border)",
              }}
            >
              Se déconnecter
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
}
