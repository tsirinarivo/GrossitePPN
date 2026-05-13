import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type LigneShopCart = {
  id: string;
  produitId: string;
  nom: string;
  unite: string;
  emoji: string;
  prixUnit: number;
  qte: number;
};

type ShopCartState = {
  lignes: LigneShopCart[];
  ajouterArticle: (item: Omit<LigneShopCart, "id">) => void;
  modifierQte: (produitId: string, delta: number) => void;
  setQte: (produitId: string, qte: number) => void;
  supprimer: (produitId: string) => void;
  vider: () => void;
};

export const useShopCart = create<ShopCartState>()(
  persist(
    (set, get) => ({
      lignes: [],

      ajouterArticle: (item) => {
        const { lignes } = get();
        const existant = lignes.find((l) => l.produitId === item.produitId);
        if (existant) {
          set({
            lignes: lignes.map((l) =>
              l.produitId === item.produitId ? { ...l, qte: l.qte + item.qte } : l
            ),
          });
        } else {
          set({ lignes: [...lignes, { ...item, id: crypto.randomUUID() }] });
        }
      },

      modifierQte: (produitId, delta) => {
        set({
          lignes: get()
            .lignes.map((l) => {
              if (l.produitId !== produitId) return l;
              const qte = Math.max(0, l.qte + delta);
              return qte === 0 ? null : { ...l, qte };
            })
            .filter(Boolean) as LigneShopCart[],
        });
      },

      setQte: (produitId, qte) => {
        if (qte <= 0) {
          set({ lignes: get().lignes.filter((l) => l.produitId !== produitId) });
          return;
        }
        set({
          lignes: get().lignes.map((l) =>
            l.produitId === produitId ? { ...l, qte } : l
          ),
        });
      },

      supprimer: (produitId) =>
        set({ lignes: get().lignes.filter((l) => l.produitId !== produitId) }),

      vider: () => set({ lignes: [] }),
    }),
    {
      name: "ppn-shop-cart",
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
    }
  )
);
