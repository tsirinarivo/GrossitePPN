import nodemailer from "nodemailer";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/**
 * Envoi d'emails transactionnels via SMTP.
 *
 * La configuration provient EN PRIORITÉ de la base (table smtp_config, éditable
 * via /admin/smtp), avec repli sur les variables d'environnement SMTP_*.
 *
 * Dégrade proprement : si non configuré, sendMail renvoie { sent:false } sans
 * jamais jeter — l'appelant décide quoi afficher.
 */

export interface ResolvedSmtp {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  source: "db" | "env";
}

/** Résout la config SMTP effective (DB puis env). */
export async function getSmtpConfig(): Promise<ResolvedSmtp | null> {
  // 1. Base de données
  try {
    const [row] = await db.select().from(schema.smtpConfig).limit(1);
    if (row?.actif && row.host && row.username && row.password) {
      const from = row.fromEmail
        ? row.fromNom
          ? `${row.fromNom} <${row.fromEmail}>`
          : row.fromEmail
        : row.username;
      return {
        host: row.host,
        port: row.port ?? 587,
        secure: row.secure ?? false,
        user: row.username,
        pass: row.password,
        from,
        source: "db",
      };
    }
  } catch {
    /* table absente ou DB indisponible → on tente l'env */
  }

  // 2. Variables d'environnement
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    return {
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      source: "env",
    };
  }

  return null;
}

export async function isMailConfigured(): Promise<boolean> {
  return (await getSmtpConfig()) !== null;
}

/** Envoie un email avec une config donnée (ou la config résolue). */
export async function sendMail(
  opts: { to: string; subject: string; html: string; text?: string },
  override?: ResolvedSmtp
): Promise<{ sent: boolean; reason?: string }> {
  const cfg = override ?? (await getSmtpConfig());
  if (!cfg) return { sent: false, reason: "SMTP non configuré" };
  if (!opts.to?.trim()) return { sent: false, reason: "Destinataire manquant" };

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
      from: cfg.from,
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
