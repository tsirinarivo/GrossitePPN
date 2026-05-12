import type { Metadata } from "next";
import { PanierPage } from "@/components/shop/panier-page";

export const metadata: Metadata = { title: "Mon panier" };

export default function Panier() {
  return <PanierPage />;
}
