import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    const [retour] = await db
      .select()
      .from(schema.retours)
      .where(eq(schema.retours.id, id))
      .limit(1);

    if (!retour) return NextResponse.json({ error: "Retour introuvable" }, { status: 404 });

    const lignes = await db
      .select()
      .from(schema.lignesRetour)
      .where(eq(schema.lignesRetour.retourId, id));

    let client = null;
    if (retour.clientId) {
      const [c] = await db.select().from(schema.clients).where(eq(schema.clients.id, retour.clientId)).limit(1);
      client = c ?? null;
    }

    let facture = null;
    if (retour.factureId) {
      const [f] = await db.select().from(schema.factures).where(eq(schema.factures.id, retour.factureId)).limit(1);
      facture = f ?? null;
    }

    const [avoir] = await db
      .select()
      .from(schema.avoirs)
      .where(eq(schema.avoirs.retourId, id))
      .limit(1);

    return NextResponse.json({ retour, lignes, client, facture, avoir: avoir ?? null });
  } catch {
    return NextResponse.json({ error: "Erreur de chargement" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { statut, modeRemboursement } = body as { statut?: string; modeRemboursement?: string };

  if (!statut) return NextResponse.json({ error: "Statut requis" }, { status: 400 });

  try {
    const [retour] = await db
      .select()
      .from(schema.retours)
      .where(eq(schema.retours.id, id))
      .limit(1);

    if (!retour) return NextResponse.json({ error: "Retour introuvable" }, { status: 404 });

    const updates: Record<string, unknown> = { statut };
    if (statut === "valide" && !retour.valideeAt) updates.valideeAt = new Date();
    if (statut === "rembourse") updates.rembourseeAt = new Date();

    const [updated] = await db
      .update(schema.retours)
      .set(updates as never)
      .where(eq(schema.retours.id, id))
      .returning();

    let avoir = null;

    // À la validation, on génère l'avoir s'il n'existe pas
    if (statut === "valide") {
      const [existant] = await db
        .select()
        .from(schema.avoirs)
        .where(eq(schema.avoirs.retourId, id))
        .limit(1);

      if (!existant) {
        const annee = new Date().getFullYear();
        const seq = Date.now().toString().slice(-5);
        const numeroAvoir = `AVR-${annee}-${seq}`;
        [avoir] = await db
          .insert(schema.avoirs)
          .values({
            id: crypto.randomUUID(),
            numero: numeroAvoir,
            retourId: id,
            clientId: retour.clientId ?? null,
            factureId: retour.factureId ?? null,
            montant: retour.totalTTC,
            modeRemboursement: (modeRemboursement ?? "credit_compte") as never,
            statut: "emis",
            notes: `Avoir suite au retour ${retour.numero}`,
          })
          .returning();
      } else {
        avoir = existant;
      }

      if (retour.clientId && (modeRemboursement ?? "credit_compte") === "credit_compte") {
        try {
          const [cli] = await db
            .select({ encours: schema.clients.encoursCourant })
            .from(schema.clients)
            .where(eq(schema.clients.id, retour.clientId))
            .limit(1);
          if (cli) {
            const nouveau = Math.max(0, (cli.encours ?? 0) - retour.totalTTC);
            await db
              .update(schema.clients)
              .set({ encoursCourant: nouveau, updatedAt: new Date() })
              .where(eq(schema.clients.id, retour.clientId));
          }
        } catch {}
      }
    }

    if (statut === "rembourse") {
      const [a] = await db
        .select()
        .from(schema.avoirs)
        .where(eq(schema.avoirs.retourId, id))
        .limit(1);
      if (a) {
        await db
          .update(schema.avoirs)
          .set({ statut: "rembourse", appliqueAt: new Date() })
          .where(eq(schema.avoirs.id, a.id));
        avoir = { ...a, statut: "rembourse" };
      }
    }

    return NextResponse.json({ retour: updated, avoir });
  } catch (err) {
    console.error("PATCH /api/retours/[id]", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;

  try {
    await db.delete(schema.retours).where(eq(schema.retours.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
