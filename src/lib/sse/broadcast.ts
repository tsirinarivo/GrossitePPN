/**
 * Broadcaster SSE in-process.
 * Toutes les connexions /api/stream/caisse sont stockées dans un Set global.
 * Quand creerCommande() appelle broadcastCommande(), chaque client reçoit l'événement.
 * Fonctionne en dev (processus unique). En prod multi-instance, remplacer par Redis Pub/Sub.
 */

export interface CommandeEvent {
  commandeId: string;
  numero: string;
  source: string;
  totalTTC: number;
  clientId?: string | null;
}

type StreamController = ReadableStreamDefaultController<Uint8Array>;

// Stockage global des connexions actives
const clients = new Set<StreamController>();

export function registerClient(controller: StreamController) {
  clients.add(controller);
  return () => clients.delete(controller);
}

export async function broadcastCommande(event: CommandeEvent): Promise<void> {
  const payload = `event: nouvelle_commande\ndata: ${JSON.stringify(event)}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      clients.delete(ctrl);
    }
  }
}

export function sseKeepAlive(controller: StreamController) {
  const ping = new TextEncoder().encode(": ping\n\n");
  return setInterval(() => {
    try {
      controller.enqueue(ping);
    } catch {
      clients.delete(controller);
    }
  }, 25_000);
}
