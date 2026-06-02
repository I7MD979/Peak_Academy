"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardHeader({ title, subtitle }) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        {title ? <h1 className="text-xl font-bold text-primary">{title}</h1> : null}
        {subtitle ? <p className="text-sm text-text-muted">{subtitle}</p> : null}
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-lg border-border text-sm"
        onClick={handleLogout}
      >
        تسجيل الخروج
      </Button>
    </header>
  );
}
