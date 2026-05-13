import Dexie, { type Table } from "dexie";

export type SyncStatus = "pending" | "syncing" | "done" | "error";

export interface CommandePending {
  id: string;
  payload: unknown;
  createdAt: number;
  syncStatus: SyncStatus;
  lastError?: string;
  attempts: number;
}

export interface MouvementPending {
  id: string;
  produitId: string;
  depotId: string;
  type: "entree" | "sortie" | "ajustement" | "casse";
  quantiteBase: number;
  payload: unknown;
  createdAt: number;
  syncStatus: SyncStatus;
}

export interface CacheEntry<T = unknown> {
  id: string;
  data: T;
  updatedAt: number;
}

class OfflineDB extends Dexie {
  commandesPending!: Table<CommandePending, string>;
  mouvementsPending!: Table<MouvementPending, string>;
  produitsCache!: Table<CacheEntry, string>;
  clientsCache!: Table<CacheEntry, string>;

  constructor() {
    super("ppn-offline");
    this.version(1).stores({
      commandesPending: "id, createdAt, syncStatus",
      mouvementsPending: "id, produitId, depotId, createdAt, syncStatus",
      produitsCache: "id, updatedAt",
      clientsCache: "id, updatedAt",
    });
  }
}

let _db: OfflineDB | null = null;

export function getOfflineDB(): OfflineDB {
  if (typeof window === "undefined") {
    throw new Error("offlineDB n'est utilisable que côté client");
  }
  if (!_db) _db = new OfflineDB();
  return _db;
}

export async function enqueueCommande(payload: unknown): Promise<string> {
  const db = getOfflineDB();
  const id = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.commandesPending.add({
    id,
    payload,
    createdAt: Date.now(),
    syncStatus: "pending",
    attempts: 0,
  });
  return id;
}

export async function enqueueMouvement(m: Omit<MouvementPending, "id" | "createdAt" | "syncStatus">): Promise<string> {
  const db = getOfflineDB();
  const id = `mvt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.mouvementsPending.add({
    ...m,
    id,
    createdAt: Date.now(),
    syncStatus: "pending",
  });
  return id;
}

export async function listPendingCommandes(): Promise<CommandePending[]> {
  const db = getOfflineDB();
  return db.commandesPending.where("syncStatus").equals("pending").toArray();
}

export async function cacheProduits(produits: { id: string; data: unknown }[]): Promise<void> {
  const db = getOfflineDB();
  const now = Date.now();
  await db.produitsCache.bulkPut(produits.map((p) => ({ id: p.id, data: p.data, updatedAt: now })));
}

export async function syncPending(): Promise<{ ok: number; ko: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: 0, ko: 0 };
  }
  const db = getOfflineDB();
  const pending = await db.commandesPending.where("syncStatus").equals("pending").toArray();
  let ok = 0;
  let ko = 0;

  for (const cmd of pending) {
    await db.commandesPending.update(cmd.id, { syncStatus: "syncing" });
    try {
      // TODO: route /api/sync à implémenter une fois la persistance DB Neon active
      // const res = await fetch("/api/sync/commandes", { method: "POST", body: JSON.stringify(cmd.payload) });
      // if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await new Promise((r) => setTimeout(r, 50));
      await db.commandesPending.update(cmd.id, { syncStatus: "done" });
      ok++;
    } catch (e) {
      await db.commandesPending.update(cmd.id, {
        syncStatus: "error",
        lastError: e instanceof Error ? e.message : String(e),
        attempts: (cmd.attempts ?? 0) + 1,
      });
      ko++;
    }
  }

  return { ok, ko };
}

export function watchOnline(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(navigator.onLine);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}
