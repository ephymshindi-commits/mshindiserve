import { Suspense } from "react";
import { AuthPage } from "@/components/shared/AuthPage";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthPage defaultTab="register" />
    </Suspense>
  );
}
