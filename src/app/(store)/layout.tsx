import type { ReactNode } from "react";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { getCategoriesWithCounts } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/settings";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [settings, categories] = await Promise.all([getSettings(), getCategoriesWithCounts().catch(() => [])]);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-electric-500 focus:px-4 focus:py-2">
        تخطي إلى المحتوى
      </a>
      <Header announcement={settings.announcement} />
      <main id="main" className="flex-1">{children}</main>
      <Footer settings={settings} categories={categories} />
    </div>
  );
}
