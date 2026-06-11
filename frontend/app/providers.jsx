"use client";

import AuthProvider from "@/components/providers/AuthProvider";
import QueryProvider from "@/components/providers/QueryProvider";

export default function Providers({ children, nonce }) {
  return (
    <QueryProvider nonce={nonce}>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
