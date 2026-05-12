import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <div className="p-6">
      <h1 className="text-display-sm text-[--foreground]">Clients</h1>
      <p className="text-[--foreground-muted] mt-2">Module en cours de développement.</p>
    </div>
  );
}
