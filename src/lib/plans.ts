/**
 * Définition centrale des formules d'abonnement.
 * Source unique pour : landing (tarifs), souscription, MRR de la console master.
 */

export type PlanKey = "standard" | "pro" | "entreprise";

export interface PlanDef {
  key: PlanKey;
  nom: string;
  prix: number; // Ar / mois
  tagline: string;
  features: string[];
  accent?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    key: "standard",
    nom: "Standard",
    prix: 49_000,
    tagline: "Pour démarrer sereinement",
    features: ["1 dépôt", "5 utilisateurs", "POS, stock, livraisons", "Rapports essentiels", "Boutique B2B"],
  },
  {
    key: "pro",
    nom: "Pro",
    prix: 99_000,
    tagline: "Le plus populaire",
    features: ["Multi-dépôts", "Utilisateurs étendus", "Tous les modules", "Analytics avancés (RFM, prévisions)", "Audit & rôles fins"],
    accent: true,
  },
  {
    key: "entreprise",
    nom: "Entreprise",
    prix: 149_000,
    tagline: "Pour les grands volumes",
    features: ["Dépôts illimités", "Quotas personnalisés", "Accompagnement dédié", "Priorité support", "Intégrations sur devis"],
  },
];

export const PLAN_MAP: Record<PlanKey, PlanDef> = Object.fromEntries(
  PLANS.map((p) => [p.key, p])
) as Record<PlanKey, PlanDef>;

/** Prix mensuel par plan (inclut essai = 0) — pour le MRR. */
export const PLAN_PRIX: Record<string, number> = {
  essai: 0,
  standard: 49_000,
  pro: 99_000,
  entreprise: 149_000,
};

export function isPlanKey(v: string): v is PlanKey {
  return v === "standard" || v === "pro" || v === "entreprise";
}
