import { headers } from "next/headers";
import { CsrfProvider } from "@/components/auth/CsrfContext";

/** Prevent static caching of auth pages (login, register, etc.). */
export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }) {
  const csrfToken = (await headers()).get("x-csrf-token") ?? "";
  return <CsrfProvider token={csrfToken}>{children}</CsrfProvider>;
}
