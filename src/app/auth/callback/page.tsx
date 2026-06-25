import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { OAuthCallback } from "@/components/shared/OAuthCallback";

export const dynamic = "force-dynamic";

function CallbackFallback() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-stone-50 px-4 py-16 dark:bg-zinc-950">
      <div className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
        <Loader2 size={18} className="animate-spin text-amber-600" />
        Preparing secure sign-in
      </div>
    </section>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <OAuthCallback />
    </Suspense>
  );
}
