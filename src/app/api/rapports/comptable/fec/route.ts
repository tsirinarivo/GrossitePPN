import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { serializeFec } from "@/lib/comptable";
import { buildAnneeFecLines } from "@/lib/comptable-data";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || !["admin", "gerant", "comptable"].includes(role)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const annee = parseInt(
    req.nextUrl.searchParams.get("annee") ?? String(new Date().getFullYear()),
    10
  );

  const { lines } = await buildAnneeFecLines(annee);
  const content = serializeFec(lines);

  await logAudit({
    action: "export",
    entite: "configuration",
    description: `Export FEC ${annee} (${lines.length} lignes)`,
    actor: { id: session.user.id, nom: session.user.name, role },
  });

  const stamp = `${annee}1231`;
  return new NextResponse("﻿" + content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="GROSSISTEPPNFEC${stamp}.txt"`,
    },
  });
}
