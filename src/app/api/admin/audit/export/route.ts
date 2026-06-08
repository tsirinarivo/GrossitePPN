import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, desc, eq, gte, lte, ilike, type SQL } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";
import { demoAuditEntries, type AuditEntryDTO } from "@/lib/audit-demo";

export const dynamic = "force-dynamic";

function csvCell(v: string | null): string {
  const s = (v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ");
  return `"${s}"`;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || (role !== "admin" && role !== "gerant")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? undefined;
  const entite = sp.get("entite") ?? undefined;
  const userId = sp.get("userId") ?? undefined;
  const q = sp.get("q")?.trim() || undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  let entries: AuditEntryDTO[] = [];

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
      .limit(5000);
    if (rows.length > 0) {
      entries = rows.map((r) => ({
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
    }
  } catch (e) {
    console.error("[admin/audit/export] error:", e instanceof Error ? e.message : e);
  }

  if (entries.length === 0) {
    let demo = demoAuditEntries(60);
    if (action) demo = demo.filter((e) => e.action === action);
    if (entite) demo = demo.filter((e) => e.entite === entite);
    if (userId) demo = demo.filter((e) => e.userId === userId);
    if (q) demo = demo.filter((e) => e.description.toLowerCase().includes(q.toLowerCase()));
    entries = demo;
  }

  await logAudit({
    action: "export",
    entite: "rgpd",
    description: `Export CSV du journal d'audit (${entries.length} entrées)`,
    actor: { id: session.user.id, nom: session.user.name, role },
  });

  const header = [
    "Date",
    "Heure",
    "Utilisateur",
    "Rôle",
    "Action",
    "Entité",
    "Description",
    "Détails",
    "Adresse IP",
  ];
  const lines = [header.map(csvCell).join(";")];
  for (const e of entries) {
    const d = new Date(e.createdAt);
    lines.push(
      [
        d.toLocaleDateString("fr-FR"),
        d.toLocaleTimeString("fr-FR"),
        e.userNom,
        e.userRole,
        e.action,
        e.entite,
        e.description,
        e.metadata,
        e.ipAddress,
      ]
        .map(csvCell)
        .join(";")
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-audit-${stamp}.csv"`,
    },
  });
}
