import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/shared/Providers";
import { Navbar } from "@/components/public/Navbar";
import { CartDrawer } from "@/components/shared/CartDrawer";
import { CartFab } from "@/components/shared/CartFab";
import { AIConcierge } from "@/components/shared/AIConcierge";
import "./globals.css";

export const metadata: Metadata = {
  title: "MshindiServe - Fine Breeze Bar & Grill",
  description:
    "Nairobi's premier dining destination. Order food, book rooms, and buy event tickets online.",
  keywords: ["restaurant", "nairobi", "bar", "grill", "hotel", "booking", "kenya"],
  openGraph: {
    title: "MshindiServe - Fine Breeze Bar & Grill",
    description: "Order food, book rooms, and buy event tickets online.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-stone-50 font-sans text-zinc-950 antialiased dark:bg-zinc-950 dark:text-white">
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <CartDrawer />
          <CartFab />
          <AIConcierge />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#18181b",
                color: "#fff",
                border: "1px solid #d97706",
                borderRadius: "10px",
                fontSize: "13px",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
