export type AppRole =
  | "admin"
  | "gerant"
  | "caissier"
  | "agent"
  | "magasinier"
  | "chauffeur"
  | "comptable"
  | "marketing"
  | "client_b2b"
  | "sous_utilisateur_client";

/**
 * Sections accessibles par rôle.
 * "*" signifie accès total.
 * La correspondance est par préfixe de chemin.
 */
export const ROLE_SECTIONS: Record<AppRole, string[] | "*"> = {
  admin:                  "*",
  gerant:                 ["/", "/pos", "/stock", "/clients", "/livraisons", "/achats", "/rapports", "/historique"],
  caissier:               ["/pos/caisse", "/historique"],
  agent:                  ["/pos/agent", "/clients"],
  magasinier:             ["/stock", "/achats"],
  chauffeur:              ["/livraisons"],
  comptable:              ["/rapports", "/achats", "/clients", "/historique"],
  marketing:              ["/rapports", "/clients"],
  client_b2b:             [],
  sous_utilisateur_client: [],
};

/** Page d'accueil par défaut après login selon le rôle */
export const ROLE_HOME: Record<AppRole, string> = {
  admin:                  "/",
  gerant:                 "/",
  caissier:               "/pos/caisse",
  agent:                  "/pos/agent",
  magasinier:             "/stock",
  chauffeur:              "/livraisons",
  comptable:              "/rapports",
  marketing:              "/rapports",
  client_b2b:             "/shop",
  sous_utilisateur_client: "/shop",
};

export function canAccess(role: string | null | undefined, pathname: string): boolean {
  const r = (role ?? "agent") as AppRole;
  const allowed = ROLE_SECTIONS[r] ?? [];
  if (allowed === "*") return true;
  return allowed.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix === "/" ? "/" : prefix + "/") || pathname.startsWith(prefix)
  );
}

export function homeForRole(role: string | null | undefined): string {
  return ROLE_HOME[(role ?? "agent") as AppRole] ?? "/";
}

/** Labels affichables pour chaque rôle */
export const ROLE_LABELS: Record<AppRole, string> = {
  admin:                  "Administrateur",
  gerant:                 "Gérant",
  caissier:               "Caissier",
  agent:                  "Agent commercial",
  magasinier:             "Magasinier",
  chauffeur:              "Chauffeur",
  comptable:              "Comptable",
  marketing:              "Marketing",
  client_b2b:             "Client B2B",
  sous_utilisateur_client: "Sous-utilisateur client",
};
