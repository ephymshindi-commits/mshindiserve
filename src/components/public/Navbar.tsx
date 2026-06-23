"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import { AuthModal } from "@/components/shared/AuthModal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/rooms", label: "Rooms" },
  { href: "/events", label: "Events" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Don't render public navbar in admin/staff routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    toast.success("Signed out");
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-amber-500 font-semibold text-lg tracking-tight">
            Mshindi<span className="text-white font-normal">Serve</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors",
                  pathname === l.href
                    ? "text-amber-500 bg-amber-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-medium">
                      {user.name.charAt(0)}
                    </div>
                    <span className="max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
                    <ChevronDown size={14} className="text-zinc-500" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-[180px] bg-zinc-900 border border-zinc-800 rounded-xl p-1 shadow-xl z-50"
                    align="end"
                    sideOffset={8}
                  >
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/orders"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer outline-none"
                      >
                        <User size={14} /> My Orders
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/bookings"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg cursor-pointer outline-none"
                      >
                        <User size={14} /> My Bookings
                      </Link>
                    </DropdownMenu.Item>
                    {(user.role === "ADMIN" || user.role === "KITCHEN") && (
                      <DropdownMenu.Item asChild>
                        <Link
                          href={user.role === "ADMIN" ? "/admin" : "/staff/kitchen"}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-amber-500 hover:bg-zinc-800 rounded-lg cursor-pointer outline-none"
                        >
                          ⚡ {user.role === "ADMIN" ? "Admin Panel" : "Kitchen Panel"}
                        </Link>
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Separator className="my-1 border-t border-zinc-800" />
                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg cursor-pointer outline-none"
                    >
                      <LogOut size={14} /> Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign in
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-zinc-800 px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block px-3 py-2 text-sm rounded-lg",
                  pathname === l.href
                    ? "text-amber-500 bg-amber-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                {l.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <button
                onClick={() => { setMenuOpen(false); setAuthOpen(true); }}
                className="w-full mt-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg"
              >
                Sign in
              </button>
            )}
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
