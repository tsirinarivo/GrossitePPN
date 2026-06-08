/** Entrées d'audit de démonstration (fallback si le journal réel est vide). */

export interface AuditEntryDTO {
  id: string;
  userId: string | null;
  userNom: string | null;
  userRole: string | null;
  action: string;
  entite: string;
  entiteId: string | null;
  description: string;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTEURS = [
  { nom: "Hery Rakoto", role: "admin" },
  { nom: "Tiana Andriamena", role: "gerant" },
  { nom: "Fara Razafy", role: "caissier" },
  { nom: "Lova Rabe", role: "agent" },
  { nom: "Niry Rasoa", role: "comptable" },
  { nom: "Mamy Randria", role: "magasinier" },
];

const MODELES: Array<{
  action: string;
  entite: string;
  desc: (n: number) => string;
  meta?: Record<string, unknown>;
}> = [
  { action: "connexion", entite: "auth", desc: () => "Connexion au back-office" },
  { action: "creation", entite: "vente", desc: (n) => `Vente POS #V-${2400 + n} encaissée`, meta: { mode: "especes" } },
  { action: "remise", entite: "vente", desc: (n) => `Remise exceptionnelle 8% sur vente #V-${2400 + n}`, meta: { remisePct: 8 } },
  { action: "modification", entite: "prix", desc: () => "Prix de vente Riz Makalioka 25kg ajusté", meta: { avant: 92000, apres: 95000 } },
  { action: "annulation", entite: "vente", desc: (n) => `Annulation vente #V-${2390 + n}` },
  { action: "creation", entite: "client", desc: (n) => `Nouveau client Épicerie Tana ${n}` },
  { action: "modification", entite: "client", desc: () => "Plafond de crédit relevé à 5 000 000 Ar", meta: { avant: 3000000, apres: 5000000 } },
  { action: "creation", entite: "produit", desc: (n) => `Création produit Huile Soavita 1L (lot ${n})` },
  { action: "modification", entite: "stock", desc: (n) => `Inventaire dépôt Tana Nord — écart ${n} unités constaté` },
  { action: "creation", entite: "utilisateur", desc: () => "Création compte caissier", meta: { role: "caissier" } },
  { action: "modification", entite: "utilisateur", desc: () => "Rôle modifié agent → gérant", meta: { avant: "agent", apres: "gerant" } },
  { action: "export", entite: "facture", desc: () => "Export PDF facture FAC-2026-0142" },
  { action: "suppression", entite: "promotion", desc: () => "Suppression promotion « Vente flash week-end »" },
  { action: "acces", entite: "rgpd", desc: () => "Consultation des données personnelles d'un client" },
];

/** Génère une liste d'entrées démo déterministe et chronologique. */
export function demoAuditEntries(count = 60): AuditEntryDTO[] {
  const out: AuditEntryDTO[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const m = MODELES[i % MODELES.length]!;
    const acteur = ACTEURS[i % ACTEURS.length]!;
    // ~38 min d'écart entre chaque entrée → s'étale sur plusieurs jours
    const created = new Date(now - i * 38 * 60 * 1000);
    out.push({
      id: `demo-audit-${i}`,
      userId: `demo-user-${i % ACTEURS.length}`,
      userNom: acteur.nom,
      userRole: acteur.role,
      action: m.action,
      entite: m.entite,
      entiteId: null,
      description: m.desc(i + 1),
      metadata: m.meta ? JSON.stringify(m.meta) : null,
      ipAddress: `10.0.${(i % 4) + 1}.${20 + (i % 30)}`,
      createdAt: created.toISOString(),
    });
  }
  return out;
}
