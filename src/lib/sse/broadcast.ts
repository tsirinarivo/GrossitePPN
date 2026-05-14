/**
 * Broadcaster SSE in-process.
 * Toutes les connexions /api/stream/caisse sont stockées dans un Set global.
 * Fonctionne en dev (processus unique). En prod multi-instance, remplacer par Redis Pub/Sub.
 */

export interface CommandeEvent {
  commandeId: string;
  numero: string;
  source: string;
  totalTTC: number;
  clientId?: string | null;
}

export interface CommandeMiseAJourEvent {
  commandeId: string;
  numero: string;
  totalTTC: number;
  nbArticles: number;
}

export interface CommandeAnnuleeEvent {
  commandeId: string;
  numero: string;
}

type StreamController = ReadableStreamDefaultController<Uint8Array>;

const clients = new Set<StreamController>();

export function registerClient(controller: StreamController) {
  clients.add(controller);
  return () => clients.delete(controller);
}

function send(eventName: string, data: unknown): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);
  for (const ctrl of clients) {
    try {
      ctrl.enqueue(encoded);
    } catch {
      clients.delete(ctrl);
    }
  }
}

export function broadcastCommande(event: CommandeEvent): void {
  send("nouvelle_commande", event);
}

export function broadcastMiseAJour(event: CommandeMiseAJourEvent): void {
  send("commande_modifiee", event);
}

export function broadcastAnnulation(event: CommandeAnnuleeEvent): void {
  send("commande_annulee", event);
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
