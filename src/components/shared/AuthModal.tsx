"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Chrome, Eye, EyeOff, Loader2, Lock, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { normalizeRole, resolvePostAuthRedirect } from "@/lib/role-redirect";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
  defaultTab?: "login" | "register";
}

function validateLogin(email: string, password: string) {
  const errors: Record<string, string> = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  return errors;
}

function validateRegister(name: string, phone: string, email: string, password: string) {
  const errors: Record<string, string> = {};
  const normalizedPhone = phone.replace(/\s/g, "");

  if (name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (phone && !/^(\+254|0)[17]\d{8}$/.test(normalizedPhone)) {
    errors.phone = "Enter a valid Safaricom number";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (password.length < 8) errors.password = "At least 8 characters";
  else if (!/[A-Z]/.test(password)) errors.password = "Include an uppercase letter";
  else if (!/[0-9]/.test(password)) errors.password = "Include a number";

  return errors;
}

function safeNextPath() {
  if (typeof window === "undefined") return "/";

  const params = new URLSearchParams(window.location.search);
  const explicitNext = params.get("next");
  if (explicitNext && explicitNext.startsWith("/") && !explicitNext.startsWith("//")) {
    return explicitNext;
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath.startsWith("/login") || currentPath.startsWith("/register")) {
    return "/";
  }

  return currentPath;
}

export function AuthModal({ open, onClose, onSuccess, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [defaultTab, open]);

  function resetAll() {
    setLoginEmail("");
    setLoginPassword("");
    setLoginErrors({});
    setRegName("");
    setRegPhone("");
    setRegEmail("");
    setRegPassword("");
    setRegErrors({});
    setSubmitting(false);
    setGoogleLoading(false);
    setShowPassword(false);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateLogin(loginEmail.trim(), loginPassword);
    if (Object.keys(errors).length > 0) {
      setLoginErrors(errors);
      return;
    }

    setSubmitting(true);
    setLoginErrors({});
    const toastId = toast.loading("Signing in");

    try {
      const res = await authApi.login(loginEmail.trim(), loginPassword);
      const { user, accessToken } = res.data.data;
      const role = normalizeRole(user.role);
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`, { id: toastId });
      resetAll();
      if (onSuccess) onSuccess(user);
      else router.replace(resolvePostAuthRedirect(role));
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Sign in failed", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const normalizedPhone = regPhone.replace(/\s/g, "");
    const errors = validateRegister(regName, regPhone, regEmail.trim(), regPassword);
    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setSubmitting(true);
    setRegErrors({});
    const toastId = toast.loading("Creating account");

    try {
      const res = await authApi.register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: normalizedPhone || undefined,
        password: regPassword,
      });
      const { user, accessToken } = res.data.data;
      const role = normalizeRole(user.role);
      setAuth(user, accessToken);
      toast.success(`Welcome, ${user.name.split(" ")[0]}`, { id: toastId });
      resetAll();
      if (onSuccess) onSuccess(user);
      else router.replace(resolvePostAuthRedirect(role));
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Registration failed", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.error(
        "Google sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    setGoogleLoading(true);
    const toastId = toast.loading("Opening Google sign-in");

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        safeNextPath()
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });

      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
      toast.error(message, { id: toastId });
      setGoogleLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-2xl dark:bg-zinc-900">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-zinc-950 dark:text-white">
                Welcome to MshindiServe
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-500">
                {tab === "login" ? "Sign in to continue" : "Create your guest account"}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
            {(["login", "register"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setShowPassword(false);
                }}
                className={cn(
                  "h-9 rounded-md text-sm font-medium transition",
                  tab === value
                    ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
              >
                {value === "login" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting || googleLoading}
            className="mb-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-amber-500 dark:hover:bg-zinc-800"
          >
            {googleLoading ? <Loader2 size={16} className="animate-spin" /> : <Chrome size={16} />}
            Continue with Google
          </button>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs font-medium text-zinc-400">or use email</span>
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Field label="Email" error={loginErrors.email}>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              <PasswordField
                label="Password"
                value={loginPassword}
                onChange={setLoginPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                error={loginErrors.password}
                autoComplete="current-password"
              />
              <SubmitButton submitting={submitting} icon="login" label="Sign in securely" busy="Signing in" />
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <Field label="Full name" error={regErrors.name}>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Grace Njoroge"
                  autoComplete="name"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone (M-Pesa) - optional" error={regErrors.phone}>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+254 712 345 678"
                  autoComplete="tel"
                  className={inputCls}
                />
              </Field>
              <Field label="Email" error={regErrors.email}>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              <PasswordField
                label="Password"
                value={regPassword}
                onChange={setRegPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                error={regErrors.password}
                autoComplete="new-password"
              />
              <SubmitButton submitting={submitting} icon="register" label="Create account" busy="Creating account" />
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  setShowPassword,
  error,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  error?: string;
  autoComplete: string;
}) {
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete={autoComplete}
          className={cn(inputCls, "pr-10")}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}

function SubmitButton({
  submitting,
  icon,
  label,
  busy,
}: {
  submitting: boolean;
  icon: "login" | "register";
  label: string;
  busy: string;
}) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60 dark:bg-amber-600 dark:hover:bg-amber-500"
    >
      {submitting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : icon === "login" ? (
        <Lock size={16} />
      ) : (
        <UserPlus size={16} />
      )}
      {submitting ? busy : label}
    </button>
  );
}
