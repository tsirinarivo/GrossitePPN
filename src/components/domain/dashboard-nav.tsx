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
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/app.store";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useSession, signOut } from "@/lib/auth/client";
import { toast } from "sonner";
import { canAccess, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";

const ALL_NAV_ITEMS = [
  { href: "/pos/agent",  label: "Point de vente", icon: ShoppingCart, badge: null, couleur: "text-[--color-ocre-600]" },
  { href: "/pos/caisse",  label: "Caisse",           icon: Receipt,  badge: null, couleur: "text-[--color-vanille-600]" },
  { href: "/historique",  label: "Historique ventes",icon: History,  badge: null, couleur: null },
  { href: "/stock",      label: "Stock",           icon: Package,      badge: null, couleur: "text-[--color-indigo-600]" },
  { href: "/clients",    label: "Clients",         icon: Users,        badge: null, couleur: null },
  { href: "/livraisons", label: "Livraisons",      icon: Truck,        badge: null, couleur: null },
  { href: "/achats",     label: "Achats",          icon: ShoppingBag,  badge: null, couleur: null },
  { href: "/rapports",   label: "Rapports",        icon: BarChart3,    badge: null, couleur: null },
  { href: "/shop",       label: "Boutique",        icon: Store,        badge: null, couleur: null, external: true },
  { href: "/admin",      label: "Admin",           icon: Settings,     badge: null, couleur: null },
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
    <nav className="w-64 lg:w-16 xl:w-56 h-screen flex flex-col border-r border-[--border] bg-[--card] shrink-0 transition-all duration-200">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[--border]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[--primary] flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-white" />
          </div>
          <div className="lg:hidden xl:block min-w-0 flex-1">
            <div className="text-sm font-bold tracking-tight truncate">GrossistePPN</div>
            <div className="text-[10px] text-[--foreground-subtle] truncate">Madagascar</div>
          </div>
        </div>
        {/* Close button - mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-[--foreground-muted] hover:bg-[--accent] transition-colors"
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
            pathname === item.href ||
            pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg",
                "text-sm font-medium transition-all duration-150",
                "group relative",
                isActive
                  ? "bg-[--primary]/10 text-[--primary]"
                  : "text-[--foreground-muted] hover:bg-[--accent] hover:text-[--foreground]"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive && item.couleur ? item.couleur : "",
                  isActive && !item.couleur ? "text-[--primary]" : ""
                )}
              />
              <span className="lg:hidden xl:block truncate">{item.label}</span>
              {item.badge && (
                <Badge
                  variant="destructive"
                  className="lg:hidden xl:flex ml-auto text-[10px] h-5 min-w-5 px-1.5"
                >
                  {item.badge}
                </Badge>
              )}
              {isActive && (
                <ChevronRight className="lg:hidden xl:block w-4 h-4 ml-auto text-[--primary] opacity-60" />
              )}
              {/* Tooltip pour mode réduit (lg only) */}
              <div className="hidden lg:block xl:hidden absolute left-full ml-2 px-2 py-1 bg-[--foreground] text-[--background] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
                {item.badge && (
                  <span className="ml-1 px-1 bg-[--destructive] text-white rounded-full text-[10px]">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sélecteur de langue + plein écran */}
      <div className="px-3 pb-2 lg:hidden xl:block space-y-1">
        <LocaleSwitcher className="w-full justify-around" />
        <FullscreenToggle className="w-full justify-center" />
      </div>
      {/* Plein écran mode icône (lg sans labels) */}
      <div className="hidden lg:flex xl:hidden justify-center pb-2">
        <FullscreenToggle iconOnly />
      </div>

      {/* Statut connexion */}
      <div className="px-3 py-2 border-t border-[--border]">
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",
            connexion === "online"
              ? "text-[--success]"
              : connexion === "slow"
                ? "text-[--warning-foreground]"
                : "text-[--destructive]"
          )}
        >
          {connexion === "offline" ? (
            <WifiOff className="w-4 h-4 shrink-0" />
          ) : (
            <Wifi className="w-4 h-4 shrink-0" />
          )}
          <span className="lg:hidden xl:block font-medium">
            {connexion === "online"
              ? "En ligne"
              : connexion === "slow"
                ? "Réseau lent"
                : "Hors ligne"}
          </span>
        </div>
      </div>

      {/* Profil utilisateur + déconnexion */}
      <div className="p-3 border-t border-[--border]">
        <div className="flex items-center gap-2 min-w-0">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[--primary]/15 text-[--primary] flex items-center justify-center font-semibold text-xs shrink-0">
            {userInitials || <User className="w-4 h-4" />}
          </div>

          {/* Nom + rôle */}
          <div className="lg:hidden xl:flex flex-col flex-1 min-w-0">
            <span className="text-xs font-medium text-[--foreground] truncate">{userName}</span>
            <span className="text-[10px] text-[--foreground-subtle] truncate">
              {role ? (ROLE_LABELS[role as AppRole] ?? role) : ""}
            </span>
          </div>

          {/* Bouton déconnexion */}
          <button
            onClick={handleSignOut}
            title="Se déconnecter"
            className={cn(
              "p-1.5 rounded-lg text-[--foreground-muted] transition-colors",
              "hover:bg-[--destructive]/10 hover:text-[--destructive]",
              "group relative"
            )}
          >
            <LogOut className="w-4 h-4" />
            {/* Tooltip mode réduit (lg only) */}
            <div className="hidden lg:block xl:hidden absolute left-full ml-2 px-2 py-1 bg-[--foreground] text-[--background] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Se déconnecter
            </div>
          </button>
        </div>
      </div>
    </nav>
  );
}
