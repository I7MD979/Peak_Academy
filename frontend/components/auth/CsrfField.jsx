"use client";

import { useCsrfToken } from "@/components/auth/CsrfContext";

export default function CsrfField() {
  const token = useCsrfToken();
  if (!token) return null;

  return <input type="hidden" name="csrf_token" value={token} autoComplete="off" />;
}
