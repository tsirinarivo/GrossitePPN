import type { Metadata } from "next";
import { CheckoutPage } from "@/components/shop/checkout-page";

export const metadata: Metadata = { title: "Finaliser ma commande" };

export default function Checkout() {
  return <CheckoutPage />;
}
