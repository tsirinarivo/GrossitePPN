import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isMasterHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

async function requireMasterAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return null;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin" ? session.user : null;
}

export async function GET() {
  if (!(await requireMasterAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const rows = await db
      .select()
      .from(schema.abonnements)
      .orderBy(desc(schema.abonnements.createdAt))
      .limit(200);
    return NextResponse.json({ abonnements: rows });
  } catch (e) {
    console.error("[api/admin/abonnements] GET", e);
    return NextResponse.json({ abonnements: [] });
  }
}
