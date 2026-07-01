import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import "@/styles/globals.css";
import { Providers } from "./providers";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "GrossistePPN Madagascar",
    template: "%s — GrossistePPN",
  },
  description: "Système de gestion grossiste PPN pour Madagascar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GrossistePPN",
  },
  robots: { index: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B1D24",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} min-h-screen`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <PwaRegister />
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast:
                    "font-sans rounded-xl border border-brand-border shadow-card bg-brand-card text-white",
                },
              }}
            />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
