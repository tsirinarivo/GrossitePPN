import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { Store } from "lucide-react";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { parseTenantSlug } from "@/lib/tenant-host";
import { getEntrepriseFor } from "@/lib/entreprise";
import { planAllowsB2B } from "@/lib/plans";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopFooter } from "@/components/shop/shop-footer";

/** La boutique B2B n'est disponible que si la formule du tenant l'inclut. */
async function boutiqueDisponible(): Promise<boolean> {
  const slug = parseTenantSlug((await headers()).get("host"));
  if (!slug) return true; // hors sous-domaine tenant → on ne bloque pas
  try {
    const [t] = await db
      .select({ id: schema.tenants.id, plan: schema.tenants.plan })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, slug))
      .limit(1);
    if (!t) return true;
    if (!planAllowsB2B(t.plan)) return false;
    const e = await getEntrepriseFor(t.id);
    return e?.ecommerceActif ?? false;
  } catch {
    return true;
  }
}

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await boutiqueDisponible())) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[--background] text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-[--card] border border-[--border] flex items-center justify-center mb-5">
          <Store className="w-6 h-6 text-[--foreground-muted]" />
        </div>
        <h1 className="text-2xl font-bold text-[--foreground]">Boutique non disponible</h1>
        <p className="mt-2 text-[--foreground-muted] max-w-md">
          La boutique en ligne B2B n&apos;est pas incluse dans la formule de cette entreprise.
          Elle est disponible à partir de la formule Pro.
        </p>
        <a href="/login" className="mt-6 inline-flex items-center rounded-xl bg-[#FF4D00] hover:bg-[#E04400] px-5 py-2.5 font-semibold text-white transition-colors">
          Accéder à mon espace
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[--background]">
      <ShopHeader />
      <main className="flex-1">{children}</main>
      <ShopFooter />
    </div>
  );
}
