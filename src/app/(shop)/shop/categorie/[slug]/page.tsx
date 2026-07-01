import { redirect } from "next/navigation";

/**
 * Les catégories sont désormais gérées par le catalogue unique `/shop` via le
 * paramètre `?cat=`. Cette route redirige donc vers le catalogue filtré
 * (source de vérité unique, produits réels).
 */
export default async function CategoriePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/shop?cat=${encodeURIComponent(slug)}`);
}
