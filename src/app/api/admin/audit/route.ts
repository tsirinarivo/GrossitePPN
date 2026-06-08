import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, desc, eq, gte, lte, ilike, type SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { demoAuditEntries, type AuditEntryDTO } from "@/lib/audit-demo";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin" || role === "gerant";
}

function buildFacets(entries: AuditEntryDTO[]) {
  const actions = new Map<string, number>();
  const entites = new Map<string, number>();
  const users = new Map<string, string>();
  for (const e of entries) {
    actions.set(e.action, (actions.get(e.action) ?? 0) + 1);
    entites.set(e.entite, (entites.get(e.entite) ?? 0) + 1);
    if (e.userId && e.userNom) users.set(e.userId, e.userNom);
  }
  return {
    actions: [...actions.entries()].map(([value, count]) => ({ value, count })),
    entites: [...entites.entries()].map(([value, count]) => ({ value, count })),
    users: [...users.entries()].map(([id, nom]) => ({ id, nom })),
  };
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? undefined;
  const entite = sp.get("entite") ?? undefined;
  const userId = sp.get("userId") ?? undefined;
  const q = sp.get("q")?.trim() || undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  const limit = Math.min(parseInt(sp.get("limit") ?? "200", 10) || 200, 1000);

  const conditions: SQL[] = [];
  if (action) conditions.push(eq(schema.journalAudit.action, action));
  if (entite) conditions.push(eq(schema.journalAudit.entite, entite));
  if (userId) conditions.push(eq(schema.journalAudit.userId, userId));
  if (q) conditions.push(ilike(schema.journalAudit.description, `%${q}%`));
  if (from) conditions.push(gte(schema.journalAudit.createdAt, new Date(from)));
  if (to) conditions.push(lte(schema.journalAudit.createdAt, new Date(`${to}T23:59:59`)));

  try {
    const rows = await db
      .select()
      .from(schema.journalAudit)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.journalAudit.createdAt))
      .limit(limit);

    if (rows.length > 0) {
      const entries: AuditEntryDTO[] = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userNom: r.userNom,
        userRole: r.userRole,
        action: r.action,
        entite: r.entite,
        entiteId: r.entiteId,
        description: r.description,
        metadata: r.metadata,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      }));
      // Facettes calculées sur l'ensemble (non filtré) pour peupler les selects.
      const allRows = await db
        .select({
          action: schema.journalAudit.action,
          entite: schema.journalAudit.entite,
          userId: schema.journalAudit.userId,
          userNom: schema.journalAudit.userNom,
          userRole: schema.journalAudit.userRole,
          description: schema.journalAudit.description,
          metadata: schema.journalAudit.metadata,
          id: schema.journalAudit.id,
          entiteId: schema.journalAudit.entiteId,
          ipAddress: schema.journalAudit.ipAddress,
          createdAt: schema.journalAudit.createdAt,
        })
        .from(schema.journalAudit)
        .limit(1000);
      const facets = buildFacets(
        allRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
      );
      return NextResponse.json({ entries, facets, demo: false });
    }
  } catch (e) {
    console.error("[admin/audit] GET error:", e instanceof Error ? e.message : e);
  }

  // ── Fallback démo ──────────────────────────────────────────────────────────
  let demo = demoAuditEntries(60);
  const facets = buildFacets(demo);
  if (action) demo = demo.filter((e) => e.action === action);
  if (entite) demo = demo.filter((e) => e.entite === entite);
  if (userId) demo = demo.filter((e) => e.userId === userId);
  if (q) demo = demo.filter((e) => e.description.toLowerCase().includes(q.toLowerCase()));
  if (from) demo = demo.filter((e) => e.createdAt >= from);
  if (to) demo = demo.filter((e) => e.createdAt <= `${to}T23:59:59`);

  return NextResponse.json({ entries: demo.slice(0, limit), facets, demo: true });
}
