import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { parseTenantSlug } from "@/lib/tenant-host";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = parseTenantSlug(request.headers.get("host"));
  const sessionCookie = getSessionCookie(request);

  // ── Racine "/" ────────────────────────────────────────────────────────────
  // Apex  → landing marketing (visiteur) ou /dashboard (déjà connecté).
  // Sous-domaine tenant → toujours vers l'espace (/dashboard, qui gère le login).
  if (pathname === "/") {
    if (slug || sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next(); // landing publique
  }

  // ── Routes protégées ──────────────────────────────────────────────────────
  const isDashboard = DASHBOARD_ROUTES.some((r) => pathname.startsWith(r));
  const isShopAccount = SHOP_ROUTES.some((r) => pathname.startsWith(r));

  if (!isDashboard && !isShopAccount) {
    return NextResponse.next();
  }

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
