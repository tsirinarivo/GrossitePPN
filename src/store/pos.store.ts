import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

export type PalierPrix = "gros" | "semi_gros" | "detail";

export type UniteVente = {
  id: string;
  nom: string;
  facteurConversion: number;
  prixGros: number | null;
  prixSemiGros: number | null;
  prixDetail: number | null;
  codeBarres: string | null;
};

export type ProduitPOS = {
  id: string;
  code: string;
  nom: string;
  nomMG?: string;
  photo?: string;
  uniteBase: string;
  stockDisponible: number;
  unitesVente: UniteVente[];
  tauxTVA: number;
};

export type LignePanier = {
  id: string;
  produitId: string;
  nomProduit: string;
  uniteId: string;
  nomUnite: string;
  facteurConversion: number;
  quantite: number;
  quantiteBase: number;
  prixUnitaire: number;
  tauxRemise: number;
  montantRemise: number;
  tauxTVA: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  notes?: string;
};

export type ClientPOS = {
  id: string;
  code: string;
  raisonSociale: string;
  telephone?: string;
  palier: PalierPrix;
  creditAutorise: boolean;
  encoursCourant: number;
  plafondCredit: number;
  pointsFidelite: number;
};

type POSState = {
  // Session
  agentId: string | null;
  depotId: string | null;
  client: ClientPOS | null;

  // Panier
  lignes: LignePanier[];
  notes: string;
  adresseLivraison: string;
  notesLivraison: string;

  // UI
  recherche: string;
  categorieActive: string | null;
  modeHorsLigne: boolean;

  // Brouillons (persistance crash)
  brouillonId: string | null;

  // Actions
  setAgent: (agentId: string, depotId: string) => void;
  setClient: (client: ClientPOS | null) => void;
  ajouterLigne: (ligne: Omit<LignePanier, "id">) => void;
  modifierQuantite: (ligneId: string, delta: number) => void;
  setQuantiteLigne: (ligneId: string, quantite: number) => void;
  supprimerLigne: (ligneId: string) => void;
  setRemiseLigne: (ligneId: string, tauxOuMontant: number, type: "pct" | "montant") => void;
  setNotes: (notes: string) => void;
  setRecherche: (v: string) => void;
  setCategorieActive: (id: string | null) => void;
  setModeHorsLigne: (v: boolean) => void;
  viderPanier: () => void;
};

function calculerLigne(
  quantite: number,
  facteurConversion: number,
  prixUnitaire: number,
  tauxRemise: number,
  tauxTVA: number,
  assujetti: boolean
): Pick<LignePanier, "quantiteBase" | "montantRemise" | "totalHT" | "totalTVA" | "totalTTC"> {
  const quantiteBase = quantite * facteurConversion;
  const subtotal = quantite * prixUnitaire;
  const montantRemise = Math.round(subtotal * (tauxRemise / 100));
  const totalHT = subtotal - montantRemise;
  const totalTVA = assujetti ? Math.round(totalHT * (tauxTVA / 100)) : 0;
  const totalTTC = totalHT + totalTVA;
  return { quantiteBase, montantRemise, totalHT, totalTVA, totalTTC };
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      agentId: null,
      depotId: null,
      client: null,
      lignes: [],
      notes: "",
      adresseLivraison: "",
      notesLivraison: "",
      recherche: "",
      categorieActive: null,
      modeHorsLigne: false,
      brouillonId: null,

      setAgent: (agentId, depotId) => set({ agentId, depotId }),

      setClient: (client) => set({ client }),

      ajouterLigne: (ligne) => {
        const { lignes } = get();
        const existante = lignes.find(
          (l) => l.produitId === ligne.produitId && l.uniteId === ligne.uniteId
        );
        if (existante) {
          set({
            lignes: lignes.map((l) =>
              l.id === existante.id
                ? {
                    ...l,
                    quantite: l.quantite + ligne.quantite,
                    ...calculerLigne(
                      l.quantite + ligne.quantite,
                      l.facteurConversion,
                      l.prixUnitaire,
                      l.tauxRemise,
                      l.tauxTVA,
                      true
                    ),
                  }
                : l
            ),
          });
        } else {
          set({ lignes: [...lignes, { ...ligne, id: crypto.randomUUID() }] });
        }
      },

      modifierQuantite: (ligneId, delta) => {
        set({
          lignes: get()
            .lignes.map((l) => {
              if (l.id !== ligneId) return l;
              const qte = Math.max(0, l.quantite + delta);
              if (qte === 0) return null;
              return {
                ...l,
                quantite: qte,
                ...calculerLigne(qte, l.facteurConversion, l.prixUnitaire, l.tauxRemise, l.tauxTVA, true),
              };
            })
            .filter(Boolean) as LignePanier[],
        });
      },

      setQuantiteLigne: (ligneId, quantite) => {
        if (quantite <= 0) {
          set({ lignes: get().lignes.filter((l) => l.id !== ligneId) });
          return;
        }
        set({
          lignes: get().lignes.map((l) =>
            l.id === ligneId
              ? {
                  ...l,
                  quantite,
                  ...calculerLigne(quantite, l.facteurConversion, l.prixUnitaire, l.tauxRemise, l.tauxTVA, true),
                }
              : l
          ),
        });
      },

      supprimerLigne: (ligneId) =>
        set({ lignes: get().lignes.filter((l) => l.id !== ligneId) }),

      setRemiseLigne: (ligneId, valeur, type) => {
        set({
          lignes: get().lignes.map((l) => {
            if (l.id !== ligneId) return l;
            const tauxRemise =
              type === "pct"
                ? valeur
                : Math.round((valeur / (l.quantite * l.prixUnitaire)) * 100);
            return {
              ...l,
              tauxRemise,
              ...calculerLigne(l.quantite, l.facteurConversion, l.prixUnitaire, tauxRemise, l.tauxTVA, true),
            };
          }),
        });
      },

      setNotes: (notes) => set({ notes }),
      setRecherche: (v) => set({ recherche: v }),
      setCategorieActive: (id) => set({ categorieActive: id }),
      setModeHorsLigne: (v) => set({ modeHorsLigne: v }),
      viderPanier: () => set({ lignes: [], client: null, notes: "", notesLivraison: "", adresseLivraison: "" }),
    }),
    {
      name: "ppn-pos-store",
      // skipHydration prevents Zustand from reading localStorage during module
      // initialisation, which fires a setState mid-React-19 hydration (error #185).
      // We call usePOSStore.persist.rehydrate() in a useEffect after mount instead.
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown as Storage)
      ),
      partialize: (state) => ({
        agentId: state.agentId,
        depotId: state.depotId,
        client: state.client,
        lignes: state.lignes,
        notes: state.notes,
        adresseLivraison: state.adresseLivraison,
        notesLivraison: state.notesLivraison,
        brouillonId: state.brouillonId,
      }),
    }
  )
);

// Sélecteurs dérivés
// useShallow prevents the infinite-render loop (React error #185): without it,
// the selector returns a new object reference every call, causing useSyncExternalStore
// to schedule another render, which calls the selector again, ad infinitum.
export const usePOSTotaux = () =>
  usePOSStore(
    useShallow((s) => {
      const totalHT = s.lignes.reduce((sum, l) => sum + l.totalHT, 0);
      const totalTVA = s.lignes.reduce((sum, l) => sum + l.totalTVA, 0);
      const totalTTC = s.lignes.reduce((sum, l) => sum + l.totalTTC, 0);
      const totalRemise = s.lignes.reduce((sum, l) => sum + l.montantRemise, 0);
      const nbArticles = s.lignes.reduce((sum, l) => sum + l.quantite, 0);
      return { totalHT, totalTVA, totalTTC, totalRemise, nbArticles };
    })
  );
