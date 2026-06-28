import type { Role } from "@/types";

const roleHomePaths: Record<Role, string> = {
  ADMIN: "/admin/dashboard",
  KITCHEN: "/staff/kitchen",
  RECEPTION: "/staff/reception",
  CUSTOMER: "/",
};

export function normalizeRole(role: unknown): Role {
  return role === "ADMIN" || role === "KITCHEN" || role === "RECEPTION" || role === "CUSTOMER"
    ? role
    : "CUSTOMER";
}

function isSafeInternalPath(path: string | null | undefined) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

function isAllowedForRole(path: string, role: Role) {
  if (path.startsWith("/admin")) return role === "ADMIN";
  if (path.startsWith("/staff/kitchen")) return role === "ADMIN" || role === "KITCHEN";
  if (path.startsWith("/staff/reception")) return role === "ADMIN" || role === "RECEPTION";
  if (path.startsWith("/staff")) return role === "ADMIN";
  return true;
}

export function roleHomePath(role: Role) {
  return roleHomePaths[role] ?? "/";
}

export function resolvePostAuthRedirect(role: Role, next?: string | null): string {
  if (!isSafeInternalPath(next)) return roleHomePath(role);

  const safeNext = next as string;
  if (safeNext === "/" || safeNext === "/login" || safeNext === "/register") return roleHomePath(role);
  if (!isAllowedForRole(safeNext, role)) return roleHomePath(role);
  return safeNext;
}
