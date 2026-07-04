import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isMasterHost } from "@/lib/tenant-host";
import { logAudit } from "@/lib/audit";
import { isPlanKey, PLAN_MAP } from "@/lib/plans";

export const dynamic = "force-dynamic";

async function requireMasterAdmin() {
  const h = await headers();
  if (!isMasterHost(h.get("host"))) return null;
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  return role === "admin" ? session.user : null;
}

/** Valide ou rejette une demande d'abonnement. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireMasterAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  if (action !== "valider" && action !== "rejeter") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const [abo] = await db.select().from(schema.abonnements).where(eq(schema.abonnements.id, id)).limit(1);
  if (!abo) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (abo.statut !== "en_attente") {
    return NextResponse.json({ error: "Demande déjà traitée" }, { status: 409 });
  }

  // ── Rejet ────────────────────────────────────────────────────────────────
  if (action === "rejeter") {
    await db.update(schema.abonnements)
      .set({ statut: "rejete", valideAt: new Date(), valideBy: actor.id })
      .where(eq(schema.abonnements.id, id));
    if (abo.tenantId) {
      await db.update(schema.tenants)
        .set({ statut: "suspendu", updatedAt: new Date() })
        .where(eq(schema.tenants.id, abo.tenantId));
    }
    await logAudit({ action: "abonnement.rejeter", entite: "abonnement", entiteId: id, details: { entreprise: abo.entrepriseNom } });
    return NextResponse.json({ ok: true, statut: "rejete" });
  }

  // ── Validation → active le tenant + crée le compte + envoie les identifiants ─
  if (!abo.tenantId) {
    return NextResponse.json({ error: "Aucun tenant lié à cette demande" }, { status: 400 });
  }
  const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, abo.tenantId)).limit(1);
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const quotas = isPlanKey(abo.plan)
    ? { maxDepots: PLAN_MAP[abo.plan].maxDepots, maxUtilisateurs: PLAN_MAP[abo.plan].maxUtilisateurs }
    : {};
  await db.update(schema.tenants)
    .set({ statut: "actif", plan: abo.plan, ...quotas, updatedAt: new Date() })
    .where(eq(schema.tenants.id, tenant.id));

  // Compte gérant + email des identifiants (best-effort)
  let email: { sent: boolean; reason?: string } = { sent: false, reason: "Aucun email de contact" };
  try {
    if (tenant.contactEmail) {
      const { ensureTenantAdmin } = await import("@/lib/tenant-account");
      const admin = await ensureTenantAdmin(tenant);
      const creds = admin?.password ? { email: admin.email, password: admin.password } : null;
      const { buildTenantEmail } = await import("@/lib/tenant-email");
      const { sendMail } = await import("@/lib/mailer");
      const content = buildTenantEmail({ ...tenant, statut: "actif" }, creds);
      email = await sendMail({ to: tenant.contactEmail, ...content });
    }
  } catch (e) {
    console.error("[abonnements valider] email", e);
    email = { sent: false, reason: "Erreur envoi email" };
  }

  await db.update(schema.abonnements)
    .set({ statut: "valide", valideAt: new Date(), valideBy: actor.id })
    .where(eq(schema.abonnements.id, id));

  await logAudit({
    action: "abonnement.valider",
    entite: "abonnement",
    entiteId: id,
    details: { entreprise: abo.entrepriseNom, plan: abo.plan, montant: abo.montant, emailEnvoye: email.sent },
  });

  return NextResponse.json({ ok: true, statut: "valide", email });
}
