import type { Metadata } from "next";

export const metadata: Metadata = { title: "Administration" };

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-display-sm text-[--foreground]">Administration</h1>
      <p className="text-[--foreground-muted] mt-2">Module en cours de développement.</p>
    </div>
  );
}
