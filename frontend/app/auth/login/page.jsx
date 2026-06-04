import Link from "next/link";
import AuthLogoHeader from "@/components/auth/AuthLogoHeader";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-bg via-bg to-white p-4 font-cairo"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        <AuthLogoHeader />

        <div className="rounded-3xl border border-border/80 bg-card p-8 shadow-[0_8px_35px_rgba(15,23,42,0.08)]">
          <h1 className="mb-1 text-2xl font-black text-text">أهلًا بك 👋</h1>
          <p className="mb-6 text-sm leading-relaxed text-text-muted">
            سجّل دخولك لمتابعة الجلسات، الأداء، والتقارير في لوحة Peak Academy.
          </p>

          <LoginForm />
        </div>

        <p className="mt-5 text-center text-sm text-text-muted">
          ليس لديك حساب؟{" "}
          <Link href="/auth/register" className="font-bold text-accent hover:underline">
            أنشئ حسابًا الآن
          </Link>
        </p>
      </div>
    </div>
  );
}
