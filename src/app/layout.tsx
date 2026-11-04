import type { Metadata, Viewport } from "next";
import { Cairo, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/store/cart-context";
import { ServiceWorker } from "@/components/ui/service-worker";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SLOGAN, SITE_URL } from "@/lib/site";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-latin", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – ${SITE_SLOGAN}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["RIVO", "متجر إلكتروني", "تسوق أونلاين", "مصر", "إلكترونيات", "إكسسوارات", "منتجات منزلية"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ar_EG",
    siteName: SITE_NAME,
    title: `${SITE_NAME} – ${SITE_SLOGAN}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: "/images/hero.jpg", width: 1600, height: 900, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} – ${SITE_SLOGAN}`, description: SITE_DESCRIPTION, images: ["/images/hero.jpg"] },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#07080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('rivo-theme');document.documentElement.dataset.theme=t==='light'?'light':'dark'}catch(e){}})()` }} />
      </head>
      <body className="min-h-screen bg-ink-950 text-white antialiased">
        <CartProvider>{children}</CartProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
