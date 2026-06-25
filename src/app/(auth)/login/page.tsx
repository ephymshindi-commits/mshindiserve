import { Suspense } from "react";
import { AuthPage } from "@/components/shared/AuthPage";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthPage defaultTab="login" />
    </Suspense>
  );
}
