import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { parseHost, ROOT_DOMAIN, DEFAULT_TENANT_SLUG } from "@/lib/tenant-host";

const DASHBOARD_ROUTES = [
  "/dashboard",
  "/pos",
  "/stock",
  "/clients",
  "/livraisons",
  "/rapports",
  "/admin",
  "/achats",
  "/commandes",
  "/finances",
  "/historique",
  "/retours",
  "/tournees",
];

const SHOP_ROUTES = ["/compte"];

// Surfaces plateforme : gestion des tenants + config SMTP. Réservées à la
// console master (isolation totale vis-à-vis des tenants).
const PLATFORM_ROUTES = ["/admin/tenants", "/admin/smtp"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { kind } = parseHost(request.headers.get("host"));
  const sessionCookie = getSessionCookie(request);

  // 1) Les routes plateforme n'existent QUE sur la console master.
  if (PLATFORM_ROUTES.some((r) => pathname.startsWith(r)) && kind !== "master") {
    return NextResponse.redirect(new URL(kind === "tenant" ? "/admin" : "/", request.url));
  }

  // 2) Apex : uniquement la landing. Login et routes applicatives sont
  //    renvoyés vers le sous-domaine tenant par défaut (aucun login sur l'apex).
  if (kind === "apex") {
    if (pathname === "/") return NextResponse.next();
    return NextResponse.redirect(new URL(`${pathname}${search}`, `https://${DEFAULT_TENANT_SLUG}.${ROOT_DOMAIN}`));
  }

  // 3) Racine des sous-domaines.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(kind === "master" ? "/admin/tenants" : "/dashboard", request.url));
  }
  // Sur master, /dashboard mène à la gestion des tenants.
  if (kind === "master" && pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/admin/tenants", request.url));
  }

  // 4) Garde d'authentification sur les routes protégées.
  const isDashboard = DASHBOARD_ROUTES.some((r) => pathname.startsWith(r));
  const isShopAccount = SHOP_ROUTES.some((r) => pathname.startsWith(r));
  if (!isDashboard && !isShopAccount) return NextResponse.next();

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
    "/pos/:path*",
    "/stock/:path*",
    "/clients/:path*",
    "/livraisons/:path*",
    "/rapports/:path*",
    "/admin/:path*",
    "/achats/:path*",
    "/commandes/:path*",
    "/finances/:path*",
    "/historique/:path*",
    "/retours/:path*",
    "/tournees/:path*",
    "/compte/:path*",
  ],
};
