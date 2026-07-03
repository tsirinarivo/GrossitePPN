import { e } from "@/lib/escape";

export interface TenantEmailData {
  nom: string;
  slug: string;
  statut: string;
  plan: string;
  contactNom: string | null;
  contactEmail: string | null;
  contactTelephone: string | null;
  maxUtilisateurs: number;
  maxDepots: number;
  finEssaiAt: string | Date | null;
}

const PLAN_LABEL: Record<string, string> = {
  essai: "Essai", standard: "Standard", pro: "Pro", entreprise: "Entreprise",
};

/** Construit le sujet + corps (HTML & texte) de l'email d'accès d'un tenant. */
export function buildTenantEmail(
  t: TenantEmailData,
  creds?: { email: string; password: string } | null
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://grossiste.dago-it.com";
  const plan = PLAN_LABEL[t.plan] ?? t.plan;
  const finEssai = t.finEssaiAt
    ? new Date(t.finEssaiAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const subject = `Vos accès GrossistePPN — ${t.nom}`;

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;background:#f4f5f7;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1d24;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06);">
      <div style="background:linear-gradient(135deg,#FF4D00 0%,#FFB800 100%);padding:28px 24px;">
        <div style="font-size:22px;font-weight:900;color:#fff;">Grossiste<span style="color:#111;">PPN</span></div>
        <div style="color:rgba(255,255,255,.9);font-size:13px;margin-top:4px;">Espace client activé</div>
      </div>
      <div style="padding:24px;">
        <p style="font-size:15px;margin:0 0 16px;">Bonjour ${e(t.contactNom ?? t.nom)},</p>
        <p style="font-size:14px;line-height:1.6;color:#3a3f4a;margin:0 0 20px;">
          Votre espace <strong>${e(t.nom)}</strong> vient d'être créé sur la plateforme GrossistePPN. Voici vos informations d'accès :
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tbody>
            ${row("Espace", e(t.nom))}
            ${row("Identifiant", `<code style="font-family:monospace;background:#f4f5f7;padding:2px 6px;border-radius:4px;">${e(t.slug)}</code>`)}
            ${row("Plateforme", `<a href="${e(appUrl)}" style="color:#FF4D00;">${e(appUrl)}</a>`)}
            ${row("Formule", e(plan))}
            ${row("Quotas", `${t.maxUtilisateurs} utilisateurs · ${t.maxDepots} dépôt(s)`)}
            ${finEssai ? row("Fin d'essai", e(finEssai)) : ""}
          </tbody>
        </table>
        ${
          creds
            ? `<div style="margin:20px 0;padding:16px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;">
                 <div style="font-size:13px;font-weight:700;color:#9a3412;margin-bottom:10px;">🔑 Vos identifiants de connexion</div>
                 <table style="width:100%;border-collapse:collapse;font-size:14px;">
                   <tbody>
                     <tr><td style="padding:4px 0;color:#8a8f99;width:110px;">Email</td><td style="padding:4px 0;font-weight:600;">${e(creds.email)}</td></tr>
                     <tr><td style="padding:4px 0;color:#8a8f99;">Mot de passe</td><td style="padding:4px 0;"><code style="font-family:monospace;background:#fff;border:1px solid #fed7aa;padding:3px 8px;border-radius:4px;font-weight:700;">${e(creds.password)}</code></td></tr>
                   </tbody>
                 </table>
                 <div style="font-size:11px;color:#9a3412;margin-top:8px;">Par sécurité, changez ce mot de passe après votre première connexion.</div>
               </div>`
            : ""
        }
        <div style="margin:24px 0 8px;">
          <a href="${e(appUrl)}" style="display:inline-block;background:#FF4D00;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:14px;">Accéder à la plateforme</a>
        </div>
        <p style="font-size:12px;color:#8a8f99;line-height:1.6;margin:20px 0 0;">
          ${creds ? "Conservez ces identifiants en lieu sûr." : "Un administrateur vous communiquera vos identifiants de connexion personnels."}
          Pour toute question, répondez simplement à cet email.
        </p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#a0a4ac;margin:16px 0 0;">GrossistePPN · Madagascar</p>
  </div>
</body></html>`;

  const text = [
    `Bonjour ${t.contactNom ?? t.nom},`,
    ``,
    `Votre espace « ${t.nom} » a été créé sur GrossistePPN.`,
    ``,
    `Espace        : ${t.nom}`,
    `Identifiant   : ${t.slug}`,
    `Plateforme    : ${appUrl}`,
    `Formule       : ${plan}`,
    `Quotas        : ${t.maxUtilisateurs} utilisateurs, ${t.maxDepots} dépôt(s)`,
    finEssai ? `Fin d'essai   : ${finEssai}` : ``,
    ``,
    creds ? `--- Identifiants de connexion ---` : ``,
    creds ? `Email         : ${creds.email}` : ``,
    creds ? `Mot de passe  : ${creds.password}` : ``,
    creds ? `(à changer après la première connexion)` : ``,
    ``,
    `Accédez à la plateforme : ${appUrl}`,
    creds ? `` : `Un administrateur vous communiquera vos identifiants de connexion.`,
    ``,
    `GrossistePPN — Madagascar`,
  ].filter((l) => l !== null).join("\n");

  return { subject, html, text };
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#8a8f99;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#1a1d24;font-weight:500;">${value}</td>
  </tr>`;
}
