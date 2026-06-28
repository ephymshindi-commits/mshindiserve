"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, RefreshCcw, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { authApi } from "@/lib/api";
import { labelFromEnum } from "@/lib/visuals";
import type { ApiResponse, Role } from "@/types";

const roles = ["CUSTOMER", "KITCHEN", "RECEPTION", "ADMIN"] as const;

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  failedLoginAttempts?: number;
  lockedUntil?: string | Date | null;
};

type RoleFilter = "ALL" | Role;

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return (await res.json()) as ApiResponse<T>;
  } catch {
    return { success: false, error: "The server returned an invalid response." };
  }
}

async function fetchUsers({ search, role }: { search: string; role: RoleFilter }) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (role !== "ALL") params.set("role", role);

  const res = await fetch(`/api/users?${params.toString()}`, { credentials: "include" });
  const data = await readJson<AdminUser[]>(res);
  if (!res.ok || !data.success || !data.data) {
    throw new Error(data.error ?? "Could not load users.");
  }
  return data.data;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [staffOpen, setStaffOpen] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const usersQuery = useQuery({
    queryKey: ["admin-users", debouncedSearch, roleFilter],
    queryFn: () => fetchUsers({ search: debouncedSearch, role: roleFilter }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const res = await fetch(`/api/users/${id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await readJson<AdminUser>(res);
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "Could not update role.");
      }
      return data.data;
    },
    onSuccess: () => {
      toast.success("User role updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update role.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await readJson<AdminUser>(res);
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error ?? "Could not update user status.");
      }
      return data.data;
    },
    onSuccess: (user) => {
      toast.success(user.isActive ? "User activated." : "User suspended.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update user status.");
    },
  });

  const users = usersQuery.data ?? [];
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      admins: users.filter((user) => user.role === "ADMIN").length,
      staff: users.filter((user) => user.role !== "CUSTOMER").length,
    };
  }, [users]);

  function refreshUsers() {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  function changeRole(user: AdminUser, nextRole: Role) {
    if (nextRole === user.role || roleMutation.isPending) return;

    if (nextRole === "ADMIN") {
      const approved = window.confirm(`Promote ${user.email} to admin? Admins can manage the full system.`);
      if (!approved) return;
    }

    roleMutation.mutate({ id: user.id, role: nextRole });
  }

  function toggleStatus(user: AdminUser) {
    if (statusMutation.isPending) return;
    const nextActive = !user.isActive;

    if (!nextActive) {
      const approved = window.confirm(`Suspend ${user.email}? They will not be able to use the platform until reactivated.`);
      if (!approved) return;
    }

    statusMutation.mutate({ id: user.id, isActive: nextActive });
  }

  return (
    <div>
      <AdminSectionHeader
        title="Users"
        description="Manage customer and staff accounts, roles, and account access."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshUsers}
              disabled={usersQuery.isFetching}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <RefreshCcw size={16} className={usersQuery.isFetching ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setStaffOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-500"
            >
              <UserPlus size={16} />
              Add user
            </button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible users" value={stats.total} />
        <StatCard label="Active" value={stats.active} tone="success" />
        <StatCard label="Staff" value={stats.staff} />
        <StatCard label="Admins" value={stats.admins} tone="warning" />
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
          className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
        >
          <option value="ALL">All roles</option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {labelFromEnum(role)}
            </option>
          ))}
        </select>
      </div>

      {usersQuery.isLoading && <UsersSkeleton />}

      {usersQuery.isError && (
        <ErrorState
          message={usersQuery.error instanceof Error ? usersQuery.error.message : "Could not load users."}
          onRetry={() => usersQuery.refetch()}
        />
      )}

      {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
        <EmptyState title="No users found" detail="Try another search, clear the role filter, or create a new staff account." />
      )}

      {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="hidden grid-cols-[minmax(250px,1.6fr)_150px_160px_130px_130px] border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium text-zinc-500 md:grid dark:border-zinc-800 dark:bg-zinc-950">
            <span>User</span>
            <span>Role</span>
            <span>Phone</span>
            <span>Joined</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {users.map((user) => (
              <article key={user.id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(250px,1.6fr)_150px_160px_130px_130px] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Avatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{user.name}</p>
                      <p className="truncate text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                </div>
                <select
                  value={user.role}
                  onChange={(event) => changeRole(user, event.target.value as Role)}
                  disabled={roleMutation.isPending}
                  className="h-9 w-fit min-w-32 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 outline-none transition focus:ring-2 focus:ring-amber-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {labelFromEnum(role)}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">{user.phone ?? "Not set"}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">{format(new Date(user.createdAt), "d MMM yyyy")}</div>
                <button
                  onClick={() => toggleStatus(user)}
                  disabled={statusMutation.isPending}
                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
                    user.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                  }`}
                >
                  {user.isActive ? "Active" : "Suspended"}
                </button>
              </article>
            ))}
          </div>
        </div>
      )}

      <AddUserModal
        open={staffOpen}
        onOpenChange={setStaffOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
      />
    </div>
  );
}

function AddUserModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "RECEPTION" as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setApiError(null);
    setForm({ name: "", email: "", phone: "", password: "", role: "RECEPTION" });
  }, [open]);

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Name must be at least 2 characters.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.phone.trim() && !/^(\+254|0)[17]\d{8}$/.test(form.phone.trim())) next.phone = "Enter a valid Kenyan phone number.";
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = "Password needs 8 characters, one uppercase letter, and one number.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);

    try {
      await authApi.register({
        adminCreate: true,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
      });

      toast.success("User created.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? "Could not create user.";
      setApiError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <div>
              <Dialog.Title className="text-base font-semibold text-zinc-950 dark:text-white">Add user</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-zinc-500">
                Create a customer or staff account without signing out the current admin.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" disabled={submitting}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {apiError && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{apiError}</div>}
            <Field label="Full name" error={errors.name}>
              <input className={inputClass} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" className={inputClass} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Phone (optional)" error={errors.phone}>
              <input className={inputClass} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+254712345678" />
            </Field>
            <Field label="Temporary password" error={errors.password}>
              <input type="password" className={inputClass} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </Field>
            <Field label="Role">
              <select className={inputClass} value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {labelFromEnum(role)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="border-t border-zinc-200 p-5 dark:border-zinc-800">
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 text-sm font-medium text-white transition hover:bg-amber-500 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create user
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Avatar({ user }: { user: AdminUser }) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white dark:bg-amber-600">
      {initials || "US"}
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "text-amber-700 dark:text-amber-300"
        : "text-zinc-950 dark:text-white";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-3 border-b border-zinc-100 p-4 last:border-0 dark:border-zinc-800">
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-3 w-64 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <p className="font-medium">{message}</p>
      <button onClick={onRetry} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-3 text-xs font-medium text-white">
        <Loader2 size={14} />
        Retry
      </button>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}
