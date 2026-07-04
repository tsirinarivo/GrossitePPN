import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";
import { buildTenantEmail } from "@/lib/tenant-email";
import { sendMail, isMailConfigured } from "@/lib/mailer";
import { isMasterHost } from "@/lib/tenant-host";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return false;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return false;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin";
}

/** Renvoie les informations d'accès d'un tenant à son contact par email. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.id, id))
    .limit(1);

  if (!tenant) {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  // Email destinataire : celui du tenant, ou un override transmis dans le body
  const body = await req.json().catch(() => null);
  const to = (body?.email as string | undefined)?.trim() || tenant.contactEmail;

  if (!to) {
    return NextResponse.json(
      { error: "Aucun email de contact pour ce tenant" },
      { status: 400 }
    );
  }
  if (!(await isMailConfigured())) {
    return NextResponse.json(
      { sent: false, error: "SMTP non configuré — renseignez-le dans Admin → Email/SMTP" },
      { status: 503 }
    );
  }

  // Option : réinitialiser le mot de passe du compte tenant et l'inclure
  let creds: { email: string; password: string } | null = null;
  if (body?.resetPassword) {
    const { resetTenantAdminPassword } = await import("@/lib/tenant-account");
    creds = await resetTenantAdminPassword(tenant);
    if (!creds) {
      return NextResponse.json(
        { error: "Impossible de générer les identifiants (email de contact requis)" },
        { status: 400 }
      );
    }
  }

  const content = buildTenantEmail(tenant, creds);
  const result = await sendMail({ to, ...content });

  if (result.sent) {
    await logAudit({
      action: creds ? "tenant.envoi_identifiants" : "tenant.envoi_infos",
      entite: "tenant",
      entiteId: id,
      details: { to, motDePasseReinitialise: !!creds },
    });
    return NextResponse.json({ sent: true, to, credentials: !!creds });
  }
  return NextResponse.json(
    { sent: false, error: result.reason ?? "Échec de l'envoi" },
    { status: 502 }
  );
}
