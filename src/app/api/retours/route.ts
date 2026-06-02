import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type LigneInput = {
  ligneCommandeId?: string;
  produitId?: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA?: number;
  motifLigne?: string;
};

function buildDemoRetours() {
  const today = new Date();
  const make = (i: number, statut: string, motif: string, total: number, client: string) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return {
      id: `demo-ret-${i}`,
      numero: `RET-2026-${String(100 + i).padStart(4, "0")}`,
      factureId: `demo-fac-${i}`,
      factureNumero: `FAC-2026-${String(200 + i).padStart(4, "0")}`,
      clientId: `demo-cli-${i}`,
      clientNom: client,
      motif,
      statut,
      totalHT: Math.round(total / 1.2),
      totalTVA: total - Math.round(total / 1.2),
      totalTTC: total,
      createdAt: d.toISOString(),
      valideeAt: statut !== "brouillon" ? d.toISOString() : null,
      notes: null,
    };
  };
  return [
    make(0, "brouillon", "qualite", 150000, "Épicerie Soafia"),
    make(1, "valide", "erreur_livraison", 420000, "Bazar Ankorondrano"),
    make(2, "rembourse", "produit_endommage", 85000, "Mini-Market Ivato"),
    make(4, "valide", "refus_client", 250000, "Restaurant La Varangue"),
    make(7, "rembourse", "qualite", 320000, "Hôtel Colbert"),
    make(12, "annule", "autre", 50000, "Boulangerie Mahamasina"),
  ];
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const url = new URL(req.url);
  const statut = url.searchParams.get("statut");
  const sinceDays = parseInt(url.searchParams.get("sinceDays") ?? "60", 10);

  try {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);

    const conditions = [gte(schema.retours.createdAt, sinceDate)];
    if (statut && statut !== "tous") {
      conditions.push(eq(schema.retours.statut, statut as never));
    }

    const rows = await db
      .select({
        retour: schema.retours,
        clientNom: schema.clients.raisonSociale,
        factureNumero: schema.factures.numero,
      })
      .from(schema.retours)
      .leftJoin(schema.clients, eq(schema.clients.id, schema.retours.clientId))
      .leftJoin(schema.factures, eq(schema.factures.id, schema.retours.factureId))
      .where(and(...conditions))
      .orderBy(desc(schema.retours.createdAt))
      .limit(200);

    if (rows.length === 0) {
      return NextResponse.json({ retours: buildDemoRetours(), demo: true });
    }

    const list = rows.map((r) => ({
      ...r.retour,
      clientNom: r.clientNom ?? "Client comptoir",
      factureNumero: r.factureNumero ?? null,
      createdAt: r.retour.createdAt.toISOString(),
      valideeAt: r.retour.valideeAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ retours: list, demo: false });
  } catch {
    return NextResponse.json({ retours: buildDemoRetours(), demo: true });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json();
  const {
    factureId,
    clientId,
    motif,
    notes,
    lignes,
    modeRemboursement = "credit_compte",
    validerImmediat = false,
  } = body as {
    factureId?: string;
    clientId?: string;
    motif: string;
    notes?: string;
    lignes: LigneInput[];
    modeRemboursement?: string;
    validerImmediat?: boolean;
  };

  if (!motif || !Array.isArray(lignes) || lignes.length === 0) {
    return NextResponse.json({ error: "Motif et lignes requis" }, { status: 400 });
  }

  try {
    let commandeId: string | null = null;
    if (factureId) {
      const [fac] = await db
        .select({ commandeId: schema.factures.commandeId })
        .from(schema.factures)
        .where(eq(schema.factures.id, factureId))
        .limit(1);
      commandeId = fac?.commandeId ?? null;
    }

    let totalHT = 0;
    let totalTVA = 0;
    let totalTTC = 0;

    const lignesPrepared = lignes.map((l) => {
      const qty = Number(l.quantite) || 0;
      const pu = Math.round(Number(l.prixUnitaire) || 0);
      const taux = Math.round(Number(l.tauxTVA ?? 0));
      const ht = Math.round(pu * qty);
      const tva = Math.round((ht * taux) / 100);
      const ttc = ht + tva;
      totalHT += ht;
      totalTVA += tva;
      totalTTC += ttc;
      return {
        id: crypto.randomUUID(),
        ligneCommandeId: l.ligneCommandeId ?? null,
        produitId: l.produitId ?? null,
        nomProduit: l.nomProduit,
        quantite: qty,
        prixUnitaire: pu,
        tauxTVA: taux,
        totalHT: ht,
        totalTVA: tva,
        totalTTC: ttc,
        motifLigne: l.motifLigne ?? null,
      };
    });

    const annee = new Date().getFullYear();
    const seq = Date.now().toString().slice(-5);
    const numeroRetour = `RET-${annee}-${seq}`;

    const retourId = crypto.randomUUID();
    const [retour] = await db
      .insert(schema.retours)
      .values({
        id: retourId,
        numero: numeroRetour,
        factureId: factureId ?? null,
        commandeId,
        clientId: clientId ?? null,
        agentId: session.user.id,
        motif: motif as never,
        statut: validerImmediat ? "valide" : "brouillon",
        totalHT,
        totalTVA,
        totalTTC,
        notes: notes ?? null,
        valideeAt: validerImmediat ? new Date() : null,
      })
      .returning();

    await db.insert(schema.lignesRetour).values(
      lignesPrepared.map((l) => ({ ...l, retourId }))
    );

    let avoir = null;
    if (validerImmediat) {
      const avoirId = crypto.randomUUID();
      const numeroAvoir = `AVR-${annee}-${seq}`;
      [avoir] = await db
        .insert(schema.avoirs)
        .values({
          id: avoirId,
          numero: numeroAvoir,
          retourId,
          clientId: clientId ?? null,
          factureId: factureId ?? null,
          montant: totalTTC,
          modeRemboursement: modeRemboursement as never,
          statut: "emis",
          notes: `Avoir suite au retour ${numeroRetour}`,
        })
        .returning();

      // Décrémente l'encours client si remboursement en crédit compte
      if (clientId && modeRemboursement === "credit_compte") {
        try {
          const [cli] = await db
            .select({ encours: schema.clients.encoursCourant })
            .from(schema.clients)
            .where(eq(schema.clients.id, clientId))
            .limit(1);
          if (cli) {
            const nouveau = Math.max(0, (cli.encours ?? 0) - totalTTC);
            await db
              .update(schema.clients)
              .set({ encoursCourant: nouveau, updatedAt: new Date() })
              .where(eq(schema.clients.id, clientId));
          }
        } catch {}
      }
    }

    return NextResponse.json({ retour, avoir }, { status: 201 });
  } catch (err) {
    console.error("POST /api/retours", err);
    return NextResponse.json(
      { error: "Tables absentes — exécutez pnpm drizzle-kit push sur le VPS" },
      { status: 503 }
    );
  }
}
