import { Suspense } from "react";

import { LoginClient } from "@/app/(auth)/login/login-client";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
