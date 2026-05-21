import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

type ValidationResult = {
  valide: boolean;
  promotion?: {
    id: string;
    nom: string;
    code: string | null;
    type: string;
    valeur: number;
    typeValeur: string;
    minCommande: number;
  };
  remise?: number;
  raison?: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.code || typeof body.totalPanier !== "number") {
    return NextResponse.json(
      { valide: false, raison: "Code et total panier requis" } satisfies ValidationResult,
      { status: 400 }
    );
  }

  const code = String(body.code).trim().toUpperCase();
  const totalPanier = Math.round(Number(body.totalPanier));

  try {
    const [promo] = await db
      .select()
      .from(schema.promotions)
      .where(eq(sql`UPPER(${schema.promotions.code})`, code))
      .limit(1);

    if (!promo) {
      return NextResponse.json({ valide: false, raison: "Code introuvable" } satisfies ValidationResult);
    }

    if (!promo.actif) {
      return NextResponse.json({ valide: false, raison: "Code désactivé" } satisfies ValidationResult);
    }

    const now = new Date();
    if (now < new Date(promo.debutAt)) {
      return NextResponse.json({
        valide: false,
        raison: `Code valable à partir du ${new Date(promo.debutAt).toLocaleDateString("fr-FR")}`,
      } satisfies ValidationResult);
    }
    if (now > new Date(promo.finAt)) {
      return NextResponse.json({ valide: false, raison: "Code expiré" } satisfies ValidationResult);
    }

    if (promo.nbUtilisationsMax && (promo.nbUtilisations ?? 0) >= promo.nbUtilisationsMax) {
      return NextResponse.json({
        valide: false,
        raison: "Limite d'utilisations atteinte",
      } satisfies ValidationResult);
    }

    const minCommande = promo.minCommande ?? 0;
    if (minCommande > 0 && totalPanier < minCommande) {
      return NextResponse.json({
        valide: false,
        raison: `Commande minimum ${new Intl.NumberFormat("fr-FR").format(minCommande)} MGA`,
      } satisfies ValidationResult);
    }

    // Calcul remise
    let remise = 0;
    if (promo.typeValeur === "pct") {
      remise = Math.round((totalPanier * promo.valeur) / 100);
    } else {
      remise = Math.min(totalPanier, Math.round(promo.valeur));
    }

    return NextResponse.json({
      valide: true,
      promotion: {
        id: promo.id,
        nom: promo.nom,
        code: promo.code,
        type: promo.type,
        valeur: promo.valeur,
        typeValeur: promo.typeValeur ?? "pct",
        minCommande,
      },
      remise,
    } satisfies ValidationResult);
  } catch {
    return NextResponse.json({ valide: false, raison: "Erreur serveur" } satisfies ValidationResult);
  }
}
