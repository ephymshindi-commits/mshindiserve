"use client";

import {
  BarChart3,
  BedDouble,
  Calendar,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/liquor", label: "Liquor", icon: Wine },
  { href: "/admin/rooms", label: "Rooms", icon: BedDouble },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, clearAuth, setUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdmin() {
      try {
        const res = await authApi.me();
        const sessionUser = res.data.data.user;
        if (cancelled) return;
        setUser(sessionUser);
        if (sessionUser.role !== "ADMIN") {
          clearAuth();
          toast.error("Admin access requires an administrator account.");
          router.replace(`/login?next=${encodeURIComponent(pathname || "/admin/dashboard")}&reason=admin_required`);
          return;
        }
        setChecking(false);
      } catch {
        if (!cancelled) {
          clearAuth();
          router.replace(`/login?next=${encodeURIComponent(pathname || "/admin/dashboard")}`);
        }
      }
    }

    verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, pathname, router, setUser]);

  async function handleLogout() {
    await authApi.logout().catch(() => undefined);
    clearAuth();
    toast.success("Signed out");
    router.push("/");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading admin workspace...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-zinc-950">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 md:flex md:flex-col">
        <div className="border-b border-zinc-800 px-5 py-5">
          <p className="text-sm font-semibold text-white">
            Mshindi<span className="text-amber-500">Serve</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Admin workspace</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-amber-500/10 text-amber-300"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
                )}
              >
                <Icon size={16} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto text-amber-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wide text-zinc-600">Signed in as</p>
          <p className="mt-1 truncate text-xs text-zinc-300">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2 text-xs font-medium text-red-400 transition hover:text-red-300"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-zinc-200 bg-white px-4 py-3 md:hidden dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-semibold text-zinc-950 dark:text-white">Admin workspace</p>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-xs font-medium",
                  pathname === href
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
