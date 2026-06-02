import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { code, totalCommande } = await req.json() as { code: string; totalCommande: number };

  if (!code || typeof code !== "string") {
    return NextResponse.json({ valid: false, error: "Code requis" }, { status: 400 });
  }

  try {
    const [promo] = await db
      .select()
      .from(schema.promotions)
      .where(and(eq(schema.promotions.code, code.toUpperCase()), eq(schema.promotions.actif, true)))
      .limit(1);

    if (!promo) {
      // Fallback démo : codes connus pour tests
      const DEMO_CODES: Record<string, { valeur: number; typeValeur: "pct" | "montant"; minCommande: number }> = {
        BIENVENUE10: { valeur: 10, typeValeur: "pct", minCommande: 0 },
        PPN5: { valeur: 5, typeValeur: "pct", minCommande: 0 },
        FETE50K: { valeur: 50000, typeValeur: "montant", minCommande: 500000 },
      };
      const demo = DEMO_CODES[code.toUpperCase()];
      if (demo) {
        if (totalCommande < demo.minCommande) {
          return NextResponse.json({ valid: false, error: `Commande minimum ${demo.minCommande} MGA requise` });
        }
        const reduction = demo.typeValeur === "pct"
          ? Math.round(totalCommande * demo.valeur / 100)
          : demo.valeur;
        return NextResponse.json({ valid: true, code: code.toUpperCase(), reduction, libelle: `Code promo ${code.toUpperCase()}`, demo: true });
      }
      return NextResponse.json({ valid: false, error: "Code invalide" });
    }

    const now = new Date();
    if (promo.debutAt && new Date(promo.debutAt) > now) {
      return NextResponse.json({ valid: false, error: "Code non encore actif" });
    }
    if (promo.finAt && new Date(promo.finAt) < now) {
      return NextResponse.json({ valid: false, error: "Code expiré" });
    }
    if (promo.nbUtilisationsMax && promo.nbUtilisations >= promo.nbUtilisationsMax) {
      return NextResponse.json({ valid: false, error: "Code épuisé" });
    }
    if ((promo.minCommande ?? 0) > totalCommande) {
      return NextResponse.json({ valid: false, error: `Commande minimum ${promo.minCommande} MGA requise` });
    }

    const reduction = promo.typeValeur === "pct"
      ? Math.round((totalCommande * promo.valeur) / 100)
      : Math.round(promo.valeur);

    return NextResponse.json({
      valid: true,
      id: promo.id,
      code: promo.code,
      libelle: promo.nom,
      reduction,
      typeValeur: promo.typeValeur,
      valeur: promo.valeur,
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Erreur serveur" }, { status: 500 });
  }
}
