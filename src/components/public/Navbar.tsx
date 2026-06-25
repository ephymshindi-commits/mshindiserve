"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BedDouble,
  ChevronDown,
  ClipboardList,
  LogOut,
  Menu,
  ShieldCheck,
  Ticket,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { AuthModal } from "@/components/shared/AuthModal";
import { authApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

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

  if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) return null;

  async function handleLogout() {
    await authApi.logout().catch(() => undefined);
    clearAuth();
    toast.success("Signed out");
  }

  const staffHref =
    user?.role === "ADMIN"
      ? "/admin/dashboard"
      : user?.role === "KITCHEN"
      ? "/staff/kitchen"
      : user?.role === "RECEPTION"
      ? "/staff/reception"
      : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">
            Mshindi<span className="text-amber-600">Serve</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition",
                  pathname === link.href
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated && user ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-xs font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate">{user.name.split(" ")[0]}</span>
                    <ChevronDown size={14} className="text-zinc-400" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-50 min-w-[210px] rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <MenuItem href="/orders" icon={ClipboardList} label="My orders" />
                    <MenuItem href="/bookings" icon={BedDouble} label="My bookings" />
                    <MenuItem href="/tickets" icon={Ticket} label="My tickets" />
                    {staffHref && <MenuItem href={staffHref} icon={ShieldCheck} label="Workspace" accent />}
                    <DropdownMenu.Separator className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                    <DropdownMenu.Item
                      onSelect={handleLogout}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none transition hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <LogOut size={15} /> Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                Sign in
              </button>
            )}
          </div>

          <button
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 md:hidden dark:hover:bg-zinc-900 dark:hover:text-white"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
                    pathname === link.href
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-white"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              {isAuthenticated && user ? (
                <div className="space-y-1">
                  <MenuLink href="/orders" label="My orders" onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/bookings" label="My bookings" onClick={() => setMenuOpen(false)} />
                  <MenuLink href="/tickets" label="My tickets" onClick={() => setMenuOpen(false)} />
                  {staffHref && (
                    <MenuLink href={staffHref} label="Workspace" onClick={() => setMenuOpen(false)} />
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}
                  className="h-10 w-full rounded-lg bg-zinc-950 text-sm font-medium text-white dark:bg-amber-600"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

function MenuItem({
  href,
  icon: Icon,
  label,
  accent,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  accent?: boolean;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition hover:bg-zinc-100 dark:hover:bg-zinc-800",
          accent ? "text-amber-700 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-200"
        )}
      >
        <Icon size={15} />
        {label}
      </Link>
    </DropdownMenu.Item>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
    >
      {label}
    </Link>
  );
}
