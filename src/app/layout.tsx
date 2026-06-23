import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/shared/Providers";
import { Navbar } from "@/components/public/Navbar";
import { CartDrawer } from "@/components/shared/CartDrawer";
import { CartFab } from "@/components/shared/CartFab";
import { AIConcierge } from "@/components/shared/AIConcierge";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MshindiServe — Fine Breeze Bar & Grill",
  description:
    "Nairobi's premier dining destination. Order food, book rooms, and buy event tickets online.",
  keywords: ["restaurant", "nairobi", "bar", "grill", "hotel", "booking", "kenya"],
  openGraph: {
    title: "MshindiServe — Fine Breeze Bar & Grill",
    description: "Order food, book rooms, and buy event tickets online.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white`}>
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
                background: "#1c1917",
                color: "#fff",
                border: "1px solid #d97706",
                borderRadius: "12px",
                fontSize: "13px",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
