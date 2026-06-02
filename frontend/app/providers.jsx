"use client";

import AuthProvider from "@/components/providers/AuthProvider";

export default function Providers({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
