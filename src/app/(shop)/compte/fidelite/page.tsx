import type { Metadata } from "next";
import { CompteFidelite } from "@/components/shop/compte-fidelite";

export const metadata: Metadata = { title: "Mon programme fidélité" };

export default function FidelitePage() {
  return <CompteFidelite />;
}
