import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * Endpoint pour les erreurs JS côté navigateur (capturées par ErrorBoundary).
 * Best-effort : on log et on renvoie 204 même si l'écriture échoue.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return new NextResponse(null, { status: 204 });

    const h = await headers();
    const session = await auth.api.getSession({ headers: h }).catch(() => null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session?.user as any)?.id ?? null;

    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent") ?? null;

    logger.error("[client-error]", undefined, {
      message: String(body.message ?? "unknown"),
      stack: typeof body.stack === "string" ? body.stack.slice(0, 4000) : undefined,
      url: typeof body.url === "string" ? body.url : undefined,
      userId,
      ip,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
