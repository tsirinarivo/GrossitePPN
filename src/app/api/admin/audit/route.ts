import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc, gte, eq, and, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role ?? "agent";
  if (role !== "admin" && role !== "gerant") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const periode = searchParams.get("periode") ?? "semaine";
  const action = searchParams.get("action") ?? "";
  const entite = searchParams.get("entite") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 1000);

  const now = new Date();
  let debut: Date;
  if (periode === "jour") debut = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (periode === "semaine") debut = new Date(now.getTime() - 7 * 86400000);
  else if (periode === "mois") debut = new Date(now.getFullYear(), now.getMonth(), 1);
  else debut = new Date(now.getFullYear(), 0, 1);

  try {
    const logs = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          gte(schema.auditLogs.createdAt, debut),
          action ? eq(schema.auditLogs.action, action) : undefined,
          entite ? eq(schema.auditLogs.entite, entite) : undefined,
          q
            ? or(
                ilike(schema.auditLogs.userEmail, `%${q}%`),
                ilike(schema.auditLogs.entiteId, `%${q}%`),
                ilike(schema.auditLogs.action, `%${q}%`)
              )
            : undefined
        )
      )
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}
