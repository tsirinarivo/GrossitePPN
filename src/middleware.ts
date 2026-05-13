import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const DASHBOARD_ROUTES = [
  "/pos",
  "/stock",
  "/clients",
  "/livraisons",
  "/rapports",
  "/admin",
  "/achats",
];

const SHOP_ROUTES = ["/compte"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboard = DASHBOARD_ROUTES.some((r) => pathname.startsWith(r));
  const isShopAccount = SHOP_ROUTES.some((r) => pathname.startsWith(r));

  if (!isDashboard && !isShopAccount) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL(
      isDashboard ? "/login" : "/shop/login",
      request.url
    );
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/pos/:path*",
    "/stock/:path*",
    "/clients/:path*",
    "/livraisons/:path*",
    "/rapports/:path*",
    "/admin/:path*",
    "/achats/:path*",
    "/compte/:path*",
  ],
};
