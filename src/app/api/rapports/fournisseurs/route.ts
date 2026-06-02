import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function buildDemo() {
  return [
    { id: "f1", nom: "Star Madagascar SARL", ville: "Antananarivo", nbBC: 28, volumeAchat: 85_400_000, delaiMoyen: 4.2, tauxConformite: 96, tauxRetard: 11 },
    { id: "f2", nom: "Tiko Distribution", ville: "Toamasina", nbBC: 22, volumeAchat: 62_300_000, delaiMoyen: 6.8, tauxConformite: 92, tauxRetard: 24 },
    { id: "f3", nom: "Magro Import", ville: "Antananarivo", nbBC: 35, volumeAchat: 124_800_000, delaiMoyen: 3.5, tauxConformite: 98, tauxRetard: 5 },
    { id: "f4", nom: "Sucoma Ind", ville: "Mahajanga", nbBC: 12, volumeAchat: 41_600_000, delaiMoyen: 8.4, tauxConformite: 88, tauxRetard: 33 },
    { id: "f5", nom: "Lecofruit Madagascar", ville: "Antsirabe", nbBC: 18, volumeAchat: 27_900_000, delaiMoyen: 5.1, tauxConformite: 94, tauxRetard: 17 },
  ];
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const rows = await db
      .select({
        f: schema.fournisseurs,
        nbBC: sql<number>`COUNT(${schema.bonsCommande.id})`,
        volumeAchat: sql<number>`COALESCE(SUM(${schema.bonsCommande.totalTTC}), 0)`,
        delaiMoyen: sql<number>`COALESCE(AVG(EXTRACT(epoch FROM (${schema.bonsCommande.dateReceptionEffective} - ${schema.bonsCommande.dateCommande})) / 86400), 0)`,
        nbRetard: sql<number>`COUNT(CASE WHEN ${schema.bonsCommande.dateReceptionEffective} > ${schema.bonsCommande.dateLivraisonPrevue} THEN 1 END)`,
        nbRecus: sql<number>`COUNT(CASE WHEN ${schema.bonsCommande.dateReceptionEffective} IS NOT NULL THEN 1 END)`,
      })
      .from(schema.fournisseurs)
      .leftJoin(schema.bonsCommande, eq(schema.bonsCommande.fournisseurId, schema.fournisseurs.id))
      .groupBy(schema.fournisseurs.id)
      .orderBy(desc(sql<number>`COALESCE(SUM(${schema.bonsCommande.totalTTC}), 0)`));

    if (rows.length === 0) {
      return NextResponse.json({ fournisseurs: buildDemo(), demo: true });
    }

    const result = rows.map((r) => {
      const nbBC = Number(r.nbBC ?? 0);
      const nbRetard = Number(r.nbRetard ?? 0);
      const nbRecus = Number(r.nbRecus ?? 0);
      return {
        id: r.f.id,
        nom: r.f.nom,
        ville: r.f.ville,
        nbBC,
        volumeAchat: Number(r.volumeAchat ?? 0),
        delaiMoyen: Math.round(Number(r.delaiMoyen ?? 0) * 10) / 10,
        tauxConformite: nbBC > 0 ? Math.round(((nbBC - nbRetard) / nbBC) * 100) : 100,
        tauxRetard: nbRecus > 0 ? Math.round((nbRetard / nbRecus) * 100) : 0,
      };
    });

    return NextResponse.json({ fournisseurs: result, demo: false });
  } catch {
    return NextResponse.json({ fournisseurs: buildDemo(), demo: true });
  }
}
