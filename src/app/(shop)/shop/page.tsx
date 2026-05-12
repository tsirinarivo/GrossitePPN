import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";

export const metadata: Metadata = {
  title: "Catalogue — Boutique B2B PPN Madagascar",
};

export default function ShopCataloguePage() {
  return <ShopCatalogue />;
}
