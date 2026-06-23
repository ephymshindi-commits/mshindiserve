"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed,
  BedDouble, Calendar, Users, BarChart3, LogOut, ChevronRight
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== "ADMIN") return null;

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    clearAuth();
    toast.success("Signed out");
    router.push("/");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col">
        <div className="px-4 py-5 border-b border-zinc-800">
          <p className="text-amber-500 font-semibold text-sm">MshindiServe</p>
          <p className="text-zinc-600 text-xs mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 py-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors",
                pathname === href
                  ? "text-amber-500 bg-amber-500/10"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <Icon size={15} />
              {label}
              {pathname === href && <ChevronRight size={12} className="ml-auto text-amber-500/50" />}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-zinc-800">
          <p className="text-zinc-600 text-[10px] mb-1">Signed in as</p>
          <p className="text-zinc-400 text-xs truncate mb-3">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
