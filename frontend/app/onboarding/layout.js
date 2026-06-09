import { headers } from "next/headers";
import { CsrfProvider } from "@/components/auth/CsrfContext";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }) {
  const csrfToken = (await headers()).get("x-csrf-token") ?? "";
  return <CsrfProvider token={csrfToken}>{children}</CsrfProvider>;
}
