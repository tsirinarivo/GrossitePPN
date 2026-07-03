import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sendMail, getSmtpConfig, type ResolvedSmtp } from "@/lib/mailer";

export const dynamic = "force-dynamic";

/**
 * Envoie un email de test.
 * - Si le body contient une config (host/username/password…), on teste CELLE-CI
 *   (permet de valider avant d'enregistrer). Sinon on utilise la config résolue.
 */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role ?? "agent";
  if (!session?.user || role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const to = (body?.to as string | undefined)?.trim() || session.user.email;
  if (!to) {
    return NextResponse.json({ error: "Adresse de test manquante" }, { status: 400 });
  }

  // Config de test : si fournie dans le body (avec mot de passe), on l'utilise.
  let override: ResolvedSmtp | undefined;
  if (body?.host && body?.username) {
    let pass: string | undefined = body.password;
    if (!pass) {
      // Pas de mot de passe fourni → on reprend celui enregistré
      const [row] = await db.select().from(schema.smtpConfig).limit(1);
      pass = row?.password ?? undefined;
    }
    if (!pass) {
      return NextResponse.json(
        { error: "Mot de passe SMTP requis pour le test" },
        { status: 400 }
      );
    }
    const port = Number(body.port) || 587;
    override = {
      host: String(body.host),
      port,
      secure: !!body.secure || port === 465,
      user: String(body.username),
      pass,
      from: body.fromEmail
        ? body.fromNom
          ? `${body.fromNom} <${body.fromEmail}>`
          : String(body.fromEmail)
        : String(body.username),
      source: "db",
    };
  } else {
    const resolved = await getSmtpConfig();
    if (!resolved) {
      return NextResponse.json(
        { error: "Aucune configuration SMTP à tester" },
        { status: 400 }
      );
    }
    override = resolved;
  }

  const result = await sendMail(
    {
      to,
      subject: "Test SMTP — GrossistePPN",
      html: `<div style="font-family:Arial,sans-serif;padding:16px;">
        <h2 style="color:#FF4D00;">✅ Configuration SMTP fonctionnelle</h2>
        <p>Cet email confirme que l'envoi depuis GrossistePPN fonctionne.</p>
        <p style="color:#888;font-size:12px;">Serveur : ${override.host}:${override.port}</p>
      </div>`,
      text: "Configuration SMTP fonctionnelle — GrossistePPN.",
    },
    override
  );

  if (result.sent) {
    return NextResponse.json({ sent: true, to });
  }
  return NextResponse.json({ sent: false, error: result.reason ?? "Échec" }, { status: 502 });
}
