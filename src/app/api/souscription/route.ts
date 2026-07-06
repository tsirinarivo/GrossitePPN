import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { isPlanKey, PLAN_MAP, planAllowsB2B } from "@/lib/plans";

export const dynamic = "force-dynamic";

const OPERATEURS = ["mvola", "orange_money", "airtel_money"] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Souscription publique depuis la landing : crée le tenant (en attente) + la demande de paiement. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const plan = String(body.plan ?? "");
  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: "Formule invalide" }, { status: 400 });
  }
  const entrepriseNom = String(body.entrepriseNom ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
  const contactNom = String(body.contactNom ?? "").trim();
  const telephone = String(body.telephone ?? "").trim();
  const reference = String(body.reference ?? "").trim();
  const operateur = String(body.operateur ?? "");

  if (!entrepriseNom) return NextResponse.json({ error: "Nom de l'entreprise requis" }, { status: 400 });
  if (!contactEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Email de contact valide requis" }, { status: 400 });
  }
  if (!OPERATEURS.includes(operateur as (typeof OPERATEURS)[number])) {
    return NextResponse.json({ error: "Opérateur Mobile Money invalide" }, { status: 400 });
  }
  if (!reference) {
    return NextResponse.json({ error: "Référence de la transaction requise" }, { status: 400 });
  }

  // Email unique : pas de compte existant ni de demande déjà en cours.
  try {
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(sql`lower(${schema.users.email})`, contactEmail))
      .limit(1);
    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email. Connectez-vous à votre espace ou utilisez une autre adresse." },
        { status: 409 }
      );
    }
    const [existingDemande] = await db
      .select({ id: schema.abonnements.id })
      .from(schema.abonnements)
      .where(and(eq(sql`lower(${schema.abonnements.contactEmail})`, contactEmail), eq(schema.abonnements.statut, "en_attente")))
      .limit(1);
    if (existingDemande) {
      return NextResponse.json(
        { error: "Une demande de souscription est déjà en cours pour cet email. Nous la validons au plus vite." },
        { status: 409 }
      );
    }
  } catch (e) {
    console.error("[api/souscription] vérif email", e);
  }

  const planDef = PLAN_MAP[plan];
  const montant = planDef.prix;

  // Slug unique (dérivé du nom, suffixe si déjà pris).
  const wantedSlug = (body.slug ? slugify(String(body.slug)) : slugify(entrepriseNom)) || "tenant";
  let slug = wantedSlug;
  try {
    const [taken] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, slug)).limit(1);
    if (taken) slug = `${wantedSlug}-${Math.random().toString(36).slice(2, 6)}`;
  } catch {
    /* on tentera l'insert directement */
  }

  const tenantId = crypto.randomUUID();
  try {
    // Tenant créé immédiatement, EN ATTENTE de paiement (activé à la validation).
    await db.insert(schema.tenants).values({
      id: tenantId,
      nom: entrepriseNom,
      slug,
      statut: "en_attente",
      plan,
      contactNom: contactNom || null,
      contactEmail,
      contactTelephone: telephone || null,
      maxDepots: planDef.maxDepots,
      maxUtilisateurs: planDef.maxUtilisateurs,
    });

    // Identité entreprise (utilisée sur ses futurs documents).
    // Boutique B2B activée seulement si la formule l'inclut (pas Standard).
    await db.insert(schema.entreprise).values({
      id: crypto.randomUUID(),
      tenantId,
      nom: entrepriseNom,
      ecommerceActif: planAllowsB2B(plan),
    });

    // Demande d'abonnement / paiement en attente de validation.
    const abonnementId = crypto.randomUUID();
    await db.insert(schema.abonnements).values({
      id: abonnementId,
      tenantId,
      entrepriseNom,
      slug,
      plan,
      montant,
      operateur: operateur as (typeof OPERATEURS)[number],
      telephone: telephone || null,
      reference,
      contactNom: contactNom || null,
      contactEmail,
      statut: "en_attente",
    });

    await logAudit({
      action: "abonnement.souscription",
      entite: "abonnement",
      entiteId: abonnementId,
      userId: "public",
      userEmail: contactEmail,
      details: { entrepriseNom, plan, montant, operateur, slug },
    });

    return NextResponse.json({ ok: true, slug, montant, plan }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json({ error: "Identifiant d'espace déjà utilisé, réessayez." }, { status: 409 });
    }
    console.error("[api/souscription]", msg);
    return NextResponse.json({ error: "Erreur lors de la souscription" }, { status: 500 });
  }
}
