import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "agent";
  if (role !== "admin") return null;
  return { id: session.user.id, nom: session.user.name, role };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function demoTenants() {
  const now = Date.now();
  const j = 24 * 60 * 60 * 1000;
  return [
    { id: "demo-t1", nom: "Grossiste Analakely", slug: "analakely", statut: "actif", plan: "pro", contactNom: "Hery Rakoto", contactEmail: "hery@analakely.mg", contactTelephone: "034 12 345 67", maxUtilisateurs: 25, maxDepots: 3, finEssaiAt: null, notes: null, createdAt: new Date(now - 120 * j).toISOString(), updatedAt: new Date(now - 2 * j).toISOString() },
    { id: "demo-t2", nom: "Distrib Tamatave", slug: "tamatave", statut: "actif", plan: "standard", contactNom: "Tiana Andria", contactEmail: "contact@distamatave.mg", contactTelephone: "032 98 765 43", maxUtilisateurs: 10, maxDepots: 2, finEssaiAt: null, notes: null, createdAt: new Date(now - 80 * j).toISOString(), updatedAt: new Date(now - 5 * j).toISOString() },
    { id: "demo-t3", nom: "PPN Fianar Express", slug: "fianar-express", statut: "essai", plan: "essai", contactNom: "Lova Rabe", contactEmail: "lova@fianar.mg", contactTelephone: "033 44 556 67", maxUtilisateurs: 5, maxDepots: 1, finEssaiAt: new Date(now + 9 * j).toISOString(), notes: "Prospect chaud", createdAt: new Date(now - 5 * j).toISOString(), updatedAt: new Date(now - 5 * j).toISOString() },
    { id: "demo-t4", nom: "Épicerie Diego Nord", slug: "diego-nord", statut: "suspendu", plan: "standard", contactNom: "Niry Rasoa", contactEmail: "niry@diego.mg", contactTelephone: "034 77 889 90", maxUtilisateurs: 10, maxDepots: 1, finEssaiAt: null, notes: "Impayé mars", createdAt: new Date(now - 200 * j).toISOString(), updatedAt: new Date(now - 30 * j).toISOString() },
  ];
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const rows = await db
      .select()
      .from(schema.tenants)
      .orderBy(desc(schema.tenants.createdAt));
    if (rows.length > 0) {
      return NextResponse.json({ tenants: rows, demo: false });
    }
  } catch (e) {
    console.error("[admin/tenants] GET", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ tenants: demoTenants(), demo: true });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdmin();
  if (!actor) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.nom?.trim()) {
    return NextResponse.json({ error: "Nom du tenant requis" }, { status: 400 });
  }

  const slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.nom);
  if (!slug) {
    return NextResponse.json({ error: "Slug invalide" }, { status: 400 });
  }

  const statuts = ["essai", "actif", "suspendu", "resilie"];
  const plans = ["essai", "standard", "pro", "entreprise"];
  const statut = statuts.includes(body.statut) ? body.statut : "essai";
  const plan = plans.includes(body.plan) ? body.plan : "essai";

  const id = crypto.randomUUID();
  try {
    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        id,
        nom: body.nom.trim(),
        slug,
        statut,
        plan,
        contactNom: body.contactNom?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        contactTelephone: body.contactTelephone?.trim() || null,
        maxUtilisateurs: Number.isFinite(Number(body.maxUtilisateurs)) ? Number(body.maxUtilisateurs) : 5,
        maxDepots: Number.isFinite(Number(body.maxDepots)) ? Number(body.maxDepots) : 1,
        finEssaiAt: body.finEssaiAt ? new Date(body.finEssaiAt) : null,
        notes: body.notes?.trim() || null,
      })
      .returning();

    await logAudit({
      action: "tenant.creer",
      entite: "tenant",
      entiteId: id,
      details: { nom: body.nom.trim(), slug, plan, statut },
    });

    // Création du compte administrateur du tenant + envoi des accès (si email + SMTP)
    let email: { sent: boolean; reason?: string } = { sent: false, reason: "Aucun email de contact" };
    if (tenant?.contactEmail) {
      const { ensureTenantAdmin } = await import("@/lib/tenant-account");
      const admin = await ensureTenantAdmin(tenant);
      const creds = admin?.password ? { email: admin.email, password: admin.password } : null;

      const { buildTenantEmail } = await import("@/lib/tenant-email");
      const { sendMail } = await import("@/lib/mailer");
      const content = buildTenantEmail(tenant, creds);
      email = await sendMail({ to: tenant.contactEmail, ...content });
      if (email.sent) {
        await logAudit({
          action: creds ? "tenant.envoi_identifiants" : "tenant.envoi_infos",
          entite: "tenant",
          entiteId: id,
          details: { to: tenant.contactEmail, compteCree: !!creds },
        });
      }
    }

    return NextResponse.json({ tenant, email }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 });
    }
    console.error("[admin/tenants] POST", msg);
    return NextResponse.json({ error: "Erreur de création" }, { status: 500 });
  }
}
