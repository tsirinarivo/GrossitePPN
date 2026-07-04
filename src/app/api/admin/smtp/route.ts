import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";
import { isMasterHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

const SINGLETON = "singleton";

async function requireAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return false;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [row] = await db.select().from(schema.smtpConfig).limit(1);
  // Le mot de passe n'est jamais renvoyé en clair — juste un indicateur.
  return NextResponse.json({
    config: {
      host: row?.host ?? "",
      port: row?.port ?? 587,
      secure: row?.secure ?? false,
      username: row?.username ?? "",
      hasPassword: !!row?.password,
      fromEmail: row?.fromEmail ?? "",
      fromNom: row?.fromNom ?? "",
      actif: row?.actif ?? false,
    },
    envConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const [existing] = await db.select().from(schema.smtpConfig).limit(1);
  // Mot de passe : on ne l'écrase que si un nouveau est fourni (champ non vide).
  const password =
    typeof body.password === "string" && body.password.length > 0
      ? body.password
      : existing?.password ?? null;

  const values = {
    id: SINGLETON,
    host: body.host?.trim() || null,
    port: Number.isFinite(Number(body.port)) ? Number(body.port) : 587,
    secure: !!body.secure,
    username: body.username?.trim() || null,
    password,
    fromEmail: body.fromEmail?.trim() || null,
    fromNom: body.fromNom?.trim() || null,
    actif: !!body.actif,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.smtpConfig)
    .values(values)
    .onConflictDoUpdate({ target: schema.smtpConfig.id, set: values });

  await logAudit({
    action: "smtp.configurer",
    entite: "configuration",
    details: { host: values.host, actif: values.actif },
  });

  return NextResponse.json({ ok: true });
}
