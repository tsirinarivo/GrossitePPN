import { create } from "zustand";

type AppState = {
  langue: "fr" | "mg";
  theme: "light" | "dark" | "system";
  connexion: "online" | "offline" | "slow";
  assujettieTV: boolean;
  setLangue: (l: "fr" | "mg") => void;
  setTheme: (t: "light" | "dark" | "system") => void;
  setConnexion: (c: "online" | "offline" | "slow") => void;
  setAssujettieTV: (v: boolean) => void;
};

export const useAppStore = create<AppState>()((set) => ({
  langue: "fr",
  theme: "system",
  connexion: "online",
  assujettieTV: false,
  setLangue: (langue) => set({ langue }),
  setTheme: (theme) => set({ theme }),
  setConnexion: (connexion) => set({ connexion }),
  setAssujettieTV: (assujettieTV) => set({ assujettieTV }),
}));
