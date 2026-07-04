import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isMasterHost } from "@/lib/tenant-host";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const SINGLETON = "singleton";

async function requireMasterAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return false;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin";
}

export async function GET() {
  if (!(await requireMasterAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const [cfg] = await db.select().from(schema.paiementConfig).where(eq(schema.paiementConfig.id, SINGLETON)).limit(1);
  return NextResponse.json(cfg ?? {});
}

export async function PUT(req: NextRequest) {
  if (!(await requireMasterAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const val = {
    mvolaNumero: body.mvolaNumero?.trim() || null,
    mvolaNom: body.mvolaNom?.trim() || null,
    orangeNumero: body.orangeNumero?.trim() || null,
    orangeNom: body.orangeNom?.trim() || null,
    airtelNumero: body.airtelNumero?.trim() || null,
    airtelNom: body.airtelNom?.trim() || null,
    instructions: body.instructions?.trim() || null,
    updatedAt: new Date(),
  };
  await db.insert(schema.paiementConfig)
    .values({ id: SINGLETON, ...val })
    .onConflictDoUpdate({ target: schema.paiementConfig.id, set: val });
  await logAudit({ action: "paiement.config", entite: "paiement_config" });
  return NextResponse.json({ ok: true });
}
