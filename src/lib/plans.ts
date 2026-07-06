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
  maxDepots: number;
  maxUtilisateurs: number;
  boutiqueB2B: boolean;
  accent?: boolean;
}

export const PLANS: PlanDef[] = [
  {
    key: "standard",
    nom: "Standard",
    prix: 49_000,
    tagline: "Pour démarrer sereinement",
    maxDepots: 1,
    maxUtilisateurs: 5,
    boutiqueB2B: false,
    features: ["1 dépôt", "5 utilisateurs", "POS, stock, livraisons", "Rapports essentiels"],
  },
  {
    key: "pro",
    nom: "Pro",
    prix: 99_000,
    tagline: "Le plus populaire",
    maxDepots: 10,
    maxUtilisateurs: 20,
    boutiqueB2B: true,
    features: ["10 dépôts", "20 utilisateurs", "Boutique B2B", "Tous les modules", "Analytics avancés (RFM, prévisions)", "Audit & rôles fins"],
    accent: true,
  },
  {
    key: "entreprise",
    nom: "Entreprise",
    prix: 149_000,
    tagline: "Pour les grands volumes",
    maxDepots: 999,
    maxUtilisateurs: 999,
    boutiqueB2B: true,
    features: ["Dépôts illimités", "Quotas personnalisés", "Accompagnement dédié", "Priorité support", "Intégrations sur devis"],
  },
];

/** La boutique B2B est incluse partout SAUF sur la formule Standard. */
export function planAllowsB2B(plan: string | null | undefined): boolean {
  return plan !== "standard";
}

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
