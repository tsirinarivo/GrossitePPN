import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envoi d'emails transactionnels via SMTP.
 * Configuré par variables d'environnement :
 *   SMTP_HOST, SMTP_PORT (def. 587), SMTP_SECURE ("true" pour 465),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (def. = SMTP_USER)
 *
 * Dégrade proprement : si non configuré, sendMail renvoie { sent:false } sans
 * jamais jeter — l'appelant décide quoi afficher.
 */

export function isMailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

let cached: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isMailConfigured()) return null;
  if (!cached) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return cached;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, reason: "SMTP non configuré" };
  }
  if (!opts.to?.trim()) {
    return { sent: false, reason: "Destinataire manquant" };
  }
  try {
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
    await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { sent: true };
  } catch (e) {
    console.error("[mailer] envoi échoué:", e instanceof Error ? e.message : e);
    return { sent: false, reason: e instanceof Error ? e.message : "Erreur d'envoi" };
  }
}
