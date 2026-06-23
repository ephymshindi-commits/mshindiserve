"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import toast from "react-hot-toast";
import { X, Lock, UserPlus, Eye, EyeOff } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: "login" | "register";
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateLogin(email: string, password: string) {
  const errors: Record<string, string> = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!password) errors.password = "Password is required";
  return errors;
}

function validateRegister(name: string, phone: string, email: string, password: string) {
  const errors: Record<string, string> = {};
  if (!name || name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (phone && !/^(\+254|0)[17]\d{8}$/.test(phone.replace(/\s/g, "")))
    errors.phone = "Enter a valid Safaricom number";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email";
  if (!password || password.length < 8) errors.password = "At least 8 characters";
  else if (!/[A-Z]/.test(password)) errors.password = "Include an uppercase letter";
  else if (!/[0-9]/.test(password)) errors.password = "Include a number";
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuthModal({ open, onClose, onSuccess, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { setAuth } = useAuthStore();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});

  // Register form state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  function resetAll() {
    setLoginEmail(""); setLoginPassword(""); setLoginErrors({});
    setRegName(""); setRegPhone(""); setRegEmail(""); setRegPassword(""); setRegErrors({});
    setSubmitting(false); setShowPassword(false);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateLogin(loginEmail, loginPassword);
    if (Object.keys(errors).length > 0) { setLoginErrors(errors); return; }
    setLoginErrors({});
    setSubmitting(true);
    const toastId = toast.loading("Signing in…");
    try {
      const res = await authApi.login(loginEmail, loginPassword);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}! 👋`, { id: toastId });
      resetAll();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Sign in failed", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateRegister(regName, regPhone, regEmail, regPassword);
    if (Object.keys(errors).length > 0) { setRegErrors(errors); return; }
    setRegErrors({});
    setSubmitting(true);
    const toastId = toast.loading("Creating your account…");
    try {
      const res = await authApi.register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        password: regPassword,
      });
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Account created! Welcome, ${user.name.split(" ")[0]}! 🎉`, { id: toastId });
      resetAll();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Registration failed", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Welcome to MshindiServe
              </h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                {tab === "login" ? "Sign in to continue" : "Create your account"}
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X size={18} className="text-zinc-500" />
              </button>
            </Dialog.Close>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-6">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setShowPassword(false); }}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  tab === t
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Field label="Email" error={loginErrors.email}>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              <Field label="Password" error={loginErrors.password}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
              >
                <Lock size={16} />
                {submitting ? "Signing in…" : "Sign in securely"}
              </button>
              <p className="text-center text-xs text-zinc-400">
                Protected by JWT · Your data is encrypted
              </p>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === "register" && (
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
              <Field label="Phone (M-Pesa) — optional" error={regErrors.phone}>
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
                  placeholder="you@email.com"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>
              <Field label="Password" error={regErrors.password}>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium rounded-xl transition-colors"
              >
                <UserPlus size={16} />
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Shared field wrapper ─────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition";

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
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}