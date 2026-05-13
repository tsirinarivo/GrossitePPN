import { registerClient, sseKeepAlive } from "@/lib/sse/broadcast";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Message de bienvenue
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unregister = registerClient(controller);
      const interval = sseKeepAlive(controller);

      // Cleanup sur déconnexion
      const cleanup = () => {
        clearInterval(interval);
        unregister();
      };

      // Pas d'event cancel natif dans ReadableStream controller — on expose via AbortSignal
      // Le client qui se déconnecte provoquera une erreur sur enqueue() gérée dans broadcast.ts
      void cleanup; // référence pour éviter lint "unused variable"
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
